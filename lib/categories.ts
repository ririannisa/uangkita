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
export function categoryOptions(data: {
  categories?: string[];
  entries: { category: string; spaceId?: string }[];
  budgets: { name: string }[];
}) {
  const names = [
    ...defaultCategories,
    ...(data.categories ?? []),
    ...data.budgets.map((b) => b.name),
    ...data.entries.filter((e) => !e.spaceId).map((e) => e.category),
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
