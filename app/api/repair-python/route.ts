import { z } from "zod";
import { proposePythonChange } from "@/lib/ai";

const Input = z.object({
  code: z.string().min(1).max(20000),
  name: z.string().max(100),
  behavior: z.string().max(3000),
  evidence: z.json(),
  feedback: z.string().max(3000),
});
const Proposal = z.object({ code: z.string().min(1).max(20000), summary: z.string().min(1).max(1000) });

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 70000) return Response.json({ error: "Repair request is too large." }, { status: 413 });
    const input = Input.safeParse(JSON.parse(raw));
    if (!input.success) return Response.json({ error: "Invalid repair request." }, { status: 400 });
    return Response.json(Proposal.parse(await proposePythonChange(input.data)));
  } catch {
    return Response.json({ error: "Gemini could not draft a Python repair. Try again." }, { status: 503 });
  }
}
