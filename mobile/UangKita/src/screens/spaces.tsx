import { useCallback, useRef, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  Button,
  Card,
  Field,
  Metric,
  Page,
  Progress,
  Row,
  Transactions,
  Txt,
  confirm,
} from "@/components/finance-ui";
import { api } from "@/lib/api";
import { useFinance } from "@/lib/store";
import { useSpace } from "@/lib/shared";
import {
  inActivityMonth,
  money,
  sharedFigures,
  sharedRealization,
  type SpaceAction,
} from "@/lib/finance";

export function SpacesScreen() {
  const store = useFinance();
  const { demo, loadSpaces, setError } = store;
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"couple" | "family">("couple");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!demo) loadSpaces().catch((e) => setError(e.message));
    }, [demo, loadSpaces, setError]),
  );
  async function act(action: SpaceAction) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await api("/api/spaces", action);
      await store.loadSpaces();
      setName("");
    } catch (e) {
      store.setError(e instanceof Error ? e.message : "Belum berhasil.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  if (store.demo)
    return (
      <Page period={false}>
        <Card title="Ruang bersama">
          <Txt>
            Kelola uang pasangan atau keluarga, lengkap dengan kontribusi,
            anggaran, dan riwayat anggota.
          </Txt>
          <Txt muted>
            Masuk dengan akunmu untuk memakai ruang bersama. Mode demo memakai
            data pribadi di perangkat.
          </Txt>
        </Card>
      </Page>
    );
  return (
    <Page period={false} refresh={store.loadSpaces}>
      <Txt large>Uang bersama,{"\n"}rencana bersama.</Txt>
      {store.spaces.invitations.map((invite) => (
        <Card key={invite.id} title={`Undangan: ${invite.spaceName}`}>
          <Txt muted>Berlaku hingga {invite.expiresAt.slice(0, 10)}</Txt>
          <Row>
            <Button
              title="Terima undangan"
              disabled={busy || !store.spaces.emailVerified}
              onPress={() => act({ action: "accept", invitationId: invite.id })}
            />
            <Button
              secondary
              title="Tolak"
              disabled={busy}
              onPress={() =>
                act({ action: "decline", invitationId: invite.id })
              }
            />
          </Row>
          {!store.spaces.emailVerified && (
            <Button
              secondary
              title="Verifikasi email"
              onPress={() => router.push("/account")}
            />
          )}
        </Card>
      ))}
      {store.spaces.spaces.map((space) => (
        <Card key={space.id} title={space.name}>
          <Txt muted>
            {space.kind === "couple" ? "Pasangan" : "Keluarga"} ·{" "}
            {space.role === "owner" ? "Pemilik" : "Anggota"}
          </Txt>
          <Button
            title="Buka ruang"
            onPress={() =>
              router.push({ pathname: "/space", params: { scope: space.id } })
            }
          />
        </Card>
      ))}
      <Card title="Buat ruang baru">
        <Field
          label="Nama ruang"
          value={name}
          onChangeText={setName}
          maxLength={80}
        />
        <Row>
          <Button
            secondary={kind !== "couple"}
            title="Pasangan"
            onPress={() => setKind("couple")}
          />
          <Button
            secondary={kind !== "family"}
            title="Keluarga"
            onPress={() => setKind("family")}
          />
        </Row>
        <Button
          title="Buat ruang"
          disabled={busy || !name.trim()}
          onPress={() => act({ action: "create", name, kind })}
        />
      </Card>
    </Page>
  );
}
export function SpaceScreen() {
  const { scope = "", mode = "summary" } = useLocalSearchParams<{
    scope: string;
    mode?: string;
  }>();
  const store = useFinance();
  const shared = useSpace(scope);
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const space = store.spaces.spaces.find((s) => s.id === scope);
  const owner = space?.role === "owner";
  async function act(action: SpaceAction) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await api("/api/spaces", action);
      await store.loadSpaces();
      if (action.action === "deleteSpace") router.back();
      else await shared.reload();
    } catch (e) {
      store.setError(
        e instanceof Error ? e.message : "Perubahan belum berhasil.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  if (!shared.data)
    return (
      <Page>
        <Card>
          <Txt>{shared.error || "Memuat ruang…"}</Txt>
          <Button
            secondary
            title="Coba lagi"
            onPress={() =>
              shared.reload().catch((e) => store.setError(e.message))
            }
          />
        </Card>
      </Page>
    );
  const { finance, details } = shared.data;
  const f = sharedFigures(finance, store.month);
  const budgets = finance.budgets.filter((b) => b.month === store.month);
  return (
    <Page refresh={shared.reload}>
      <Txt large>{space?.name || "Ruang bersama"}</Txt>
      <Row>
        {[
          ["summary", "Ringkasan"],
          ["activity", "Aktivitas ruang"],
          ["budget", "Anggaran ruang"],
          ["members", "Anggota"],
        ].map(([value, label]) => (
          <Button
            compact
            key={value}
            title={label}
            secondary={mode !== value}
            onPress={() => {
              if (mode !== value)
                router.push({
                  pathname: "/space",
                  params: { scope, mode: value },
                });
            }}
          />
        ))}
      </Row>
      {shared.error !== "" && <Txt>{shared.error}</Txt>}
      {mode === "summary" && (
        <>
          <Card tone="mint">
            <Metric label="Saldo ruang · sampai bulan ini" value={f.balance} />
            <Metric label="Kontribusi bulan ini" value={f.contributions} />
            <Metric label="Pengeluaran bulan ini" value={f.expense} />
            <Metric
              label="Pengeluaran dibayar bulan ini"
              value={f.cashExpense}
            />
          </Card>
          <Row>
            <Button
              title="＋ Kontribusi"
              onPress={() =>
                router.push({
                  pathname: "/form",
                  params: { kind: "entry", type: "contribution", scope },
                })
              }
            />
            <Button
              secondary
              title="Catat pengeluaran"
              onPress={() =>
                router.push({
                  pathname: "/form",
                  params: { kind: "entry", type: "out", scope },
                })
              }
            />
          </Row>
          <Txt muted>
            Kontribusi mengurangi saldo pribadimu dan menambah saldo ruang.
          </Txt>
          <Transactions
            entries={finance.entries
              .filter((e) => inActivityMonth(e, store.month))
              .sort((a, b) => b.date.localeCompare(a.date))}
            scope={scope}
            limit={5}
          />
        </>
      )}
      {mode === "activity" && (
        <>
          <Button
            title="＋ Catat transaksi ruang"
            onPress={() =>
              router.push({
                pathname: "/form",
                params: { kind: "entry", type: "out", scope },
              })
            }
          />
          <Transactions
            entries={finance.entries
              .filter((e) => inActivityMonth(e, store.month))
              .sort((a, b) => b.date.localeCompare(a.date))}
            scope={scope}
          />
        </>
      )}
      {mode === "budget" && (
        <>
          {owner && (
            <Button
              title="＋ Buat anggaran ruang"
              onPress={() =>
                router.push({
                  pathname: "/form",
                  params: { kind: "budget", scope },
                })
              }
            />
          )}
          {budgets.map((b) => {
            const r = sharedRealization(finance, b);
            const percent = Math.round((r.spent / b.planned) * 100);
            return (
              <Card key={b.id} title={b.name}>
                <Txt>
                  {money(r.spent)} / {money(b.planned)} · {percent}%
                </Txt>
                <Progress percent={percent} label={b.name} />
                <Txt>Sisa {money(b.planned - r.spent)}</Txt>
                {owner && (
                  <Button
                    secondary
                    title="Ubah anggaran ruang"
                    onPress={() =>
                      router.push({
                        pathname: "/form",
                        params: { kind: "budget", scope, id: b.id },
                      })
                    }
                  />
                )}
                <Transactions entries={r.entries} scope={scope} limit={3} />
              </Card>
            );
          })}
          {!budgets.length && (
            <Txt muted>Belum ada anggaran untuk bulan ini.</Txt>
          )}
        </>
      )}
      {mode === "members" && (
        <>
          {details.members.map((member) => (
            <Card key={member.userId} title={member.name}>
              <Txt muted>{member.email}</Txt>
              {owner && member.userId !== space?.ownerId && (
                <Button
                  danger
                  title="Keluarkan anggota"
                  disabled={busy}
                  onPress={() =>
                    confirm("Keluarkan anggota?", member.name, () =>
                      act({
                        action: "removeMember",
                        spaceId: scope,
                        userId: member.userId,
                      }),
                    )
                  }
                />
              )}
            </Card>
          ))}
          {owner && (
            <Card title="Undang anggota">
              <Field
                label="Email anggota"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Button
                title="Kirim undangan"
                disabled={busy || !email.trim()}
                onPress={() => act({ action: "invite", spaceId: scope, email })}
              />
            </Card>
          )}
          {details.invitations.map((invite) => (
            <Card key={invite.id} title={invite.email}>
              <Txt muted>Undangan belum diterima</Txt>
              {owner && (
                <Button
                  danger
                  title="Batalkan undangan"
                  disabled={busy}
                  onPress={() =>
                    act({
                      action: "revoke",
                      spaceId: scope,
                      invitationId: invite.id,
                    })
                  }
                />
              )}
            </Card>
          ))}
          {owner && (
            <Card title="Kategori ruang">
              <Field
                label="Nama kategori baru"
                value={category}
                onChangeText={setCategory}
                maxLength={80}
              />
              <Button
                title="Tambah kategori ruang"
                disabled={shared.busy || !category.trim()}
                onPress={async () => {
                  if (await shared.save({ action: "category", name: category }))
                    setCategory("");
                }}
              />
            </Card>
          )}
          <Card title="Riwayat perubahan">
            {details.events.map((event) => (
              <ViewEvent
                key={event.id}
                text={`${event.actorName} · ${event.action}`}
                detail={`${event.detail.category ?? event.detail.name ?? event.detail.email ?? ""}${event.detail.amount ? ` · ${money(event.detail.amount)}` : ""}`}
                date={event.createdAt}
              />
            ))}
          </Card>
          {owner && (
            <Card title="Hapus ruang">
              <Txt muted>
                Seluruh data ruang akan dihapus. Ketik nama ruang untuk
                konfirmasi.
              </Txt>
              <Field
                label="Nama ruang untuk konfirmasi"
                value={confirmation}
                onChangeText={setConfirmation}
              />
              <Button
                danger
                title="Hapus ruang permanen"
                disabled={busy || confirmation !== space?.name}
                onPress={() =>
                  confirm(
                    "Hapus ruang permanen?",
                    "Transaksi, anggaran, anggota, dan riwayat ruang akan dihapus.",
                    () =>
                      act({
                        action: "deleteSpace",
                        spaceId: scope,
                        confirmation,
                      }),
                  )
                }
              />
            </Card>
          )}
        </>
      )}
    </Page>
  );
}
function ViewEvent({
  text,
  detail,
  date,
}: {
  text: string;
  detail: string;
  date: string;
}) {
  return (
    <Card>
      <Txt bold>{text}</Txt>
      <Txt muted>
        {detail} · {date.slice(0, 10)}
      </Txt>
    </Card>
  );
}
