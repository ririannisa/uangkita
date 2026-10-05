import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { api } from "./api";
import { useFinance } from "./store";
import {
  sharedMutationSchema,
  type SharedFinance,
  type SpaceDetails,
} from "./finance";

export type SharedData = { finance: SharedFinance; details: SpaceDetails };
export function useSpace(id?: string) {
  const store = useFinance();
  const [data, setData] = useState<SharedData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const reload = useCallback(async () => {
    if (!id || store.demo) return;
    setData(
      await api<SharedData>(`/api/spaces/${encodeURIComponent(id)}/finance`),
    );
    setError("");
  }, [id, store.demo]);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (id && !store.demo)
        api<SharedData>(`/api/spaces/${encodeURIComponent(id)}/finance`)
          .then((result) => {
            if (alive) {
              setData(result);
              setError("");
            }
          })
          .catch((e) => {
            if (alive) setError(e.message);
          });
      return () => {
        alive = false;
      };
    }, [id, store.demo]),
  );
  async function save(input: unknown) {
    if (!id || pending.current || store.demo) return false;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const parsed = sharedMutationSchema.safeParse(input);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      await api(`/api/spaces/${encodeURIComponent(id)}/finance`, parsed.data);
      await reload().catch(() =>
        store.setError(
          "Perubahan ruang sudah tersimpan. Muat ulang untuk memperbarui tampilan.",
        ),
      );
      await store.reload().catch(() => undefined);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Perubahan belum tersimpan.");
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { data, busy, error, reload, save };
}
