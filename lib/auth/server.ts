import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

export function authConfigured() {
  return Boolean(
    process.env.NEON_AUTH_BASE_URL?.startsWith("https://") &&
    process.env.NEON_AUTH_COOKIE_SECRET &&
    process.env.NEON_AUTH_COOKIE_SECRET !== "[SENSITIVE]" &&
    process.env.NEON_AUTH_COOKIE_SECRET.length >= 32,
  );
}

let instance: ReturnType<typeof createNeonAuth> | undefined;
export function getAuth() {
  if (!authConfigured()) throw new Error("Neon Auth belum dikonfigurasi");
  return (instance ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: {
      secret: process.env.NEON_AUTH_COOKIE_SECRET!,
      sessionDataTtl: 60,
    },
  }));
}
