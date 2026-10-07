import { z } from "zod";

export const planItemSchema = z
  .object({
    id: z.string().uuid(),
    group: z.string().trim().min(1).max(80),
    name: z.string().trim().min(1).max(120),
    note: z.string().trim().max(300),
    estimated: z.number().int().min(0).max(1_000_000_000_000).nullable(),
    ready: z.boolean(),
  })
  .strict();
export const planFieldsSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => {
        const date = new Date(value);
        return (
          Number.isFinite(date.getTime()) &&
          date.toISOString().slice(0, 10) === value &&
          value >= "2000-01-01" &&
          value <= "2100-12-31"
        );
      })
      .nullable(),
    location: z.string().trim().max(120),
    items: z
      .array(planItemSchema)
      .max(200)
      .refine((items) => new Set(items.map((i) => i.id)).size === items.length),
  })
  .strict();
export const planActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("create"),
      kind: z.enum(["lamaran", "wedding"]),
      name: z.string().trim().min(1).max(80),
    })
    .strict(),
  z
    .object({
      action: z.literal("save"),
      id: z.string().uuid(),
      revision: z.number().int().nonnegative(),
      plan: planFieldsSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("delete"),
      id: z.string().uuid(),
      revision: z.number().int().nonnegative(),
      confirmation: z.string().min(1).max(80),
    })
    .strict(),
]);
export type PlanItem = z.infer<typeof planItemSchema>;
export type PlanFields = z.infer<typeof planFieldsSchema>;
export type EventPlan = PlanFields & {
  id: string;
  kind: "lamaran" | "wedding";
  revision: number;
  summary: ReturnType<typeof planSummary>;
};
export type PlanOverview = { plans: EventPlan[]; canDelete: boolean };
export function planSummary(items: PlanItem[]) {
  const ready = items.filter((i) => i.ready).length;
  return {
    total: items.length,
    ready,
    percent: items.length ? Math.round((ready / items.length) * 100) : 0,
    estimated: items.reduce((sum, i) => sum + (i.estimated ?? 0), 0),
    unpriced: items.filter((i) => i.estimated === null).length,
  };
}
