import { redirect } from "next/navigation";
import { currentUser } from "@/server/session";
import { OnboardingView } from "@/components/onboarding-view";

export const dynamic = "force-dynamic";

export default async function Onboarding() {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.favoriteMovie) redirect("/dashboard");
  const first = user.name?.trim().split(/\s+/)[0];
  return <OnboardingView
    greeting={`${first ? `Hi ${first}. ` : ""}We’ll save it to your account and start finding facts about it.`}
    right={user.email ? <span className="truncate text-dim">{user.email}</span> : null}/>;
}
