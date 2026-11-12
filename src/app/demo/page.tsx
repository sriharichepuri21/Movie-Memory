"use client";

import { useCallback, useState } from "react";
import { DashboardView } from "@/components/dashboard-view";
import { OnboardingView } from "@/components/onboarding-view";
import { Button, ButtonLink } from "@/components/ui";
import type { FactResult } from "@/lib/contracts";

export default function Demo() {
  const [movie, setMovie] = useState("Interstellar");
  const [onboarding, setOnboarding] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const loader = useCallback(async (): Promise<FactResult> => {
    if (showFailure) throw new Error("Sample error: the fact service couldn’t be reached.");
    const text = movie.toLowerCase() === "interstellar"
      ? "The cornfield around the farmhouse was real. The crew planted about 500 acres of corn near Calgary and sold the harvest after filming."
      : `A fact about ${movie} appears here. In the real app, your saved title is sent to OpenAI.`;
    return { fact: { id: "sample", movie, text, generatedAt: new Date().toISOString() }, source: "cache" };
  }, [movie, showFailure]);

  return <>
    <div role="note" className="border-b border-rail bg-stage">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 text-sm sm:px-6">
        <p><strong className="font-semibold">Preview mode</strong> <span className="text-dim">with sample data. Nothing is saved.</span></p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="text-sm" onClick={() => setOnboarding(!onboarding)}>{onboarding ? "Show dashboard" : "Try onboarding"}</Button>
          <Button variant="secondary" className="text-sm" onClick={() => setShowFailure(!showFailure)}>{showFailure ? "Show working state" : "Show error state"}</Button>
          <ButtonLink href="/" className="text-sm">Exit preview</ButtonLink>
        </div>
      </div>
    </div>
    {onboarding
      ? <OnboardingView greeting="This preview keeps your choice until you reload." onDemoSave={(title) => { setMovie(title); setOnboarding(false); }}/>
      : <DashboardView key={`${movie}-${showFailure}`} user={{ name: "Alex Morgan", email: "alex@example.com", image: null, favoriteMovie: movie }} demo loader={loader}/>}
  </>;
}
