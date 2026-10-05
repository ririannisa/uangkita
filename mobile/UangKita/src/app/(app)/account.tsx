import { useState } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import {
  Button,
  Card,
  Field,
  Page,
  Row,
  Txt,
  confirm,
} from "@/components/finance-ui";
import { useFinance } from "@/lib/store";
import { api } from "@/lib/api";
import { backupSchema, categoryOptions, today } from "@/lib/finance";

export default function AccountScreen() {
  const store = useFinance();
  const [category, setCategory] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [working, setWorking] = useState(false);
  const [reset, setReset] = useState("");
  const busy = store.busy || working;
  async function exportBackup() {
    setWorking(true);
    try {
      const backup = backupSchema.parse({
        version: 1,
        ...store.data,
        entries: store.data.entries.filter((e) => !e.spaceId),
      });
      const text = JSON.stringify(backup, null, 2);
      const name = `uangkita-${today()}.json`;
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(
          new Blob([text], { type: "application/json" }),
        );
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = name;
        anchor.click();
        URL.revokeObjectURL(url);
      } else {
        const file = new File(Paths.cache, name);
        file.write(text);
        if (await Sharing.isAvailableAsync())
          await Sharing.shareAsync(file.uri, {
            mimeType: "application/json",
            dialogTitle: "Simpan cadangan UangKita",
            UTI: "public.json",
          });
        else throw new Error("Berbagi file belum tersedia di perangkat ini.");
      }
    } catch (e) {
      store.setError(
        e instanceof Error ? e.message : "Cadangan belum dapat dibuat.",
      );
    } finally {
      setWorking(false);
    }
  }
  async function importBackup() {
    setWorking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/plain"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if ((asset.size ?? 0) > 4000000)
        throw new Error("Ukuran cadangan terlalu besar (maksimal 4 MB).");
      const text =
        Platform.OS === "web" && asset.file
          ? await asset.file.text()
          : await new File(asset.uri).text();
      if (text.length > 4000000)
        throw new Error("Ukuran cadangan terlalu besar.");
      const backup = backupSchema.parse(JSON.parse(text));
      confirm(
        "Pulihkan cadangan?",
        `${backup.entries.length} transaksi akan menggantikan seluruh data pribadimu. Data ruang bersama tetap tersimpan.`,
        () => {
          void store.save({ action: "import", backup });
        },
      );
    } catch (e) {
      store.setError(e instanceof Error ? e.message : "Cadangan tidak valid.");
    } finally {
      setWorking(false);
    }
  }
  async function verify() {
    setWorking(true);
    try {
      await api(
        otpSent
          ? "/api/auth/email-otp/verify-email"
          : "/api/auth/email-otp/send-verification-otp",
        otpSent
          ? { email: store.user?.email, otp }
          : { email: store.user?.email, type: "email-verification" },
      );
      if (otpSent) {
        await store.loadSpaces();
        setOtpSent(false);
        setOtp("");
      } else setOtpSent(true);
    } catch (e) {
      store.setError(
        e instanceof Error ? e.message : "Verifikasi belum berhasil.",
      );
    } finally {
      setWorking(false);
    }
  }
  return (
    <Page period={false}>
      <Card tone="mint" title={store.user?.name}>
        <Txt>{store.user?.email}</Txt>
        <Txt muted>
          {store.demo
            ? "Akun contoh · data lokal"
            : "Akun pribadi · terhubung ke web"}
        </Txt>
      </Card>
      <Card title="Pengaturan keuangan">
        <Button
          secondary
          title="Atur pemasukan rutin"
          onPress={() => router.push("/form?kind=income")}
        />
        <Button
          secondary
          title="Kelola tagihan rutin"
          onPress={() => router.push("/bills")}
        />
        <Button
          secondary
          title="Analitik keuangan"
          onPress={() => router.push("/analytics")}
        />
        <Button
          secondary
          title="Ruang bersama"
          onPress={() => router.push("/spaces")}
        />
      </Card>
      <Card title="Tampilan">
        <Row>
          {[
            ["auto", "Ikuti perangkat"],
            ["light", "Terang"],
            ["dark", "Gelap"],
          ].map(([value, label]) => (
            <Button
              compact
              key={value}
              title={label}
              secondary={store.theme !== value}
              onPress={() => store.setTheme(value as "auto" | "light" | "dark")}
            />
          ))}
        </Row>
        <Button
          secondary
          title={store.hidden ? "Tampilkan nominal" : "Sembunyikan nominal"}
          onPress={() => store.setHidden(!store.hidden)}
        />
      </Card>
      <Card title="Kategori pribadi">
        <Txt muted>{categoryOptions(store.data).join(" · ")}</Txt>
        <Field
          label="Nama kategori baru"
          value={category}
          onChangeText={setCategory}
          maxLength={80}
        />
        <Button
          title="Tambah kategori"
          disabled={busy || !category.trim()}
          onPress={async () => {
            if (await store.save({ action: "category", name: category }))
              setCategory("");
          }}
        />
      </Card>
      {!store.demo && !store.spaces.emailVerified && (
        <Card title="Verifikasi email">
          <Txt muted>
            Verifikasi email agar dapat menerima undangan ruang bersama.
          </Txt>
          {otpSent && (
            <Field
              label="Kode verifikasi"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={8}
            />
          )}
          <Button
            title={otpSent ? "Verifikasi kode" : "Kirim kode verifikasi"}
            disabled={busy || (otpSent && !otp)}
            onPress={verify}
          />
        </Card>
      )}
      <Card title="Cadangan data">
        <Txt muted>
          Simpan cadangan pribadi atau pulihkan dari file JSON web UangKita.
        </Txt>
        <Button
          secondary
          title="Ekspor cadangan"
          disabled={busy}
          onPress={exportBackup}
        />
        <Button
          secondary
          title="Impor cadangan"
          disabled={busy}
          onPress={importBackup}
        />
      </Card>
      <Button
        secondary
        title={store.demo ? "Keluar dari mode demo" : "Keluar dari akun"}
        disabled={busy}
        onPress={() =>
          confirm(
            "Keluar?",
            "Kamu dapat masuk kembali kapan saja.",
            () => {
              void store.logout();
            },
            false,
          )
        }
      />
      <Card title="Hapus data pribadi">
        <Txt muted>
          Ketik HAPUS untuk mengosongkan transaksi dan rencana pribadi. Tindakan
          ini tidak dapat dibatalkan.
        </Txt>
        <Field
          label="Konfirmasi penghapusan"
          value={reset}
          onChangeText={setReset}
          autoCapitalize="characters"
        />
        <Button
          danger
          title="Hapus semua data pribadi"
          disabled={busy || reset !== "HAPUS"}
          onPress={() =>
            confirm(
              "Hapus semua data pribadi?",
              "Simpan cadangan terlebih dahulu bila masih diperlukan.",
              async () => {
                if (
                  await store.save({ action: "reset", confirmation: "HAPUS" })
                )
                  setReset("");
              },
            )
          }
        />
      </Card>
    </Page>
  );
}
