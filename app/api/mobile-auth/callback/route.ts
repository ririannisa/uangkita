import { mobileAuthRedirect } from "@/lib/mobile-auth";

export function GET(request: Request) {
  const target = mobileAuthRedirect(new URL(request.url));
  if (!target)
    return Response.json(
      { error: "Callback login tidak valid." },
      { status: 400 },
    );
  // The verifier still needs the native-only Neon challenge cookie to become a session.
  return new Response(null, {
    status: 302,
    headers: {
      Location: target,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
