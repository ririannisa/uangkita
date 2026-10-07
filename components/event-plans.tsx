"use client";
import { useEffect, useState } from "react";
import { money } from "@/lib/finance";
import {
  planFieldsSchema,
  type EventPlan,
  type PlanItem,
  type PlanOverview,
} from "@/lib/event-plans";
import "./event-plans.css";

export default function EventPlans({ spaceId }: { spaceId?: string }) {
  const endpoint = `/api/event-plans${spaceId ? `?spaceId=${encodeURIComponent(spaceId)}` : ""}`;
  const [data, setData] = useState<PlanOverview | null>(null);
  const [selected, setSelected] = useState<EventPlan | null>(null);
  const [item, setItem] = useState<PlanItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function request(body?: unknown): Promise<PlanOverview> {
    const r = await fetch(
      endpoint,
      body
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : { cache: "no-store" },
    );
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Rencana belum dapat dimuat.");
    return d;
  }
  useEffect(() => {
    let alive = true;
    fetch(endpoint, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [endpoint]);
  async function mutate(body: unknown, id?: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await request(body);
      const next = await request();
      setData(next);
      setSelected(next.plans.find((p) => p.id === id) ?? null);
      setItem(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }
  function save(plan: EventPlan) {
    const fields = {
      name: plan.name,
      date: plan.date,
      location: plan.location,
      items: plan.items,
    };
    if (!planFieldsSchema.safeParse(fields).success) {
      setError(
        "Periksa nama, tanggal, dan estimasi rupiah. Maksimal 200 item.",
      );
      return;
    }
    return mutate(
      { action: "save", id: plan.id, revision: plan.revision, plan: fields },
      plan.id,
    );
  }
  return (
    <section className="event-plans">
      <h1>Persiapan Acara</h1>
      <p>
        {spaceId ? "Rencana bersama anggota ruang" : "Rencana pribadi"}.
        Kesiapan dan estimasi tidak mengurangi saldo. Catat pembayaran melalui
        pencatatan keuangan.
      </p>
      <p>
        Template bisa disesuaikan. Dokumen pernikahan mengikuti kebutuhan dan
        ketentuan KUA setempat.
      </p>
      {error && (
        <p role="alert" className="space-error">
          {error}
        </p>
      )}
      <button
        disabled={busy}
        onClick={async () => {
          if (
            selected &&
            !window.confirm(
              "Muat ulang dan buang perubahan yang belum disimpan?",
            )
          )
            return;
          setBusy(true);
          try {
            const next = await request();
            setData(next);
            setSelected(next.plans.find((p) => p.id === selected?.id) ?? null);
            setItem(null);
            setError("");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Gagal memuat.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Muat ulang
      </button>
      {!data && !error && <p>Memuat persiapan…</p>}
      {data && !selected && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void mutate({
                action: "create",
                kind: f.get("kind"),
                name: f.get("name"),
              });
            }}
          >
            <label>
              Nama acara
              <input
                name="name"
                maxLength={80}
                required
                placeholder="Mis. Lamaran kami"
              />
            </label>
            <label>
              Template
              <select name="kind">
                <option value="lamaran">Lamaran</option>
                <option value="wedding">Wedding</option>
              </select>
            </label>
            <button disabled={busy}>Buat rencana</button>
          </form>
          {!data.plans.length && <p>Belum ada rencana acara.</p>}
          {data.plans.map((p) => (
            <button
              className="event-plan-card"
              key={p.id}
              disabled={busy}
              onClick={() => {
                setSelected(p);
                setItem(null);
              }}
            >
              <strong>{p.name}</strong>
              <span>
                {p.date || "Tanggal belum diatur"} · {p.summary.ready}/
                {p.summary.total} siap ({p.summary.percent}%)
              </span>
              <span>
                Estimasi {money(p.summary.estimated)} · {p.summary.unpriced}{" "}
                item belum dianggarkan
              </span>
            </button>
          ))}
        </>
      )}
      {selected && (
        <>
          <button
            disabled={busy}
            onClick={() => {
              setSelected(null);
              setItem(null);
            }}
          >
            Kembali ke daftar
          </button>
          <p>
            {selected.summary.ready}/{selected.summary.total} siap (
            {selected.summary.percent}%) · Estimasi{" "}
            {money(selected.summary.estimated)} · {selected.summary.unpriced}{" "}
            item belum dianggarkan
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save(selected);
            }}
          >
            <label>
              Nama acara
              <input
                required
                maxLength={80}
                value={selected.name}
                onChange={(e) =>
                  setSelected({ ...selected, name: e.target.value })
                }
              />
            </label>
            <label>
              Tanggal acara
              <input
                type="date"
                min="2000-01-01"
                max="2100-12-31"
                value={selected.date ?? ""}
                onChange={(e) =>
                  setSelected({ ...selected, date: e.target.value || null })
                }
              />
            </label>
            <label>
              Lokasi
              <input
                maxLength={120}
                value={selected.location}
                onChange={(e) =>
                  setSelected({ ...selected, location: e.target.value })
                }
              />
            </label>
            <button disabled={busy}>Simpan detail acara</button>
          </form>
          <button
            disabled={busy || selected.items.length >= 200}
            onClick={() =>
              setItem({
                id: crypto.randomUUID(),
                group: "Persiapan",
                name: "",
                note: "",
                estimated: null,
                ready: false,
              })
            }
          >
            Tambah item
          </button>
          {item && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const exists = selected.items.some((i) => i.id === item.id);
                void save({
                  ...selected,
                  items: exists
                    ? selected.items.map((i) => (i.id === item.id ? item : i))
                    : [...selected.items, item],
                });
              }}
            >
              <h2>
                {selected.items.some((i) => i.id === item.id)
                  ? "Edit item"
                  : "Item baru"}
              </h2>
              <label>
                Kelompok
                <input
                  required
                  maxLength={80}
                  value={item.group}
                  onChange={(e) => setItem({ ...item, group: e.target.value })}
                />
              </label>
              <label>
                Nama item
                <input
                  required
                  maxLength={120}
                  value={item.name}
                  onChange={(e) => setItem({ ...item, name: e.target.value })}
                />
              </label>
              <label>
                Catatan / tema
                <input
                  maxLength={300}
                  value={item.note}
                  onChange={(e) => setItem({ ...item, note: e.target.value })}
                />
              </label>
              <label>
                Estimasi biaya (Rp)
                <input
                  type="number"
                  min="0"
                  max="1000000000000"
                  step="1"
                  value={item.estimated ?? ""}
                  onChange={(e) =>
                    setItem({
                      ...item,
                      estimated:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  placeholder="Belum dianggarkan"
                />
              </label>
              <button disabled={busy}>Simpan item</button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setItem(null)}
              >
                Batal
              </button>
            </form>
          )}
          {[...new Set(selected.items.map((i) => i.group))].map((group) => (
            <section key={group}>
              <h2>{group}</h2>
              {selected.items
                .filter((i) => i.group === group)
                .map((i) => (
                  <div className="event-item" key={i.id}>
                    <label className="event-check">
                      <input
                        type="checkbox"
                        checked={i.ready}
                        disabled={busy}
                        onChange={() =>
                          void save({
                            ...selected,
                            items: selected.items.map((x) =>
                              x.id === i.id ? { ...x, ready: !x.ready } : x,
                            ),
                          })
                        }
                      />
                      <span>
                        {i.name}
                        <small>{i.note}</small>
                        <small>
                          {i.estimated === null
                            ? "Belum dianggarkan"
                            : money(i.estimated)}
                        </small>
                      </span>
                    </label>
                    <button
                      disabled={busy}
                      onClick={() => setItem(i)}
                      aria-label={`Edit ${i.name}`}
                    >
                      Edit
                    </button>
                    <button
                      disabled={busy}
                      aria-label={`Hapus ${i.name}`}
                      onClick={() => {
                        if (window.confirm(`Hapus item ${i.name}?`))
                          void save({
                            ...selected,
                            items: selected.items.filter((x) => x.id !== i.id),
                          });
                      }}
                    >
                      Hapus
                    </button>
                  </div>
                ))}
            </section>
          ))}
          {data?.canDelete && (
            <button
              disabled={busy}
              onClick={() => {
                const confirmation = window.prompt(
                  `Ketik nama acara untuk menghapus seluruh rencana: ${selected.name}`,
                );
                if (confirmation !== null)
                  void mutate({
                    action: "delete",
                    id: selected.id,
                    revision: selected.revision,
                    confirmation,
                  });
              }}
            >
              Hapus seluruh rencana
            </button>
          )}
        </>
      )}
    </section>
  );
}
