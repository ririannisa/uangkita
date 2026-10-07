import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Switch, View } from "react-native";
import { randomUUID } from "expo-crypto";
import {
  Button,
  Card,
  ChoicePicker,
  Field,
  Page,
  Txt,
  confirm,
  useColors,
} from "@/components/finance-ui";
import { api } from "@/lib/api";
import { money } from "@/lib/finance";
import {
  planFieldsSchema,
  type EventPlan,
  type PlanItem,
  type PlanOverview,
} from "../../../../lib/event-plans";

export default function PreparationsScreen() {
  const { scope } = useLocalSearchParams<{ scope?: string }>();
  const endpoint = `/api/event-plans${scope ? `?spaceId=${encodeURIComponent(scope)}` : ""}`;
  const c = useColors();
  const [data, setData] = useState<PlanOverview | null>(null);
  const [selected, setSelected] = useState<EventPlan | null>(null);
  const [item, setItem] = useState<PlanItem | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("lamaran");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    let current = true;
    api<PlanOverview>(endpoint)
      .then((next) => {
        if (current) {
          setData(next);
          setError("");
        }
      })
      .catch((e) => {
        if (current)
          setError(e instanceof Error ? e.message : "Gagal memuat rencana.");
      });
    return () => {
      current = false;
      alive.current = false;
    };
  }, [endpoint]);
  async function mutate(body: unknown, id?: string) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await api(endpoint, body);
      const next = await api<PlanOverview>(endpoint);
      if (alive.current) {
        setData(next);
        setSelected(next.plans.find((p) => p.id === id) ?? null);
        setItem(null);
        setName("");
      }
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function save(plan: EventPlan) {
    const fields = {
      name: plan.name,
      date: plan.date || null,
      location: plan.location,
      items: plan.items,
    };
    if (!planFieldsSchema.safeParse(fields).success) {
      setError(
        "Periksa nama, tanggal YYYY-MM-DD, dan estimasi rupiah. Maksimal 200 item.",
      );
      return;
    }
    void mutate(
      { action: "save", id: plan.id, revision: plan.revision, plan: fields },
      plan.id,
    );
  }
  async function reload() {
    if (selected) {
      confirm(
        "Muat ulang?",
        "Perubahan yang belum disimpan akan dibuang.",
        () => void reloadData(),
        false,
      );
    } else await reloadData();
  }
  async function reloadData() {
    try {
      const next = await api<PlanOverview>(endpoint);
      if (alive.current) {
        setData(next);
        setSelected(next.plans.find((p) => p.id === selected?.id) ?? null);
        setItem(null);
        setError("");
      }
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Gagal memuat.");
    }
  }
  return (
    <Page period={false} refresh={reload}>
      <Txt large>Persiapan Acara</Txt>
      <Txt muted>
        {scope ? "Rencana bersama anggota ruang" : "Rencana pribadi"}. Centang
        kesiapan dan estimasi tidak mengurangi saldo. Catat pembayaran lewat
        pencatatan keuangan.
      </Txt>
      <Txt muted>
        Sesuaikan template dengan kebutuhanmu. Dokumen pernikahan mengikuti
        ketentuan KUA setempat.
      </Txt>
      {error !== "" && <Txt>{error}</Txt>}
      <Button
        title="Muat ulang rencana"
        secondary
        disabled={busy}
        onPress={() => void reload()}
      />
      {!data && !error && <Txt>Memuat persiapan…</Txt>}
      {data && !selected && (
        <>
          <Card>
            <Txt bold>Buat rencana</Txt>
            <Field
              label="Nama acara"
              value={name}
              onChangeText={setName}
              maxLength={80}
            />
            <ChoicePicker
              label="Template"
              value={kind}
              onChange={setKind}
              options={[
                { value: "lamaran", label: "Lamaran" },
                { value: "wedding", label: "Wedding" },
              ]}
            />
            <Button
              title="Buat rencana"
              disabled={busy || !name.trim()}
              onPress={() => void mutate({ action: "create", kind, name })}
            />
          </Card>
          {!data.plans.length && <Txt muted>Belum ada rencana acara.</Txt>}
          {data.plans.map((p) => (
            <Card key={p.id}>
              <Txt bold>{p.name}</Txt>
              <Txt muted>
                {p.date || "Tanggal belum diatur"} · {p.summary.ready}/
                {p.summary.total} siap ({p.summary.percent}%)
              </Txt>
              <Txt>
                Estimasi {money(p.summary.estimated)} · {p.summary.unpriced}{" "}
                item belum dianggarkan
              </Txt>
              <Button
                title={`Buka ${p.name}`}
                secondary
                disabled={busy}
                onPress={() => {
                  setSelected(p);
                  setItem(null);
                }}
              />
            </Card>
          ))}
        </>
      )}
      {selected && (
        <>
          <Button
            title="Kembali ke daftar acara"
            secondary
            disabled={busy}
            onPress={() => {
              setSelected(null);
              setItem(null);
            }}
          />
          <Card tone="mint">
            <Txt bold>
              {selected.summary.ready}/{selected.summary.total} siap (
              {selected.summary.percent}%)
            </Txt>
            <Txt>Estimasi {money(selected.summary.estimated)}</Txt>
            <Txt muted>{selected.summary.unpriced} item belum dianggarkan</Txt>
          </Card>
          <Card>
            <Field
              label="Nama acara"
              value={selected.name}
              onChangeText={(name) => setSelected({ ...selected, name })}
              maxLength={80}
            />
            <Field
              label="Tanggal acara (YYYY-MM-DD, opsional)"
              value={selected.date ?? ""}
              onChangeText={(date) =>
                setSelected({ ...selected, date: date || null })
              }
              maxLength={10}
            />
            <Field
              label="Lokasi"
              value={selected.location}
              onChangeText={(location) =>
                setSelected({ ...selected, location })
              }
              maxLength={120}
            />
            <Button
              title="Simpan detail acara"
              disabled={busy}
              onPress={() => save(selected)}
            />
          </Card>
          <Button
            title="Tambah item"
            disabled={busy || selected.items.length >= 200}
            onPress={() => {
              setItem({
                id: randomUUID(),
                group: "Persiapan",
                name: "",
                note: "",
                estimated: null,
                ready: false,
              });
              setAmount("");
            }}
          />
          {item && (
            <Card>
              <Txt bold>
                {selected.items.some((i) => i.id === item.id)
                  ? "Edit item"
                  : "Item baru"}
              </Txt>
              <Field
                label="Kelompok"
                value={item.group}
                onChangeText={(group) => setItem({ ...item, group })}
                maxLength={80}
              />
              <Field
                label="Nama item"
                value={item.name}
                onChangeText={(name) => setItem({ ...item, name })}
                maxLength={120}
              />
              <Field
                label="Catatan / tema"
                value={item.note}
                onChangeText={(note) => setItem({ ...item, note })}
                maxLength={300}
              />
              <Field
                label="Estimasi biaya (Rp)"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="Belum dianggarkan"
                maxLength={13}
              />
              <Button
                title="Simpan item"
                disabled={busy}
                onPress={() => {
                  const next = {
                    ...item,
                    estimated: amount.trim() ? Number(amount) : null,
                  };
                  save({
                    ...selected,
                    items: selected.items.some((i) => i.id === item.id)
                      ? selected.items.map((i) => (i.id === item.id ? next : i))
                      : [...selected.items, next],
                  });
                }}
              />
              <Button
                title="Batal edit item"
                secondary
                disabled={busy}
                onPress={() => setItem(null)}
              />
            </Card>
          )}
          {[...new Set(selected.items.map((i) => i.group))].map((group) => (
            <View key={group} style={{ gap: 12 }}>
              <Txt large>{group}</Txt>
              {selected.items
                .filter((i) => i.group === group)
                .map((i) => (
                  <Card key={i.id}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Txt bold>{i.name}</Txt>
                        <Txt muted>{i.note}</Txt>
                      </View>
                      <Switch
                        accessibilityLabel={`Kesiapan ${i.name}`}
                        disabled={busy}
                        value={i.ready}
                        trackColor={{ true: c.primary }}
                        onValueChange={(ready) =>
                          save({
                            ...selected,
                            items: selected.items.map((x) =>
                              x.id === i.id ? { ...x, ready } : x,
                            ),
                          })
                        }
                      />
                    </View>
                    <Txt>
                      {i.estimated === null
                        ? "Belum dianggarkan"
                        : money(i.estimated)}
                    </Txt>
                    <Button
                      title={`Edit ${i.name}`}
                      secondary
                      disabled={busy}
                      onPress={() => {
                        setItem(i);
                        setAmount(
                          i.estimated === null ? "" : String(i.estimated),
                        );
                      }}
                    />
                    <Button
                      title={`Hapus ${i.name}`}
                      danger
                      disabled={busy}
                      onPress={() => {
                        confirm("Hapus item?", i.name, () =>
                          save({
                            ...selected,
                            items: selected.items.filter((x) => x.id !== i.id),
                          }),
                        );
                      }}
                    />
                  </Card>
                ))}
            </View>
          ))}
          {data?.canDelete && (
            <Card>
              <Txt bold>Hapus seluruh rencana</Txt>
              <Field
                label={`Ketik nama acara: ${selected.name}`}
                value={name}
                onChangeText={setName}
                maxLength={80}
              />
              <Button
                title="Hapus seluruh rencana"
                danger
                disabled={busy || name !== selected.name}
                onPress={() => {
                  confirm(
                    "Hapus seluruh rencana?",
                    "Semua item persiapan acara ini akan dihapus.",
                    () =>
                      void mutate({
                        action: "delete",
                        id: selected.id,
                        revision: selected.revision,
                        confirmation: name,
                      }),
                  );
                }}
              />
            </Card>
          )}
        </>
      )}
      <Button
        title="Kembali ke UangKita"
        secondary
        onPress={() => router.back()}
      />
    </Page>
  );
}
