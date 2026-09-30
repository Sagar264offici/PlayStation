import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * One easing vocabulary for the whole site.
 *
 * Mixing easings is what makes a page feel assembled rather than designed, so
 * every timeline in `src/animations` pulls from here.
 */
export const ease = {
  /** Default for UI and text. Decisive but soft on arrival. */
  out: 'power3.out',
  /** Long cinematic settles. */
  cinematic: 'expo.out',
  /** Used when something needs to arrive and hold. */
  emphasis: 'power4.out',
  /** Symmetric movement, mostly for ambient loops. */
  inOut: 'sine.inOut',
  /** Scroll-scrubbed values should be linear. */
  scrub: 'none',
} as const;

/** Stagger that feels like a sequence, not a queue. */
export const stagger = (amount = 0.06) => ({
  duration: 0.7,
  ease: ease.out,
  stagger: { each: amount, from: 'start' as const },
});

export { gsap, ScrollTrigger };

/**
 * Disables every ScrollTrigger. Used when the user prefers reduced motion:
 * the page still scrolls and all content is present, it simply stops being
 * scrubbed and animated.
 */
export function normaliseForReducedMotion() {
  ScrollTrigger.getAll().forEach((trigger) => {
    const scrub = (trigger.vars as { scrub?: unknown }).scrub;
    if (scrub !== undefined) trigger.disable(false);
  });
}

export default gsap;
