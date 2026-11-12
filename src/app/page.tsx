import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { signIn } from "@/auth";
import { currentUser } from "@/server/session";
import { GoogleIcon } from "@/components/icons";
import { About, Footer, Hero, HowItWorks } from "@/components/landing";
import { Alert } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser();
  if (user) redirect(user.favoriteMovie ? "/dashboard" : "/onboarding");
  const { error } = await searchParams;
  const configured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && process.env.AUTH_SECRET);
  const cta = <>
    {error && <Alert>Google sign-in didn’t finish. Try again.</Alert>}
    <form action={async () => { "use server"; await signIn("google", { redirectTo: "/" }); }}>
      <button disabled={!configured} className="group inline-flex items-center gap-2 rounded-full bg-primary py-1.5 pl-5 pr-1.5 text-sm font-medium text-black transition-[gap] hover:gap-3 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base">
        <GoogleIcon className="h-5 w-5"/>Sign in with Google
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-primary transition-transform group-hover:scale-110 sm:h-10 sm:w-10"><ArrowRight aria-hidden="true" className="h-4 w-4"/></span>
      </button>
    </form>
    {!configured && <p className="text-sm text-dim">Sign-in isn’t set up on this server yet. <Link href="/demo" className="underline underline-offset-4 hover:text-ink">Open the preview</Link> to see the app with sample data.</p>}
  </>;
  return <main id="main">
    <Hero cta={cta}/>
    <About/>
    <HowItWorks/>
    <Footer/>
  </main>;
}
