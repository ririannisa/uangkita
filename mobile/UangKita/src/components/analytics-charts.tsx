import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { BarChart, PieChart } from "react-native-gifted-charts";
import { router } from "expo-router";
import {
  ChartColumnIncreasing,
  ChartPie,
  CreditCard,
  Target,
} from "lucide-react-native";
import { Card, Metric, Txt, useColors } from "./finance-ui";
import { useFinance } from "@/lib/store";
import { money, monthLabel, type creditHealth } from "@/lib/finance";
import type { analyticsData } from "@/lib/analytics";

type Report = ReturnType<typeof analyticsData>;
const compact = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
function Legend({ color, label }: { color: string; label: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
      <View
        style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: color }}
      />
      <Text style={{ fontSize: 12, color: c.muted }}>{label}</Text>
    </View>
  );
}

export function CashFlowChart({ periods }: { periods: Report["periods"] }) {
  const c = useColors();
  const { hidden } = useFinance();
  const [selected, setSelected] = useState(periods.length - 1);
  const row = periods[selected];
  const [width, setWidth] = useState(310);
  const maximum = Math.max(
    1,
    ...periods.flatMap((period) => [period.income, period.expense]),
  );
  return (
    <Card
      title="Arus kas 6 bulan"
      icon={ChartColumnIncreasing}
      testID="cashflow-chart"
    >
      <Txt muted>
        Pemasukan dan pembayaran aktual, termasuk pelunasan kredit. Semua bulan
        memakai skala yang sama.
      </Txt>
      <View style={{ flexDirection: "row", gap: 18, flexWrap: "wrap" }}>
        <Legend color={c.green} label="Pemasukan" />
        <Legend color={c.primary} label="Pengeluaran dibayar" />
      </View>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <BarChart
          data={periods.flatMap((period, index) => [
            {
              value: period.income,
              frontColor: c.green,
              gradientColor: c.mint,
              spacing: 4,
              onPress: () => setSelected(index),
            },
            {
              value: period.expense,
              frontColor: c.primary,
              gradientColor: c.lilac,
              spacing: Math.max(8, (width - 64) / 6 - 28),
              onPress: () => setSelected(index),
            },
          ])}
          width={Math.max(180, width - 48)}
          height={170}
          maxValue={maximum}
          noOfSections={4}
          barWidth={12}
          barBorderRadius={4}
          initialSpacing={8}
          endSpacing={0}
          disableScroll
          isAnimated
          animationDuration={450}
          showGradient
          yAxisLabelWidth={40}
          yAxisTextStyle={{ color: c.muted, fontSize: 10 }}
          formatYLabel={(label) => (hidden ? "" : compact(Number(label)))}
          rulesColor={c.line}
          xAxisColor={c.line}
          yAxisThickness={0}
          hideAxesAndRules={false}
          xAxisLabelsHeight={0}
        />
      </View>
      <View style={{ flexDirection: "row", paddingLeft: 40 }}>
        {periods.map((period, index) => (
          <Pressable
            key={period.month}
            accessibilityRole="button"
            accessibilityLabel={`Arus kas ${monthLabel(period.month)}`}
            accessibilityState={{ selected: selected === index }}
            onPress={() => setSelected(index)}
            style={{
              flex: 1,
              minHeight: 44,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                color: selected === index ? c.primary : c.muted,
                fontWeight: selected === index ? "700" : "400",
              }}
            >
              {monthLabel(period.month).split(" ")[0].slice(0, 3)}
            </Text>
          </Pressable>
        ))}
      </View>
      <View
        style={{
          padding: 14,
          gap: 8,
          backgroundColor: c.lilac,
          borderRadius: 14,
        }}
      >
        <Txt bold>{monthLabel(row.month)}</Txt>
        <Metric label="Pemasukan" value={row.income} />
        <Metric label="Dibayar" value={row.expense} />
      </View>
      <Txt muted>
        Ketuk nama bulan untuk melihat angkanya. Setoran tabungan dan transfer
        ruang tidak termasuk pengeluaran pada grafik ini.
      </Txt>
    </Card>
  );
}
export function CategoryChart({
  slices,
  total,
}: Pick<Report, "slices" | "total">) {
  const c = useColors();
  const { hidden } = useFinance();
  const [selected, setSelected] = useState<number | null>(null);
  const colors = [c.primary, c.green, "#b47ae8", c.red, "#d6a345", c.muted];
  const row = selected === null ? null : slices[selected];
  return (
    <Card
      title="Pengeluaran per kategori"
      icon={ChartPie}
      testID="category-chart"
    >
      <Txt muted>
        Komposisi pengeluaran yang dicatat bulan ini, termasuk pembelian kredit.
      </Txt>
      {!total ? (
        <Txt muted>
          Belum ada pengeluaran bulan ini. Grafik akan terisi dari transaksi
          aktif.
        </Txt>
      ) : (
        <>
          <View style={{ alignItems: "center" }}>
            <PieChart
              data={slices.map((slice, index) => ({
                value: slice.amount,
                color: colors[index],
                focused: selected === index,
                onPress: () => setSelected(selected === index ? null : index),
              }))}
              donut
              radius={88}
              innerRadius={64}
              innerCircleColor={c.surface}
              strokeColor={c.surface}
              strokeWidth={3}
            />
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                justifyContent: "center",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Text style={{ color: c.muted, fontSize: 11 }}>
                {row ? "Kategori dipilih" : "Total pengeluaran"}
              </Text>
              <Text style={{ color: c.ink, fontSize: 20, fontWeight: "700" }}>
                {hidden
                  ? "\u2022\u2022\u2022\u2022\u2022\u2022"
                  : `Rp ${compact(row?.amount ?? total)}`}
              </Text>
            </View>
          </View>
          {slices.map((slice, index) => (
            <Pressable
              key={slice.name}
              accessibilityRole="button"
              accessibilityLabel={`Kategori ${slice.name}`}
              accessibilityState={{ selected: selected === index }}
              onPress={() => setSelected(selected === index ? null : index)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                padding: 12,
                minHeight: 56,
                backgroundColor: selected === index ? c.lilac : "transparent",
                borderRadius: 12,
              }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  backgroundColor: colors[index],
                }}
              />
              <View style={{ flex: 1, gap: 3 }}>
                <Txt>{slice.name}</Txt>
                <Text style={{ fontSize: 12, color: c.muted }}>
                  {hidden ? "Nominal disembunyikan" : money(slice.amount)}
                </Text>
              </View>
              <Txt bold>{Math.round((slice.amount / total) * 100)}%</Txt>
            </Pressable>
          ))}
          <Txt muted>
            Terbesar: {slices[0].name}. Ketuk kategori untuk menyorot porsinya;
            kategori kecil digabung sebagai kategori lainnya.
          </Txt>
        </>
      )}
    </Card>
  );
}

