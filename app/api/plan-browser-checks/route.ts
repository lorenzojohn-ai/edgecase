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
    const plan = Checks.parse(await planBrowserChecks(input.data));
    return Response.json(plan);
  } catch {
    return Response.json({ error: "AI planning was unavailable. You can still run the built-in demo." }, { status: 503 });
  }
}
