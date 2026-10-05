import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import Constants from "expo-constants";
import { mobileAuthVerifier } from "../../../../lib/mobile-auth";
import { api, ApiError, clearSession, apiURL } from "./api";
import { applyMutation, demoData } from "./core";
import {
  backupSchema,
  emptyData,
  mutationSchema,
  today,
  type FinanceData,
  type Mutation,
  type SpaceOverview,
  type SpaceUser,
} from "./finance";

type User = Pick<SpaceUser, "id" | "name" | "email" | "emailVerified">;
type Store = {
  user: User | null;
  data: FinanceData;
  month: string;
  setMonth: (v: string) => void;
  ready: boolean;
  demo: boolean;
  busy: boolean;
  error: string;
  setError: (v: string) => void;
  hidden: boolean;
  setHidden: (v: boolean) => void;
  theme: "auto" | "light" | "dark";
  setTheme: (v: "auto" | "light" | "dark") => void;
  reload: () => Promise<void>;
  save: (a: Mutation) => Promise<boolean>;
  login: (email: string, password: string, name?: string) => Promise<boolean>;
  loginGoogle: () => Promise<boolean>;
  startDemo: () => void;
  logout: () => Promise<void>;
  spaces: SpaceOverview;
  loadSpaces: () => Promise<void>;
};
const Context = createContext<Store | null>(null);
const demoFile = () => new File(Paths.document, "uangkita-demo.json");
function persistDemo(data: FinanceData) {
  if (Platform.OS === "web")
    sessionStorage.setItem("uangkita-demo", JSON.stringify(data));
  else demoFile().write(JSON.stringify(data));
}
export function FinanceProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [data, setDataState] = useState<FinanceData>(emptyData);
  const [month, setMonth] = useState(today().slice(0, 7));
  const [ready, setReady] = useState(!apiURL || Platform.OS === "web");
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState(false);
  const [theme, setTheme] = useState<Store["theme"]>("auto");
  const [spaces, setSpaces] = useState<SpaceOverview>({
    spaces: [],
    invitations: [],
    emailVerified: false,
  });
  const pending = useRef(false);
  const generation = useRef(0);
  const currentData = useRef(data);
  function setData(next: FinanceData) {
    currentData.current = next;
    setDataState(next);
  }

  const loadSpaces = useCallback(async () => {
    if (!demo) {
      const version = generation.current;
      const overview = await api<SpaceOverview>("/api/spaces");
      if (version === generation.current) setSpaces(overview);
    }
  }, [demo]);
  useEffect(() => {
    if (user && !demo) loadSpaces().catch((e) => setError(e.message));
  }, [user, demo, loadSpaces]);
  async function reload() {
    if (demo) return;
    const version = generation.current;
    try {
      const updated = await api<FinanceData>("/api/finance");
      if (version === generation.current) {
        setData(updated);
        setError("");
      }
    } catch (e) {
      if (version !== generation.current) return;
      if (e instanceof ApiError && e.status === 401) {
        await clearSession();
        generation.current++;
        setUser(null);
        setData(emptyData);
      }
      throw e;
    }
  }
  useEffect(() => {
    let alive = true;
    if (!apiURL || Platform.OS === "web") {
      return;
    }
    api<{ user?: User } | null>("/api/auth/get-session?disableCookieCache=true")
      .then(async (session) => {
        if (!alive || !session?.user) return;
        const finance = await api<FinanceData>("/api/finance");
        if (alive) {
          setUser(session.user);
          setData(finance);
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && user && !demo && !pending.current)
        reload().catch((e) => setError(e.message));
    });
    return () => subscription.remove();
  });

  async function save(input: Mutation) {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const parsed = mutationSchema.safeParse(input);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const next = applyMutation(currentData.current, parsed.data);
      if (demo) persistDemo(next);
      else await api("/api/finance", parsed.data);
      currentData.current = next;
      setData(next);
      if (!demo)
        await reload().catch(() =>
          setError(
            "Perubahan sudah tersimpan. Tarik layar ke bawah untuk memuat data terbaru.",
          ),
        );
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await clearSession();
        generation.current++;
        setUser(null);
        setData(emptyData);
      }
      setError(e instanceof Error ? e.message : "Perubahan belum tersimpan.");
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function completeLogin() {
    const session = await api<{ user?: User } | null>(
      "/api/auth/get-session?disableCookieCache=true",
    );
    if (!session?.user)
      throw new Error(
        "Sesi belum tersedia. Periksa verifikasi email atau ulangi login.",
      );
    const finance = await api<FinanceData>("/api/finance");
    generation.current++;
    setDemo(false);
    setUser(session.user);
    setData(finance);
  }
  async function loginGoogle() {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError("");
    const attempt = { cookie: "" };
    try {
      if (Platform.OS === "web")
        throw new Error(
          "Login akun tersedia di aplikasi Android/iOS. Pratinjau browser bisa memakai mode demo.",
        );
      if (Constants.appOwnership === "expo")
        throw new Error(
          "Login Google memerlukan APK atau development build UangKita. Expo Go tidak mendaftarkan callback uangkita://.",
        );
      const state = Crypto.randomUUID();
      const callback = `${apiURL}/api/mobile-auth/callback?state=${state}`;
      const social = await api<{ url?: string }>(
        "/api/auth/sign-in/social",
        {
          provider: "google",
          callbackURL: callback,
          errorCallbackURL: callback,
          disableRedirect: true,
        },
        attempt,
      );
      if (
        !social.url ||
        new URL(social.url).protocol !== "https:" ||
        !attempt.cookie
      )
        throw new Error(
          "Server belum menyediakan login Google untuk aplikasi ini.",
        );
      const result = await WebBrowser.openAuthSessionAsync(
        social.url,
        "uangkita://login",
      );
      if (result.type !== "success") return false;
      const verifier = mobileAuthVerifier(result.url, state);
      const exchanged = await api<{ user?: User } | null>(
        `/api/auth/get-session?disableCookieCache=true&neon_auth_session_verifier=${encodeURIComponent(verifier)}`,
        undefined,
        attempt,
      );
      if (!exchanged?.user) throw new Error("Sesi Google belum tersedia. Silakan ulangi login.");
      await completeLogin();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login Google belum berhasil.");
      return false;
    } finally {
      attempt.cookie = "";
      pending.current = false;
      setBusy(false);
    }
  }
  async function login(email: string, password: string, name?: string) {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await api(`/api/auth/${name ? "sign-up" : "sign-in"}/email`, {
        email: email.trim(),
        password,
        ...(name ? { name: name.trim() } : {}),
        callbackURL: `${apiURL}/`,
      });
      await completeLogin();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Belum berhasil masuk.");
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function startDemo() {
    let next = demoData(today().slice(0, 7));
    try {
      const saved =
        Platform.OS === "web"
          ? sessionStorage.getItem("uangkita-demo")
          : demoFile().exists
            ? demoFile().textSync()
            : null;
      if (saved)
        next = backupSchema.parse({ ...JSON.parse(saved), version: 1 });
    } catch {
      /* A damaged demo file must never block the app. */
    }
    generation.current++;
    setData(next);
    setMonth(today().slice(0, 7));
    setDemo(true);
    setError("");
    setUser({
      id: "demo",
      name: "Annisa",
      email: "annisa@example.com",
      emailVerified: true,
    });
  }
  async function logout() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      if (!demo) await api("/api/auth/sign-out", {}).catch(() => undefined);
      await clearSession();
      generation.current++;
      setUser(null);
      setData(emptyData);
      setDemo(false);
      setSpaces({ spaces: [], invitations: [], emailVerified: false });
      setError("");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <Context.Provider
      value={{
        user,
        data,
        month,
        setMonth,
        ready,
        demo,
        busy,
        error,
        setError,
        hidden,
        setHidden,
        theme,
        setTheme,
        reload,
        save,
        login,
        loginGoogle,
        startDemo,
        logout,
        spaces,
        loadSpaces,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useFinance() {
  const store = useContext(Context);
  if (!store) throw new Error("FinanceProvider belum tersedia.");
  return store;
}