export function CreditGauge({
  health,
}: {
  health: ReturnType<typeof creditHealth>;
}) {
  const c = useColors();
  const { hidden } = useFinance();
  const percent = health.percent;
  const color =
    percent === null
      ? c.muted
      : health.status === "Beban tinggi" || health.overdue > 0
        ? c.red
        : c.green;
  return (
    <Card title="Kesehatan kredit" icon={CreditCard} testID="credit-chart">
      <Txt muted>
        Beban pembayaran dibandingkan pemasukan bulan ini. Acuan beban
        pembayaran 30%, bukan skor kredit.
      </Txt>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Rasio beban kredit ${percent === null ? "belum dapat dinilai" : `${percent.toFixed(1)} persen`}. ${health.status}`}
      >
        <View style={{ alignItems: "center", paddingVertical: 12, gap: 12 }}>
          <PieChart
            data={[
              { value: Math.min(100, percent ?? 0), color },
              { value: 100 - Math.min(100, percent ?? 0), color: c.line },
            ]}
            donut
            radius={100}
            innerRadius={80}
            innerCircleColor={c.surface}
            centerLabelComponent={() => (
              <Text style={{ color: c.ink, fontSize: 28, fontWeight: "700" }}>
                {percent === null ? "\u2014" : `${percent.toFixed(1)}%`}
              </Text>
            )}
          />
          <Txt color={color} bold>
            {health.status}
          </Txt>
          <Txt muted>0% - Acuan 30% - 100%</Txt>
        </View>
      </View>
      <Metric label="Beban pembayaran" value={health.burden} />
      <Metric label="Acuan 30% pemasukan" value={health.limit} />
      {health.overdue > 0 && (
        <Metric label="Sisa kredit terlambat" value={health.overdue} negative />
      )}
      {hidden ? (
        <Txt muted>
          Nominal disembunyikan. Status dan rasio tetap ditampilkan.
        </Txt>
      ) : (
        health.reasons.map((reason) => (
          <Txt muted key={reason}>
            {reason}
          </Txt>
        ))
      )}
    </Card>
  );
}

export function BudgetChart({ budgets }: { budgets: Report["budgets"] }) {
  const c = useColors();
  const { hidden } = useFinance();
  const [width, setWidth] = useState(310);
  const maximum = Math.max(
    1,
    ...budgets.flatMap((budget) => [budget.planned, budget.spent]),
  );
  return (
    <Card title="Realisasi anggaran" icon={Target} testID="budget-chart">
      <Txt muted>
        Bandingkan rencana dan pengeluaran tiap kategori pada skala yang sama.
        Merah berarti melewati anggaran.
      </Txt>
      <View style={{ flexDirection: "row", gap: 18, flexWrap: "wrap" }}>
        <Legend color={c.muted} label="Rencana" />
        <Legend color={c.primary} label="Realisasi" />
      </View>
      {!!budgets.length && (
        <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
          <BarChart
            data={budgets.flatMap((budget, index) => [
              {
                value: budget.planned,
                frontColor: c.muted,
                spacing: 4,
                label: String(index + 1),
                labelTextStyle: { color: c.muted, fontSize: 11 },
              },
              {
                value: budget.spent,
                frontColor: budget.percent > 100 ? c.red : c.primary,
                spacing: Math.max(16, (width - 64) / budgets.length - 32),
              },
            ])}
            width={Math.max(180, width - 48)}
            height={160}
            maxValue={maximum}
            noOfSections={4}
            barWidth={14}
            barBorderRadius={4}
            initialSpacing={8}
            endSpacing={0}
            yAxisLabelWidth={40}
            yAxisTextStyle={{ color: c.muted, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: c.muted, fontSize: 11 }}
            formatYLabel={(label) => (hidden ? "" : compact(Number(label)))}
            rulesColor={c.line}
            xAxisColor={c.line}
            yAxisThickness={0}
          />
        </View>
      )}
      {!budgets.length ? (
        <Txt muted>
          Belum ada anggaran bulan ini. Buat anggaran untuk membandingkan
          rencana dan realisasi.
        </Txt>
      ) : (
        budgets.map((budget, index) => (
          <Pressable
            key={budget.id}
            accessibilityRole="button"
            accessibilityLabel={`Rincian anggaran ${budget.name}`}
            onPress={() =>
              router.push({
                pathname: "/budget-detail",
                params: { id: budget.id },
              })
            }
            style={{ gap: 8, paddingVertical: 10 }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Txt bold>
                  {index + 1}. {budget.name}
                </Txt>
              </View>
              <Txt color={budget.percent > 100 ? c.red : c.primary}>
                {budget.percent}%
              </Txt>
            </View>
            <Text style={{ fontSize: 12, color: c.muted }}>
              {hidden
                ? "Nominal disembunyikan"
                : `${money(budget.spent)} dari ${money(budget.planned)}`}
            </Text>
          </Pressable>
        ))
      )}
      <Txt muted>
        Ketuk anggaran untuk melihat transaksi. Pengeluaran tanpa anggaran dan
        tabungan tidak dihitung pada grafik ini.
      </Txt>
    </Card>
  );
}
