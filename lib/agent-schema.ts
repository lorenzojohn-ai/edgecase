import { z } from "zod";

export const Action = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("fill"), selector: z.string().min(1).max(200), value: z.string().max(300) }),
  z.object({ kind: z.literal("click"), selector: z.string().min(1).max(200) }),
]);
export const Check = z.object({
  title: z.string().min(1).max(100),
  actions: z.array(Action).min(1).max(8),
  assertion: z.object({
    selector: z.string().min(1).max(200),
    text: z.string().min(1).max(150),
    present: z.boolean(),
  }),
});
export const Checks = z.object({ tests: z.array(Check).min(1).max(5) });
export type Test = z.infer<typeof Check>;
