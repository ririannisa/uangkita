import { router, useLocalSearchParams } from "expo-router";
import {
  Button,
  Card,
  Metric,
  Page,
  Progress,
  Transactions,
  Txt,
} from "@/components/finance-ui";
import { useFinance } from "@/lib/store";
import { realization } from "@/lib/finance";

export default function BudgetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useFinance();
  const budget = data.budgets.find((b) => b.id === id);
  if (!budget)
    return (
      <Page period={false}>
        <Card>
          <Txt>Anggaran tidak ditemukan.</Txt>
        </Card>
      </Page>
    );
  const r = realization(data, budget);
  return (
    <Page period={false}>
      <Txt large>{budget.name}</Txt>
      <Card>
        <Metric label="Rencana" value={budget.planned} />
        <Metric label="Realisasi" value={r.spent} />
        <Metric label="Sisa anggaran" value={r.remaining} />
        <Progress percent={r.percent} label={budget.name} />
        <Button
          title="Ubah anggaran"
          onPress={() =>
            router.push({ pathname: "/form", params: { kind: "budget", id } })
          }
        />
      </Card>
      <Txt bold>Transaksi terbesar lebih dulu</Txt>
      <Transactions entries={r.transactions} />
    </Page>
  );
}
