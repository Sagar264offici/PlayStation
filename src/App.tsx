import { useCallback, useEffect, useRef, useState } from 'react';
import { Experience } from '@/three/Experience';
import { LoadingScreen } from '@/components/loading/LoadingScreen';
import type { LoadProgress } from '@/components/loading/LoadingScreen';
import { BootSequence } from '@/components/intro/BootSequence';
import { Navigation } from '@/components/navigation/Navigation';
import { Hero } from '@/components/hero/Hero';
import { Hardware } from '@/components/hardware/Hardware';
import { Performance, Immersion } from '@/components/chapters/Chapters';
import { ControllerSection } from '@/components/controller/ControllerSection';
import { GameCinema } from '@/components/games/GameCinema';
import { GameDiscovery } from '@/components/games/GameDiscovery';
import { Community, Finale } from '@/components/community/Community';
import { StaticFallback } from '@/components/ui/StaticFallback';
import { createMasterTimeline } from '@/animations/masterTimeline';
import { ScrollTrigger } from '@/animations/gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { usePointerStage } from '@/hooks/usePointerStage';
import { useMediaReady } from '@/hooks/useMediaReady';
import { introVideo } from '@/data/assets';
import { detectWebGL } from '@/utils/webgl';
import { ui, useUi } from '@/state/stage';

/**
 * The application shell.
 *
 * Owns the four-phase lifecycle:
 *
 *   loading    →  assets report in, the gate is shown
 *   intro      →  the supplied sting plays and hands off to the 3D studio
 *   experience →  the page is live and scroll drives the single timeline
 *
 * The WebGL canvas is mounted once and never unmounted, so the hardware stays
 * resident for the whole experience and scrolling only moves the camera.
 */
export default function App() {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  // Detected during initialisation rather than in an effect. An effect would
  // commit a "probing" render first and then immediately re-render, which is a
  // wasted pass and a visible blank frame before the loader appears. The probe
  // is a context-creation attempt, not a blocking layout read, so doing it
  // eagerly is cheap.
  const [webgl] = useState(() => detectWebGL());

  usePointerStage();

  if (!webgl) return <StaticFallback />;

  return <LiveExperience reducedMotion={reducedMotion} isMobile={isMobile} />;
}

/* -------------------------------------------------------------------------- */
/* Load tracking                                                               */
/* -------------------------------------------------------------------------- */

const PHASE_KEYS = ['assets', 'scene', 'environment', 'media', 'interaction'] as const;
type PhaseKey = (typeof PHASE_KEYS)[number];

/**
 * Tracks the five things the loader actually waits on.
 *
 * Overall progress is the mean of the phases rather than a running total, so a
 * single slow dependency cannot hide behind four fast ones and leave the bar
 * sitting at 90%.
 */
function useLoadTracker() {
  const [progress, setProgress] = useState<LoadProgress>(() => ({
    value: 0,
    phases: PHASE_KEYS.reduce((acc, key) => ({ ...acc, [key]: 0 }), {} as Record<PhaseKey, number>),
    complete: false,
  }));

  const phasesRef = useRef(progress.phases);

  const mark = useCallback((key: PhaseKey, value = 1) => {
    const next = { ...phasesRef.current, [key]: Math.max(phasesRef.current[key] ?? 0, value) };
    phasesRef.current = next;

    const mean = PHASE_KEYS.reduce((sum, name) => sum + (next[name] ?? 0), 0) / PHASE_KEYS.length;
    const complete = PHASE_KEYS.every((name) => (next[name] ?? 0) >= 0.999);

    setProgress({ value: mean, phases: next, complete });
    ui.set({ loadProgress: mean });
  }, []);

  /**
   * Failsafe.
   *
   * Every phase above is driven by a callback from a resource we do not fully
   * control, and two of them can simply never fire: a WebGL context that fails
   * to create, or a model request that stalls without erroring. In that case
   * `complete` stays false forever and the visitor is locked on the gate
   * looking at a bar that will not move.
   *
   * Nothing here is worth locking anyone out of, so past a generous budget the
   * gate opens regardless and the scene resolves in the background.
   * `ModelBoundary` and the reduced-motion path already cover the degraded
   * result, so forcing completion degrades rather than breaks.
   */
  useEffect(() => {
    if (progress.complete) return;

    const id = window.setTimeout(() => {
      PHASE_KEYS.forEach((key) => mark(key, 1));
    }, 20_000);

    return () => window.clearTimeout(id);
  }, [progress.complete, mark]);

  return { progress, mark };
}

/* -------------------------------------------------------------------------- */
/* Live experience                                                             */
/* -------------------------------------------------------------------------- */

