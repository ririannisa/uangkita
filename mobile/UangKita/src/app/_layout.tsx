import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FinanceProvider, useFinance } from "@/lib/store";
import { Loading, useColors } from "@/components/finance-ui";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <FinanceProvider>
        <Routes />
      </FinanceProvider>
    </SafeAreaProvider>
  );
}
function Routes() {
  const { user, ready } = useFinance();
  const c = useColors();
  if (!ready) return <Loading />;
  return (
    <>
      <StatusBar style={c.dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Protected guard={!user}>
          <Stack.Screen name="login" />
        </Stack.Protected>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
