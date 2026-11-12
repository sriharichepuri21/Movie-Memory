import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { currentUser } from "@/server/session";
import { DashboardView } from "@/components/dashboard-view";
import { navAction } from "@/components/header";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await currentUser();
  if (!user) redirect("/");
  if (!user.favoriteMovie) redirect("/onboarding");
  const logout = <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}><button className={navAction}>Log out</button></form>;
  return <DashboardView user={{ ...user, favoriteMovie: user.favoriteMovie }} logout={logout}/>;
}