function LiveExperience({ reducedMotion, isMobile }: { reducedMotion: boolean; isMobile: boolean }) {
  const phase = useUi((s) => s.phase);
  const booted = useUi((s) => s.booted);
  const activeScene = useUi((s) => s.activeScene);

  const storyRef = useRef<HTMLDivElement>(null);
  const [canvasMounted, setCanvasMounted] = useState(false);

  const { progress, mark } = useLoadTracker();

  // `assets` is fractional on purpose: the gate is not a fake timer, and it
  // should not open until both meshes have actually resolved. Each model
  // reports in and takes half of the phase.
  const onConsoleReady = useCallback(() => mark('assets', 0.5), [mark]);
  const onControllerReady = useCallback(() => mark('assets', 1), [mark]);

  const onSceneReady = useCallback(() => {
    mark('scene', 1);

    // The environment bake and the interaction wiring both become real on the
    // first presented frame: the lightformer environment has been resolved by
    // then, and the camera rig, orbit controls and pointer tracking are all
    // constructed and mounted. Marking them a frame later than the scene
    // itself is what lets the bar visibly complete instead of snapping to 100%.
    requestAnimationFrame(() => {
      mark('environment', 1);
      mark('interaction', 1);
    });
  }, [mark]);

  // The intro sting is 13MB of video. Probing its metadata before the gate
  // opens means the boot cut plays straight away instead of buffering in front
  // of the user. `media` counts as satisfied on error too — a missing sting must
  // not make the experience unreachable.
  const intro = useMediaReady(introVideo.src);
  useEffect(() => {
    if (intro.status === 'ready') mark('media', 1);
    if (intro.status === 'error') mark('media', 1);
  }, [intro.status, mark]);

  // Defer canvas construction by a frame so it does not compete with the
  // loading gate's own layout work on constrained machines.
  useEffect(() => {
    const id = requestAnimationFrame(() => setCanvasMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  /* ---- master timeline -------------------------------------------------- */

  useEffect(() => {
    const node = storyRef.current;
    if (!node || phase !== 'experience') return;

    const handles = createMasterTimeline(node, { reducedMotion, isMobile });

    // Section heights settle after fonts and images land; re-measure once.
    const onLoad = () => handles.refresh();
    window.addEventListener('load', onLoad);

    return () => {
      window.removeEventListener('load', onLoad);
      handles.destroy();
    };
  }, [phase, reducedMotion, isMobile]);

  /* ---- active scene tracking ------------------------------------------- */

  useEffect(() => {
    if (phase !== 'experience') return;

    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-scene]'));
    if (!sections.length) return;

    const triggers = sections.map((section) =>
      ScrollTrigger.create({
        trigger: section,
        start: 'top 55%',
        end: 'bottom 45%',
        onToggle: (self) => {
          if (self.isActive) ui.set({ activeScene: section.dataset.scene ?? 'boot' });
        },
      }),
    );

    return () => triggers.forEach((trigger) => trigger.kill());
  }, [phase]);

  /* ---- scroll gate ------------------------------------------------------ */

  useEffect(() => {
    if (phase === 'experience') {
      document.body.style.overflow = '';
    } else {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [phase]);

  const enter = useCallback(() => ui.set({ phase: 'intro' }), []);
  const bootComplete = useCallback(() => ui.set({ phase: 'experience', booted: true }), []);

  return (
    <div className="app" data-phase={phase}>
      {/* One persistent canvas behind the entire document. */}
      {canvasMounted ? (
        <div className="app__canvas" aria-hidden="true">
          <Experience
            reducedMotion={reducedMotion}
            isMobile={isMobile}
            onSceneReady={onSceneReady}
            onConsoleReady={onConsoleReady}
            onControllerReady={onControllerReady}
          />
        </div>
      ) : null}

      {/* The scrollable story. The master timeline is bound to this element. */}
      <div className="app__story" ref={storyRef}>
        {booted ? (
          <>
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
              <Footer />
            </main>
          </>
        ) : null}
      </div>

      {phase === 'loading' ? (
        <LoadingScreen progress={progress} ready={progress.complete} onEnter={enter} compact={isMobile} />
      ) : null}

      {phase === 'intro' ? <BootSequence onComplete={bootComplete} /> : null}

      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <p className="visually-hidden" aria-live="polite">
        {activeScene ? `Current section: ${activeScene}` : ''}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Footer                                                                      */
/* -------------------------------------------------------------------------- */

function Footer() {
  return (
    <footer className="footer">
      <div className="section__inner footer__inner">
        <p className="footer__mark">Project NOVA</p>
        <p className="footer__disclaimer">
          Independent fan project. Not affiliated with, endorsed by, or representing Sony
          Interactive Entertainment or PlayStation.
        </p>
        <p className="footer__colophon">
          Real-time WebGL · React Three Fiber · GSAP ScrollTrigger · Models and textures from the
          supplied asset set
        </p>
      </div>
    </footer>
  );
}
