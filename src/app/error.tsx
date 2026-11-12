"use client";

import { Button, ButtonLink } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main" className="mx-auto flex max-w-md flex-col gap-4 px-4 py-24 sm:px-6">
    <h1 className="display text-5xl">Something went wrong</h1>
    <p className="text-dim">Movie Memory couldn’t load this page. Try again, or go back to the start.</p>
    <div className="flex gap-3"><Button onClick={reset}>Try again</Button><ButtonLink href="/">Home</ButtonLink></div>
  </main>;
}
