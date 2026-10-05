import { fetch } from "expo/fetch";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { sessionCookie } from "./core";

export const apiURL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(
  /\/+$/,
  "",
);
const storageKey = "uangkita.session";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function clearSession() {
  if (Platform.OS !== "web") await SecureStore.deleteItemAsync(storageKey);
}

export async function api<T>(
  path: string,
  body?: unknown,
  attempt?: { cookie: string },
): Promise<T> {
  if (!apiURL)
    throw new ApiError(
      "Alamat server belum diatur. Isi EXPO_PUBLIC_API_URL atau coba mode demo.",
      0,
    );
  const url = new URL(apiURL);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && __DEV__))
    throw new ApiError("Gunakan alamat HTTPS untuk server.", 0);
  if (!path.startsWith("/api/"))
    throw new ApiError("Alamat API tidak valid.", 0);
  const headers: Record<string, string> = {
    Accept: "application/json",
    Origin: url.origin,
  };
  let cookie = "";
  if (Platform.OS !== "web") {
    const saved = attempt ? null : await SecureStore.getItemAsync(storageKey);
    if (saved) {
      const session = JSON.parse(saved) as { origin: string; cookie: string };
      if (session.origin === url.origin) cookie = session.cookie;
    }
    if (cookie || attempt?.cookie)
      headers.Cookie = [cookie, attempt?.cookie].filter(Boolean).join("; ");
  }
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${apiURL}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: Platform.OS === "web" ? "include" : "omit",
      redirect: "error",
      signal: controller.signal,
    });
    if (Platform.OS !== "web") {
      const setCookies = response.headers.getSetCookie?.() ?? [
        response.headers.get("set-cookie") ?? "",
      ];
      const next = sessionCookie(setCookies, cookie);
      if (attempt) {
        // OAuth challenge stays in memory and is never sent through the deep link.
        attempt.cookie = [
          "__Secure-neon-auth.session_challenge",
          "__Secure-neon-auth.session_challange",
        ]
          .map((name) =>
            sessionCookie(
              setCookies,
              attempt.cookie
                .split("; ")
                .find((pair) => pair.startsWith(`${name}=`)) ?? "",
              Date.now(),
              name,
            ),
          )
          .filter(Boolean)
          .join("; ");
      }
      if (next !== cookie) {
        if (next)
          await SecureStore.setItemAsync(
            storageKey,
            JSON.stringify({ origin: url.origin, cookie: next }),
          );
        else await clearSession();
      }
    }
    const result = await response.json().catch(() => null);
    if (!response.ok)
      throw new ApiError(
        result?.error ||
          result?.message ||
          "Permintaan belum berhasil. Coba lagi.",
        response.status,
      );
    return result as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      controller.signal.aborted
        ? "Server terlalu lama merespons. Coba lagi."
        : "Tidak dapat terhubung. Periksa koneksi dan alamat server.",
      0,
    );
  } finally {
    clearTimeout(timeout);
  }
}
