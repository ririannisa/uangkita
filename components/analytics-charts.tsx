"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Rectangle,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  creditHealth,
  money,
  realization,
  type FinanceData,
} from "@/lib/finance";

const compact = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
const palette = [
  "var(--primary)",
  "var(--green)",
  "#b47ae8",
  "var(--red)",
  "#d6a345",
  "var(--muted)",
];
const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 12,
  color: "var(--ink)",
};

export function FinancialBars({
  rows,
  series,
}: {
  rows: { label: string; first: number; second: number }[];
  series: [string, string];
}) {
  return (
    <div className="library-chart" data-testid="financial-bars">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={rows}
          margin={{ top: 12, right: 8, bottom: 8, left: 0 }}
        >
          <CartesianGrid
            stroke="var(--line)"
            strokeDasharray="3 5"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={compact}
            width={55}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => money(Number(value))}
            contentStyle={tooltipStyle}
            cursor={{ fill: "var(--lilac)" }}
          />
          <Bar
            dataKey="first"
            name={series[0]}
            fill="var(--green)"
            radius={[5, 5, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="second"
            name={series[1]}
            fill="var(--primary)"
            radius={[5, 5, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryDonut({
  categories,
}: {
  categories: { name: string; amount: number }[];
}) {
  const slices = categories.slice(0, 5);
  const rest = categories.slice(5).reduce((sum, row) => sum + row.amount, 0);
  if (rest) slices.push({ name: "Kategori lainnya", amount: rest });
  if (!slices.length) return null;
  return (
    <div className="library-chart" data-testid="category-donut">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            isAnimationActive={false}
            data={slices.map((row, index) => ({
              ...row,
              fill: palette[index],
            }))}
            dataKey="amount"
            nameKey="name"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            stroke="var(--surface)"
          />
          <Tooltip
            formatter={(value) => money(Number(value))}
            contentStyle={tooltipStyle}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CreditBurdenChart({
  health,
}: {
  health: ReturnType<typeof creditHealth>;
}) {
  const value = Math.min(100, health.percent ?? 0);
  return (
    <div
      className="library-gauge"
      role="img"
      aria-label={`Rasio beban kredit: ${health.percent === null ? "belum dapat dinilai" : `${health.percent.toFixed(1)}%`}. ${health.status}`}
    >
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            isAnimationActive={false}
            data={[
              {
                value,
                fill:
                  health.status === "Beban tinggi" || health.overdue > 0
                    ? "var(--red)"
                    : "var(--green)",
              },
              { value: 100 - value, fill: "var(--line)" },
            ]}
            dataKey="value"
            startAngle={180}
            endAngle={0}
            innerRadius={70}
            outerRadius={90}
            cy="75%"
            stroke="none"
          />
        </PieChart>
      </ResponsiveContainer>
      <strong className="library-gauge-value">
        {health.percent === null ? "—" : `${health.percent.toFixed(1)}%`}
      </strong>
      <p className="muted small">
        Rasio beban pembayaran · acuan 30%, bukan skor kredit
      </p>
    </div>
  );
}

export function BudgetRealizationChart({
  data,
  month,
}: {
  data: FinanceData;
  month: string;
}) {
  const rows = data.budgets
    .filter((budget) => budget.month === month)
    .map((budget) => ({
      ...budget,
      ...realization(data, budget),
    }));
  return (
    <section className="panel chart-panel">
      <h2>Realisasi anggaran</h2>
      <p className="muted small">
        Rencana dan pengeluaran pada skala yang sama. Merah berarti melewati
        anggaran.
      </p>
      {rows.length ? (
        <>
          <div className="chart-legend">
            <span>
              <i style={{ background: "var(--muted)" }} /> Rencana
            </span>
            <span>
              <i className="expense-dot" /> Realisasi
            </span>
          </div>
          <div className="library-chart" data-testid="budget-realization-chart">
            <ResponsiveContainer
              width="100%"
              height={Math.max(220, rows.length * 65)}
            >
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ left: 0, right: 12 }}
              >
                <CartesianGrid
                  stroke="var(--line)"
                  strokeDasharray="3 5"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tickFormatter={compact}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={95}
                  tick={{ fill: "var(--ink)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => money(Number(value))}
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "var(--lilac)" }}
                />
                <Bar
                  dataKey="planned"
                  name="Rencana"
                  fill="var(--muted)"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={14}
                />
                <Bar
                  dataKey="spent"
                  name="Realisasi"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={14}
                  shape={(props) => (
                    <Rectangle
                      x={props.x}
                      y={props.y}
                      width={props.width}
                      height={props.height}
                      radius={[0, 4, 4, 0]}
                      fill={
                        props.payload.percent > 100
                          ? "var(--red)"
                          : "var(--primary)"
                      }
                    />
                  )}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-table">
            <table>
              <caption>Rencana dan realisasi bulan {month}</caption>
              <thead>
                <tr>
                  <th>Kategori</th>
                  <th>Rencana</th>
                  <th>Realisasi</th>
                  <th>Persentase</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">{row.name}</th>
                    <td>{money(row.planned)}</td>
                    <td>{money(row.spent)}</td>
                    <td>{row.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="muted">Belum ada anggaran bulan ini.</p>
      )}
      <p className="muted small">
        Pengeluaran tanpa anggaran dan tabungan tidak termasuk.
      </p>
    </section>
  );
}
