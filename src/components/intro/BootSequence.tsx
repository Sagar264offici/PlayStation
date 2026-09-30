import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap, ease } from '@/animations/gsap';
import { introVideo } from '@/data/assets';
import { stage } from '@/state/stage';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * The boot sequence.
 *
 * This is the handoff that the whole experience is built around, and it is not
 * a crossfade. The sequence is:
 *
 *   1. Pure black. A single blue point of light, barely there.
 *   2. The supplied SIE intro sting plays in that darkness, letterboxed to
 *      nothing, scaled just past the frame so it feels like a lens rather than
 *      a `<video>` element.
 *   3. As the sting resolves to black, that blue point expands and becomes the
 *      key light in the 3D studio.
 *   4. The environment resolves out of black: fog thins, the floor appears, the
 *      hardware rises.
 *   5. The camera pushes in and the site proper begins.
 *
 * The continuity between step 2 and step 3 is the point: the same blue that
 * fills the last frame of the video is the light the console is lit by.
 */

export type BootPhase = 'dark' | 'video' | 'bloom' | 'reveal' | 'done';

interface BootSequenceProps {
  /** Called once the camera push-in has begun and the page is interactive. */
  onComplete: () => void;
}

export function BootSequence({ onComplete }: BootSequenceProps) {
  const root = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const lightbarRef = useRef<HTMLSpanElement>(null);

  const [phase, setPhase] = useState<BootPhase>('dark');
  const [videoFailed, setVideoFailed] = useState(false);
  const finished = useRef(false);
  const reduced = useReducedMotion();

  /* ---------------------------------------------------------------------- */
  /* The 3D side of the handoff                                              */
  /* ---------------------------------------------------------------------- */

  const bloomToScene = useCallback(() => {
    if (finished.current) return;
    finished.current = true;

    setPhase('bloom');

    const tl = gsap.timeline({
      defaults: { ease: ease.cinematic },
      onComplete: () => setPhase('done'),
    });

    // 1. The point of light swells and washes the frame.
    tl.to(glowRef.current, {
      scale: 46,
      opacity: 1,
      duration: reduced ? 0.5 : 1.5,
    })
      .to(veilRef.current, { opacity: 0, duration: reduced ? 0.4 : 1.2 }, '-=0.7')

      // 2. The same blue becomes the studio's rim light. This is the moment the
      //    video's last frame and the 3D scene are the same light source.
      .to(
        stage,
        {
          rimIntensity: 2.6,
          ledIntensity: 2.8,
          rimHue: 0.55,
          duration: reduced ? 0.6 : 1.9,
        },
        '-=1.15',
      )
      .to(glowRef.current, { opacity: 0, duration: 0.9 }, '-=1.3')

      // 3. The world resolves: fog thins, the floor catches light, the
      //    hardware rises out of the floor.
      .to(
        stage,
        {
          fogDensity: 0.16,
          floorReflect: 1,
          particleOpacity: 0.85,
          voidAmount: 0,
          duration: reduced ? 0.6 : 2.1,
        },
        '-=1.5',
      )
      .to(
        stage,
        {
          consoleReveal: 1,
          padReveal: 1,
          duration: reduced ? 0.6 : 1.8,
          ease: ease.emphasis,
        },
        '-=1.75',
      )

      // 4. The camera pushes forward into the hero framing.
      .to(
        stage,
        {
          camZ: 1.62,
          camY: 0.3,
          camX: 0.62,
          duration: reduced ? 0.5 : 2.4,
          ease: 'power2.inOut',
        },
        '-=1.5',
      )
      .add(() => onComplete(), '-=0.9');

    return tl;
  }, [onComplete, reduced]);

  /* ---------------------------------------------------------------------- */
  /* Video playback                                                          */
  /* ---------------------------------------------------------------------- */

  /**
   * Wire playback.
   *
   * The `<video>` is mounted from the very first render (see `renderVideo`
   * below) rather than being gated on the phase, because an effect that reads
   * a ref can only see an element that already exists. Gating the element on
   * `phase === 'video'` and promoting the phase from here would mean the first
   * pass always saw a null ref, bailed out, and never re-ran — its
   * dependencies could not change, since the very act of bailing was what
   * prevented them from changing. The sequence would then sit on true black
   * indefinitely with nothing left to trigger a retry.
   *
   * The phase is instead promoted from `canplay`, which is both an accurate
   * description of what is on screen and an event handler, not an effect body.
   */
  useEffect(() => {
    if (videoFailed) {
      // No video: honour the reduced-motion path and boot straight to the
      // bloom. The 3D reveal is the real content.
      const timer = window.setTimeout(bloomToScene, 400);
      return () => window.clearTimeout(timer);
    }
  }, [videoFailed, bloomToScene]);

  useEffect(() => {
    if (videoFailed) return;

    const video = videoRef.current;
    if (!video) return;

    // The site has no audio until the user asks for it, so the sting is muted
    // and unmuting is a deliberate, labelled action elsewhere in the UI.
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      bloomToScene();
    };

    const reveal = () => {
      // Kick the fade of the letterbox away so the sting plays on true black.
      gsap.fromTo(
        video,
        { opacity: 0, scale: 1.06 },
        { opacity: 1, scale: 1, duration: 0.8, ease: ease.out },
      );
      setPhase('video');
    };

    const onEnded = () => finish();
    const onError = () => {
      setVideoFailed(true);
    };
    const onCanPlay = () => reveal();

    // A video that never fires `ended` (autoplay blocked, decode stall) must
    // not trap the user on the boot screen. Cap it by wall clock.
    const failsafe = window.setTimeout(finish, 26_000);

    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);
    video.addEventListener('canplay', onCanPlay);

    // `canplay` may already have fired before this effect ran — the element is
    // mounted on first render and `preload="auto"` starts fetching immediately.
    // Without this the sequence would stay on `dark` with the sting already
    // decoded and playing, which is the same class of bug as above.
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) reveal();

    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => {
        // Autoplay refused. Say so honestly and continue without the sting
        // rather than silently pretending it played.
        setVideoFailed(true);
      });
    }

    return () => {
      window.clearTimeout(failsafe);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
      video.removeEventListener('canplay', onCanPlay);
    };
    // `phase` is deliberately absent: the body never reads it, and `reveal`
    // sets it. Depending on it here would tear down and re-wire playback — and
    // restart the fade — each time the sequence moved forward.
  }, [videoFailed, bloomToScene]);

  /* ---------------------------------------------------------------------- */
  /* Reduced motion                                                          */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!reduced) return;
    // Keep all content, cut the theatrics: short bloom, no long drift.
    gsap.set(glowRef.current, { scale: 1, opacity: 0.4 });
  }, [reduced]);

  /* ---------------------------------------------------------------------- */
  /* Pointer light during the dark phase                                     */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (phase !== 'dark' && phase !== 'video') return;
    const onMove = (event: PointerEvent) => {
      if (!lightbarRef.current) return;
      lightbarRef.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [phase]);

  // Mounted from the first render, not gated on the phase, so the playback
  // effect always has a real element to wire. Stays invisible until `canplay`
  // fades it in, and unmounts with the sequence.
  const renderVideo = !videoFailed && phase !== 'done';

  // The slate is presentation, not plumbing: it may only appear once the sting
  // is genuinely about to play.
  const showVideo = phase === 'video' && !videoFailed;

  return (
    <div
      ref={root}
      className="boot"
      data-phase={phase}
      aria-hidden={phase === 'done'}
      // Once the sequence has handed off, the whole overlay stops receiving
      // events so the experience underneath is immediately interactive.
      style={{ pointerEvents: phase === 'done' ? 'none' : 'auto' }}
    >
      {/* 0. True black. Nothing else is on screen. */}
      <div ref={veilRef} className="boot__veil" aria-hidden="true" />

      {/* 1. Ambient motes, almost invisible. */}
      <div className="boot__dust" aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 61) % 100}%`,
              animationDelay: `${(i % 7) * 0.9}s`,
              animationDuration: `${9 + (i % 5) * 3}s`,
            }}
          />
        ))}
      </div>

      {/* 2. The blue point of light. Follows the cursor before it blooms. */}
      <div
        ref={glowRef}
        className="boot__glow"
        aria-hidden="true"
        style={{ transform: 'translate(-50%, -50%)' }}
      />
      <span ref={lightbarRef} className="boot__tracker" aria-hidden="true" />

      {/* 3. The supplied SIE intro sting. Scaled past the frame so it reads as
             a lens filling the screen, not as a media element. */}
      {renderVideo ? (
        <video
          ref={videoRef}
          className="boot__video"
          src={introVideo.src}
          poster={introVideo.poster}
          playsInline
          muted
          preload="auto"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
        />
      ) : null}

      {/* 4. Chapter slate, present only while the sting plays. */}
      {showVideo ? (
        <div className="boot__slate" aria-hidden="true">
          <span className="boot__slate-index">00</span>
          <span className="boot__slate-label">Boot</span>
        </div>
      ) : null}

      {videoFailed && phase === 'dark' ? (
        <p className="boot__notice" role="status">
          Opening sting unavailable — continuing to the studio.
        </p>
      ) : null}
    </div>
  );
}
