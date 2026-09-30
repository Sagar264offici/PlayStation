import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { gsap, ScrollTrigger, ease } from '@/animations/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/* -------------------------------------------------------------------------- */
/* Reveal                                                                      */
/* -------------------------------------------------------------------------- */

interface RevealProps {
  children: ReactNode;
  /** Seconds. */
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'p' | 'h2' | 'h3' | 'span' | 'li' | 'article' | 'dl' | 'section' | 'figure';
  /** Trigger relative to the viewport. */
  start?: string;
}

/**
 * Scroll-triggered entrance.
 *
 * One `fromTo` per element, killed on unmount. The point is that elements are
 * fully visible in the DOM and in the accessibility tree before GSAP touches
 * them, so nothing is ever hidden by a script that failed to run.
 */
export function Reveal({
  children,
  delay = 0,
  y = 26,
  className = '',
  as: Tag = 'div',
  start = 'top 84%',
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (reduced) {
      gsap.set(node, { clearProps: 'all' });
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        node,
        { opacity: 0, y, filter: 'blur(6px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 1,
          delay,
          ease: ease.cinematic,
          scrollTrigger: { trigger: node, start, once: true },
        },
      );
    }, node);

    return () => context.revert();
  }, [reduced, delay, y, start]);

  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
}

/* -------------------------------------------------------------------------- */
/* LineReveal                                                                  */
/* -------------------------------------------------------------------------- */

interface LineRevealProps {
  /** Each string becomes one masked line that slides up from its own clip. */
  lines: string[];
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p';
  delay?: number;
  start?: string;
  /**
   * Set on the element that a section's `aria-labelledby` points at. The
   * heading is split into per-line spans for the mask, so the id has to land on
   * the real heading element or the label resolves to nothing.
   */
  id?: string;
  /** Trigger immediately on mount instead of waiting for scroll. */
  immediate?: boolean;
}

/**
 * Masked line-by-line headline reveal.
 *
 * The editorial workhorse. Each line is wrapped in an overflow-hidden mask and
 * translated from below, so the type appears to be pushed up into frame rather
 * than faded in. This is the single biggest contributor to the site feeling
 * art-directed rather than templated.
 */
export function LineReveal({
  lines,
  className = '',
  as: Tag = 'h2',
  delay = 0,
  start = 'top 86%',
  immediate = false,
  id,
}: LineRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const targets = root.querySelectorAll<HTMLElement>('[data-line-inner]');
    if (!targets.length) return;

    if (reduced) {
      gsap.set(targets, { clearProps: 'all' });
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        targets,
        { yPercent: 118, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.15,
          delay,
          ease: ease.cinematic,
          stagger: 0.085,
          scrollTrigger: immediate ? undefined : { trigger: root, start, once: true },
        },
      );
    }, root);

    return () => context.revert();
  }, [reduced, delay, start, immediate]);

  return (
    <Tag id={id} ref={ref as never} className={`line-reveal ${className}`}>
      {lines.map((line, index) => (
        <span className="line-reveal__mask" key={`${line}-${index}`}>
          <span className="line-reveal__inner" data-line-inner>
            {line}
          </span>
        </span>
      ))}
    </Tag>
  );
}

/* -------------------------------------------------------------------------- */
/* Counter                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Counts a number up when it scrolls into view.
 *
 * Uses a plain rAF tween rather than a GSAP tween so the value can be read
 * without allocating a timeline for a single number.
 */
export function Counter({
  value,
  suffix = '',
  prefix = '',
  decimals = 0,
  className = '',
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const write = (n: number) => {
      node.textContent = `${prefix}${n.toFixed(decimals)}${suffix}`;
    };

    if (reduced) {
      write(value);
      return;
    }

    const state = { current: 0 };
    write(0);

    const trigger = ScrollTrigger.create({
      trigger: node,
      start: 'top 88%',
      once: true,
      onEnter: () => {
        const start = performance.now();
        const duration = 1400;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          // expo.out
          const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
          state.current = value * eased;
          write(state.current);
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
    });

    return () => trigger.kill();
  }, [value, prefix, suffix, decimals, reduced]);

  return <span ref={ref} className={className} />;
}
