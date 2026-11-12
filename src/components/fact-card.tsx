"use client";

import { useEffect, useState } from "react";
import { FACT_CACHE_SECONDS, type FactResult } from "@/lib/contracts";
import { RefreshIcon } from "./icons";
import { Badge, Button } from "./ui";

export async function loadFact(): Promise<FactResult> {
  const response = await fetch("/api/fact", { cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "We couldn’t get a fact right now.");
  return body;
}

const badge = { generated: "New", cache: "Cached", stale: "Saved earlier" } as const;

export function FactCard({ loader = loadFact, demo = false }: { loader?: () => Promise<FactResult>; demo?: boolean }) {
  const [result, setResult] = useState<FactResult | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    loader().then((data) => { if (active) { setResult(data); setNow(Date.now()); } })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "We couldn’t get a fact right now."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [loader]);

  // shortcut: the countdown uses the browser clock against the server's generatedAt; clock skew only shifts the label, the server still decides.
  const expiresAt = result && result.source !== "stale" && !demo ? Date.parse(result.fact.generatedAt) + FACT_CACHE_SECONDS * 1000 : 0;
  const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const waiting = remaining > 0 && !error;
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [waiting]);

  async function refresh() {
    if (busy) return;
    setBusy(true); setError("");
    try { setResult(await loader()); setNow(Date.now()); }
    catch (err) { setError(err instanceof Error ? err.message : "We couldn’t get a fact right now."); }
    finally { setBusy(false); }
  }

  const label = busy ? "Finding a fact…" : error ? "Try again" : waiting ? `New fact in ${remaining}s` : "New fact";
  const time = result && new Date(result.fact.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return <section aria-labelledby="fact-heading" aria-busy={busy} className="flex flex-col gap-5">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <h2 id="fact-heading" className="label">Today’s fact</h2>
      {result && <Badge tone={result.source === "stale" ? "accent" : "neutral"}>{demo ? "Example" : badge[result.source]}</Badge>}
      {time && <span className="text-xs text-dim tabular-nums">{time}</span>}
    </div>

    <div aria-live="polite">
      {busy && !result && <div role="status" className="flex flex-col gap-3"><span className="sr-only">Finding a fact…</span>{["w-full", "w-11/12", "w-2/3"].map((w) => <div key={w} className={`h-5 animate-pulse rounded bg-card ${w}`}/>)}</div>}
      {result && <p className="text-xl leading-relaxed sm:text-2xl">{result.fact.text}</p>}
      {result?.warning && <p role="status" className="mt-3 text-sm text-dim">{result.warning}</p>}
      {error && !result && <div role="alert" className="flex flex-col gap-1"><p className="text-xl sm:text-2xl">{error}</p><p className="text-sm text-dim">Your movie is saved. Nothing else is lost.</p></div>}
      {error && result && <p role="alert" className="mt-3 text-sm text-dim">{error}</p>}
    </div>

    <div className="flex flex-wrap items-center gap-4">
      <Button variant="secondary" onClick={refresh} disabled={busy || waiting}><RefreshIcon className={`h-4 w-4 ${busy ? "animate-spin" : ""}`}/>{label}</Button>
      <p className="text-xs text-dim">Written by AI. It can make mistakes.</p>
    </div>
  </section>;
}
