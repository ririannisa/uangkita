import type { FinanceData } from "../src/lib/finance";

export function sampleData(month: string): FinanceData {
  return {
    plans: [{ month, income: 8500000 }],
    budgets: ["Makan & minum", "Transportasi", "Belanja"].map((name, i) => ({
      id: `00000000-0000-4000-8000-00000000000${i + 1}`,
      month,
      name,
      planned: [1500000, 600000, 1000000][i],
    })),
    entries: [
      ["out", 875000, "Makan & minum", "Belanja kebutuhan dapur", "01"],
      ["out", 425000, "Makan & minum", "Makan malam keluarga", "02"],
      ["out", 380000, "Makan & minum", "Kopi & makan siang", "03"],
      ["out", 185000, "Transportasi", "Isi bensin", "02"],
      ["out", 450000, "Belanja", "Sepatu kerja", "03"],
      ["fixed", 1500000, "Tempat tinggal", "Sewa kos bulanan", "01"],
      ["deposit", 1500000, "Tabungan", "Dana darurat", "01"],
      ["in", 1250000, "Freelance", "Proyek desain", "04"],
    ].map(([type, amount, category, note, day], i) => ({
      id: `00000000-0000-4000-8000-00000000001${i + 1}`,
      type: type as FinanceData["entries"][number]["type"],
      amount: Number(amount),
      category: String(category),
      note: String(note),
      date: `${month}-${day}`,
      active: true,
    })),
  };
}
