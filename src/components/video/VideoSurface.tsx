import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap, ease } from '@/animations/gsap';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { VideoAsset } from '@/types';

/**
 * The video surface.
 *
 * Built for footage that has not been supplied yet, which is the current
 * state of this project. Three things must be true:
 *
 *   - A missing file must never crash anything. It renders an explicit
 *     "media pending" panel that says what is expected and where it goes.
 *   - A paused or offscreen video must not keep decoding. Visibility and
 *     intersection are both watched, and only one video is ever mounted with a
 *     live source at a time.
 *   - Controls are real: play/pause, a scrubbable progress bar, time, mute
 *     and fullscreen, all keyboard reachable.
 */

export type MediaState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error' | 'pending';

interface VideoSurfaceProps {
  asset: VideoAsset | null;
  /** Slot index, shown in the pending state. */
  index: string;
  title: string;
  accent: string;
  /** Paused while the section is off screen. */
  active: boolean;
  /** Reported so the parent can pause siblings. */
  onPlay?: () => void;
  className?: string;
}

export function VideoSurface({
  asset,
  index,
  title,
  accent,
  active,
  onPlay,
  className = '',
}: VideoSurfaceProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const scrubberRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<MediaState>(asset ? 'loading' : 'pending');
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);

  const isMobile = useIsMobile();
  const reduced = useReducedMotion();

  /* ---------------------------------------------------------------------- */
  /* Element loading                                                        */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !asset) return;

    setState('loading');

    const onLoaded = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setState('ready');
    };
    const onError = () => setState('error');
    const onWaiting = () => setState('loading');

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('error', onError);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('stalled', onWaiting);

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('stalled', onWaiting);
    };
  }, [asset]);

  /* ---------------------------------------------------------------------- */
  /* Offscreen pausing                                                      */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const video = videoRef.current;
    const wrap = wrapRef.current;
    if (!video || !asset) return;

    if (!active) {
      if (!video.paused) {
        video.pause();
        setPlaying(false);
        setState('paused');
      }
      return;
    }

    // Only decode while genuinely on screen.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && !video.paused) {
          video.pause();
          setPlaying(false);
          setState('paused');
        }
      },
      { threshold: 0.25 },
    );

    if (wrap) observer.observe(wrap);
    return () => observer.disconnect();
  }, [active, asset]);

  /* ---------------------------------------------------------------------- */
  /* Page visibility                                                        */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const onVisibility = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden && !video.paused) {
        video.pause();
        setPlaying(false);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Transport                                                              */
  /* ---------------------------------------------------------------------- */

  const toggle = useCallback(() => {
    const video = videoRef.current;
    if (!video || !asset) return;

    if (video.paused) {
      video.muted = muted;
      video
        .play()
        .then(() => {
          setPlaying(true);
          setState('playing');
          onPlay?.();
        })
        .catch(() => setState('error'));
    } else {
      video.pause();
      setPlaying(false);
      setState('paused');
    }
  }, [asset, muted, onPlay]);

  const seek = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.duration, value));
    setTime(video.currentTime);
  }, []);

  const onScrub = (event: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(event.target.value));
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !muted;
    video.muted = next;
    setMuted(next);
  };

  const fullscreen = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      wrap.requestFullscreen?.().catch(() => undefined);
    }
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Progress                                                               */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !asset) return;

    let raf = 0;
    const tick = () => {
      if (!scrubbing) {
        const current = video.currentTime;
        setTime(current);
        if (progressRef.current && video.duration) {
          progressRef.current.style.transform = `scaleX(${current / video.duration})`;
        }
        if (scrubberRef.current) {
          scrubberRef.current.valueAsNumber = current;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    // Only run the rAF loop while actually playing.
    if (playing) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, scrubbing, asset]);

  /* ---------------------------------------------------------------------- */
  /* Entrance                                                               */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const node = wrapRef.current;
    if (!node || !active) return;
    if (reduced) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        node,
        { opacity: 0, scale: 0.97, y: 18 },
        { opacity: 1, scale: 1, y: 0, duration: 1.1, ease: ease.cinematic },
      );
    }, node);

    return () => context.revert();
  }, [active, reduced]);

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* --------------------------------------------------------------------------*/

  const format = (seconds: number) => {
    if (!Number.isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const percent = duration ? (time / duration) * 100 : 0;
  const pending = !asset;

  return (
    <div
      ref={wrapRef}
      className={`video-surface ${className}`}
      data-state={state}
      style={{ '--accent': accent } as never}
    >
      {/* ---- pending / error -------------------------------------------- */}
      {pending || state === 'error' ? (
        <div className="video-surface__placeholder" role="status">
          <div className="video-surface__placeholder-frame" aria-hidden="true">
            <span className="video-surface__corner video-surface__corner--tl" />
            <span className="video-surface__corner video-surface__corner--tr" />
            <span className="video-surface__corner video-surface__corner--bl" />
            <span className="video-surface__corner video-surface__corner--br" />
            <span className="video-surface__scan" />
          </div>

          <div className="video-surface__placeholder-copy">
            <p className="video-surface__placeholder-index">Slot {index}</p>
            <p className="video-surface__placeholder-title">
              {state === 'error' ? 'Media unavailable' : 'Media slot ready'}
            </p>
            <p className="video-surface__placeholder-body">
              {state === 'error' ? (
                <>
                  The file for <strong>{title}</strong> could not be decoded. The slot stays in
                  place so the gallery layout holds.
                </>
              ) : (
                <>
                  This slot is wired and waiting on capture. Drop{' '}
                  <code>game-{index}.mp4</code> into the media directory and it appears here — no
                  layout change required.
                </>
              )}
            </p>
            <p className="video-surface__placeholder-hint">
              {state === 'error' ? 'Check the file path and codec.' : 'No placeholder footage is shown in its place.'}
            </p>
          </div>
        </div>
      ) : (
        /* ---- video ----------------------------------------------------- */
        <>
          <video
            ref={videoRef}
            className="video-surface__video"
            src={asset.src}
            poster={asset.poster}
            playsInline
            muted={muted}
            loop
            preload="metadata"
            onClick={toggle}
            onPlay={() => {
              setPlaying(true);
              setState('playing');
            }}
            onPause={() => {
              setPlaying(false);
              setState('paused');
            }}
          />

          {state === 'loading' ? (
            <div className="video-surface__loading" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          ) : null}

          {/* Controls appear on hover, focus-within, or while paused. Never a
              permanent bar across the frame. */}
          <div className="video-surface__controls" data-visible={!playing}>
            <div className="video-surface__transport">
              <button
                type="button"
                className="video-surface__play"
                onClick={toggle}
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? (
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <rect x="4" y="3" width="3" height="10" />
                    <rect x="9" y="3" width="3" height="10" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M5 3.2 12.4 8 5 12.8Z" />
                  </svg>
                )}
              </button>

              <div className="video-surface__scrub">
                <span className="video-surface__scrub-track" aria-hidden="true">
                  <span ref={progressRef} className="video-surface__scrub-fill" />
                </span>
                <input
                  ref={scrubberRef}
                  type="range"
                  className="video-surface__range"
                  min={0}
                  max={duration || 0}
                  step={0.01}
                  value={time}
                  onChange={onScrub}
                  onPointerDown={() => setScrubbing(true)}
                  onPointerUp={() => setScrubbing(false)}
                  onKeyDown={() => setScrubbing(true)}
                  onKeyUp={() => setScrubbing(false)}
                  aria-label="Seek"
                  aria-valuetext={`${format(time)} of ${format(duration)}`}
                />
              </div>

              <span className="video-surface__time">
                {format(time)} <span className="video-surface__time-sep">/</span> {format(duration)}
              </span>

              <button
                type="button"
                className="video-surface__icon"
                onClick={toggleMute}
                aria-label={muted ? 'Unmute' : 'Mute'}
                aria-pressed={!muted}
              >
                {muted ? (
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
                    <path d="M3 6h2.5L9 3v10L5.5 10H3Z" />
                    <path d="M11.5 6.5 14 9M14 6.5 11.5 9" strokeLinecap="square" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
                    <path d="M3 6h2.5L9 3v10L5.5 10H3Z" />
                    <path d="M11 6.2a2.6 2.6 0 0 1 0 3.6" strokeLinecap="square" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                className="video-surface__icon video-surface__icon--fs"
                onClick={fullscreen}
                aria-label={isMobile ? 'Fullscreen' : 'Enter fullscreen'}
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
                  <path d="M2 6V2.8h3.2M14 6V2.8h-3.2M2 10v3.2h3.2M14 10v3.2h-3.2" strokeLinecap="square" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Letterbox mattes, which sell the footage as cinema rather than as a
          web player. */}
      <span className="video-surface__matte video-surface__matte--top" aria-hidden="true" />
      <span className="video-surface__matte video-surface__matte--bottom" aria-hidden="true" />

      <p className="visually-hidden" aria-live="polite">
        {pending
          ? `Game slot ${index}, ${title}. Media not yet supplied.`
          : `${title}. ${playing ? 'Playing' : 'Paused'} at ${format(time)} of ${format(duration)}.`}
      </p>

      <span className="visually-hidden" aria-hidden="true" data-percent={percent} />
    </div>
  );
}
