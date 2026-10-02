"use client";
import { money, type CreditPayment } from "@/lib/finance";

export default function CreditPaymentFields({
  amount,
  payments,
  onPayments,
  paid,
  onPaid,
  paidDate,
}: {
  amount: number;
  payments: CreditPayment[];
  onPayments: (payments: CreditPayment[]) => void;
  paid: boolean;
  onPaid: (paid: boolean) => void;
  paidDate?: string | null;
}) {
  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  const add = (value = 0) =>
    onPayments([
      ...payments,
      { id: crypto.randomUUID(), date: "", amount: value },
    ]);
  return (
    <>
      <label>
        Status kredit
        <select
          className="app-select"
          aria-label="Status kredit"
          value={
            payments.length
              ? total >= amount && amount > 0
                ? "paid"
                : "partial"
              : paid
                ? "paid"
                : "unpaid"
          }
          onChange={(e) => {
            if (e.target.value === "unpaid") {
              onPaid(false);
              onPayments([]);
            } else if (e.target.value === "partial") {
              if (!payments.length) add();
              onPaid(false);
            } else if (payments.length) {
              if (total < amount) add(amount - total);
            } else onPaid(true);
          }}
        >
          <option value="unpaid">Belum lunas</option>
          <option value="partial">Dibayar sebagian</option>
          <option value="paid">Lunas</option>
        </select>
      </label>
      {!payments.length && paid && (
        <label>
          Tanggal pembayaran
          <input
            name="paidDate"
            type="date"
            required
            min="2000-01-01"
            max="2100-12-31"
            defaultValue={paidDate ?? ""}
          />
        </label>
      )}
      {payments.length > 0 && (
        <div className="credit-payments">
          <p className="small muted">
            Terbayar {money(total)} · Sisa {money(Math.max(0, amount - total))}
          </p>
          {payments.map((p, index) => (
            <div className="payment-row" key={p.id}>
              <label>
                Tanggal pembayaran {index + 1}
                <input
                  aria-label={`Tanggal pembayaran ${index + 1}`}
                  type="date"
                  required
                  min="2000-01-01"
                  max="2100-12-31"
                  value={p.date}
                  onChange={(e) =>
                    onPayments(
                      payments.map((x) =>
                        x.id === p.id ? { ...x, date: e.target.value } : x,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Nominal pembayaran {index + 1}
                <input
                  aria-label={`Nominal pembayaran ${index + 1}`}
                  type="number"
                  required
                  min="1"
                  max={amount || 1000000000000}
                  step="1"
                  value={p.amount || ""}
                  onChange={(e) =>
                    onPayments(
                      payments.map((x) =>
                        x.id === p.id
                          ? { ...x, amount: Number(e.target.value) }
                          : x,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                className="text-button"
                aria-label={`Hapus pembayaran ${index + 1}`}
                onClick={() =>
                  onPayments(payments.filter((x) => x.id !== p.id))
                }
              >
                Hapus
              </button>
            </div>
          ))}
          <button type="button" className="secondary" onClick={() => add()}>
            Tambah pembayaran
          </button>
        </div>
      )}
    </>
  );
}
