import { useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Eye,
  EyeOff,
  Moon,
  Sun,
  ReceiptText,
  ChevronRight,
  createLucideIcon,
  Target,
  ChartNoAxesCombined,
  UsersRound,
  Tags,
} from "lucide-react-native";
import { router } from "expo-router";
import {
  Button,
  Brand,
  IconButton,
  MonthPicker,
  Card,
  Field,
  Metric,
  Page,
  Progress,
  Row,
  Transactions,
  Txt,
  useColors,
} from "@/components/finance-ui";
import { useFinance } from "@/lib/store";
import {
  billOverview,
  creditFigures,
  creditHealth,
  figures,
  inActivityMonth,
  money,
  monthLabel,
  realization,
  savingsProgress,
} from "@/lib/finance";
import { shiftMonth } from "@/lib/core";
import { chickenIcon } from "../../../../lib/chicken-icon";
const Chicken = createLucideIcon("chicken", chickenIcon);

export function HomeScreen() {
  const { data, month, user, hidden, setHidden, setTheme } = useFinance();
  const c = useColors();
  const f = figures(data, month);
  const bills = billOverview(data, month);
  const health = creditHealth(data, month);
  return (
    <Page
      header={
        <>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Brand />
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <IconButton
                icon={c.dark ? Sun : Moon}
                label="Ganti tema terang atau gelap"
                onPress={() => setTheme(c.dark ? "light" : "dark")}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Akun saya"
                onPress={() => router.push("/account")}
                style={{
                  width: 37,
                  height: 37,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: c.lilac,
                  borderRadius: 20,
                }}
              >
                <Txt color={c.primary} bold>
                  {user?.name.slice(0, 1).toUpperCase()}
                </Txt>
              </Pressable>
            </View>
          </View>
          <View style={{ gap: 9 }}>
            <Text style={{ color: c.muted, fontSize: 10, letterSpacing: 1.1 }}>
              HALO, {user?.name.toUpperCase()}
            </Text>
            <Text style={{ fontSize: 22, fontWeight: "700", color: c.ink }}>
              Keuangan rapi, hati tenang.
            </Text>
          </View>
          <MonthPicker />
          <View
            style={{
              backgroundColor: c.surface,
              borderRadius: 17,
              borderWidth: 1,
              borderColor: c.line,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 15,
                paddingHorizontal: 19,
                backgroundColor: c.lilac,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Wallet size={17} color={c.primary} />
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "700",
                    color: c.primary,
                    letterSpacing: 0.6,
                  }}
                >
                  DOMPET PRIBADI
                </Text>
              </View>
              <Text style={{ fontSize: 9, color: c.primary }}>
                Rupiah · IDR
              </Text>
            </View>
            <View style={{ paddingHorizontal: 19, paddingTop: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 12, color: c.muted }}>
                  Sisa saldo bulan ini
                </Text>
                <IconButton
                  icon={hidden ? EyeOff : Eye}
                  label={hidden ? "Tampilkan saldo" : "Sembunyikan saldo"}
                  onPress={() => setHidden(!hidden)}
                />
              </View>
              <Text
                style={{
                  fontSize: 30,
                  fontWeight: "700",
                  letterSpacing: -1,
                  color: f.balance < 0 ? c.red : c.ink,
                }}
              >
                {hidden ? "Rp ••••••••" : money(f.balance)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Lihat aktivitas keuangan"
                onPress={() => router.push("/activity")}
                style={{
                  minHeight: 52,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 9,
                  borderTopWidth: 1,
                  borderColor: c.line,
                  marginTop: 18,
                }}
              >
                <ReceiptText size={17} color={c.primary} />
                <Text style={{ fontSize: 12, color: c.primary, flex: 1 }}>
                  Lihat aktivitas keuangan
                </Text>
                <ChevronRight size={17} color={c.primary} />
              </Pressable>
            </View>
          </View>
        </>
      }
    >
      <View style={{ flexDirection: "row", gap: 7 }}>
        {(
          [
            ["Pemasukan", f.income, ArrowDownLeft, "mint", "/form?kind=income"],
            ["Pengeluaran", f.expense, ArrowUpRight, "peach", "/activity"],
            ["Ditabung bulan ini", f.saved, Chicken, "lilac", "/savings"],
          ] as const
        ).map(([label, value, Icon, tone, href]) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => router.push(href)}
            style={{
              flex: 1,
              minWidth: 0,
              borderWidth: 1,
              borderColor: c.line,
              borderRadius: 12,
              padding: 10,
              gap: 10,
              backgroundColor: c.surface,
            }}
          >
            <View
              style={{
                padding: 6,
                borderRadius: 9,
                backgroundColor: c[tone],
                alignSelf: "flex-start",
              }}
            >
              <Icon size={17} color={tone === "mint" ? c.green : c.primary} />
            </View>
            <Text style={{ fontSize: 9, color: c.muted }}>{label}</Text>
            <Text style={{ fontSize: 11, fontWeight: "700", color: c.ink }}>
              {hidden ? "••••••" : money(value)}
            </Text>
          </Pressable>
        ))}
      </View>
      {f.cashExpense !== f.expense && (
        <Txt muted>
          Pembayaran bulan ini: {hidden ? "••••••" : money(f.cashExpense)}.
          Saldo mengikuti tanggal pembayaran.
        </Txt>
      )}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Txt bold>Menu utama</Txt>
        <Text style={{ color: c.muted, fontSize: 10 }}>
          Semua dalam satu tempat
        </Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 22 }}>
        {(
          [
            [
              "Catat transaksi",
              ReceiptText,
              "/form?kind=entry&type=out",
              "cream",
            ],
            ["Anggaran", Target, "/budget", "mint"],
            ["Tabungan", Chicken, "/savings", "lilac"],
            ["Analitik", ChartNoAxesCombined, "/analytics", "peach"],
            ["Tagihan rutin", Wallet, "/bills", "cream"],
            ["Pendapatan", ArrowDownLeft, "/form?kind=income", "mint"],
            ["Ruang bersama", UsersRound, "/spaces", "lilac"],
            ["Kelola kategori", Tags, "/account", "mint"],
          ] as const
        ).map(([label, Icon, href, tone]) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => router.push(href)}
            style={{ width: "25%", alignItems: "center", gap: 9 }}
          >
            <View
              style={{
                width: 54,
                height: 54,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 17,
                backgroundColor: c[tone],
              }}
            >
              <Icon
                size={26}
                strokeWidth={1.7}
                color={tone === "mint" ? c.green : c.primary}
              />
            </View>
            <Text
              style={{
                fontSize: 10,
                lineHeight: 15,
                textAlign: "center",
                color: c.ink,
                maxWidth: 73,
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Lihat rencana anggaran"
        onPress={() => router.push("/budget")}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 16,
          backgroundColor: c.lilac,
          borderRadius: 16,
        }}
      >
        <Target size={25} color={c.primary} />
        <View style={{ flex: 1 }}>
          <Txt bold>Sedikit direncanakan, banyak ketenangan.</Txt>
          <Text style={{ fontSize: 11, color: c.muted, marginTop: 5 }}>
            Atur batas untuk hal-hal yang penting.
          </Text>
        </View>
        <ChevronRight size={20} color={c.primary} />
      </Pressable>
      <Card title="Yang perlu disiapkan">
        <Metric label="Tagihan kredit jatuh tempo" value={bills.unpaid} />
        <Metric label="Tagihan rutin belum dicatat" value={bills.recurring} />
        <Metric
          label="Perkiraan sisa setelah tagihan"
          value={bills.afterBills}
        />
        <Button
          secondary
          title="Lihat tagihan"
          onPress={() => router.push("/bills")}
        />
      </Card>
      <Card title={`Kesehatan kredit · ${health.status}`}>
        <Txt muted>{health.reasons[0]}</Txt>
        <Button
          secondary
          title="Lihat analitik kredit"
          onPress={() => router.push("/analytics")}
        />
      </Card>
      <Txt bold>Pantau anggaran</Txt>
      {data.budgets
        .filter((b) => b.month === month)
        .slice(0, 3)
        .map((b) => {
          const r = realization(data, b);
          return (
            <Pressable
              key={b.id}
              accessibilityRole="button"
              accessibilityLabel={`Pantau ${b.name}`}
              onPress={() =>
                router.push({
                  pathname: "/budget-detail",
                  params: { id: b.id },
                })
              }
            >
              <Card title={b.name}>
                <Metric label="Terpakai" value={r.spent} />
                <Progress percent={r.percent} label={`Anggaran ${b.name}`} />
                <Txt muted>
                  {r.percent}% terpakai · sisa{" "}
                  {hidden ? "••••••" : money(r.remaining)}
                </Txt>
              </Card>
            </Pressable>
          );
        })}
      <Txt bold>Aktivitas terbaru</Txt>
      <Transactions
        entries={data.entries
          .filter((e) => inActivityMonth(e, month))
          .sort((a, b) => b.date.localeCompare(a.date))}
        limit={5}
      />
    </Page>
  );
}
export function ActivityScreen() {
  const { data, month } = useFinance();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const entries = useMemo(
    () =>
      data.entries
        .filter(
          (e) =>
            inActivityMonth(e, month) &&
            (filter === "all" ||
              (filter === "credit"
                ? e.paymentMethod === "credit"
                : e.type === filter)) &&
            `${e.note} ${e.category}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data, month, query, filter],
  );
  return (
    <Page>
      <Field
        label="Cari transaksi"
        value={query}
        onChangeText={setQuery}
        placeholder="Kategori atau catatan"
      />
      <Row>
        {[
          ["all", "Semua"],
          ["in", "Masuk"],
          ["out", "Keluar"],
          ["fixed", "Tetap"],
          ["deposit", "Setoran"],
          ["withdraw", "Penarikan"],
          ["credit", "Kredit"],
        ].map(([value, label]) => (
          <Button
            compact
            secondary={filter !== value}
            key={value}
            title={label}
            onPress={() => setFilter(value)}
          />
        ))}
      </Row>
      <Button
        title="＋ Catat transaksi"
        onPress={() => router.push("/form?kind=entry&type=out")}
      />
      <Txt muted>{entries.length} transaksi · ketuk untuk lihat atau ubah</Txt>
      <Transactions key={`${month}:${filter}:${query}`} entries={entries} />
    </Page>
  );
}
export function GoalCard() {
  const { data, month } = useFinance();
  const p = savingsProgress(data, month);
  const goal = data.savingsGoal;
  return (
    <Card
      title={goal ? `Target tabungan: ${goal.name}` : "Target tabungan"}
      tone="mint"
    >
      {p && goal ? (
        <>
          <Txt muted>
            {monthLabel(goal.startMonth)} – {monthLabel(goal.targetMonth)}
          </Txt>
          <Metric label="Target" value={goal.amount} />
          <Progress percent={p.percent} label="Progres target tabungan" />
          <Txt>
            {p.percent}% tercapai · saldo {money(p.actual)}
          </Txt>
          <Metric label="Rencana bulanan" value={p.monthlyPlan} />
          <Metric
            label="Realisasi tabungan bulan ini"
            value={p.monthlyActual}
          />
          <Txt muted>
            {p.monthlyGap < 0
              ? `Kurang ${money(-p.monthlyGap)}`
              : `Lebih ${money(p.monthlyGap)}`}{" "}
            dari rencana bulan ini
          </Txt>
          <Txt muted>
            Rencana kumulatif {money(p.planned)} ·{" "}
            {p.gap < 0
              ? `tertinggal ${money(-p.gap)}`
              : `di atas rencana ${money(p.gap)}`}
          </Txt>
          <Txt muted>
            {p.remaining === 0
              ? "Target sudah tercapai!"
              : p.nextMonthly !== null
                ? `Mulai bulan berikutnya perlu ${money(p.nextMonthly)} per bulan, tanpa asumsi bunga.`
                : `Periode selesai. Sisa target ${money(p.remaining)}.`}
          </Txt>
        </>
      ) : (
        <Txt muted>
          Tentukan tujuanmu, lalu sisihkan sedikit setiap bulan. Penarikan ikut
          mengurangi progres.
        </Txt>
      )}
      <Button
        secondary
        title={goal ? "Ubah target tabungan" : "Buat target tabungan"}
        onPress={() => router.push("/form?kind=goal")}
      />
    </Card>
  );
}
export function BudgetScreen() {
  const { data, month } = useFinance();
  const f = figures(data, month);
  const p = savingsProgress(data, month);
  const goal = data.savingsGoal;
  const budgets = data.budgets.filter((b) => b.month === month);
  const allocated =
    goal && month >= goal.startMonth && month <= goal.targetMonth
      ? (p?.monthlyPlan ?? 0)
      : 0;
  const planned = budgets.reduce((sum, b) => sum + b.planned, 0) + allocated;
  const spent =
    budgets.reduce((sum, b) => sum + realization(data, b).spent, 0) + f.saved;
  return (
    <Page>
      <Txt large>Rencana & realisasi</Txt>
      <Card title="Ringkasan anggaran">
        <Metric label="Total rencana, termasuk tabungan" value={planned} />
        <Metric label="Sudah terealisasi" value={spent} />
        <Metric label="Sisa alokasi" value={planned - spent} />
        <Metric
          label="Sisa setelah rencana"
          value={f.income - planned - f.transferred}
        />
        <Metric label="Sisa uang saat ini" value={f.balance} />
        <Txt muted>
          Sisa uang mengikuti pembayaran dan tabungan yang sudah dicatat,
          termasuk pengeluaran di luar anggaran.
        </Txt>
      </Card>
      <GoalCard />
      <Button
        secondary
        title="Lihat tabungan"
        onPress={() => router.push("/savings")}
      />
      <Button
        title="＋ Buat anggaran"
        onPress={() => router.push("/form?kind=budget")}
      />
      {budgets.length ? (
        budgets.map((b) => {
          const r = realization(data, b);
          return (
            <Card key={b.id} title={b.name}>
              <Row>
                <Txt bold>
                  {money(r.spent)} / {money(b.planned)}
                </Txt>
                <Txt muted>{r.percent}% terpakai</Txt>
              </Row>
              <Progress percent={r.percent} label={`Anggaran ${b.name}`} />
              <Txt>
                {r.remaining < 0 ? "Melebihi" : "Sisa"}{" "}
                {money(Math.abs(r.remaining))}
              </Txt>
              {r.transactions[0] && (
                <Txt muted>
                  Terbesar:{" "}
                  {r.transactions[0].note || r.transactions[0].category}
                </Txt>
              )}
              <Button
                secondary
                title={`Rincian ${b.name}`}
                onPress={() =>
                  router.push({
                    pathname: "/budget-detail",
                    params: { id: b.id },
                  })
                }
              />
            </Card>
          );
        })
      ) : (
        <Card>
          <Txt muted>Belum ada anggaran untuk bulan ini.</Txt>
        </Card>
      )}
    </Page>
  );
}
export function SavingsScreen() {
  const { data, month } = useFinance();
  const f = figures(data, month);
  return (
    <Page>
      <Card tone="lilac">
        <Metric label="Total tabungan · seluruh periode" value={f.savings} />
        <Txt muted>Satu langkah lebih dekat ke tujuanmu.</Txt>
        <Row>
          <Button
            title="＋ Setor tabungan"
            onPress={() => router.push("/form?kind=entry&type=deposit")}
          />
          <Button
            secondary
            title="Tarik tabungan"
            onPress={() => router.push("/form?kind=entry&type=withdraw")}
          />
        </Row>
      </Card>
      <GoalCard />
      <Txt bold>Riwayat tabungan · semua periode</Txt>
      <Transactions
        entries={data.entries
          .filter((e) => e.type === "deposit" || e.type === "withdraw")
          .sort((a, b) => b.date.localeCompare(a.date))}
      />
    </Page>
  );
}
export function BillsScreen() {
  const { data, month } = useFinance();
  const bills = billOverview(data, month);
  return (
    <Page>
      <Card title="Ringkasan tagihan">
        <Metric label="Kredit jatuh tempo belum dibayar" value={bills.unpaid} />
        <Metric label="Tagihan rutin belum dicatat" value={bills.recurring} />
        <Metric label="Sisa setelah tagihan" value={bills.afterBills} />
      </Card>
      <Txt bold>Kredit belum lunas</Txt>
      {bills.credits.length ? (
        bills.credits.map(({ entry, remaining }) => (
          <Card key={entry.id} title={entry.note || entry.category}>
            <Metric label="Sisa pembayaran" value={remaining} />
            <Txt muted>Jatuh tempo {entry.dueDate}</Txt>
            <Button
              title="Catat pembayaran"
              onPress={() =>
                router.push({
                  pathname: "/form",
                  params: { kind: "entry", id: entry.id },
                })
              }
            />
          </Card>
        ))
      ) : (
        <Card>
          <Txt muted>Tidak ada kredit belum lunas untuk periode ini.</Txt>
        </Card>
      )}
      <Txt bold>Langganan & tagihan rutin</Txt>
      <Button
        title="＋ Tambah tagihan rutin"
        onPress={() => router.push("/form?kind=recurring")}
      />
      {(data.recurringBills ?? []).map((bill) => {
        const existing = data.entries.find(
          (e) => e.recurringId === bill.id && e.date.startsWith(month),
        );
        return (
          <Card key={bill.id} title={bill.name}>
            <Txt>
              {money(bill.amount)} · setiap tanggal {bill.day}
            </Txt>
            <Txt muted>
              {bill.active
                ? `Mulai ${monthLabel(bill.startMonth)}`
                : "Nonaktif"}
            </Txt>
            <Row>
              <Button
                secondary
                title="Ubah tagihan"
                onPress={() =>
                  router.push({
                    pathname: "/form",
                    params: { kind: "recurring", id: bill.id },
                  })
                }
              />
              <Button
                title={
                  existing ? "Lihat transaksi bulan ini" : "Catat bulan ini"
                }
                disabled={!bill.active || month < bill.startMonth}
                onPress={() =>
                  router.push({
                    pathname: "/form",
                    params: existing
                      ? { kind: "entry", id: existing.id }
                      : { kind: "entry", type: "fixed", recurringId: bill.id },
                  })
                }
              />
            </Row>
          </Card>
        );
      })}
    </Page>
  );
}
export function AnalyticsScreen() {
  const { data, month } = useFinance();
  const c = useColors();
  const f = figures(data, month);
  const credit = creditFigures(data, month);
  const health = creditHealth(data, month);
  const categories = [
    ...new Set(
      data.entries
        .filter(
          (e) =>
            e.active &&
            !e.spaceId &&
            e.date.startsWith(month) &&
            (e.type === "out" || e.type === "fixed"),
        )
        .map((e) => e.category),
    ),
  ]
    .map((name) => ({
      name,
      amount: data.entries
        .filter(
          (e) =>
            e.active &&
            !e.spaceId &&
            e.date.startsWith(month) &&
            e.category === name &&
            (e.type === "out" || e.type === "fixed"),
        )
        .reduce((s, e) => s + e.amount, 0),
    }))
    .sort((a, b) => b.amount - a.amount);
  return (
    <Page>
      <Card title="Ringkasan bulan ini">
        <Metric label="Pemasukan" value={f.income} />
        <Metric label="Pengeluaran tercatat" value={f.expense} />
        <Metric label="Pengeluaran dibayar" value={f.cashExpense} />
        <Metric label="Tabungan bersih" value={f.saved} />
        <Metric label="Transfer ruang bersama" value={f.transferred} />
      </Card>
      <Card title="Arus kas 6 bulan">
        {Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5)).map(
          (m) => {
            const v = figures(data, m);
            const max = Math.max(
              v.income,
              v.cashExpense + v.saved + v.transferred,
              1,
            );
            return (
              <View key={m} style={{ gap: 6 }}>
                <Txt bold>{monthLabel(m)}</Txt>
                <Txt muted>
                  Masuk {money(v.income)} · keluar{" "}
                  {money(v.cashExpense + v.saved + v.transferred)}
                </Txt>
                <View
                  style={{
                    height: 7,
                    backgroundColor: c.line,
                    borderRadius: 6,
                  }}
                >
                  <View
                    style={{
                      width: `${Math.min(100, Math.max(0, (v.income / max) * 100))}%`,
                      height: 7,
                      backgroundColor: c.green,
                    }}
                  />
                </View>
                <View
                  style={{
                    height: 7,
                    backgroundColor: c.line,
                    borderRadius: 6,
                  }}
                >
                  <View
                    style={{
                      width: `${Math.min(100, Math.max(0, ((v.cashExpense + v.saved + v.transferred) / max) * 100))}%`,
                      height: 7,
                      backgroundColor: c.primary,
                    }}
                  />
                </View>
              </View>
            );
          },
        )}
        <Txt muted>
          Hijau: masuk · Ungu: keluar (termasuk tabungan dan transfer). Skala
          dibandingkan dalam tiap bulan.
        </Txt>
      </Card>
      <Card title="Pengeluaran per kategori">
        {categories.length ? (
          categories.map((row) => (
            <View key={row.name} style={{ gap: 8 }}>
              <Txt>
                {row.name} · {money(row.amount)}
              </Txt>
              <Progress
                percent={Math.round(
                  (row.amount / Math.max(f.expense, 1)) * 100,
                )}
                label={row.name}
              />
            </View>
          ))
        ) : (
          <Txt muted>Grafik terisi setelah kamu mencatat pengeluaran.</Txt>
        )}
      </Card>
      <Card title={`Kesehatan kredit · ${health.status}`}>
        <Metric label="Beban pembayaran bulan ini" value={health.burden} />
        <Metric label="Acuan 30% pemasukan" value={health.limit} />
        <Metric
          label="Sisa kredit seluruh periode"
          value={credit.outstanding}
        />
        <Metric label="Kredit baru bulan ini" value={credit.borrowed} />
        <Metric label="Pembayaran kredit bulan ini" value={credit.paid} />
        {health.reasons.map((reason) => (
          <Txt muted key={reason}>
            {reason}
          </Txt>
        ))}
      </Card>
      {credit.categories.map((row) => (
        <Card key={row.name} title={row.name}>
          <Txt>
            Kredit baru {money(row.borrowed)} · dibayar {money(row.paid)} · sisa{" "}
            {money(row.outstanding)}
          </Txt>
        </Card>
      ))}
    </Page>
  );
}
