import { NextResponse } from 'next/server';
import { ExplainSchema } from '@/lib/schema';
import { explainWithAI, isAIConfigured } from '@/lib/ai';
import { ZodError } from 'zod';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get('content-length') || 0) > 6000) return NextResponse.json({ error: 'Request too large.' }, { status: 413 });
    const input = ExplainSchema.parse(await request.json());
    if (isAIConfigured()) {
      try {
        const explanation = await explainWithAI(input);
        return NextResponse.json({ mode: 'ai', explanation });
      } catch (err) {
        console.error('AI guidance unavailable:', err instanceof Error ? err.name : 'Unknown error');
      }
    }
    return NextResponse.json({ mode: 'demo', explanation: {
      likelyCauses: ['The application may not enforce the expected rule on submission.', 'The validation logic may not cover this input or workflow.'],
      nextSteps: ['Repeat the test to confirm the observed behavior.', 'Inspect the form validation and submission handler.', 'Add a regression test after making a fix.'],
      caveat: 'Generic guidance. Repeat the test and inspect the application to confirm the cause.'
    }});
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: 'Record a meaningful failed observation first.' }, { status: 400 });
    console.error('Failure explanation:', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json({ error: 'Could not generate guidance. Please retry.' }, { status: 503 });
  }
}
