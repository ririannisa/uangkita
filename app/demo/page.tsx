import Dashboard from "@/components/dashboard";
import { today, withFinanceDetails, type FinanceData } from "@/lib/finance";
export const dynamic = "force-dynamic";
export default function DemoPage() {
  const month = today().slice(0, 7);
  const initialData: FinanceData = {
    plans: [{ month, income: 8500000 }],
    budgets: [
      {
        id: "00000000-0000-4000-8000-000000000001",
        month,
        name: "Makan & minum",
        planned: 1500000,
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        month,
        name: "Transportasi",
        planned: 600000,
      },
      {
        id: "00000000-0000-4000-8000-000000000003",
        month,
        name: "Belanja",
        planned: 1000000,
      },
    ],
    entries: [
      {
        id: "00000000-0000-4000-8000-000000000011",
        type: "out",
        amount: 875000,
        category: "Makan & minum",
        note: "Belanja kebutuhan dapur",
        date: `${month}-01`,
        active: true,
      },
      {
        id: "00000000-0000-4000-8000-000000000012",
        type: "out",
        amount: 425000,
        category: "Makan & minum",
        note: "Makan malam keluarga",
        date: `${month}-02`,
        active: true,
      },
      {
        id: "00000000-0000-4000-8000-000000000013",
        type: "out",
        amount: 380000,
        category: "Makan & minum",
        note: "Kopi & makan siang",
        date: `${month}-03`,
        active: true,
      },
      {
        id: "00000000-0000-4000-8000-000000000014",
        type: "out",
        amount: 185000,
        category: "Transportasi",
        note: "Isi bensin",
        date: `${month}-02`,
        active: true,
      },
      {
        id: "00000000-0000-4000-8000-000000000015",
        type: "out",
        amount: 450000,
        category: "Belanja",
        note: "Sepatu kerja",
        date: `${month}-03`,
        active: true,
      },
      {
        id: "00000000-0000-4000-8000-000000000016",
        type: "fixed",
        amount: 1500000,
        category: "Tempat tinggal",
        note: "Sewa kos bulanan",
        date: `${month}-01`,
        active: true,
      },
      {
        id: "00000000-0000-4000-8000-000000000017",
        type: "deposit",
        amount: 1500000,
        category: "Tabungan",
        note: "Dana darurat",
        date: `${month}-01`,
        active: true,
      },
      {
        id: "00000000-0000-4000-8000-000000000018",
        type: "in",
        amount: 1250000,
        category: "Freelance",
        note: "Proyek desain",
        date: `${month}-04`,
        active: true,
      },
    ],
  };
  return (
    <Dashboard
      user={{ name: "Annisa", email: "annisa@example.com" }}
      initialData={withFinanceDetails(initialData)}
      demo
    />
  );
}
