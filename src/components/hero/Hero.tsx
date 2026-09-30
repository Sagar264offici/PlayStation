import { useEffect, useRef } from 'react';
import { gsap, ease } from '@/animations/gsap';
import { Button, Arrow } from '@/components/ui/Button';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useUi } from '@/state/stage';

/**
 * The hero.
 *
 * Type lives in the negative space on the left; the console holds the right of
 * frame. On phones the type moves under the hardware instead of beside it.
 *
 * Nothing here animates the 3D — the boot sequence has already put the camera
 * in its hero framing. This component only handles the DOM half: the headline
 * lines pushing up into frame, the body copy, the actions, and the stat rail.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const phase = useUi((s) => s.phase);
  const booted = useUi((s) => s.booted);
  const reduced = useReducedMotion();

  const active = phase === 'experience' && booted;

  useEffect(() => {
    const node = root.current;
    if (!node || !active) return;

    if (reduced) {
      gsap.set(node.querySelectorAll('[data-hero]'), { clearProps: 'all' });
      return;
    }

    const context = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: ease.cinematic } });

      tl.fromTo('[data-hero="eyebrow"]', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9 })
        .fromTo(
          '[data-hero="line"] > span',
          { yPercent: 116 },
          { yPercent: 0, duration: 1.25, stagger: 0.09 },
          '-=0.55',
        )
        .fromTo('[data-hero="body"]', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1 }, '-=0.85')
        .fromTo(
          '[data-hero="actions"]',
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.9 },
          '-=0.7',
        )
        .fromTo(
          '[data-hero="rail"] > *',
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.07 },
          '-=0.6',
        )
        .fromTo('[data-hero="scroll"]', { opacity: 0 }, { opacity: 1, duration: 0.8 }, '-=0.4');
    }, node);

    return () => context.revert();
  }, [active, reduced]);

  const go = (anchor: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    document.getElementById(anchor)?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <section
      ref={root}
      className="hero section"
      id="scene-boot"
      aria-labelledby="hero-title"
      data-scene="boot"
    >
      <div className="hero__grid">
        <div className="hero__content">
          <p className="hero__eyebrow" data-hero="eyebrow">
            <span className="hero__eyebrow-dot" aria-hidden="true" />
            Next-generation hardware
          </p>

          <h1 className="hero__title" id="hero-title">
            <span className="hero__line" data-hero="line">
              <span>Play</span>
            </span>
            <span className="hero__line" data-hero="line">
              <span>without</span>
            </span>
            <span className="hero__line hero__line--accent" data-hero="line">
              <span>limits.</span>
            </span>
          </h1>

          <p className="hero__body" data-hero="body">
            A cinematic interactive experience built around the next generation of play —
            rendered in real time, lit like a product, and scored by nothing but your scroll.
          </p>

          <div className="hero__actions" data-hero="actions">
            <Button
              variant="primary"
              size="lg"
              trailing={<Arrow />}
              href="#scene-hardware"
              onClick={go('scene-hardware')}
            >
              Explore the experience
            </Button>
            <Button
              variant="secondary"
              size="lg"
              href="#scene-games"
              onClick={go('scene-games')}
            >
              Enter the showcase
            </Button>
          </div>
        </div>

        {/* Spec rail. Doubles as the technical caption for the hardware on the
            right of frame, and disappears on phones where space is scarce. */}
        <dl className="hero__rail" data-hero="rail" aria-label="Platform summary">
          <div className="hero__rail-row">
            <dt>Storage</dt>
            <dd>825 GB SSD</dd>
          </div>
          <div className="hero__rail-row">
            <dt>Rendering</dt>
            <dd>Ray traced</dd>
          </div>
          <div className="hero__rail-row">
            <dt>Output</dt>
            <dd>4K 120 Hz</dd>
          </div>
          <div className="hero__rail-row">
            <dt>Audio</dt>
            <dd>Spatial</dd>
          </div>
        </dl>
      </div>

      <a
        className="hero__scroll"
        href="#scene-hardware"
        onClick={go('scene-hardware')}
        data-hero="scroll"
        aria-label="Scroll to the hardware section"
      >
        <span className="hero__scroll-label">Scroll</span>
        <span className="hero__scroll-track" aria-hidden="true">
          <span className="hero__scroll-dot" />
        </span>
      </a>
    </section>
  );
}
