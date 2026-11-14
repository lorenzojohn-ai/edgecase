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
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return Response.json(Proposal.parse(await proposePythonChange(input.data)));
      } catch (error) {
        const match = error instanceof Error
          ? /^AI provider returned HTTP (\d{3})$/.exec(error.message)
          : null;
        const status = Number(match?.[1]);
        console.warn("Python repair attempt failed", {
          attempt,
          providerStatus: match?.[1],
          errorType: error instanceof Error ? error.name : "Unknown",
        });
        if (status === 429) return Response.json({ error: "Gemini is rate-limiting repairs. Wait a minute and try again." }, { status: 429 });
        if ([400, 401, 403, 404].includes(status)) {
          return Response.json({ error: "Gemini rejected the repair request. Check the production model and API configuration." }, { status: 502 });
        }
      }
    }
    return Response.json({ error: "Gemini did not return a usable repair after two attempts. Try again shortly." }, { status: 503 });
  } catch {
    return Response.json({ error: "Gemini could not draft a Python repair. Try again." }, { status: 503 });
  }
}
