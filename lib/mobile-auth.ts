// Only the registered app callback is accepted; no caller-controlled redirect.
export function mobileAuthRedirect(input: URL) {
  const state = input.searchParams.get("state");
  const verifier = input.searchParams.get("neon_auth_session_verifier");
  if (!state || !/^[a-f0-9-]{36}$/.test(state)) return null;
  const target = new URL("uangkita://login");
  target.searchParams.set("state", state);
  if (verifier && verifier.length <= 4096 && !input.searchParams.has("error"))
    target.searchParams.set("neon_auth_session_verifier", verifier);
  else target.searchParams.set("error", "google");
  return target.toString();
}

export function mobileAuthVerifier(callback: string, state: string) {
  const url = new URL(callback);
  if (
    url.protocol !== "uangkita:" ||
    url.hostname !== "login" ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== "" ||
    (url.pathname !== "" && url.pathname !== "/") ||
    url.searchParams.get("state") !== state
  )
    throw new Error("Callback login tidak cocok. Silakan ulangi login Google.");
  const verifier = url.searchParams.get("neon_auth_session_verifier");
  if (url.searchParams.has("error") || !verifier || verifier.length > 4096)
    throw new Error("Login Google belum berhasil. Silakan coba lagi.");
  return verifier;
}
