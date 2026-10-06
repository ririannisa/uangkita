import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import {
  Brand,
  Button,
  Field,
  IconButton,
  Page,
  Txt,
  useColors,
} from "@/components/finance-ui";
import { WalletArt } from "@/components/wallet-art";
import { useFinance } from "@/lib/store";
import { apiURL } from "@/lib/api";

export default function LoginScreen() {
  const store = useFinance();
  const c = useColors();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [visible, setVisible] = useState(false);
  return (
    <Page
      period={false}
      header={
        <>
          <Brand />
          <View
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              padding: 7,
              borderRadius: 24,
              backgroundColor: c.surface,
              transform: [{ rotate: "-3deg" }],
            }}
          >
            <Sparkles size={13} color={c.green} />
            <Text style={{ fontSize: 10, color: c.green }}>
              Teman baik dompetmu
            </Text>
          </View>
          <View
            style={{
              position: "absolute",
              right: 8,
              top: 53,
              transform: [{ rotate: "10deg" }],
            }}
          >
            <WalletArt />
          </View>
          <Text
            style={{
              fontSize: 33,
              fontWeight: "800",
              letterSpacing: -1.3,
              lineHeight: 39,
              color: c.ink,
            }}
          >
            Uang rapi.{"\n"}Hidup lebih{" "}
            <Text style={{ color: c.primary }}>happy.</Text>
          </Text>
          <Text style={{ fontSize: 11, lineHeight: 19, color: c.green }}>
            Buat jajan hari ini, nabung buat nanti.{"\n"}Yuk, kasih ruang buat
            semua rencanamu.
          </Text>
        </>
      }
    >
      <View style={{ paddingHorizontal: 5, paddingTop: 5, gap: 17 }}>
        <View style={{ gap: 7 }}>
          <Text style={{ fontSize: 9, letterSpacing: 1.5, color: c.muted }}>
            DOMPETMU, CERITAMU
          </Text>
          <Text style={{ fontSize: 28, fontWeight: "700", color: c.ink }}>
            {register ? "Mulai bareng, yuk!" : "Halo, kamu!"}
          </Text>
          <View
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              backgroundColor: c.cream,
              padding: 10,
              borderRadius: 14,
              transform: [{ rotate: "8deg" }],
            }}
          >
            <Text style={{ fontSize: 24 }}>{register ? "🌱" : "👋"}</Text>
          </View>
          <View style={{ maxWidth: 270 }}>
            <Txt muted>
              {register
                ? "Satu akun untuk semua rencana kecil dan mimpi besarmu."
                : "Senang kamu mampir. Yuk, lanjut merawat dompetmu."}
            </Txt>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Masuk dengan Google"
          accessibilityState={{ disabled: store.busy || !apiURL }}
          disabled={store.busy || !apiURL}
          onPress={store.loginGoogle}
          style={({ pressed }) => ({
            minHeight: 50,
            flexDirection: "row",
            alignItems: "center",
            gap: 11,
            paddingHorizontal: 15,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.line,
            backgroundColor: c.surface,
            opacity: store.busy || !apiURL ? 0.45 : pressed ? 0.7 : 1,
          })}
        >
          <Svg width={19} height={19} viewBox="0 0 48 48">
            <Path
              fill="#4285F4"
              d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.8 6.1-14.9Z"
            />
            <Path
              fill="#34A853"
              d="M24 44c5.5 0 10.1-1.8 13.5-4.6l-6.6-5c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.3H5.8v5.2A20.4 20.4 0 0 0 24 44Z"
            />
            <Path
              fill="#FBBC05"
              d="M12.6 28a12 12 0 0 1 0-8v-5.2H5.8a20 20 0 0 0 0 18.4L12.6 28Z"
            />
            <Path
              fill="#EA4335"
              d="M24 11.7c3 0 5.6 1 7.7 3l5.8-5.8A19.5 19.5 0 0 0 24 4 20.4 20.4 0 0 0 5.8 14.8l6.8 5.2c1.6-4.7 6.1-8.3 11.4-8.3Z"
            />
          </Svg>
          <Txt bold>Google</Txt>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 10, color: c.muted }}>
            lanjut dengan akunmu
          </Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ height: 1, backgroundColor: c.line, flex: 1 }} />
          <Text style={{ fontSize: 11, color: c.muted }}>atau pakai email</Text>
          <View style={{ height: 1, backgroundColor: c.line, flex: 1 }} />
        </View>
        {register && (
          <Field
            label="Nama lengkap"
            value={name}
            onChangeText={setName}
            placeholder="Nama panggilanmu"
            maxLength={80}
            autoComplete="name"
            editable={!store.busy}
          />
        )}
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="nama@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          maxLength={254}
          editable={!store.busy}
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Minimal 8 karakter"
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoComplete={register ? "new-password" : "current-password"}
          maxLength={128}
          editable={!store.busy}
          trailing={
            <IconButton
              icon={visible ? EyeOff : Eye}
              label={visible ? "Sembunyikan password" : "Tampilkan password"}
              onPress={() => setVisible(!visible)}
            />
          }
        />
        <Button
          title={
            store.busy
              ? "Sebentar, ya…"
              : register
                ? "Buat akun"
                : "Masuk ke UangKita"
          }
          disabled={
            store.busy ||
            !apiURL ||
            !email.trim() ||
            password.length < 8 ||
            (register && !name.trim())
          }
          onPress={() =>
            store.login(email, password, register ? name : undefined)
          }
        />
        <Pressable
          accessibilityRole="button"
          disabled={store.busy}
          onPress={() => {
            setRegister(!register);
            store.setError("");
          }}
          style={{
            minHeight: 44,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 12, color: c.muted }}>
            {register ? "Sudah punya akun? " : "Belum punya akun? "}
            <Text style={{ color: c.primary, fontWeight: "700" }}>
              {register ? "Masuk" : "Daftar sekarang"}
            </Text>
          </Text>
        </Pressable>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 7,
          }}
        >
          <ShieldCheck size={15} color={c.green} />
          <Text style={{ fontSize: 11, color: c.muted }}>
            Catatan pribadi, untuk kamu sendiri.
          </Text>
        </View>
      </View>
    </Page>
  );
}
