import { authConfigured } from "@/lib/auth/server";
import LoginForm from "@/components/login-form";
export const dynamic = "force-dynamic";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  return (
    <LoginForm
      configured={authConfigured()}
      oauthError={Boolean(params.error)}
      returnTo={params.returnTo === "/delete-account" ? "/delete-account" : "/"}
    />
  );
}
