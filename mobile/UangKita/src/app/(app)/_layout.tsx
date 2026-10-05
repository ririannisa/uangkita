import { Stack, router } from "expo-router";
import { Pressable } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useColors } from "@/components/finance-ui";

export default function AppLayout() {
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.ink,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: c.bg },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        headerLeft: ({ canGoBack }) =>
          canGoBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kembali ke fitur sebelumnya"
              onPress={() => router.back()}
              style={{ minWidth: 48, minHeight: 48, justifyContent: "center" }}
            >
              <ChevronLeft size={25} color={c.primary} />
            </Pressable>
          ) : null,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "UangKita", headerShown: false }}
      />
      <Stack.Screen name="activity" options={{ title: "Aktivitas" }} />
      <Stack.Screen name="budget" options={{ title: "Anggaran" }} />
      <Stack.Screen
        name="budget-detail"
        options={{ title: "Rincian anggaran" }}
      />
      <Stack.Screen name="savings" options={{ title: "Tabungan" }} />
      <Stack.Screen name="bills" options={{ title: "Tagihan rutin" }} />
      <Stack.Screen name="analytics" options={{ title: "Analitik" }} />
      <Stack.Screen name="account" options={{ title: "Akun saya" }} />
      <Stack.Screen name="spaces" options={{ title: "Ruang bersama" }} />
      <Stack.Screen name="space" options={{ title: "Keuangan bersama" }} />
      <Stack.Screen
        name="form"
        options={{ title: "Catatan keuangan", presentation: "card" }}
      />
    </Stack>
  );
}
