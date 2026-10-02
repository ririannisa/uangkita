"use client";
import { useState } from "react";
import { categoryOptions } from "@/lib/categories";
import {
  money,
  monthLabel,
  recurringDate,
  type FinanceData,
  type RecurringBill,
} from "@/lib/finance";

export default function RecurringBillsPanel({
  data,
  month,
  busy,
  onSave,
  onRecord,
}: {
  data: FinanceData;
  month: string;
  busy: boolean;
  onSave: (bill: RecurringBill) => Promise<boolean>;
  onRecord: (bill: RecurringBill) => void;
}) {
  const [editing, setEditing] = useState<RecurringBill | "new" | null>(null);
  const bill = editing && editing !== "new" ? editing : null;
  return (
    <section className="panel chart-panel recurring-bills">
      <h2>Pengeluaran tetap berulang</h2>
      <p className="small muted">
        Langganan dan tagihan bulanan tetap masuk pengeluaran tetap dan anggaran
        kategorinya. Klik Catat bulan ini, lalu pilih pembayaran langsung atau
        kredit.
      </p>
      {(data.recurringBills ?? []).map((b) => {
        const recorded = data.entries.some(
          (e) => e.recurringId === b.id && e.date.startsWith(month),
        );
        return (
          <div className="planning-row" key={b.id}>
            <div>
              <strong>{b.name}</strong>
              <p className="small muted">
                {b.category} · {money(b.amount)} · Tanggal {b.day} setiap bulan
                {!b.active ? " · Nonaktif" : ""}
              </p>
            </div>
            <div className="planning-actions">
              {b.active && b.startMonth <= month && (
                <button
                  className="secondary"
                  disabled={busy || recorded}
                  onClick={() => onRecord(b)}
                >
                  {recorded ? "Sudah tercatat" : "Catat bulan ini"}
                </button>
              )}
              <button
                className="text-button"
                disabled={busy}
                onClick={() => setEditing(b)}
              >
                Edit {b.name}
              </button>
            </div>
          </div>
        );
      })}
      <button className="secondary" onClick={() => setEditing("new")}>
        Tambah langganan / tagihan
      </button>
      {editing && (
        <form
          className="planning-form"
          key={bill?.id ?? "new"}
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (
              await onSave({
                id: bill?.id ?? crypto.randomUUID(),
                name: String(f.get("name")),
                amount: Number(f.get("amount")),
                category: String(f.get("category")),
                day: Number(f.get("day")),
                startMonth: String(f.get("startMonth")),
                active: f.get("active") === "on",
              })
            )
              setEditing(null);
          }}
        >
          <datalist id="recurring-categories">
            {categoryOptions(data).map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <fieldset disabled={busy}>
            <label>
              Nama langganan / tagihan
              <input
                name="name"
                required
                maxLength={80}
                defaultValue={bill?.name}
                placeholder="Claude"
              />
            </label>
            <label>
              Nominal bulanan (Rp)
              <input
                name="amount"
                type="number"
                required
                min="1"
                max="1000000000000"
                step="1"
                defaultValue={bill?.amount}
              />
            </label>
            <label>
              Kategori tagihan
              <input
                name="category"
                required
                maxLength={80}
                list="recurring-categories"
                defaultValue={bill?.category ?? "Langganan"}
              />
            </label>
            <label>
              Tanggal tagihan tiap bulan
              <input
                name="day"
                type="number"
                required
                min="1"
                max="31"
                step="1"
                defaultValue={bill?.day ?? 1}
              />
            </label>
            <label>
              Mulai bulan
              <input
                name="startMonth"
                type="month"
                required
                min="2000-01"
                max="2100-12"
                defaultValue={bill?.startMonth ?? month}
              />
            </label>
            <label className="checkbox-label">
              <input
                name="active"
                type="checkbox"
                defaultChecked={bill?.active ?? true}
              />
              Aktif
            </label>
            <p className="small muted">
              Untuk {monthLabel(month)}, tanggal di akhir bulan disesuaikan
              dengan jumlah hari bulan tersebut
              {bill ? ` (${recurringDate(bill, month)})` : ""}. Tidak ada
              pembayaran otomatis.
            </p>
            <button className="primary">Simpan tagihan berulang</button>
            <button
              type="button"
              className="text-button"
              onClick={() => setEditing(null)}
            >
              Batal
            </button>
          </fieldset>
        </form>
      )}
    </section>
  );
}
