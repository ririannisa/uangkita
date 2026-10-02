"use client";
import { useMemo } from "react";
import {
  billOverview,
  money,
  monthLabel,
  today,
  type Entry,
  type FinanceData,
  type RecurringBill,
} from "@/lib/finance";

export default function BillOverviewPanel({
  data,
  month,
  hidden,
  onEdit,
  onRecord,
}: {
  data: FinanceData;
  month: string;
  hidden: boolean;
  onEdit: (entry: Entry) => void;
  onRecord: (bill: RecurringBill) => void;
}) {
  const asOf = today();
  const bills = useMemo(
    () => billOverview(data, month, asOf),
    [data, month, asOf],
  );
  const show = (value: number) => (hidden ? "Rp ••••••••" : money(value));
  return (
    <section className="panel chart-panel bill-overview">
      <h2>Saldo setelah tagihan</h2>
      <p className="small muted">
        Perkiraan {monthLabel(month)} setelah sisa kredit jatuh tempo sampai
        akhir bulan dan langganan yang belum dicatat. Ini belum menjadi
        pengeluaran aktual.
      </p>
      <div className="budget-overview analytics-overview">
        <div>
          <span>Tagihan belum dibayar</span>
          <strong>{show(bills.unpaid + bills.recurring)}</strong>
        </div>
        <div>
          <span>Perkiraan saldo tersisa</span>
          <strong className={bills.afterBills < 0 ? "negative" : ""}>
            {show(bills.afterBills)}
          </strong>
        </div>
      </div>
      <h3>Pengingat jatuh tempo</h3>
      <p className="small muted">
        {bills.reminders.length
          ? `${bills.reminders.length} kredit terlambat atau jatuh tempo dalam 7 hari dari hari ini.`
          : "Tidak ada kredit yang terlambat atau jatuh tempo dalam 7 hari."}{" "}
        Pengingat tampil saat aplikasi dibuka.
      </p>
      <details>
        <summary>Lihat tagihan & sisa pembayaran</summary>
        {bills.credits.map(({ entry, remaining }) => (
          <div className="planning-row" key={entry.id}>
            <div>
              <strong>{entry.note || entry.category}</strong>
              <p className="small muted">
                Batas bayar {entry.dueDate?.split("-").reverse().join("/")} ·
                Sisa {show(remaining)}
                {entry.dueDate && entry.dueDate < asOf ? " · Terlambat" : ""}
              </p>
            </div>
            <button className="secondary" onClick={() => onEdit(entry)}>
              Catat pembayaran
            </button>
          </div>
        ))}
        {bills.pendingRecurring.map((b) => (
          <div className="planning-row" key={b.id}>
            <div>
              <strong>{b.name}</strong>
              <p className="small muted">
                Langganan bulan ini · {show(b.amount)} · Belum dicatat
              </p>
            </div>
            <button className="secondary" onClick={() => onRecord(b)}>
              Catat bulan ini
            </button>
          </div>
        ))}
        {!bills.credits.length && !bills.pendingRecurring.length && (
          <p className="small muted">
            Semua tagihan sudah tercatat atau lunas.
          </p>
        )}
      </details>
    </section>
  );
}
