import type { Category, CodeQuestion, Question, QuestionType, TheoryQuestion } from './types';
import { nowIso, slugify } from './utils';
import { supabase } from './supabase';

const CATEGORY_CACHE_KEY = 'categories_cache';
const THEORY_CACHE_KEY = 'theory_questions_cache';
const CODE_CACHE_KEY = 'code_questions_cache';

const mapType = (typeStr: string): QuestionType => {
  const normalized = typeStr.toLowerCase();
  if (['true_false', 'truefalse', 'tf'].includes(normalized)) return 'trueFalse';
  if (['multiple_choice', 'multiple', 'mcq'].includes(normalized)) return 'multipleChoice';
  return 'singleChoice';
};

const parseCorrectAnswerFromDb = (
  raw: string | null,
  options: string[],
  type: QuestionType,
): string | string[] | null => {
  if (!raw || !raw.trim()) return null;
  let parsed: unknown = raw.trim();
  const trimmed = raw.trim();
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      parsed = trimmed;
    }
  }
  return mapAnswerToOptionText(parsed, options, type);
};

const mapAnswerToOptionText = (
  answer: unknown,
  options: string[],
  type: QuestionType,
): string | string[] | null => {
  const indexToText = (value: string): string | null => {
    const upper = value.toUpperCase().trim();
    if (upper === 'T' || upper === 'F') {
      if (options.length === 0) return null;
      return upper === 'T' ? options[0] : options[1] ?? options[0];
    }
    if (upper.length === 1 && upper >= 'A' && upper <= 'Z') {
      const idx = upper.charCodeAt(0) - 65;
      if (idx >= 0 && idx < options.length) return options[idx];
    }
    const match = options.find((option) => option.trim() === value.trim());
    return match ?? value;
  };

  if (Array.isArray(answer)) {
    return answer.map((item) => indexToText(String(item))).filter(Boolean) as string[];
  }
  if (typeof answer === 'string') {
    if (type === 'multipleChoice') {
      const parts = answer.includes(',')
        ? answer.split(',').map((part) => part.trim()).filter(Boolean)
        : answer.split('').map((part) => part.trim()).filter(Boolean);
      if (parts.length > 1) {
        return parts.map((part) => indexToText(part) ?? part);
      }
    }
    return indexToText(answer) ?? answer;
  }
  return answer as string | string[] | null;
};

