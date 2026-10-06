import { z } from "zod";
export const defaultCategories = [
  "Makan & minum",
  "Transportasi",
  "Belanja",
  "Tempat tinggal",
  "Kesehatan",
  "Hiburan",
  "Pendidikan",
  "Lainnya",
];
export const categoryNameSchema = z
  .string()
  .trim()
  .min(1, "Isi nama kategori.")
  .max(80);
export const categoryActionSchema = z.object({
  action: z.literal("category"),
  name: categoryNameSchema,
});
export function existingCategory(name: string, names: string[]) {
  return names.find((existing) =>
    existing.trim().toLocaleLowerCase("id-ID") === name.trim().toLocaleLowerCase("id-ID"),
  ) ?? name.trim();
}
export function categoryOptions(data: {
  categories?: string[];
  entries: { category: string; spaceId?: string }[];
  budgets: { name: string }[];
  recurringBills?: { category: string }[];
}, includeTransfers = false) {
  const names = [
    ...defaultCategories,
    ...(data.categories ?? []),
    ...data.budgets.map((b) => b.name),
    ...(data.recurringBills ?? []).map((b) => b.category),
    ...data.entries.filter((e) => includeTransfers || !e.spaceId).map((e) => e.category),
  ];
  return [
    ...new Map(
      names.map((name) => [
        name.trim().toLocaleLowerCase("id-ID"),
        name.trim(),
      ]),
    ).values(),
  ].sort((a, b) => a.localeCompare(b, "id-ID"));
}
