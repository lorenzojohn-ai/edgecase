import { z } from "zod";
import { planPythonChecks } from "@/lib/ai";

const Input = z.object({ name: z.string().regex(/^[A-Za-z_]\w*$/).max(100), behavior: z.string().trim().min(15).max(3000) });
const Plan = z.object({ cases: z.array(z.object({ args: z.array(z.json()).max(10), expected: z.json() })).min(2).max(8) });

export async function POST(request: Request) {
  try {
    const input = Input.safeParse(await request.json());
    if (!input.success) return Response.json({ error: "Give the function name and describe its intended behavior in at least 15 characters." }, { status: 400 });
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return Response.json(Plan.parse(await planPythonChecks(input.data)));
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        console.warn("Python planning failed", error instanceof Error ? error.name : "Unknown", /^AI provider returned HTTP \d{3}$/.test(message) ? message : "");
        if (/HTTP (400|401|403|404|429)$/.test(message)) break;
      }
    }
    return Response.json({ error: "Gemini planning is temporarily unavailable. Try again." }, { status: 503 });
  } catch {
    return Response.json({ error: "Gemini could not generate Python cases. Try again." }, { status: 503 });
  }
}
