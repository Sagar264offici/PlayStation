import { useEffect, useRef } from 'react';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { LineReveal, Reveal } from '@/components/ui/Reveal';
import { Button, Arrow } from '@/components/ui/Button';
import { gsap, ease } from '@/animations/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * The community chapter.
 *
 * Abstract by design. The numbers are presented as a live constellation rather
 * than as a social feed or a friends list, because the point is scale and
 * presence, not a social graph. Nothing here imitates a platform account UI.
 *
 * The counters count up on entry; the ticker rows drift at different speeds so
 * the block never looks like a static table.
 */

const SIGNAL = [
  { label: 'Playing now', value: '2.4M', detail: 'across the network' },
  { label: 'Sessions started', value: '918K', detail: 'in the last hour' },
  { label: 'Trophies earned', value: '14.1M', detail: 'rolling 24 hours' },
  { label: 'Countries', value: '190', detail: 'connected right now' },
];

const PILLARS = [
  {
    index: '01',
    title: 'Shared worlds',
    body: 'Drop-in sessions designed so a stranger can join without interrupting what you were already doing.',
  },
  {
    index: '02',
    title: 'Party voice',
    body: 'Spatial chat that carries direction. You can tell which side of the room someone is on.',
  },
  {
    index: '03',
    title: 'Remote play',
    body: 'The console is the console. Start on the big screen, finish on the laptop, lose nothing.',
  },
];

export function Community() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = root.current;
    if (!node || reduced) return;

    const context = gsap.context(() => {
      // Signal rows drift horizontally at slightly different rates. Very slow,
      // and only while in view, so it reads as motion in the periphery.
      const rows = node.querySelectorAll<HTMLElement>('[data-signal]');
      rows.forEach((row, i) => {
        gsap.to(row, {
          xPercent: i % 2 === 0 ? -3 : 3,
          duration: 14 + i * 3,
          ease: ease.inOut,
          repeat: -1,
          yoyo: true,
        });
      });
    }, node);

    return () => context.revert();
  }, [reduced]);

  return (
    <section
      ref={root}
      className="section section--community"
      id="scene-community"
      data-scene="community"
      aria-labelledby="community-title"
    >
      <div className="section__inner community__inner">
        <header className="community__header">
          <SectionLabel index="06">Community</SectionLabel>
          <LineReveal
            as="h2"
            id="community-title"
            className="community__title"
            lines={['Play is', 'better', 'together.']}
          />
        </header>

        <div className="community__body">
          <Reveal as="p" className="community__intro">
            The console is the object. Everything else is the reason it exists. These are abstract
            signals — scale, presence, connection — not a social feed.
          </Reveal>

          <div className="community__signal" aria-label="Network activity summary">
            {SIGNAL.map((row, i) => (
              <div
                className="signal-row"
                key={row.label}
                data-signal
                data-ready={i % 2 === 0}
              >
                <span className="signal-row__label">{row.label}</span>
                <span className="signal-row__value">{row.value}</span>
                <span className="signal-row__detail">{row.detail}</span>
                <span className="signal-row__pulse" aria-hidden="true" />
              </div>
            ))}
          </div>

          <ul className="community__pillars">
            {PILLARS.map((pillar, i) => (
              <Reveal as="li" key={pillar.index} className="pillar" delay={i * 0.08}>
                <span className="pillar__index">{pillar.index}</span>
                <h3 className="pillar__title">{pillar.title}</h3>
                <p className="pillar__body">{pillar.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Finale                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The closing shot.
 *
 * The camera has already returned to the hardware and the world has drained to
 * black in the master timeline. This is the last piece of type over that
 * darkness, and the only action left on the page.
 */
export function Finale() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = root.current;
    if (!node || reduced) return;

    const context = gsap.context(() => {
      // The CTA arrives last, after the world has finished draining.
      gsap.fromTo(
        '[data-finale="cta"]',
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: ease.cinematic,
          scrollTrigger: { trigger: node, start: 'top 62%', once: true },
        },
      );
    }, node);

    return () => context.revert();
  }, [reduced]);

  return (
    <section
      ref={root}
      className="section section--finale"
      id="scene-finale"
      data-scene="finale"
      aria-labelledby="finale-title"
    >
      <div className="section__inner finale__inner">
        <p className="finale__eyebrow">
          <span className="finale__dot" aria-hidden="true" />
          End of experience
        </p>

        <LineReveal
          as="h2"
          id="finale-title"
          className="finale__title"
          lines={['The next', 'level', 'starts here.']}
        />

        <p className="finale__body">
          One console, one controller, and a studio built to be looked at. Scroll back up, or
          take the long way through the showcase.
        </p>

        <div className="finale__actions" data-finale="cta">
          <Button
            variant="primary"
            size="lg"
            trailing={<Arrow />}
            href="#scene-boot"
            onClick={(event) => {
              event.preventDefault();
              window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
            }}
          >
            Explore the experience
          </Button>
          <Button variant="ghost" size="lg" href="#scene-hardware">
            Back to the hardware
          </Button>
        </div>
      </div>
    </section>
  );
}
