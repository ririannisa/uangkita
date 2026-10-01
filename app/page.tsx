import { redirect } from "next/navigation";
import { getAuth, authConfigured } from "@/lib/auth/server";
import { readFinance } from "@/lib/db";
import FinanceWorkspace from "@/components/finance-workspace";

export const dynamic = "force-dynamic";
export default async function Home() {
  if (!authConfigured()) redirect("/login");
  const { data: session } = await getAuth().getSession();
  if (!session?.user) redirect("/login");
  let initialData = null;
  try {
    initialData = await readFinance(session.user.id);
  } catch {
    /* Show retry, not an empty account. */
  }
  return (
    <FinanceWorkspace
      user={{ id: session.user.id, name: session.user.name, email: session.user.email }}
      initialData={initialData}
    />
  );
}
