import Link from "next/link";
import type { ReactNode } from "react";
import { ReelIcon } from "./icons";

/** Signed-in page frame: the same inset, grained backdrop as the landing hero, with the nav pill hanging from the top edge. */
export function Shell({ right, children }: { right?: ReactNode; children: ReactNode }) {
  return <div className="min-h-dvh p-4 md:p-6">
    <div className="relative min-h-[calc(100dvh-2rem)] overflow-hidden rounded-2xl bg-stage md:min-h-[calc(100dvh-3rem)] md:rounded-[2rem]">
      <div className="bg-noise pointer-events-none absolute inset-0 opacity-[0.12]"/>
      <header className="absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-b-2xl bg-black px-4 md:rounded-b-3xl md:px-6">
        <div className="flex items-center gap-5 text-xs sm:gap-8 sm:text-sm">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap font-bold"><ReelIcon className="h-5 w-5 text-primary"/>Movie Memory</Link>
          {right}
        </div>
      </header>
      <main id="main" className="relative px-5 pb-10 pt-24 sm:px-8 md:px-10 md:pt-28">{children}</main>
    </div>
  </div>;
}

export const navAction = "inline-flex min-h-11 items-center whitespace-nowrap text-ink/80 transition-colors hover:text-ink";
