import { z } from 'zod';

export const CategorySchema = z.enum(['validation', 'workflow', 'accessibility', 'reliability']);
export const PrioritySchema = z.enum(['high', 'medium', 'low']);
export const StatusSchema = z.enum(['untested', 'passed', 'failed', 'blocked']);

export const TestDraftSchema = z.object({
  title: z.string().trim().min(5).max(120),
  category: CategorySchema,
  priority: PrioritySchema,
  steps: z.array(z.string().trim().min(3).max(300)).min(1).max(8),
  expectedResult: z.string().trim().min(5).max(500),
  assumption: z.string().max(300).optional()
}).strict();
export const PlanSchema = z.object({ tests: z.array(TestDraftSchema).min(1).max(10) }).strict();
export const IntakeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(20).max(2000),
  requirements: z.string().trim().min(10).max(3000),
  count: z.number().int().min(3).max(10).default(7)
}).strict();
export const ExplainSchema = z.object({
  title: z.string().min(3).max(120),
  expectedResult: z.string().min(5).max(500),
  observedResult: z.string().min(5).max(2000)
}).strict();

export type TestDraft = z.infer<typeof TestDraftSchema>;
export type TestStatus = z.infer<typeof StatusSchema>;
export type TestCase = TestDraft & {
  id: string;
  status: TestStatus;
  observedResult: string;
  evidence: string;
  executionSource: 'manual' | 'automated' | null;
  executedAt: string | null;
};
export type Project = {
  id: string;
  name: string;
  description: string;
  requirements: string;
  generatedBy: 'ai' | 'demo';
  createdAt: string;
  tests: TestCase[];
};
