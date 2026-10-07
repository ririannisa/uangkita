import Link from "next/link";
import { redirect } from "next/navigation";
import { authConfigured, getAuth } from "@/lib/auth/server";
import EventPlans from "@/components/event-plans";
import "@/components/spaces.css";

export const dynamic = "force-dynamic";

export default async function Preparations({
  searchParams,
}: {
  searchParams: Promise<{ spaceId?: string }>;
}) {
  if (!authConfigured()) redirect("/login");
  const { data } = await getAuth().getSession();
  if (!data?.user) redirect("/login");
  const { spaceId } = await searchParams;
  return (
    <main className="shared-room">
      <Link href="/">← Kembali ke UangKita</Link>
      <EventPlans spaceId={spaceId} />
    </main>
  );
}
