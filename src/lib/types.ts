export type QuestionType = 'trueFalse' | 'singleChoice' | 'multipleChoice' | 'codeCompletion';
export type QuestionSection = 'theoretical' | 'operational';

export type QuestionBase = {
  id: string;
  categoryId: string;
  type: QuestionType;
  section: QuestionSection;
  text: string;
  explanation: string;
  createdAt: string;
  updatedAt: string;
};

export type TheoryQuestion = QuestionBase & {
  type: 'trueFalse' | 'singleChoice' | 'multipleChoice';
  section: 'theoretical';
  options: string[];
  correctAnswer: string | string[] | null;
};

export type CodeQuestion = QuestionBase & {
  type: 'codeCompletion';
  section: 'operational';
  codeTemplate: string;
  correctKeywords: string[];
  correctCode: string;
  dataFiles?: string[] | null;
};

export type Question = TheoryQuestion | CodeQuestion;

export type Category = {
  id: string;
  name: string;
  description: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
};

export type UserProfile = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type ExamResult = {
  id: string;
  userId: string;
  examDate: string;
  totalQuestions: number;
  totalScore: number;
  maxScore: number;
  duration: number;
  questionResults: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type MistakeType = 'wrongAnswer' | 'unanswered';
export type MistakeStatus = 'reviewing' | 'mastered' | 'continued' | 'reinforced';

export type MistakeRecord = {
  id: string;
  userId: string;
  questionId: string;
  userAnswer: unknown;
  attemptedAt: string;
  attemptCount: number;
  reviewed: boolean;
  mistakeType: MistakeType;
  status: MistakeStatus;
  createdAt: string;
  updatedAt: string;
};

export type Statistics = {
  totalQuestionsAttempted: number;
  totalQuestionsCorrect: number;
  mockExamsTaken: number;
  lastUpdateTime?: string | null;
};
