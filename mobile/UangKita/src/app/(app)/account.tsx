import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import {
  ArrowDownLeft,
  Wallet,
  ChartNoAxesCombined,
  UsersRound,
  Monitor,
  Sun,
  Moon,
  Sparkles,
  Eye,
  EyeOff,
  Tags,
  Download,
  Upload,
  LogOut,
  ShieldCheck,
  Trash2,
  Palette,
  Plus,
} from "lucide-react-native";
import { router } from "expo-router";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import {
  Button,
  Card,
  MenuRow,
  Field,
  Page,
  Row,
  Txt,
  confirm,
  useColors,
} from "@/components/finance-ui";
import { useFinance } from "@/lib/store";
import { api } from "@/lib/api";
import { backupSchema, categoryOptions, today } from "@/lib/finance";

export default function AccountScreen() {
  const store = useFinance();
  const c = useColors();
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
      <Card tone="lilac">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: c.lilac,
              borderWidth: 1,
              borderColor: c.primary,
            }}
          >
            <Text style={{ fontSize: 25, fontWeight: "700", color: c.primary }}>
              {store.user?.name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt large>{store.user?.name}</Txt>
            <Txt muted>Ruang pribadi untuk rencana besarmu.</Txt>
          </View>
        </View>
        <Txt>{store.user?.email}</Txt>
        <Txt muted>Akun pribadi · terhubung ke web</Txt>
      </Card>
      <Card title="Pengaturan keuangan" icon={Wallet}>
        <MenuRow
          icon={ArrowDownLeft}
          description="Pendapatan bulanan sebagai dasar rencanamu"
          title="Atur pemasukan rutin"
          onPress={() => router.push("/form?kind=income")}
        />
        <MenuRow
          icon={Wallet}
          description="Pantau pengeluaran tetap dan jatuh tempo"
          title="Kelola tagihan rutin"
          onPress={() => router.push("/bills")}
        />
        <MenuRow
          icon={ChartNoAxesCombined}
          description="Grafik, kategori terbesar, dan kesehatan kredit"
          title="Analitik keuangan"
          onPress={() => router.push("/analytics")}
        />
        <MenuRow
          icon={UsersRound}
          description="Satu dompet untuk pasangan atau keluarga"
          title="Ruang bersama"
          onPress={() => router.push("/spaces")}
        />
      </Card>
      <Card title="Tampilan" icon={Palette}>
        <Txt muted>Pilih suasana yang paling nyaman untukmu.</Txt>
        <Row>
          {(
            [
              [
                "auto",
                "Ikuti perangkat",
                Monitor,
                ["#7254ad", "#def3ec", "#eee5f8"],
              ],
              ["light", "Terang", Sun, ["#ffffff", "#7254ad", "#def3ec"]],
              ["dark", "Gelap", Moon, ["#171f25", "#bfa4ec", "#8dd6c1"]],
              ["neon", "Neon", Sparkles, ["#7c3aed", "#a855f7", "#22d3ee"]],
            ] as const
          ).map(([value, label, Icon, swatches]) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: store.theme === value }}
              onPress={() => store.setTheme(value)}
              style={{
                flexBasis: "46%",
                flexGrow: 1,
                minHeight: 102,
                gap: 12,
                padding: 14,
                borderRadius: 16,
                borderWidth: store.theme === value ? 2 : 1,
                borderColor: store.theme === value ? c.primary : c.line,
                backgroundColor: store.theme === value ? c.lilac : c.surface,
              }}
            >
              <Icon size={21} color={c.primary} />
              <Text style={{ color: c.ink, fontSize: 12, fontWeight: "700" }}>
                {label}
              </Text>
              <View style={{ flexDirection: "row", gap: 5 }}>
                {swatches.map((color) => (
                  <View
                    key={color}
                    style={{
                      width: 18,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: color,
                    }}
                  />
                ))}
              </View>
            </Pressable>
          ))}
        </Row>
        <MenuRow
          icon={store.hidden ? Eye : EyeOff}
          description="Atur privasi angka di layar dan grafik"
          title={store.hidden ? "Tampilkan nominal" : "Sembunyikan nominal"}
          onPress={() => store.setHidden(!store.hidden)}
        />
      </Card>
      <Card title="Kategori pribadi" icon={Tags}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(store.data.availableCategories ?? categoryOptions(store.data)).map((name) => (
            <View
              key={name}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 8,
                backgroundColor: c.lilac,
              }}
            >
              <Text style={{ color: c.primary, fontSize: 12 }}>{name}</Text>
            </View>
          ))}
        </View>
        <Field
          label="Nama kategori baru"
          value={category}
          onChangeText={setCategory}
          maxLength={80}
        />
        <Button
          title="Tambah kategori"
          icon={Plus}
          disabled={busy || !category.trim()}
          onPress={async () => {
            if (await store.save({ action: "category", name: category }))
              setCategory("");
          }}
        />
      </Card>
      {!store.spaces.emailVerified && (
        <Card title="Verifikasi email" icon={ShieldCheck}>
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
            icon={ShieldCheck}
            title={otpSent ? "Verifikasi kode" : "Kirim kode verifikasi"}
            disabled={busy || (otpSent && !otp)}
            onPress={verify}
          />
        </Card>
      )}
      <Card title="Cadangan data" icon={ShieldCheck}>
        <Txt muted>
          Simpan cadangan pribadi atau pulihkan dari file JSON web UangKita.
        </Txt>
        <MenuRow
          icon={Download}
          description="Simpan salinan transaksi dan rencana pribadi"
          title="Ekspor cadangan"
          disabled={busy}
          onPress={exportBackup}
        />
        <MenuRow
          icon={Upload}
          description="Pulihkan catatan dari cadangan UangKita"
          title="Impor cadangan"
          disabled={busy}
          onPress={importBackup}
        />
      </Card>
      <Card>
        <MenuRow
          icon={LogOut}
          description="Akunmu bisa dibuka kembali kapan saja"
          title="Keluar dari akun"
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
      </Card>
      <Card title="Hapus data pribadi" icon={Trash2}>
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
          icon={Trash2}
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
