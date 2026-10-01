import { NextResponse, type NextRequest } from "next/server";
import { authConfigured, getAuth } from "@/lib/auth/server";

// Completes the managed Neon Google OAuth verifier exchange on the callback page.
// API authorization still checks the session independently on every request.
export default function proxy(request: NextRequest) {
  if (!authConfigured()) return NextResponse.next();
  return getAuth().middleware({ loginUrl: "/login" })(request);
}
export const config = { matcher: ["/"] };
