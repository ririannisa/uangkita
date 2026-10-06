export { applyMutation } from "./finance";

export const sessionCookieName = "__Secure-neon-auth.session_token";

// Set-Cookie may be combined; Expires contains a comma that is not a separator.
export function sessionCookie(
  headers: string[],
  previous = "",
  now = Date.now(),
  name = sessionCookieName,
) {
  let cookie = previous;
  for (const header of headers) {
    for (const part of header.split(/,(?=\s*[^;,=\s]+=)/)) {
      const [pair, ...attributes] = part.trim().split(";");
      if (!pair.startsWith(`${name}=`)) continue;
      const maxAge = attributes.find((a) => /^\s*max-age=/i.test(a));
      const expires = attributes.find((a) => /^\s*expires=/i.test(a));
      const expired = maxAge
        ? Number(maxAge.split("=")[1]) <= 0
        : expires && Date.parse(expires.slice(expires.indexOf("=") + 1)) <= now;
      cookie = expired || pair === `${name}=` ? "" : pair;
    }
  }
  return cookie;
}

export function shiftMonth(month: string, offset: number) {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}
