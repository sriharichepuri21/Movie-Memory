"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MOVIE_MAX_LENGTH } from "@/lib/movie";
import { Alert, Button } from "./ui";

export function MovieForm({ onDemoSave }: { onDemoSave?: (movie: string) => void }) {
  const router = useRouter();
  const [movie, setMovie] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      if (onDemoSave) { onDemoSave(movie.trim()); return; }
      const response = await fetch("/api/me/movie", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ movie }),
      });
      const body = await response.json();
      if (response.status === 401) { router.replace("/"); return; }
      if (body.error?.code === "ALREADY_ONBOARDED") { router.replace("/dashboard"); return; }
      if (!response.ok) { setError(body.error?.message ?? "We couldn’t save your movie. Try again."); return; }
      router.replace("/dashboard");
      router.refresh();
    } catch { setError("We couldn’t reach the server. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="flex flex-col gap-4">
    <div className="flex flex-col gap-2">
      <label htmlFor="movie" className="text-sm font-medium">Your favorite movie</label>
      <input id="movie" name="movie" type="text" placeholder="The Grand Budapest Hotel" value={movie} onChange={(event) => setMovie(event.target.value)} maxLength={MOVIE_MAX_LENGTH} required autoComplete="off" aria-describedby={error ? "movie-hint movie-error" : "movie-hint"} aria-invalid={Boolean(error)} disabled={busy} className="h-12 rounded-xl border border-rail bg-stage px-4 text-base placeholder:text-dim/70 focus:border-primary"/>
      <p id="movie-hint" className="text-sm text-dim">One title, up to {MOVIE_MAX_LENGTH} characters.</p>
    </div>
    {error && <Alert id="movie-error">{error}</Alert>}
    <Button type="submit" disabled={busy || !movie.trim()}>{busy ? "Saving…" : "Save my movie"}</Button>
  </form>;
}
