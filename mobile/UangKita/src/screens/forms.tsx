import { useCallback, useRef, useState } from "react";
import { Switch, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { randomUUID } from "expo-crypto";
import {
  Button,
  Card,
  DateField,
  Field,
  Page,
  Row,
  Txt,
  confirm,
} from "@/components/finance-ui";
import { useFinance } from "@/lib/store";
import { useSpace, type SharedData } from "@/lib/shared";
import {
  categoryOptions,
  money,
  recurringDate,
  today,
  type CreditPayment,
  type Entry,
  type SharedEntry,
} from "@/lib/finance";

export function FormScreen() {
  const params = useLocalSearchParams<{
    kind?: string;
    id?: string;
    type?: string;
    recurringId?: string;
    scope?: string;
  }>();
  const shared = useSpace(params.scope);
  if (params.scope && !shared.data)
    return (
      <Page tabs={false} period={false}>
        <Card>
          <Txt>{shared.error || "Memuat data ruang…"}</Txt>
          <Button
            secondary
            title="Coba lagi"
            onPress={() => shared.reload().catch(() => undefined)}
          />
        </Card>
      </Page>
    );
  return (
    <FormEditor
      key={`${params.kind}:${params.id}:${params.recurringId}:${params.scope}`}
      params={params}
      shared={shared.data}
      sharedSave={shared.save}
      sharedBusy={shared.busy}
      sharedError={shared.error}
    />
  );
}
function FormEditor({
  params,
  shared,
  sharedSave,
  sharedBusy,
  sharedError,
}: {
  params: {
    kind?: string;
    id?: string;
    type?: string;
    recurringId?: string;
    scope?: string;
  };
  shared: SharedData | null;
  sharedSave: (input: unknown) => Promise<boolean>;
  sharedBusy: boolean;
  sharedError: string;
}) {
  const store = useFinance();
  const focused = useRef(true);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      return () => {
        focused.current = false;
      };
    }, []),
  );
  function closeSavedForm() {
    if (focused.current) router.back();
  }
  const { data, month } = store;
  const source = shared?.finance ?? data;
  const kind = params.kind ?? "entry";
  const entry = source.entries.find((e) => e.id === params.id) as
    Entry | SharedEntry | undefined;
  const budget = source.budgets.find((b) => b.id === params.id);
  const recurring = data.recurringBills?.find(
    (b) => b.id === (params.recurringId ?? params.id),
  );
  const goal = data.savingsGoal;
  const [type, setType] = useState(entry?.type ?? params.type ?? "out");
  const [amount, setAmount] = useState(
    String(
      kind === "income"
        ? (data.plans.find((p) => p.month === month)?.income ?? "")
        : kind === "budget"
          ? (budget?.planned ?? "")
          : kind === "goal"
            ? (goal?.amount ?? "")
            : kind === "recurring"
              ? (recurring?.amount ?? "")
              : (entry?.amount ??
                (params.recurringId ? (recurring?.amount ?? "") : "")),
    ),
  );
  const [name, setName] = useState(
    kind === "goal"
      ? (goal?.name ?? "")
      : kind === "budget"
        ? (budget?.name ?? "")
        : kind === "recurring"
          ? (recurring?.name ?? "")
          : (entry?.category ??
            (params.recurringId
              ? (recurring?.category ?? "")
              : type === "deposit" || type === "withdraw"
                ? "Tabungan"
                : type === "contribution"
                  ? "Kontribusi"
                  : "")),
  );
  const [note, setNote] = useState(
    kind === "recurring"
      ? (recurring?.category ?? "Lainnya")
      : (entry?.note ?? (params.recurringId ? (recurring?.name ?? "") : "")),
  );
  const [date, setDate] = useState(
    entry?.date ??
      (params.recurringId && recurring
        ? recurringDate(recurring, month)
        : `${month}-${month === today().slice(0, 7) ? today().slice(8) : "01"}`),
  );
  const [startMonth, setStartMonth] = useState(
    kind === "goal"
      ? (goal?.startMonth ?? month)
      : (recurring?.startMonth ?? month),
  );
  const [targetMonth, setTargetMonth] = useState(goal?.targetMonth ?? month);
  const [day, setDay] = useState(String(recurring?.day ?? 1));
  const [active, setActive] = useState(
    entry?.active ?? recurring?.active ?? true,
  );
  const [credit, setCredit] = useState(entry?.paymentMethod === "credit");
  const [dueDate, setDueDate] = useState(entry?.dueDate ?? date);
  const [payments, setPayments] = useState<CreditPayment[]>(
    entry?.creditPayments?.length
      ? entry.creditPayments
      : entry?.paidDate
        ? [{ id: randomUUID(), date: entry.paidDate, amount: entry.amount }]
        : [],
  );
  const [error, setError] = useState("");
  const busy = store.busy || sharedBusy;
  const space = store.spaces.spaces.find((s) => s.id === params.scope);
  const sharedEntryEditable =
    !shared ||
    !entry ||
    ("authorId" in entry &&
      (entry.authorId === store.user?.id ||
        (space?.role === "owner" && entry.type !== "contribution")));
  const readOnly =
    !!(entry && "spaceId" in entry && entry.spaceId) ||
    !sharedEntryEditable ||
    (!!shared && kind === "budget" && space?.role !== "owner");
  if (
    params.id &&
    ((kind === "entry" && !entry) ||
      (kind === "budget" && !budget) ||
      (kind === "recurring" && !recurring))
  )
    return (
      <Page period={false} tabs={false}>
        <Card>
          <Txt>Data tidak ditemukan. Muat ulang layar sebelumnya.</Txt>
        </Card>
      </Page>
    );
  if (readOnly)
    return (
      <Page period={false} tabs={false}>
        <Card title={entry?.note || entry?.category || budget?.name}>
          <Txt>{money(entry?.amount ?? budget?.planned ?? 0)}</Txt>
          <Txt muted>
            Data ini hanya dapat dibaca. Transaksi ruang mengikuti izin pemilik
            dan pembuat transaksi.
          </Txt>
          <Button secondary title="Kembali" onPress={() => router.back()} />
        </Card>
      </Page>
    );
  async function submit() {
    setError("");
    if (!/^[0-9]+$/.test(amount)) {
      setError("Isi nominal rupiah bulat tanpa titik atau koma.");
      return;
    }
    if (kind !== "income" && !name.trim()) {
      setError("Isi nama atau kategori terlebih dahulu.");
      return;
    }
    let action: unknown;
    if (kind === "entry") {
      const expense = type === "out" || type === "fixed";
      action = {
        action: "entry",
        entry: {
          id: entry?.id ?? randomUUID(),
          type,
          amount: Number(amount),
          category: name,
          note,
          date,
          active,
          paymentMethod: expense && credit ? "credit" : "direct",
          dueDate: expense && credit ? dueDate : null,
          paidDate: null,
          creditPayments: expense && credit ? payments : [],
          ...(!shared &&
          (entry && "recurringId" in entry
            ? entry.recurringId
            : params.recurringId)
            ? {
                recurringId:
                  entry && "recurringId" in entry
                    ? entry.recurringId
                    : params.recurringId,
              }
            : {}),
        },
      };
    } else if (kind === "budget")
      action = {
        action: "budget",
        budget: {
          id: budget?.id ?? randomUUID(),
          month: budget?.month ?? month,
          name,
          planned: Number(amount),
        },
      };
    else if (kind === "income")
      action = { action: "income", plan: { month, income: Number(amount) } };
    else if (kind === "goal")
      action = {
        action: "savingsGoal",
        goal: { name, amount: Number(amount), startMonth, targetMonth },
      };
    else if (kind === "recurring")
      action = {
        action: "recurringBill",
        bill: {
          id: recurring?.id ?? randomUUID(),
          name,
          amount: Number(amount),
          category: note,
          day: Number(day),
          startMonth,
          active,
        },
      };
    else {
      setError("Jenis formulir tidak dikenali.");
      return;
    }
    const success = shared
      ? await sharedSave(action)
      : await store.save(action as Parameters<typeof store.save>[0]);
    if (success) closeSavedForm();
  }
  const title =
    kind === "entry"
      ? entry
        ? "Ubah transaksi"
        : "Catat transaksi"
      : kind === "budget"
        ? budget
          ? "Ubah anggaran"
          : "Buat anggaran"
        : kind === "income"
          ? "Pemasukan rutin bulanan"
          : kind === "goal"
            ? "Target tabungan"
            : "Tagihan rutin";
  const types = shared
    ? [
        ["out", "Pengeluaran"],
        ["contribution", "Kontribusi"],
      ]
    : [
        ["in", "Pemasukan"],
        ["out", "Pengeluaran"],
        ["fixed", "Tetap"],
        ["deposit", "Setoran"],
        ["withdraw", "Penarikan"],
      ];
  const categories = categoryOptions(source);
  return (
    <Page period={false} tabs={false}>
      <Txt large>{title}</Txt>
      <Txt muted>{shared ? space?.name : month}</Txt>
      {kind === "entry" && (
        <Row>
          {types.map(([value, label]) => (
            <Button
              key={value}
              compact
              title={label}
              secondary={type !== value}
              disabled={
                busy ||
                !!params.recurringId ||
                (!!entry && "recurringId" in entry && !!entry.recurringId) ||
                (!!shared && !!entry)
              }
              onPress={() => {
                setType(value);
                if (value === "deposit" || value === "withdraw")
                  setName("Tabungan");
                if (value === "contribution") setName("Kontribusi");
              }}
            />
          ))}
        </Row>
      )}
      <Field
        label="Nominal (Rp)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="number-pad"
        placeholder="Contoh: 150000"
        editable={!busy}
      />
      {kind !== "income" && (
        <Field
          label={
            kind === "entry" || kind === "budget"
              ? "Kategori"
              : "Nama target / tagihan"
          }
          value={name}
          onChangeText={setName}
          maxLength={80}
          editable={!busy}
        />
      )}
      {(kind === "entry" || kind === "budget") && (
        <Row>
          {categories.slice(0, 8).map((category) => (
            <Button
              key={category}
              compact
              secondary
              title={category}
              disabled={busy}
              onPress={() => setName(category)}
            />
          ))}
        </Row>
      )}
      {kind === "entry" && (
        <>
          <Field
            label="Catatan"
            value={note}
            onChangeText={setNote}
            maxLength={300}
            multiline
            editable={!busy}
          />
          <DateField
            label="Tanggal transaksi"
            value={date}
            onChange={setDate}
          />
          {(type === "out" || type === "fixed") && (
            <>
              <Row>
                <Button
                  title="Bayar langsung"
                  secondary={credit}
                  disabled={busy}
                  onPress={() => setCredit(false)}
                />
                <Button
                  title="Kredit"
                  secondary={!credit}
                  disabled={busy}
                  onPress={() => setCredit(true)}
                />
              </Row>
              {credit && (
                <Card title="Pembayaran kredit">
                  <DateField
                    label="Jatuh tempo"
                    value={dueDate}
                    onChange={setDueDate}
                  />
                  <Txt muted>
                    Catat setiap pembayaran pada tanggal uang dibayarkan. Total
                    tidak boleh melebihi nominal transaksi.
                  </Txt>
                  {payments.map((p, i) => (
                    <View key={p.id} style={{ gap: 12 }}>
                      <DateField
                        label={`Tanggal pembayaran ${i + 1}`}
                        value={p.date}
                        onChange={(v) =>
                          setPayments(
                            payments.map((row) =>
                              row.id === p.id ? { ...row, date: v } : row,
                            ),
                          )
                        }
                      />
                      <Field
                        label={`Nominal pembayaran ${i + 1}`}
                        value={String(p.amount || "")}
                        keyboardType="number-pad"
                        onChangeText={(v) => {
                          if (/^\d*$/.test(v))
                            setPayments(
                              payments.map((row) =>
                                row.id === p.id
                                  ? { ...row, amount: Number(v) }
                                  : row,
                              ),
                            );
                        }}
                      />
                      <Button
                        danger
                        title={`Hapus pembayaran ${i + 1}`}
                        disabled={busy}
                        onPress={() =>
                          setPayments(payments.filter((row) => row.id !== p.id))
                        }
                      />
                    </View>
                  ))}
                  <Txt bold>
                    Sisa{" "}
                    {money(
                      Math.max(
                        0,
                        Number(amount) -
                          payments.reduce((sum, p) => sum + p.amount, 0),
                      ),
                    )}
                  </Txt>
                  <Button
                    secondary
                    title="＋ Tambah pembayaran"
                    disabled={busy}
                    onPress={() =>
                      setPayments([
                        ...payments,
                        {
                          id: randomUUID(),
                          date: today() >= date ? today() : date,
                          amount: Math.max(
                            0,
                            Number(amount) -
                              payments.reduce((sum, p) => sum + p.amount, 0),
                          ),
                        },
                      ])
                    }
                  />
                </Card>
              )}
            </>
          )}
        </>
      )}
      {kind === "goal" && (
        <>
          <DateField
            label="Bulan mulai"
            value={startMonth}
            onChange={setStartMonth}
            monthOnly
          />
          <DateField
            label="Bulan target"
            value={targetMonth}
            onChange={setTargetMonth}
            monthOnly
          />
        </>
      )}
      {kind === "recurring" && (
        <>
          <Field
            label="Kategori tagihan"
            value={note || recurring?.category || ""}
            onChangeText={setNote}
            maxLength={80}
          />
          <Field
            label="Tanggal tiap bulan (1–31)"
            value={day}
            onChangeText={setDay}
            keyboardType="number-pad"
          />
          <DateField
            label="Bulan mulai"
            value={startMonth}
            onChange={setStartMonth}
            monthOnly
          />
        </>
      )}
      {(kind === "entry" || kind === "recurring") && (
        <Row>
          <Switch
            accessibilityLabel="Aktif dalam perhitungan"
            value={active}
            onValueChange={setActive}
            disabled={busy}
          />
          <Txt>Aktif dalam perhitungan</Txt>
        </Row>
      )}
      {(error || sharedError) !== "" && (
        <Card>
          <Txt>{error || sharedError}</Txt>
        </Card>
      )}
      <Button
        title={busy ? "Menyimpan…" : "Simpan"}
        disabled={busy}
        onPress={submit}
      />
      <Button
        secondary
        title="Batal dan kembali"
        disabled={busy}
        onPress={() => router.back()}
      />
      {kind === "goal" && goal && (
        <Button
          danger
          title="Hapus target tabungan"
          disabled={busy}
          onPress={() =>
            confirm(
              "Hapus target?",
              "Riwayat tabungan tetap tersimpan.",
              async () => {
                if (await store.save({ action: "savingsGoal", goal: null }))
                  closeSavedForm();
              },
            )
          }
        />
      )}
      {(entry || budget) && (
        <Button
          danger
          title={entry ? "Hapus transaksi" : "Hapus anggaran"}
          disabled={busy}
          onPress={() =>
            confirm(
              "Hapus data ini?",
              entry
                ? "Transaksi ini akan dihapus dari perhitungan."
                : "Riwayat transaksi tetap tersimpan.",
              async () => {
                const action = {
                  action: "delete" as const,
                  kind: entry ? ("entry" as const) : ("budget" as const),
                  id: (entry ?? budget)!.id,
                };
                if (
                  shared ? await sharedSave(action) : await store.save(action)
                )
                  closeSavedForm();
              },
            )
          }
        />
      )}
    </Page>
  );
}
