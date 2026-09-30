import { SectionLabel } from '@/components/ui/SectionLabel';
import { LineReveal, Reveal } from '@/components/ui/Reveal';
import { TiltCard } from '@/components/ui/TiltCard';
import { Arrow } from '@/components/ui/Button';
import { games, stills } from '@/data/assets';

/**
 * Game discovery.
 *
 * An editorial composition, not a storefront. One oversized feature with the
 * console render as its image, three asymmetric supporting cards beneath it at
 * deliberately different sizes, and a numbered index column.
 *
 * The variation is the point: six identical rounded cards would read as a
 * template, and a template is exactly what this must not be.
 */
export function GameDiscovery() {
  const [feature, ...supporting] = games;

  return (
    <section className="section section--discovery" aria-labelledby="discovery-title">
      <div className="section__inner">
        <header className="discovery__header">
          <SectionLabel index="05.1">Discovery</SectionLabel>
          <LineReveal
            as="h2"
            className="discovery__title"
            lines={['A library,', 'not a', 'list.']}
          />
          <Reveal as="p" className="discovery__intro" delay={0.12}>
            Three slots are reserved in the cinema above. What sits here is how they will be
            presented once capture lands — a lead feature and an asymmetric supporting set.
          </Reveal>
        </header>

        {/* ---- lead feature ---------------------------------------------- */}
        <Reveal className="discovery__feature" y={40}>
          <TiltCard className="feature-card" as="article" max={5} parallax={14}>
            <a className="feature-card__link" href="#scene-games">
              <div className="feature-card__media">
                <img
                  src={stills.consoleRender}
                  alt="PlayStation 5 console rendered against a dark studio background"
                  loading="lazy"
                  decoding="async"
                  width={1400}
                  height={1400}
                />
                <span className="feature-card__scrim" aria-hidden="true" />
              </div>

              <div className="feature-card__body">
                <p className="feature-card__kicker">
                  <span>Lead feature</span>
                  <span className="feature-card__dot" aria-hidden="true" />
                  <span>{feature.genre}</span>
                </p>
                <h3 className="feature-card__title" id="discovery-title">
                  {feature.title}
                </h3>
                <p className="feature-card__description">{feature.description}</p>
                <span className="feature-card__cta">
                  Open in cinema
                  <Arrow />
                </span>
              </div>
            </a>
          </TiltCard>
        </Reveal>

        {/* ---- supporting set -------------------------------------------- */}
        <ul className="discovery__grid">
          {supporting.map((game, i) => (
            <Reveal
              as="li"
              key={game.id}
              className={`discovery__cell discovery__cell--${i === 0 ? 'wide' : 'tall'}`}
              delay={i * 0.08}
              y={32}
            >
              <TiltCard className="support-card" as="article" max={7} parallax={9}>
                <a className="support-card__link" href="#scene-games">
                  <div className="support-card__media">
                    <img
                      src={i === 0 ? stills.controller : stills.console}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      width={1400}
                      height={1400}
                    />
                    <span className="support-card__scrim" aria-hidden="true" />
                    <span className="support-card__index">{game.index}</span>
                  </div>

                  <div className="support-card__body">
                    <p className="support-card__genre">{game.genre}</p>
                    <h3 className="support-card__title">{game.title}</h3>
                    <p className="support-card__description">{game.description}</p>
                    <span className="support-card__foot">
                      <span className="support-card__platform">PS5</span>
                      <span className="support-card__action">Explore</span>
                    </span>
                  </div>
                </a>
              </TiltCard>
            </Reveal>
          ))}

          {/* A fourth cell that is not a game card at all — the archive note.
              Breaks the rhythm so the grid never reads as a repeating template. */}
          <Reveal as="li" className="discovery__cell discovery__cell--note" delay={0.16} y={32}>
            <div className="note-card">
              <p className="note-card__label">Archive</p>
              <p className="note-card__body">
                Every title here is a reserved slot with real metadata and no footage. The
                composition is final; only the capture is outstanding.
              </p>
              <a className="note-card__link" href="#scene-games">
                Back to the cinema
                <Arrow />
              </a>
            </div>
          </Reveal>
        </ul>
      </div>
    </section>
  );
}
