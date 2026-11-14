import { z } from "zod";
import { Checks } from "@/lib/agent-schema";
import { planBrowserChecks } from "@/lib/ai";

const Intake = z.object({
  requirements: z.string().trim().min(5).max(2000),
  controls: z.array(z.string().max(300)).min(1).max(50),
});

export async function POST(request: Request) {
  try {
    const input = Intake.safeParse(await request.json());
    if (!input.success) return Response.json({ error: "Provide a requirement and at least one form control." }, { status: 400 });
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const plan = Checks.parse(await planBrowserChecks(input.data));
        return Response.json(plan);
      } catch (error) {
        const reason = error instanceof z.ZodError
          ? error.issues.map(issue => issue.path.join(".") + ": " + issue.code).join(", ")
          : error instanceof Error && /^AI provider returned HTTP \d{3}$/.test(error.message)
            ? error.message
            : error instanceof Error ? error.name : "Unknown error";
        console.warn("Gemini planning attempt", attempt, reason);
        if (/HTTP (400|401|403|404|429)$/.test(reason)) break;
      }
    }
    return Response.json({ error: "Gemini could not produce a valid plan. Check the Codespaces terminal for the planning error." }, { status: 503 });
  } catch {
    return Response.json({ error: "AI planning was unavailable. You can still run the built-in demo." }, { status: 503 });
  }
}
