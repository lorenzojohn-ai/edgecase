import { NextResponse } from 'next/server';
import { IntakeSchema } from '@/lib/schema';
import { demoTests } from '@/lib/demo';
import { generateWithAI, isAIConfigured } from '@/lib/ai';
import { ZodError } from 'zod';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get('content-length') || 0) > 10000) return NextResponse.json({ error: 'Request too large.' }, { status: 413 });
    const input = IntakeSchema.parse(await request.json());
    if (!isAIConfigured()) return NextResponse.json({ mode: 'demo', tests: demoTests(input.count), notice: 'No API key configured. These are fixed sample templates, not AI-generated results.' });
    try {
      const tests = await generateWithAI(input);
      return NextResponse.json({ mode: 'ai', tests });
    } catch (err) {
      console.error('AI generation failed:', err instanceof Error ? err.message : 'Unknown error');
      return NextResponse.json({ mode: 'demo', tests: demoTests(input.count), notice: 'The AI service was unavailable or returned invalid output. Showing labeled sample templates instead.' });
    }
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: 'Please enter a valid application name, description, and requirements.' }, { status: 400 });
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
}
