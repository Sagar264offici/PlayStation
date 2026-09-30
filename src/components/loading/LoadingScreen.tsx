import { useEffect, useRef, useState } from 'react';
import { gsap, ease } from '@/animations/gsap';
import { brand } from '@/data/assets';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/* -------------------------------------------------------------------------- */
/* Load phases                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The five things actually being waited on. Each maps to a real dependency:
 * the FBX meshes, their PBR maps, the intro video's metadata, the environment
 * bake, and interaction wiring.
 */
/**
 * The wordmark is split once at module scope. `brand` is a frozen constant, so
 * it is not reactive state and never belonged in a dependency array.
 */
const WORDMARK = brand.wordmark.split(' ');

const PHASES = [
  { key: 'assets', label: 'Assets' },
  { key: 'scene', label: '3D Scene' },
  { key: 'environment', label: 'Environment' },
  { key: 'media', label: 'Media' },
  { key: 'interaction', label: 'Interaction' },
] as const;

export interface LoadProgress {
  /** 0 → 1 overall. */
  value: number;
  /** 0 → 1 per phase. */
  phases: Record<string, number>;
  /** True once every phase has reported complete. */
  complete: boolean;
}

interface LoadingScreenProps {
  progress: LoadProgress;
  /** Ready to be dismissed. */
  ready: boolean;
  onEnter: () => void;
  /** Fails fast on mobile to avoid burning battery on a blocking gate. */
  compact: boolean;
}

/**
 * The loading experience.
 *
 * A centred wordmark, five phase readouts that fill as each dependency reports,
 * and a single hairline progress bar. It holds only as long as the work takes —
 * there is no artificial minimum, and on repeat visits the gate is skipped
 * entirely.
 */
export function LoadingScreen({ progress, ready, onEnter, compact }: LoadingScreenProps) {
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const [armed, setArmed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const reduced = useReducedMotion();
  const hasEntered = useRef(false);

  const percent = Math.round(progress.value * 100);

  // The bar and the percentage are written directly to the DOM: this component
  // re-renders on every progress tick otherwise, for no benefit.
  useEffect(() => {
    if (bar.current) bar.current.style.transform = `scaleX(${progress.value})`;
  }, [progress.value]);

  // Once everything has landed, arm the button. On compact (mobile) it arms
  // immediately so the gate never feels like an obstacle. The delay is applied
  // uniformly through the timer — including a zero delay — rather than
  // branching to a synchronous setState, which would cascade an extra render
  // into the same commit that published the 100% state.
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => setArmed(true), compact ? 0 : 260);
    return () => window.clearTimeout(timer);
  }, [ready, compact]);

  const enter = () => {
    if (hasEntered.current || !armed) return;
    hasEntered.current = true;
    setLeaving(true);
    onEnter();
  };

  useEffect(() => {
    if (!leaving || !root.current || reduced) return;
    const context = gsap.context(() => {
      gsap.to(root.current, {
        opacity: 0,
        duration: 0.9,
        ease: ease.cinematic,
        onComplete: () => {
          if (root.current) root.current.style.display = 'none';
        },
      });
      gsap.to('[data-loader-content]', {
        y: -26,
        opacity: 0,
        duration: 0.7,
        ease: ease.cinematic,
        stagger: 0.04,
      });
    }, root);
    return () => context.revert();
  }, [leaving, reduced]);

  // Keyboard entry, for anyone who tabs to the button.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && armed) enter();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div
      ref={root}
      className="loader"
      role="dialog"
      aria-modal="true"
      aria-label="Loading experience"
    >
      <div className="loader__grain" aria-hidden="true" />

      <div className="loader__content" data-loader-content>
        <p className="loader__eyebrow">
          <span className="loader__dot" aria-hidden="true" />
          {brand.tagline}
        </p>

        <h1 className="loader__wordmark" aria-label={brand.wordmark}>
          {WORDMARK.map((word) => (
            <span key={word}>{word}</span>
          ))}
        </h1>

        <div className="loader__bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <span ref={bar} className="loader__bar-fill" />
        </div>

        <div className="loader__meta">
          <span className="loader__count">
            <span className="loader__count-value">{String(percent).padStart(3, '0')}</span>
            <span className="loader__count-unit">%</span>
          </span>

          <ul className="loader__phases">
            {PHASES.map((phase) => {
              const phaseProgress = progress.phases[phase.key] ?? 0;
              const done = phaseProgress >= 0.999;
              return (
                <li
                  key={phase.key}
                  className={`loader__phase${done ? ' is-done' : ''}${
                    phaseProgress > 0 && !done ? ' is-active' : ''
                  }`}
                >
                  <span className="loader__phase-marker" aria-hidden="true" />
                  <span className="loader__phase-label">{phase.label}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <button
          type="button"
          className={`loader__enter${armed ? ' is-armed' : ''}`}
          onClick={enter}
          disabled={!armed}
          aria-disabled={!armed}
        >
          <span>{ready ? 'Enter experience' : 'Preparing'}</span>
          {!ready ? <span className="loader__enter-dots" aria-hidden="true" /> : null}
        </button>
      </div>

      <p className="loader__disclaimer">{brand.disclaimer}</p>
    </div>
  );
}
