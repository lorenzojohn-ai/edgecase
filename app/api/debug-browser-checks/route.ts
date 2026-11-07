import { z } from "zod";
import { Check } from "@/lib/agent-schema";
import { proposeBrowserRepair } from "@/lib/ai";

const Input = z.object({
  code: z.string().min(1).max(60000),
  requirements: z.string().max(2000),
  evidence: z.array(z.object({
    test: Check,
    status: z.string().max(30),
    observations: z.array(z.string().max(1200)).max(3),
  })).min(1).max(5),
  previousAttempt: z.string().max(2500).optional(),
});
const Repair = z.object({
  cause: z.string().min(1).max(800),
  search: z.string().min(1).max(4000),
  replacement: z.string().max(5000),
});

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 100000) return Response.json({ error: "Repair request is too large." }, { status: 413 });
    const input = Input.safeParse(JSON.parse(raw));
    if (!input.success) return Response.json({ error: "Invalid repair evidence." }, { status: 400 });
    return Response.json(Repair.parse(await proposeBrowserRepair(input.data)));
  } catch {
    return Response.json({ error: "Gemini could not propose a patch. Try again shortly." }, { status: 503 });
  }
}
