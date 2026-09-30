import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap, ease } from '@/animations/gsap';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { LineReveal, Reveal } from '@/components/ui/Reveal';
import { VideoSurface } from '@/components/video/VideoSurface';
import { games } from '@/data/assets';
import { stage, ui } from '@/state/stage';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * The game cinema.
 *
 * An editorial film gallery, not a thumbnail row. One screen holds the whole
 * selection: a large stage, a minimal metadata column, and three numbered
 * positions.
 *
 * Switching slots is a single timeline, not a set of independent transitions:
 * the outgoing title and stage move backwards and shrink, the incoming title
 * and stage come forward and expand, the accent colour is interpolated, and
 * the studio behind reacts to the new accent on the same beat. Everything
 * arrives together or not at all.
 */
export function GameCinema() {
  const root = useRef<HTMLElement>(null);
  const stageEl = useRef<HTMLDivElement>(null);
  const metaEl = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const current = games[index];
  const reduced = useReducedMotion();
  const busy = useRef(false);
  const accentRgb = useRef<[number, number, number]>([...current.accentRgb]);

  /* ---- section visibility ------------------------------------------------ */
  useEffect(() => {
    const node = root.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: '-25% 0px -25% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Mirror the active slot into the reactive store so the nav and the studio
  // can respond.
  useEffect(() => {
    ui.set({ activeGame: index });
  }, [index]);

  /* ---- the accent drives the 3D world ----------------------------------- */
  useEffect(() => {
    const [r, g, b] = current.accentRgb;
    const proxy = { r: accentRgb.current[0], g: accentRgb.current[1], b: accentRgb.current[2] };
    accentRgb.current = [r, g, b];

    if (reduced) {
      stage.rimHue = hueFromRgb(r, g, b);
      return;
    }

    const tween = gsap.to(proxy, {
      r,
      g,
      b,
      duration: 1.1,
      ease: ease.cinematic,
      onUpdate: () => {
        // Push the interpolated accent into the studio's rim hue so the 3D
        // world relights to match the selected slot.
        stage.rimHue = hueFromRgb(proxy.r, proxy.g, proxy.b);
      },
    });

    return () => {
      tween.kill();
    };
  }, [current, reduced]);

  /* ---- the switch timeline ---------------------------------------------- */
  const select = useCallback(
    (next: number) => {
      if (next === index || busy.current) return;

      const outgoingStage = stageEl.current;
      const outgoingMeta = metaEl.current;

      // Let the next render land before animating the new content in.
      setIndex(next);

      if (reduced || !outgoingStage || !outgoingMeta) return;

      busy.current = true;

      const tl = gsap.timeline({
        defaults: { ease: ease.cinematic },
        onComplete: () => {
          busy.current = false;
        },
      });

      // Outgoing moves backwards and down-scale; incoming arrives forward.
      tl.to([outgoingStage, outgoingMeta], {
        opacity: 0,
        scale: 0.965,
        x: -18,
        duration: 0.42,
        ease: ease.out,
        stagger: 0.04,
      });
    },
    [index, reduced],
  );

  // Animate the incoming content in once React has swapped it.
  useEffect(() => {
    if (reduced) return;
    const nodes = [stageEl.current, metaEl.current].filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;

    const tl = gsap.timeline({ defaults: { ease: ease.cinematic } });
    tl.fromTo(
      nodes,
      { opacity: 0, scale: 1.04, x: 22 },
      { opacity: 1, scale: 1, x: 0, duration: 0.85, stagger: 0.06 },
    );

    // Metadata rows cascade in behind the title.
    const rows = root.current?.querySelectorAll('[data-meta-row]');
    if (rows?.length) {
      tl.fromTo(
        rows,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.06 },
        '-=0.5',
      );
    }
  }, [index, reduced]);

  /* ---- keyboard navigation ---------------------------------------------- */
  useEffect(() => {
    const node = root.current;
    if (!node) return;

    const onKey = (event: KeyboardEvent) => {
      if (!active) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        select((index + 1) % games.length);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        select((index - 1 + games.length) % games.length);
      }
    };

    node.addEventListener('keydown', onKey);
    return () => node.removeEventListener('keydown', onKey);
  }, [active, index, select]);

  return (
    <section
      ref={root}
      className="section section--games"
      id="scene-games"
      data-scene="games"
      aria-labelledby="games-title"
      style={{ '--game-accent': current.accent } as never}
    >
      <div className="section__inner">
        <header className="games__header">
          <SectionLabel index="05">Games</SectionLabel>
          <LineReveal
            as="h2"
            id="games-title"
            className="games__title"
            lines={['Worth', 'the', 'screen.']}
          />
        </header>

        <div className="games__body">
          {/* ---- the stage --------------------------------------------- */}
          <div
            className="games__stage"
            ref={stageEl}
            style={{ '--game-accent': current.accent } as never}
          >
            <VideoSurface
              key={current.id}
              asset={current.video}
              index={current.index}
              title={current.title}
              accent={current.accent}
              active={active}
            />

            <div className="games__stage-badge" aria-hidden="true">
              <span className="games__stage-badge-index">{current.index}</span>
              <span className="games__stage-badge-line" />
              <span className="games__stage-badge-slot">of 03</span>
            </div>
          </div>

          {/* ---- metadata + selector ------------------------------------ */}
          <div className="games__side" ref={metaEl}>
            <div className="games__meta">
              <p className="games__genre">{current.genre}</p>
              <h3 className="games__name">{current.title}</h3>
              <p className="games__description">{current.description}</p>

              <dl className="games__specs">
                {current.metadata.map((row) => (
                  <div className="games__spec" key={row.label} data-meta-row>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div
              className="games__selector"
              role="tablist"
              aria-label="Game slots"
              aria-orientation="vertical"
            >
              {games.map((game, i) => (
                <button
                  key={game.id}
                  type="button"
                  role="tab"
                  id={`game-tab-${game.index}`}
                  aria-selected={i === index}
                  aria-controls="game-panel"
                  tabIndex={i === index ? 0 : -1}
                  className="games__slot"
                  data-active={i === index}
                  onClick={() => select(i)}
                  style={{ '--slot-accent': game.accent } as never}
                >
                  <span className="games__slot-index">{game.index}</span>
                  <span className="games__slot-body">
                    <span className="games__slot-title">{game.title}</span>
                    <span className="games__slot-genre">{game.genre}</span>
                  </span>
                  <span className="games__slot-state" data-ready={game.ready}>
                    {game.ready ? 'Ready' : 'Awaiting media'}
                  </span>
                  <span className="games__slot-bar" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <Reveal as="p" className="games__note">
          Three cinema slots are built and wired. Only the opening sting has been supplied so
          far — the gallery is showing real media where it exists and an honest empty state
          where it does not.
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/** Converts an rgb triple to the HSL hue the studio's rim light expects. */
function hueFromRgb(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0.55;

  let hue: number;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;

  hue /= 6;
  return hue < 0 ? hue + 1 : hue;
}
