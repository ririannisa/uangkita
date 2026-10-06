import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  type TextInputProps,
} from "react-native";
import { router, usePathname, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  House,
  ReceiptText,
  Target,
  Plus,
  UserRound,
  ChevronLeft,
  ChevronRight,
  Utensils,
  Bus,
  ShoppingBag,
  Wallet,
  Check,
  ChevronDown,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useFinance } from "@/lib/store";
import { shiftMonth } from "@/lib/core";
import { themeColors } from "@/lib/theme";
import { NeonBackground } from "./neon-background";
import {
  creditStatus,
  dateLabel,
  money,
  monthLabel,
  normalize,
  type Budget,
  type Entry,
  type SharedEntry,
} from "@/lib/finance";

export function useColors() {
  const { theme } = useFinance();
  const system = useColorScheme();
  return themeColors(theme, system);
}
export function Brand() {
  const c = useColors();
  return (
    <Text
      style={{
        fontSize: 29,
        fontWeight: "800",
        letterSpacing: -1.2,
        color: c.dark ? c.ink : "#284f4b",
      }}
    >
      Uang<Text style={{ color: c.neon ? "#22d3ee" : c.green }}>Kita</Text>
    </Text>
  );
}
export function IconButton({
  icon: Icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
      })}
    >
      <Icon size={20} strokeWidth={1.7} color={c.primary} />
    </Pressable>
  );
}
export function Txt({
  children,
  muted = false,
  large = false,
  bold = false,
  color,
}: {
  children: ReactNode;
  muted?: boolean;
  large?: boolean;
  bold?: boolean;
  color?: string;
}) {
  const c = useColors();
  return (
    <Text
      style={{
        color: color ?? (muted ? c.muted : c.ink),
        fontSize: large ? 25 : 14,
        lineHeight: large ? 34 : 21,
        fontWeight: bold || large ? "700" : "400",
      }}
    >
      {children}
    </Text>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  danger = false,
  disabled = false,
  compact = false,
  icon: Icon,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  compact?: boolean;
  icon?: LucideIcon;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        paddingVertical: 12,
        paddingHorizontal: compact ? 14 : 18,
        borderRadius: 12,
        backgroundColor: danger || secondary ? c.surface : c.primary,
        borderWidth: 1,
        borderColor: danger ? c.red : secondary ? c.line : c.primary,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 9,
        overflow: "hidden",
      })}
    >
      {c.neon && !secondary && !danger && <NeonBackground variant="button" />}
      {Icon && (
        <Icon
          size={19}
          color={
            danger
              ? c.red
              : secondary
                ? c.primary
                : c.neon
                  ? "#fff"
                  : c.dark
                    ? "#231934"
                    : "#fff"
          }
        />
      )}
      <Text
        style={{
          fontSize: 14,
          fontWeight: "700",
          color: danger
            ? c.red
            : secondary
              ? c.ink
              : c.neon
                ? "#fff"
                : c.dark
                  ? "#231934"
                  : "#fff",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Row({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      {children}
    </View>
  );
}
export function Card({
  title,
  children,
  tone,
  icon: Icon,
  testID,
}: {
  title?: string;
  children: ReactNode;
  tone?: "mint" | "lilac";
  icon?: LucideIcon;
  testID?: string;
}) {
  const c = useColors();
  return (
    <View
      testID={testID}
      style={{
        backgroundColor: tone ? (c.neon ? c.lilac : c[tone]) : c.surface,
        borderRadius: 20,
        padding: 20,
        gap: 16,
        borderWidth: 1,
        borderColor: c.neon && tone ? "#a78bfa55" : c.line,
        overflow: "hidden",
        boxShadow: c.neon
          ? "0 8px 24px #00000030, 0 0 20px #8b5cf612"
          : undefined,
      }}
    >
      {c.neon && <NeonBackground />}
      {title && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {Icon && <Icon size={20} color={c.primary} />}
          <View style={{ flex: 1 }}>
            <Txt bold>{title}</Txt>
          </View>
        </View>
      )}
      {children}
    </View>
  );
}
export function MenuRow({
  icon: Icon,
  title,
  description,
  onPress,
  disabled = false,
  danger = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        minHeight: 68,
        paddingVertical: 10,
        opacity: disabled ? 0.45 : pressed ? 0.65 : 1,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: danger ? c.peach : c.lilac,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: c.neon ? 1 : 0,
          borderColor: c.line,
        }}
      >
        <Icon size={21} color={danger ? c.red : c.primary} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Txt bold color={danger ? c.red : c.ink}>
          {title}
        </Txt>
        <Text style={{ color: c.muted, fontSize: 12, lineHeight: 18 }}>
          {description}
        </Text>
      </View>
      <ChevronRight size={18} color={c.muted} />
    </Pressable>
  );
}
export function ChoicePicker({
  label,
  value,
  options,
  onChange,
  searchable = false,
  disabled = false,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  searchable?: boolean;
  disabled?: boolean;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = options.filter((option) =>
    normalize(option.label).includes(normalize(query)),
  );
  const selected =
    options.find((option) => option.value === value)?.label ??
    (value || undefined) ??
    options[0]?.label;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          setQuery("");
          setOpen(true);
        }}
        style={{
          flex: 1,
          minWidth: 130,
          minHeight: 62,
          padding: 13,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: 14,
          backgroundColor: c.surface,
          gap: 5,
        }}
      >
        <Text style={{ color: c.muted, fontSize: 11 }}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Txt bold>{selected}</Txt>
          </View>
          <ChevronDown size={17} color={c.primary} />
        </View>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "#06081099",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tutup pilihan"
            onPress={() => setOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView
            edges={["bottom"]}
            accessibilityViewIsModal
            style={{
              backgroundColor: c.surface,
              padding: 20,
              gap: 16,
              maxHeight: "85%",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Txt bold>Pilih {label.toLowerCase()}</Txt>
              <IconButton
                icon={X}
                label="Tutup pilihan"
                onPress={() => setOpen(false)}
              />
            </View>
            {searchable && (
              <Field
                label={`Cari ${label.toLowerCase()}`}
                value={query}
                onChangeText={setQuery}
                placeholder="Ketik untuk mencari"
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}
            <ScrollView
              style={{ flexGrow: 0 }}
              keyboardShouldPersistTaps="handled"
            >
              {!filtered.length && <Txt muted>Tidak ada pilihan yang cocok.</Txt>}
              {filtered.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: value === option.value }}
                  accessibilityLabel={option.label}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: 16,
                    minHeight: 52,
                    borderRadius: 12,
                    backgroundColor:
                      value === option.value ? c.lilac : "transparent",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Txt>{option.label}</Txt>
                  </View>
                  {value === option.value && (
                    <Check size={20} color={c.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
export function Metric({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: number;
  negative?: boolean;
}) {
  const c = useColors();
  const { hidden } = useFinance();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Txt muted>{label}</Txt>
      </View>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: negative || value < 0 ? c.red : c.ink,
        }}
      >
        {hidden ? "••••••" : money(value)}
      </Text>
    </View>
  );
}
export function DailyFoodAllowance({ budget }: { budget: Budget }) {
  const allowance = budget.dailyFoodAllowance;
  if (!allowance) return null;
  return (
    <View style={{ gap: 8 }}>
      <Metric label="Jatah makan per hari" value={allowance.daily} />
      <Txt muted>
        {allowance.cashLimited
          ? "Sisa uang saat ini lebih kecil dari sisa anggaran makan, jadi jatah mengikuti uang yang tersedia."
          : "Jatah dihitung dari sisa anggaran makan."}{" "}
        Dibagi {allowance.days} hari sampai akhir bulan
        {allowance.includesToday ? ", termasuk hari ini" : ""}.
      </Txt>
    </View>
  );
}
export function Progress({
  percent,
  label,
}: {
  percent: number;
  label: string;
}) {
  const c = useColors();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.min(100, Math.max(0, percent)),
        text: `${percent}%`,
      }}
      style={{
        height: 9,
        borderRadius: 8,
        backgroundColor: c.line,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: 9,
          width: `${Math.min(100, Math.max(0, percent))}%`,
          backgroundColor: percent > 100 ? c.red : c.primary,
        }}
      />
    </View>
  );
}
export function Field({
  label,
  trailing,
  ...props
}: TextInputProps & { label: string; trailing?: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: 7 }}>
      <Txt bold>{label}</Txt>
      <View style={{ position: "relative" }}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={c.muted}
          style={{
            minHeight: 50,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 12,
            padding: 13,
            paddingRight: trailing ? 50 : 13,
            backgroundColor: c.surface,
            color: c.ink,
            fontSize: 16,
          }}
          {...props}
        />
        {trailing && (
          <View style={{ position: "absolute", right: 3, top: 3 }}>
            {trailing}
          </View>
        )}
      </View>
    </View>
  );
}
export function DateField({
  label,
  value,
  onChange,
  monthOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  monthOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (Platform.OS === "web")
    return (
      <Field
        label={label}
        value={value}
        onChangeText={onChange}
        placeholder={monthOnly ? "YYYY-MM" : "YYYY-MM-DD"}
        maxLength={monthOnly ? 7 : 10}
      />
    );
  return (
    <View style={{ gap: 7 }}>
      <Txt bold>{label}</Txt>
      <Button
        secondary
        title={
          value
            ? monthOnly
              ? monthLabel(value)
              : dateLabel(value) + " " + value.slice(0, 4)
            : "Pilih tanggal"
        }
        onPress={() => setOpen(!open)}
      />
      {open && (
        <DateTimePicker
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          value={
            new Date(
              `${value || "2026-01-01"}${monthOnly ? "-01" : ""}T12:00:00`,
            )
          }
          minimumDate={new Date("2000-01-01T00:00:00")}
          maximumDate={new Date("2100-12-31T23:59:59")}
          onChange={(event, date) => {
            if (Platform.OS === "android") setOpen(false);
            if (event.type === "set" && date) {
              const next = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
              onChange(monthOnly ? next.slice(0, 7) : next);
            }
          }}
        />
      )}
      {open && Platform.OS === "ios" && (
        <Button
          title="Selesai memilih tanggal"
          onPress={() => setOpen(false)}
        />
      )}
    </View>
  );
}
export function MonthPicker() {
  const { month, setMonth } = useFinance();
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        backgroundColor: c.neon ? c.surface : "#ffffff40",
        borderWidth: 1,
        borderColor: c.neon ? c.line : "#9bbcaf55",
        borderRadius: 10,
      }}
    >
      <IconButton
        icon={ChevronLeft}
        label="Bulan sebelumnya"
        disabled={month <= "2000-01"}
        onPress={() => setMonth(shiftMonth(month, -1))}
      />
      <Txt bold>{monthLabel(month)}</Txt>
      <IconButton
        icon={ChevronRight}
        label="Bulan berikutnya"
        disabled={month >= "2100-12"}
        onPress={() => setMonth(shiftMonth(month, 1))}
      />
    </View>
  );
}
const tabs = [
  ["/", House, "Beranda"],
  ["/activity", ReceiptText, "Aktivitas"],
  ["/form?kind=entry&type=out", Plus, "Catat"],
  ["/budget", Target, "Anggaran"],
  ["/account", UserRound, "Akun saya"],
] as const;
export function Page({
  children,
  period = true,
  refresh,
  header,
}: {
  children: ReactNode;
  period?: boolean;
  refresh?: () => Promise<void>;
  header?: ReactNode;
}) {
  const c = useColors();
  const store = useFinance();
  const path = usePathname();
  const [refreshing, setRefreshing] = useState(false);
  async function onRefresh() {
    setRefreshing(true);
    try {
      await (refresh ?? store.reload)();
    } catch (e) {
      store.setError(
        e instanceof Error ? e.message : "Tidak dapat memuat data.",
      );
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <SafeAreaView
      edges={
        path === "/login"
          ? ["top", "bottom", "left", "right"]
          : path === "/"
            ? ["top", "left", "right"]
            : path === "/form"
              ? ["bottom", "left", "right"]
              : ["left", "right"]
      }
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      {c.neon && <NeonBackground variant="page" />}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            gap: 20,
            width: "100%",
            maxWidth: 640,
            alignSelf: "center",
            paddingBottom: 28,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.primary}
            />
          }
        >
          {header && (
            <View
              style={{
                marginTop: -20,
                marginHorizontal: -20,
                padding: 22,
                gap: 20,
                backgroundColor: c.neon ? c.lilac : c.mint,
                borderBottomLeftRadius: 28,
                borderBottomRightRadius: 28,
                overflow: "hidden",
              }}
            >
              {c.neon && <NeonBackground />}
              {header}
            </View>
          )}
          {period && !header && <MonthPicker />}
          {store.error !== "" && (
            <Pressable
              accessibilityRole="button"
              onPress={() => store.setError("")}
            >
              <Card>
                <Txt color={c.red}>{store.error}</Txt>
                <Txt muted>Ketuk untuk tutup pesan</Txt>
              </Card>
            </Pressable>
          )}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function BottomNav() {
  const c = useColors();
  const path = usePathname();
  return (
    <SafeAreaView
      testID="bottom-nav"
      edges={["bottom", "left", "right"]}
      style={{ backgroundColor: c.bg }}
    >
      <View
        style={{
          flexDirection: "row",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          backgroundColor: c.neon ? c.surface : "#7254ad",
          borderTopWidth: c.neon ? 1 : 0,
          borderTopColor: c.primary,
        }}
      >
        {tabs.map(([href, Icon, label]) => (
          <Pressable
            key={href}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: path === href }}
            onPress={() => {
              if (path !== href) router.push(href as Href);
            }}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 10,
              alignItems: "center",
              gap: 3,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <View
              style={{
                width: label === "Catat" ? 48 : 32,
                height: label === "Catat" ? 48 : 27,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 26,
                marginTop: label === "Catat" ? -24 : 0,
                borderWidth: label === "Catat" ? 3 : 0,
                borderColor: c.mint,
                backgroundColor:
                  label === "Catat"
                    ? c.neon
                      ? c.primary
                      : "#9b81c7"
                    : "transparent",
              }}
            >
              <Icon
                size={label === "Catat" ? 26 : 21}
                strokeWidth={1.7}
                color={
                  c.neon
                    ? label === "Catat"
                      ? c.bg
                      : path === href
                        ? c.primary
                        : c.muted
                    : path === href || label === "Catat"
                      ? "#fff"
                      : "#e2d7f2"
                }
              />
            </View>
            <Text
              style={{
                fontSize: 10,
                color: c.neon
                  ? path === href
                    ? c.primary
                    : c.muted
                  : path === href
                    ? "#fff"
                    : "#e2d7f2",
                fontWeight: path === href ? "700" : "400",
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
export function Transactions({
  entries,
  scope,
  limit = 30,
}: {
  entries: (Entry | SharedEntry)[];
  scope?: string;
  limit?: number;
}) {
  const [count, setCount] = useState(limit);
  const { hidden } = useFinance();
  const c = useColors();
  if (!entries.length)
    return (
      <Card>
        <Txt muted>Belum ada transaksi. Catat transaksi pertamamu.</Txt>
      </Card>
    );
  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.line,
        borderRadius: 17,
        paddingHorizontal: 14,
      }}
    >
      {entries.slice(0, count).map((e, index) => (
        <Pressable
          key={e.id}
          accessibilityRole="button"
          accessibilityLabel={`${e.note || e.category}, ${hidden ? "nominal disembunyikan" : e.active ? money(e.amount) : "nonaktif"}`}
          onPress={() =>
            router.push({
              pathname: "/form",
              params: { kind: "entry", id: e.id, ...(scope ? { scope } : {}) },
            })
          }
          style={({ pressed }) => ({
            backgroundColor: c.surface,
            borderBottomWidth:
              index < Math.min(count, entries.length) - 1 ||
              entries.length > count
                ? 1
                : 0,
            borderColor: c.line,
            paddingVertical: 15,
            opacity: pressed || !e.active ? 0.6 : 1,
            gap: 4,
          })}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 37,
                height: 37,
                borderRadius: 11,
                backgroundColor: e.type === "in" ? c.mint : c.lilac,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/makan|minum/i.test(e.category) ? (
                <Utensils size={20} color={c.primary} />
              ) : /transport|bensin/i.test(e.category) ? (
                <Bus size={20} color={c.primary} />
              ) : /belanja/i.test(e.category) ? (
                <ShoppingBag size={20} color={c.primary} />
              ) : (
                <Wallet
                  size={20}
                  color={e.type === "in" ? c.green : c.primary}
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Txt bold>{e.note || e.category}</Txt>
              <Txt muted>
                {e.category} · {dateLabel(e.date)}
              </Txt>
            </View>
            <Txt
              bold
              color={
                e.type === "in" ||
                e.type === "withdraw" ||
                e.type === "contribution"
                  ? c.green
                  : c.ink
              }
            >
              {hidden ? "••••••" : money(e.amount)}
            </Txt>
          </View>
          {e.paymentMethod === "credit" && (
            <Txt muted>
              {creditStatus(e)} · jatuh tempo{" "}
              {e.dueDate ? dateLabel(e.dueDate) : "-"}
            </Txt>
          )}
          {"authorName" in e && <Txt muted>Oleh {e.authorName}</Txt>}
          {"spaceId" in e && e.spaceId && (
            <Txt muted>Transfer ruang bersama · hanya baca</Txt>
          )}
          {!e.active && <Txt muted>Nonaktif · tidak dihitung</Txt>}
        </Pressable>
      ))}
      {entries.length > count && (
        <View style={{ paddingVertical: 16 }}>
          <Button
            secondary
            title={`Lihat ${Math.min(30, entries.length - count)} lainnya`}
            onPress={() => setCount(count + 30)}
          />
        </View>
      )}
    </View>
  );
}
export function confirm(
  title: string,
  message: string,
  action: () => void,
  destructive = true,
) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) action();
  } else
    Alert.alert(title, message, [
      { text: "Batal", style: "cancel" },
      {
        text: "Lanjutkan",
        style: destructive ? "destructive" : "default",
        onPress: action,
      },
    ]);
}
export function Loading() {
  const c = useColors();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.bg,
      }}
    >
      <ActivityIndicator size="large" color={c.primary} />
    </View>
  );
}
export const ui = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { flexBasis: "46%", flexGrow: 1, gap: 8 },
});
