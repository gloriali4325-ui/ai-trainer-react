import type { CodeQuestion, Question, TheoryQuestion } from './types';

export const nowIso = () => new Date().toISOString();

export function slugify(input: string): string {
  const lower = input.toLowerCase();
  const replaced = lower.replace(/[^a-z0-9]+/g, '-');
  const trimmed = replaced.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  if (!trimmed) {
    return `cat-${fnv1a32Hex(input)}`;
  }
  return trimmed;
}

export function fnv1a32Hex(input: string): string {
  let hash = 0x811c9dc5;
  const fnvPrime = 0x01000193;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = (hash * fnvPrime) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function isTheory(question: Question): question is TheoryQuestion {
  return question.section === 'theoretical';
}

export function isCode(question: Question): question is CodeQuestion {
  return question.section === 'operational';
}

export function checkTheoryAnswer(question: TheoryQuestion, userAnswer: unknown): boolean {
  if (question.type === 'multipleChoice') {
    if (!Array.isArray(userAnswer) || !Array.isArray(question.correctAnswer)) return false;
    const userSet = new Set(userAnswer as string[]);
    const correctSet = new Set(question.correctAnswer as string[]);
    if (userSet.size !== correctSet.size) return false;
    for (const item of correctSet) {
      if (!userSet.has(item)) return false;
    }
    return true;
  }
  return userAnswer === question.correctAnswer;
}

export function checkCodeAnswer(question: CodeQuestion, userAnswer: unknown): boolean {
  if (typeof userAnswer !== 'string') return false;
  const normalized = userAnswer.toLowerCase().replace(/\s+/g, '');
  return question.correctKeywords.every((keyword) =>
    normalized.includes(keyword.toLowerCase().replace(/\s+/g, '')),
  );
}

export function checkAnswer(question: Question, userAnswer: unknown): boolean {
  if (isTheory(question)) return checkTheoryAnswer(question, userAnswer);
  return checkCodeAnswer(question, userAnswer);
}