export async function loadQuestionBank(): Promise<{
  categories: Category[];
  theoryQuestions: TheoryQuestion[];
  codeQuestions: CodeQuestion[];
}> {
  try {
    const { data, error } = await supabase
      .from('question_bank')
      .select('question_id,type,category,question,options,correct_answer,explanation,created_at')
      .order('question_id');

    if (error) throw error;

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    if (rows.length === 0) throw new Error('No theory questions returned');

    const now = nowIso();
    const categoryNames = new Set<string>();
    const hasSingleChoice: Record<string, boolean> = {};
    const hasMultipleChoice: Record<string, boolean> = {};

    for (const row of rows) {
      const categoryName = (row.category as string) || 'General';
      const typeStr = (row.type as string) || 'single_choice';
      const qType = mapType(typeStr);
      categoryNames.add(categoryName);
      if (qType === 'singleChoice') hasSingleChoice[categoryName] = true;
      if (qType === 'multipleChoice') hasMultipleChoice[categoryName] = true;
    }

    const categoryIdByName: Record<string, string> = {};
    const categories: Category[] = [];

    for (const name of categoryNames) {
      const baseId = slugify(name);
      const single = hasSingleChoice[name] === true;
      const multiple = hasMultipleChoice[name] === true;
      if (single && multiple) {
        const singleId = `${baseId}-single`;
        categoryIdByName[`${name}-single`] = singleId;
        categories.push({
          id: singleId,
          name: `${name} - 单选题`,
          description: `${name} - 单选题`,
          icon: 'check_circle',
          createdAt: now,
          updatedAt: now,
        });

        const multipleId = `${baseId}-multiple`;
        categoryIdByName[`${name}-multiple`] = multipleId;
        categories.push({
          id: multipleId,
          name: `${name} - 多选题`,
          description: `${name} - 多选题`,
          icon: 'done_all',
          createdAt: now,
          updatedAt: now,
        });
      } else {
        categoryIdByName[name] = baseId;
        categories.push({
          id: baseId,
          name,
          description: name,
          icon: 'book',
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    const theoryQuestions: TheoryQuestion[] = rows.map((row) => {
      const id = String(row.question_id ?? '');
      const typeStr = (row.type as string) || 'single_choice';
      const categoryName = (row.category as string) || 'General';
      const qType = mapType(typeStr) as 'trueFalse' | 'singleChoice' | 'multipleChoice';
      let categoryId = categoryIdByName[categoryName] ?? slugify(categoryName);
      if (hasSingleChoice[categoryName] && hasMultipleChoice[categoryName]) {
        if (qType === 'singleChoice') {
          categoryId = categoryIdByName[`${categoryName}-single`] ?? slugify(`${categoryName}-single`);
        } else if (qType === 'multipleChoice') {
          categoryId = categoryIdByName[`${categoryName}-multiple`] ?? slugify(`${categoryName}-multiple`);
        }
      }

      const options = Array.isArray(row.options) ? row.options.map((opt) => String(opt)) : [];
      const explanation = (row.explanation as string) || '';
      const text = (row.question as string) || '';
      const rawAnswer = row.correct_answer != null ? String(row.correct_answer) : null;
      const correct = parseCorrectAnswerFromDb(rawAnswer, options, qType);
      const createdAt = row.created_at ? String(row.created_at) : now;

      return {
        id,
        categoryId,
        type: qType,
        section: 'theoretical',
        text,
        explanation,
        options,
        correctAnswer: correct,
        createdAt,
        updatedAt: createdAt,
      } as TheoryQuestion;
    });

    const operational = await loadOperationalQuestions(categories, categoryIdByName);

    cacheData(categories, theoryQuestions, operational.codeQuestions);

    return { categories: operational.categories, theoryQuestions, codeQuestions: operational.codeQuestions };
  } catch (error) {
    const cached = loadFromCache();
    if (cached) return cached;
    return loadFromAssets();
  }
}

async function loadOperationalQuestions(
  categories: Category[],
  categoryIdByName: Record<string, string>,
): Promise<{ categories: Category[]; codeQuestions: CodeQuestion[] }> {
  const now = nowIso();
  const response = await fetch(`${import.meta.env.BASE_URL}assets/operational_skills.json`);
  const operationalDecoded = (await response.json()) as Array<Record<string, unknown>>;

  const operationalCategoryNames = new Set<string>();
  for (const raw of operationalDecoded) {
    operationalCategoryNames.add((raw.category as string) || 'General');
  }

  for (const name of operationalCategoryNames) {
    const baseId = slugify(name);
    if (!categoryIdByName[name]) {
      categoryIdByName[name] = baseId;
      categories.push({
        id: baseId,
        name,
        description: name,
        icon: 'code',
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const codeQuestions: CodeQuestion[] = operationalDecoded.map((raw) => {
    const id = String(raw.id ?? '');
    const categoryName = (raw.category as string) || 'General';
    const categoryId = categoryIdByName[categoryName] ?? slugify(categoryName);
    const text = (raw.question as string) || (raw.title as string) || '';
    const explanation = (raw.explanation as string) || '';
    const codeTemplate = (raw.codeTemplate as string) || '';
    const correctKeywords = Array.isArray(raw.correctKeywords)
      ? raw.correctKeywords.map((item) => String(item))
      : [];
    const correctCode = (raw.correctCode as string) || '';
    const dataFiles = Array.isArray(raw.dataFiles) ? raw.dataFiles.map((item) => String(item)) : undefined;
    return {
      id,
      categoryId,
      type: 'codeCompletion',
      section: 'operational',
      text,
      explanation,
      codeTemplate,
      correctKeywords,
      correctCode,
      dataFiles,
      createdAt: now,
      updatedAt: now,
    };
  });

  return { categories, codeQuestions };
}

async function loadFromAssets(): Promise<{
  categories: Category[];
  theoryQuestions: TheoryQuestion[];
  codeQuestions: CodeQuestion[];
}> {
  const now = nowIso();
  const response = await fetch(`${import.meta.env.BASE_URL}assets/ai_trainer_bank_v2.json`);
  const decoded = (await response.json()) as Array<Record<string, unknown>>;

  const operationalResponse = await fetch(`${import.meta.env.BASE_URL}assets/operational_skills.json`);
  const operationalDecoded = (await operationalResponse.json()) as Array<Record<string, unknown>>;

  const categoryNames = new Set<string>();
  for (const raw of decoded) {
    categoryNames.add((raw.category as string) || 'General');
  }
  for (const raw of operationalDecoded) {
    categoryNames.add((raw.category as string) || 'General');
  }

  const categoryIdByName: Record<string, string> = {};
  const categories: Category[] = [];

  for (const name of categoryNames) {
    const baseId = slugify(name);
    const categoryQuestions = decoded.filter((item) => item.category === name);
    if (categoryQuestions.length === 0) continue;
    categoryIdByName[name] = baseId;
    const hasSingle = categoryQuestions.some((item) => mapType(String(item.type ?? 'single_choice')) === 'singleChoice');
    const hasMultiple = categoryQuestions.some(
      (item) => mapType(String(item.type ?? 'single_choice')) === 'multipleChoice',
    );
    if (hasSingle && hasMultiple) {
      const singleId = `${baseId}-single`;
      categoryIdByName[`${name}-single`] = singleId;
      categories.push({
        id: singleId,
        name: `${name} - 单选题`,
        description: `${name} - 单选题`,
        icon: 'check_circle',
        createdAt: now,
        updatedAt: now,
      });
      const multipleId = `${baseId}-multiple`;
      categoryIdByName[`${name}-multiple`] = multipleId;
      categories.push({
        id: multipleId,
        name: `${name} - 多选题`,
        description: `${name} - 多选题`,
        icon: 'done_all',
        createdAt: now,
        updatedAt: now,
      });
    } else {
      categories.push({
        id: baseId,
        name,
        description: name,
        icon: 'book',
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  for (const name of new Set(operationalDecoded.map((item) => (item.category as string) || 'General'))) {
    const baseId = slugify(name);
    if (!categoryIdByName[name]) {
      categoryIdByName[name] = baseId;
      categories.push({
        id: baseId,
        name,
        description: name,
        icon: 'code',
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const theoryQuestions: TheoryQuestion[] = decoded.map((raw) => {
    const id = String(raw.id ?? '');
    const typeStr = String(raw.type ?? 'single_choice');
    const categoryName = (raw.category as string) || 'General';
    const qType = mapType(typeStr) as 'trueFalse' | 'singleChoice' | 'multipleChoice';
    let categoryId = categoryIdByName[categoryName] ?? slugify(categoryName);
    if (qType === 'singleChoice') {
      categoryId = categoryIdByName[`${categoryName}-single`] ?? categoryId;
    } else if (qType === 'multipleChoice') {
      categoryId = categoryIdByName[`${categoryName}-multiple`] ?? categoryId;
    }

    const options = Array.isArray(raw.options) ? raw.options.map((opt) => String(opt)) : [];
    const explanation = (raw.explanation as string) || '';
    const text = (raw.question as string) || '';
    const answerRaw = raw.answer;
    const correct = mapAnswerToOptionText(answerRaw, options, qType);

    return {
      id,
      categoryId,
      type: qType,
      section: 'theoretical',
      text,
      explanation,
      options,
      correctAnswer: correct,
      createdAt: now,
      updatedAt: now,
    } as TheoryQuestion;
  });

  const codeQuestions: CodeQuestion[] = operationalDecoded.map((raw) => {
    const id = String(raw.id ?? '');
    const categoryName = (raw.category as string) || 'General';
    const categoryId = categoryIdByName[categoryName] ?? slugify(categoryName);
    const text = (raw.question as string) || (raw.title as string) || '';
    const explanation = (raw.explanation as string) || '';
    const codeTemplate = (raw.codeTemplate as string) || '';
    const correctKeywords = Array.isArray(raw.correctKeywords)
      ? raw.correctKeywords.map((item) => String(item))
      : [];
    const correctCode = (raw.correctCode as string) || '';
    const dataFiles = Array.isArray(raw.dataFiles) ? raw.dataFiles.map((item) => String(item)) : undefined;

    return {
      id,
      categoryId,
      type: 'codeCompletion',
      section: 'operational',
      text,
      explanation,
      codeTemplate,
      correctKeywords,
      correctCode,
      dataFiles,
      createdAt: now,
      updatedAt: now,
    };
  });

  cacheData(categories, theoryQuestions, codeQuestions);

  return { categories, theoryQuestions, codeQuestions };
}

function cacheData(categories: Category[], theoryQuestions: TheoryQuestion[], codeQuestions: CodeQuestion[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CATEGORY_CACHE_KEY, JSON.stringify(categories));
  localStorage.setItem(THEORY_CACHE_KEY, JSON.stringify(theoryQuestions));
  localStorage.setItem(CODE_CACHE_KEY, JSON.stringify(codeQuestions));
}

function loadFromCache(): { categories: Category[]; theoryQuestions: TheoryQuestion[]; codeQuestions: CodeQuestion[] } | null {
  if (typeof window === 'undefined') return null;
  try {
    const categories = localStorage.getItem(CATEGORY_CACHE_KEY);
    const theory = localStorage.getItem(THEORY_CACHE_KEY);
    const code = localStorage.getItem(CODE_CACHE_KEY);
    if (!categories || !theory || !code) return null;
    return {
      categories: JSON.parse(categories) as Category[],
      theoryQuestions: JSON.parse(theory) as TheoryQuestion[],
      codeQuestions: JSON.parse(code) as CodeQuestion[],
    };
  } catch {
    return null;
  }
}

export function getQuestionsByCategory(questions: Question[], categoryId: string): Question[] {
  return questions.filter((q) => q.categoryId === categoryId);
}
