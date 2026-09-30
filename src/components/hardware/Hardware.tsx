import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, ease } from '@/animations/gsap';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { LineReveal, Reveal, Counter } from '@/components/ui/Reveal';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { models } from '@/data/assets';

/**
 * The hardware chapter.
 *
 * The callouts are not cards floating in a grid. Each one is a hairline that
 * runs from a label to a point in the composition, with a marker that sits
 * over the hardware — the typography annotates the 3D rather than sitting
 * beside it. Each row is also tied to a slice of the section's scroll range, so
 * the annotations arrive one at a time as the camera works around the console.
 */
interface Callout {
  id: string;
  label: string;
  detail: string;
  /** Anchor position over the hardware, in viewport percentages. */
  x: number;
  y: number;
  /** Which side the leader line runs to. */
  side: 'left' | 'right';
  /** Fraction into the section where this callout appears. */
  at: number;
}

const CALLOUTS: Callout[] = [
  {
    id: 'storage',
    label: 'Ultra-fast storage',
    detail: '825 GB of NVMe SSD. 5.5 GB/s raw, compressed read, and the decompression that makes loading screens disappear.',
    x: 74,
    y: 30,
    side: 'left',
    at: 0.08,
  },
  {
    id: 'raytracing',
    label: 'Ray-traced worlds',
    detail: 'Hardware ray tracing with 52 compute units. Light that behaves the way light behaves.',
    x: 79,
    y: 47,
    side: 'left',
    at: 0.3,
  },
  {
    id: 'audio',
    label: 'Immersive audio',
    detail: 'Object-based spatial rendering. Height cues, distance falloff, and a soundstage that is genuinely around you.',
    x: 72,
    y: 62,
    side: 'left',
    at: 0.52,
  },
  {
    id: 'compute',
    label: 'Next-gen performance',
    detail: 'Zen 2 CPU, RDNA 2 GPU, and a custom SSD that feeds it fast enough to keep the frame time flat.',
    x: 80,
    y: 74,
    side: 'left',
    at: 0.74,
  },
];

