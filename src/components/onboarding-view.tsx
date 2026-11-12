import type { ReactNode } from "react";
import { Shell } from "./header";
import { FadeUp, WordsPullUpMultiStyle } from "./motion";
import { MovieForm } from "./movie-form";

export function OnboardingView({ greeting, right, onDemoSave }: { greeting: string; right?: ReactNode; onDemoSave?: (movie: string) => void }) {
  return <Shell right={right}>
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
      <FadeUp className="flex flex-col gap-4">
        <p className="text-[10px] text-primary sm:text-xs">One question</p>
        <h1 className="text-4xl leading-[0.95] sm:text-5xl md:text-6xl">
          <WordsPullUpMultiStyle className="justify-start" segments={[{ text: "What’s your" }, { text: "favorite movie?", className: "font-serif italic" }]}/>
        </h1>
        <p className="text-dim">{greeting}</p>
      </FadeUp>
      <FadeUp delay={0.3}><div className="card"><MovieForm onDemoSave={onDemoSave}/></div></FadeUp>
    </div>
  </Shell>;
}
