"use client";

import { motion, useInView, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef, type ReactNode } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

/** Each word slides up into place, staggered. `asterisk` hangs a footnote mark off the last word. */
export function WordsPullUp({ text, asterisk = false, className = "" }: { text: string; asterisk?: boolean; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return <span ref={ref} className={`inline-flex flex-wrap gap-x-[0.22em] ${className}`}>
    {words.map((word, i) => <motion.span key={i} className="relative inline-block" initial={reduce ? false : { y: 20, opacity: 0 }} animate={inView ? { y: 0, opacity: 1 } : undefined} transition={{ duration: 0.6, delay: i * 0.08, ease }}>
      {word}{asterisk && i === words.length - 1 && <sup className="absolute -right-[0.3em] top-[0.65em] text-[0.31em]">*</sup>}
    </motion.span>)}
  </span>;
}

/** Same pull-up, but each segment keeps its own classes (for an italic serif phrase inside a sentence). */
export function WordsPullUpMultiStyle({ segments, className = "" }: { segments: { text: string; className?: string }[]; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const words = segments.flatMap((s) => s.text.split(" ").map((word) => ({ word, cls: s.className ?? "" })));
  return <span ref={ref} className={`inline-flex flex-wrap justify-center gap-x-[0.25em] ${className}`}>
    {words.map(({ word, cls }, i) => <motion.span key={i} className={`inline-block ${cls}`} initial={reduce ? false : { y: 20, opacity: 0 }} animate={inView ? { y: 0, opacity: 1 } : undefined} transition={{ duration: 0.6, delay: i * 0.08, ease }}>{word}</motion.span>)}
  </span>;
}

export function FadeUp({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return <motion.div className={className} initial={reduce ? false : { y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay, ease }}>{children}</motion.div>;
}

/** Card entrance: slight scale and fade when scrolled into view, staggered by index. */
export function ScaleIn({ children, index = 0, className = "" }: { children: ReactNode; index?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const reduce = useReducedMotion();
  return <motion.div ref={ref} className={className} initial={reduce ? false : { scale: 0.95, opacity: 0 }} animate={inView ? { scale: 1, opacity: 1 } : undefined} transition={{ duration: 0.7, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}

/** Characters brighten from 20% to full as the paragraph scrolls through the viewport. */
export function ScrollRevealText({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "end 0.2"] });
  if (reduce) return <p ref={ref} className={className}>{text}</p>;
  const chars = [...text];
  return <p ref={ref} className={className} aria-label={text}>
    {chars.map((ch, i) => <Letter key={i} ch={ch} progress={scrollYProgress} start={i / chars.length}/>)}
  </p>;
}

function Letter({ ch, progress, start }: { ch: string; progress: MotionValue<number>; start: number }) {
  const opacity = useTransform(progress, [start - 0.1, start + 0.05], [0.2, 1]);
  return <motion.span aria-hidden="true" style={{ opacity }}>{ch}</motion.span>;
}
