"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { FactResult } from "@/lib/contracts";
import { Shell } from "./header";
import { FactCard } from "./fact-card";
import { FadeUp } from "./motion";
import { Poster } from "./ui";

export type DashboardUser = { name: string | null; email: string | null; image: string | null; favoriteMovie: string };

function Avatar({ name, image }: { name: string; image: string | null }) {
  const [failed, setFailed] = useState(false);
  const safeUrl = image && /^https:\/\//i.test(image) ? image : null;
  return <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card text-sm font-bold">
    {safeUrl && !failed
      // Google profile URLs vary by account; a native img avoids a broad Next image allowlist.
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={safeUrl} alt="" width={40} height={40} onError={() => setFailed(true)} referrerPolicy="no-referrer" className="h-full w-full object-cover"/>
      : <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>}
  </div>;
}

export function DashboardView({ user, logout, loader, demo = false }: { user: DashboardUser; logout?: ReactNode; loader?: () => Promise<FactResult>; demo?: boolean }) {
  const name = user.name?.trim() || "Movie lover";
  return <Shell right={logout}>
    <div className="mx-auto flex max-w-5xl flex-col gap-12">
      {/* Identity is context, not the subject: one quiet row. */}
      <FadeUp>
        <section aria-label="Your profile" className="flex items-center gap-3">
          <Avatar name={name} image={user.image}/>
          <div className="min-w-0 leading-tight">
            <p className="truncate font-bold">{name}</p>
            <p className="truncate text-sm text-dim">{user.email || "Email unavailable"}</p>
          </div>
          {demo && <span className="ml-auto text-xs text-dim">Sample profile</span>}
        </section>
      </FadeUp>

      {/* The movie is the subject: poster as the one visual, title as the page heading, fact beside it. */}
      <FadeUp delay={0.15}>
        <section aria-label="Your favorite movie" className="grid items-start gap-8 md:grid-cols-[200px_1fr] md:gap-12 lg:grid-cols-[260px_1fr]">
          <Poster title={user.favoriteMovie} className="w-44 md:w-full"/>
          <div className="flex min-w-0 flex-col gap-8">
            <div className="flex flex-col gap-2">
              <p className="label">Your favorite movie</p>
              <h1 className="display text-4xl sm:text-5xl">{user.favoriteMovie}</h1>
            </div>
            <hr className="border-rail"/>
            <FactCard loader={loader} demo={demo}/>
          </div>
        </section>
      </FadeUp>
    </div>
  </Shell>;
}
