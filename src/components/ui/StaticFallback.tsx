import { Navigation } from '@/components/navigation/Navigation';
import { Hero } from '@/components/hero/Hero';
import { Hardware } from '@/components/hardware/Hardware';
import { Performance, Immersion } from '@/components/chapters/Chapters';
import { ControllerSection } from '@/components/controller/ControllerSection';
import { GameCinema } from '@/components/games/GameCinema';
import { GameDiscovery } from '@/components/games/GameDiscovery';
import { Community, Finale } from '@/components/community/Community';
import { brand, stills } from '@/data/assets';
import { ui } from '@/state/stage';
import { useEffect } from 'react';

/**
 * The no-WebGL composition.
 *
 * If the browser cannot give us a context — old hardware, a blocklisted driver,
 * a software rasteriser — the experience does not degrade into an empty page
 * or a black rectangle. It becomes a designed editorial layout using the same
 * copy, the same stills and the same navigation, with the atmosphere faked
 * with CSS rather than shaders.
 *
 * The 3D-dependent pieces (spatial callouts, the orbit console) are replaced by
 * their information equivalents, so no content is lost.
 */
export function StaticFallback() {
  // The nav and scene tracking assume the live lifecycle; put the store into
  // its end state so shared components behave.
  useEffect(() => {
    ui.set({ phase: 'experience', booted: true, webgl: false });
  }, []);

  return (
    <div className="app app--static" data-phase="experience">
      <div className="app__canvas app__canvas--static" aria-hidden="true">
        <span className="static__glow" />
        <span className="static__grain" />
      </div>

      <div className="app__story">
        <Navigation />
        <main id="main">
          <Hero />
          <Hardware />
          <Performance />
          <Immersion />
          <ControllerSection />
          <GameCinema />
          <GameDiscovery />
          <Community />
          <Finale />

          <section className="section section--notice" aria-labelledby="notice-title">
            <div className="section__inner">
              <h2 id="notice-title" className="notice__title">
                Static edition
              </h2>
              <p className="notice__body">
                This browser could not create a WebGL context, so the real-time 3D studio is
                unavailable. Everything else on this page — the full story, the navigation, the
                cinema and all copy — is intact. Enable hardware acceleration to see the hardware
                in three dimensions.
              </p>
              <div className="notice__stills">
                <figure>
                  <img src={stills.consoleRender} alt="PlayStation 5 console, static render" loading="lazy" />
                  <figcaption>Console</figcaption>
                </figure>
                <figure>
                  <img src={stills.controller} alt="PlayStation 5 controller, static render" loading="lazy" />
                  <figcaption>Controller</figcaption>
                </figure>
              </div>
            </div>
          </section>

          <footer className="footer">
            <div className="section__inner footer__inner">
              <p className="footer__mark">{brand.wordmark}</p>
              <p className="footer__disclaimer">{brand.disclaimer}</p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
