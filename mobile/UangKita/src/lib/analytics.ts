import {
  figures,
  inActivityMonth,
  normalize,
  realization,
  type FinanceData,
} from "./finance";
import { shiftMonth } from "./core";

export function analyticsData(data: FinanceData, month: string) {
  const grouped = new Map<string, { name: string; amount: number }>();
  for (const entry of data.entries) {
    if (
      !entry.active ||
      entry.spaceId ||
      !entry.date.startsWith(month) ||
      (entry.type !== "out" && entry.type !== "fixed")
    )
      continue;
    const key = normalize(entry.category);
    const row = grouped.get(key) ?? { name: entry.category.trim(), amount: 0 };
    row.amount += entry.amount;
    grouped.set(key, row);
  }
  const categories = [...grouped.values()].sort((a, b) => b.amount - a.amount);
  const total = categories.reduce((sum, row) => sum + row.amount, 0);
  const slices = categories.slice(0, 5);
  const rest = categories.slice(5).reduce((sum, row) => sum + row.amount, 0);
  if (rest) slices.push({ name: "Kategori lainnya", amount: rest });
  const periods = Array.from({ length: 6 }, (_, index) => {
    const key = shiftMonth(month, index - 5);
    const values = figures(data, key);
    return { month: key, income: values.income, expense: values.cashExpense };
  });
  const budgets = data.budgets
    .filter((budget) => budget.month === month)
    .map((budget) => ({
      ...budget,
      ...realization(data, budget),
    }));
  return { categories, slices, total, periods, budgets };
}

export function filterActivity<
  T extends Omit<FinanceData["entries"][number], "type"> & { type: string },
>(entries: T[], month: string, type: string, category: string, query: string) {
  return entries
    .filter(
      (entry) =>
        inActivityMonth(entry, month) &&
        (type === "all" ||
          (type === "credit"
            ? entry.paymentMethod === "credit"
            : entry.type === type)) &&
        (!category || normalize(entry.category) === normalize(category)) &&
        normalize(`${entry.note} ${entry.category}`).includes(normalize(query)),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}
