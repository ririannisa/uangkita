import { z } from "zod";
import { categoryActionSchema } from "./categories";
import { entrySchema, budgetSchema, type Budget, normalize } from "./finance";

export const sharedEntrySchema = entrySchema.extend({
  type: z.enum(["contribution", "out"]),
});
export type SharedEntry = z.infer<typeof sharedEntrySchema> & {
  authorId: string;
  authorName: string;
};
export type SharedFinance = {
  entries: SharedEntry[];
  budgets: Budget[];
  categories?: string[];
};
export const sharedMutationSchema = z.discriminatedUnion("action", [
  categoryActionSchema,
  z.object({ action: z.literal("entry"), entry: sharedEntrySchema }),
  z.object({ action: z.literal("budget"), budget: budgetSchema }),
  z.object({
    action: z.literal("delete"),
    kind: z.enum(["entry", "budget"]),
    id: z.uuid(),
  }),
]);
export function sharedFigures(data: SharedFinance, month: string) {
  const throughMonth = data.entries.filter(
    (e) => e.active && e.date.slice(0, 7) <= month,
  );
  const monthly = throughMonth.filter((e) => e.date.startsWith(month));
  return {
    balance: throughMonth.reduce(
      (s, e) => s + (e.type === "contribution" ? e.amount : -e.amount),
      0,
    ),
    contributions: monthly
      .filter((e) => e.type === "contribution")
      .reduce((s, e) => s + e.amount, 0),
    expense: monthly
      .filter((e) => e.type === "out")
      .reduce((s, e) => s + e.amount, 0),
  };
}
export function sharedRealization(data: SharedFinance, budget: Budget) {
  const entries = data.entries
    .filter(
      (e) =>
        e.active &&
        e.type === "out" &&
        e.date.startsWith(budget.month) &&
        normalize(e.category) === normalize(budget.name),
    )
    .sort((a, b) => b.amount - a.amount);
  return { entries, spent: entries.reduce((s, e) => s + e.amount, 0) };
}