export function Hardware() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = root.current;
    if (!node) return;

    const rows = node.querySelectorAll<HTMLElement>('[data-callout]');
    if (reduced) {
      gsap.set(rows, { clearProps: 'all' });
      return;
    }

    const context = makeContext(node, rows);
    return () => context.revert();
  }, [reduced]);

  return (
    <section
      ref={root}
      className="section section--hardware"
      id="scene-hardware"
      data-scene="hardware"
      aria-labelledby="hardware-title"
    >
      <div className="section__inner hardware__inner">
        <header className="hardware__header">
          <SectionLabel index="01">Hardware</SectionLabel>
          <LineReveal
            as="h2"
            id="hardware-title"
            className="hardware__title"
            lines={['Engineered', 'for the', 'next generation.']}
          />
          <Reveal as="p" className="hardware__intro" delay={0.15}>
            A console built around one idea: the machine should disappear and the world should
            not. Everything below is a physical reason that is possible.
          </Reveal>
        </header>
      </div>

      {/* The annotation layer. Positioned over the 3D, pointer-transparent. */}
      <div className="hardware__annotations" aria-hidden="true">
        {CALLOUTS.map((callout) => (
          <div
            key={callout.id}
            className={`callout callout--${callout.side}`}
            data-callout
            data-at={callout.at}
            style={{ '--callout-x': `${callout.x}%`, '--callout-y': `${callout.y}%` } as never}
          >
            <span className="callout__marker">
              <span className="callout__marker-ring" />
              <span className="callout__marker-core" />
            </span>
            <span className="callout__leader" />
            <span className="callout__text">
              <span className="callout__label">{callout.label}</span>
            </span>
          </div>
        ))}
      </div>

      {/* The copy counterpart. Each entry is announced to assistive tech and
          laid out as a proper definition list. */}
      <div className="section__inner hardware__copy">
        <dl className="hardware__specs">
          {CALLOUTS.map((callout, index) => (
            <Reveal
              key={callout.id}
              as="div"
              className="spec"
              data-callout
              data-at={callout.at}
              delay={index * 0.04}
            >
              <dt className="spec__label">
                <span className="spec__index">{String(index + 1).padStart(2, '0')}</span>
                {callout.label}
              </dt>
              <dd className="spec__detail">{callout.detail}</dd>
            </Reveal>
          ))}
        </dl>

        <Reveal className="hardware__facts" delay={0.1}>
          <div className="fact">
            <Counter value={47} suffix="k" className="fact__value" />
            <span className="fact__label">Triangles in the console mesh</span>
          </div>
          <div className="fact">
            <Counter value={825} suffix=" GB" className="fact__value" />
            <span className="fact__label">Solid state storage</span>
          </div>
          <div className="fact">
            <Counter value={52} className="fact__value" />
            <span className="fact__label">Compute units</span>
          </div>
        </Reveal>
      </div>

      <p className="visually-hidden">
        Console model supplied as a {models.console.triangles.toLocaleString()} triangle mesh
        with full PBR texture set, rendered in real time.
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Scroll choreography                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Annotations arrive in sequence as the section scrolls.
 *
 * The leader lines draw outward from the marker (scaleX) at the same moment the
 * label fades up, so an annotation appears to be drawn rather than switched on.
 * Each callout owns a slice of the section's scroll range via its `at` value,
 * so the hardware is annotated one property at a time as the camera works
 * around it.
 */
function makeContext(node: HTMLElement, rows: NodeListOf<HTMLElement>) {
  const context = gsap.context(() => {
    // The section is 1.6 viewport heights of scroll; `at` is a fraction of that.
    const slice = (fraction: number) =>
      () => `top+=${(1 - fraction) * window.innerHeight * 1.6} top`;

    rows.forEach((row) => {
      const at = Number(row.dataset.at ?? 0);
      const isAnnotation = row.classList.contains('callout');

      if (isAnnotation) {
        const leader = row.querySelector<HTMLElement>('.callout__leader');
        const marker = row.querySelector<HTMLElement>('.callout__marker');
        const label = row.querySelector<HTMLElement>('.callout__text');

        gsap.set(row, { opacity: 0 });
        if (leader) gsap.set(leader, { scaleX: 0, transformOrigin: 'left center' });
        if (marker) gsap.set(marker, { scale: 0.4, opacity: 0 });
        if (label) gsap.set(label, { x: -12, opacity: 0 });

        const show = () => {
          gsap.timeline({ defaults: { ease: ease.cinematic } })
            .to(row, { opacity: 1, duration: 0.35 })
            .to(marker, { scale: 1, opacity: 1, duration: 0.7 }, 0)
            .to(leader, { scaleX: 1, duration: 0.85 }, 0.1)
            .to(label, { x: 0, opacity: 1, duration: 0.6 }, 0.3);
        };

        const hide = () => {
          gsap.set(row, { opacity: 0 });
          if (leader) gsap.set(leader, { scaleX: 0 });
          if (marker) gsap.set(marker, { scale: 0.4, opacity: 0 });
          if (label) gsap.set(label, { x: -12, opacity: 0 });
        };

        ScrollTrigger.create({
          trigger: node,
          start: slice(at + 0.04),
          end: slice(at + 0.42),
          onEnter: show,
          onLeaveBack: hide,
        });
        return;
      }

      // Copy blocks reveal with a small rise, staggered by their index.
      gsap.set(row, { opacity: 0, y: 20 });
      ScrollTrigger.create({
        trigger: node,
        start: slice(at + 0.06),
        end: slice(at + 0.52),
        onEnter: () => gsap.to(row, { opacity: 1, y: 0, duration: 0.95, ease: ease.cinematic }),
        onLeaveBack: () => gsap.set(row, { opacity: 0, y: 20 }),
      });
    });
  }, node);

  return context;
}
