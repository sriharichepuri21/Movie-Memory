import Link from "next/link";
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { ReelIcon } from "./icons";
import { FadeUp, ScaleIn, ScrollRevealText, WordsPullUp, WordsPullUpMultiStyle } from "./motion";
import { Badge, Poster } from "./ui";

const navLink = "inline-flex min-h-11 items-center whitespace-nowrap text-ink/80 transition-colors hover:text-ink";

export function Hero({ cta }: { cta: ReactNode }) {
  return <section className="h-[100svh] min-h-[640px] p-4 md:p-6">
    <div className="hero-backdrop relative h-full overflow-hidden rounded-2xl md:rounded-[2rem]">
      <div className="noise-overlay pointer-events-none absolute inset-0 opacity-70 mix-blend-overlay"/>
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/30 via-transparent to-black/60"/>
      <nav aria-label="Primary" className="absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-b-2xl bg-black px-4 md:rounded-b-3xl md:px-8">
        <ul className="flex items-center gap-3 text-[10px] sm:gap-6 sm:text-xs md:gap-12 md:text-sm">
          <li><a href="#about" className={navLink}>The idea</a></li>
          <li><a href="#how" className={navLink}>How it works</a></li>
          <li><Link href="/demo" className={navLink}>Preview</Link></li>
        </ul>
      </nav>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-5 pt-16 text-center sm:px-8 md:gap-8">
        <FadeUp><ReelIcon aria-hidden="true" className="h-14 w-14 text-white md:h-20 md:w-20"/></FadeUp>
        <h1 className="text-[15vw] font-medium leading-[0.85] tracking-[-0.06em] text-ink md:text-[10vw]">
          <WordsPullUp text="Movie Memory" asterisk className="justify-center"/>
        </h1>
        <FadeUp delay={0.5}><p className="max-w-md text-sm leading-[1.3] text-primary/70 md:text-lg">Save the one film you never get tired of. Every minute, a new fact about it, written from the title you give us.</p></FadeUp>
        <FadeUp delay={0.7} className="flex flex-col items-center gap-3">{cta}<p className="text-xs text-gray-500">* Facts are written by AI and can make mistakes.</p></FadeUp>
      </div>
    </div>
  </section>;
}

export function About() {
  return <section id="about" className="px-4 py-16 md:px-6 md:py-24">
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 rounded-2xl bg-stage px-6 py-16 text-center md:px-12 md:py-24">
      <p className="text-[10px] text-primary sm:text-xs">The idea</p>
      <h2 className="mx-auto max-w-3xl text-3xl leading-[0.95] sm:text-4xl sm:leading-[0.9] md:text-5xl lg:text-6xl xl:text-7xl">
        <WordsPullUpMultiStyle segments={[
          { text: "Everyone has one film" },
          { text: "they never get tired of.", className: "font-serif italic" },
          { text: "Save it, and learn something new about it every time you come back." },
        ]}/>
      </h2>
      <ScrollRevealText className="max-w-2xl text-xs text-primary sm:text-sm md:text-base" text="Sign in with Google and we keep three things: your name, email and photo. Add one title and it is stored under your account in Postgres. From then on, every visit asks OpenAI for a short fact about that film, keeps it for a minute so a quick refresh never costs twice, and falls back to your last saved fact if the provider is down."/>
    </div>
  </section>;
}

const steps = [
  { n: "01", title: "Sign in.", items: ["Google only, no new password", "We keep your name, email and photo", "Log out from the dashboard any time"] },
  { n: "02", title: "Save a movie.", items: ["One title, up to 120 characters", "Checked and trimmed on the server", "Stored under your account in Postgres"] },
  { n: "03", title: "Read the fact.", items: ["Written by AI from your title", "Reused for 60 seconds, then renewed", "Last saved fact shown if the provider fails"] },
];

export function HowItWorks() {
  return <section id="how" className="relative min-h-screen px-4 py-16 md:px-6 md:py-24">
    <div className="bg-noise pointer-events-none absolute inset-0 opacity-[0.15]"/>
    <div className="relative mx-auto flex max-w-6xl flex-col gap-10">
      <h2 className="max-w-3xl text-xl sm:text-2xl md:text-3xl lg:text-4xl">
        <WordsPullUpMultiStyle className="justify-start" segments={[
          { text: "Three steps from sign-in to a fact." },
          { text: "Nothing to configure, nothing to remember.", className: "text-gray-500" },
        ]}/>
      </h2>
      <div className="grid gap-3 sm:gap-2 md:grid-cols-2 md:gap-1 lg:h-[480px] lg:grid-cols-4">
        <ScaleIn index={0} className="h-full"><SampleCard/></ScaleIn>
        {steps.map((step, i) => <ScaleIn key={step.n} index={i + 1} className="h-full"><StepCard {...step}/></ScaleIn>)}
      </div>
    </div>
  </section>;
}

function SampleCard() {
  return <figure className="relative h-full min-h-80 overflow-hidden rounded-2xl">
    <Poster title="Interstellar" className="absolute inset-0 aspect-auto h-full w-full"/>
    <figcaption className="absolute right-4 top-4"><Badge>Example poster</Badge></figcaption>
  </figure>;
}

function StepCard({ n, title, items }: { n: string; title: string; items: string[] }) {
  return <article className="flex h-full flex-col gap-6 rounded-2xl bg-card p-6">
    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-xs text-primary sm:h-12 sm:w-12">{n}</span>
    <h3 className="text-xl text-primary">{title}</h3>
    <ul className="flex flex-col gap-3">
      {items.map((item) => <li key={item} className="flex gap-2 text-sm text-gray-400"><Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary"/>{item}</li>)}
    </ul>
  </article>;
}

export function Footer() {
  return <footer className="border-t border-rail">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-dim sm:px-6">
      <span>Movie Memory</span>
      <span>We store your Google name, email and photo, your movie title, and the facts we generate.</span>
    </div>
  </footer>;
}
