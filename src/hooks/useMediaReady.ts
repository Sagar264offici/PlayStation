import { useEffect, useState } from 'react';

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type MediaStatus = 'pending' | 'ready' | 'error';

/* -------------------------------------------------------------------------- */
/* Element readiness                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Reports whether a media element has enough loaded to be played without a stall.
 *
 * `loadedmetadata` is the honest gate: it is the point at which duration and
 * seeking become available, so a play call afterwards starts immediately rather
 * than buffering. `canplaythrough` is deliberately not used — it can take many
 * seconds on a slow connection, and holding the entry gate for it would trade a
 * real improvement in the intro for a much worse first impression.
 *
 * The element is created detached and never inserted into the document, so
 * probing does not add a second decode or a stray `<video>` to the accessibility
 * tree.
 */
export function useMediaReady(src: string | null | undefined): MediaState {
  const [state, setState] = useState<MediaState>(PENDING);

  useEffect(() => {
    if (!src) return;

    let cancelled = false;
    const video = document.createElement('video');

    const finish = (status: MediaStatus, duration = 0) => {
      if (cancelled) return;
      setState({ status, duration });
    };

    const onReady = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      finish('ready', duration);
    };

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    // Never fetched twice: the probe warms the HTTP cache so the real boot
    // element plays from memory rather than re-requesting the same 13MB file.
    video.src = src;

    video.addEventListener('loadedmetadata', onReady);
    video.addEventListener('error', () => finish('error'));

    // A source that never resolves should not hold the gate shut forever.
    const timeout = window.setTimeout(() => {
      if (!cancelled) finish('error');
    }, 8000);

    // Metadata may already have landed synchronously from cache.
    if (video.readyState >= 1) onReady();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      video.removeEventListener('loadedmetadata', onReady);
      // Release the decoder and the buffer immediately.
      video.removeAttribute('src');
      video.load();
    };
  }, [src]);

  // With no source there is nothing to be ready, so the state is derived rather
  // than pushed through an effect. Resetting it in the effect body would also
  // re-render on every mount to set a value it already had.
  return src ? state : PENDING;
}

const PENDING: MediaState = { status: 'pending', duration: 0 };

export interface MediaState {
  status: MediaStatus;
  /** Seconds; 0 when unknown or failed. */
  duration: number;
}
