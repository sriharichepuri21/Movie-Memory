import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

const variants = { primary: "btn btn-primary", secondary: "btn btn-secondary" } as const;
type Variant = keyof typeof variants;

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button {...props} className={`${variants[variant]} ${className}`}/>;
}

export function ButtonLink({ variant = "secondary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={`${variants[variant]} ${className}`}/>;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "accent"; children: ReactNode }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone === "accent" ? "bg-primary/15 text-primary" : "bg-rail text-dim"}`}>{children}</span>;
}

export function Alert({ id, children }: { id?: string; children: ReactNode }) {
  return <p id={id} role="alert" className="alert">{children}</p>;
}

export function Poster({ title, className = "" }: { title: string; className?: string }) {
  // Deterministic hue per title so the same movie always gets the same poster.
  const hue = [...title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  return <div aria-hidden="true" className={`poster ${className}`} style={{ "--hue": hue } as CSSProperties}><span>{title}</span></div>;
}
