"use client";
import { useMemo, useState } from "react";
import {
  money,
  monthLabel,
  savingsProgress,
  type FinanceData,
  type SavingsGoal,
} from "@/lib/finance";

export default function SavingsGoalPanel({
  data,
  month,
  busy,
  onSave,
}: {
  data: FinanceData;
  month: string;
  busy: boolean;
  onSave: (goal: SavingsGoal | null) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const progress = useMemo(() => savingsProgress(data, month), [data, month]);
  const goal = data.savingsGoal;
  return (
    <section className="panel chart-panel savings-goal">
      <h2>Target tabungan{goal ? `: ${goal.name}` : ""}</h2>
      <p className="small muted">
        Target ini memakai total saldo tabungan. Penarikan ikut mengurangi
        progres.
      </p>
      {goal && progress && (
        <>
          <p>
            {monthLabel(goal.startMonth)} – {monthLabel(goal.targetMonth)} ·
            Target {money(goal.amount)}
          </p>
          <div className="budget-overview analytics-overview">
            <div>
              <span>Rencana bulanan</span>
              <strong>{money(progress.monthlyPlan)}</strong>
            </div>
            <div>
              <span>Realisasi {monthLabel(month)}</span>
              <strong>{money(progress.monthlyActual)}</strong>
              <span>
                {progress.monthlyGap < 0
                  ? `Kurang ${money(-progress.monthlyGap)}`
                  : `Lebih ${money(progress.monthlyGap)}`}{" "}
                dari rencana bulan ini
              </span>
            </div>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Progres target tabungan"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="small">
            Saldo {money(progress.actual)} · Rencana kumulatif{" "}
            {money(progress.planned)} ·{" "}
            {progress.gap < 0
              ? `Tertinggal ${money(-progress.gap)}`
              : `Di atas rencana ${money(progress.gap)}`}
          </p>
          <p className="small muted">
            {progress.remaining === 0
              ? "Target sudah tercapai."
              : progress.nextMonthly !== null
                ? `Agar mencapai target, mulai bulan berikutnya perlu menabung ${money(progress.nextMonthly)} per bulan. Perkiraan ini berdasarkan sisa target, tanpa asumsi bunga.`
                : `Periode target berakhir; masih kurang ${money(progress.remaining)}. Perbarui tanggal target bila perlu.`}
          </p>
        </>
      )}
      <button
        type="button"
        className="secondary"
        onClick={() => setEditing(!editing)}
      >
        {goal ? "Ubah target tabungan" : "Buat target tabungan"}
      </button>
      {editing && (
        <form
          key={JSON.stringify(goal)}
          className="planning-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (
              await onSave({
                name: String(f.get("name")),
                amount: Number(f.get("amount")),
                startMonth: String(f.get("startMonth")),
                targetMonth: String(f.get("targetMonth")),
              })
            )
              setEditing(false);
          }}
        >
          <fieldset disabled={busy}>
            <label>
              Nama target
              <input
                name="name"
                required
                maxLength={80}
                defaultValue={goal?.name}
                placeholder="Dana darurat"
              />
            </label>
            <label>
              Nominal target (Rp)
              <input
                name="amount"
                type="number"
                required
                min="1"
                max="1000000000000"
                step="1"
                defaultValue={goal?.amount}
              />
            </label>
            <label>
              Bulan mulai
              <input
                name="startMonth"
                type="month"
                required
                min="2000-01"
                max="2100-12"
                defaultValue={goal?.startMonth ?? month}
              />
            </label>
            <label>
              Bulan target
              <input
                name="targetMonth"
                type="month"
                required
                min="2000-01"
                max="2100-12"
                defaultValue={goal?.targetMonth ?? month}
              />
            </label>
            <button className="primary" type="submit">
              Simpan target
            </button>
            {goal && (
              <button
                className="danger-button"
                type="button"
                onClick={async () => {
                  if (
                    confirm(
                      "Hapus target ini? Riwayat tabungan tetap tersimpan.",
                    ) &&
                    (await onSave(null))
                  )
                    setEditing(false);
                }}
              >
                Hapus target
              </button>
            )}
          </fieldset>
        </form>
      )}
    </section>
  );
}
