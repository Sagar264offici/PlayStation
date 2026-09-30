import { useCallback, useMemo, useSyncExternalStore } from 'react';

/**
 * Subscribes to a media query and re-renders on change.
 *
 * Used to branch the *composition* rather than just the CSS: the mobile
 * timeline uses a different camera path and a lighter particle budget, not a
 * squeezed version of the desktop one.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect` because the
 * viewport is external state. With the effect version the very first render
 * commits a value that may already be stale by the time it paints, which shows
 * up as a flash of the desktop layout on a phone before the effect corrects it.
 * The store also keeps the value correct during concurrent rendering, and
 * handles the subscribe/unsubscribe and cross-tab changes for free.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};

      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  }, [query]);

  // The server snapshot has to differ from a client `false` default, or React
  // treats the hydration as a mismatch. There is no server render here, so
  // `false` is a safe sentinel and never actually observed.
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** True below the 900px breakpoint — the phone/tablet composition. */
export function useIsMobile() {
  return useMediaQuery('(max-width: 900px)');
}

/** True for genuinely small screens, where particle counts get cut hardest. */
export function useIsLowPower() {
  return useMediaQuery('(max-width: 640px)');
}

/** True on pointer-fine devices (mouse/trackpad) as opposed to touch. */
export function useHasFinePointer() {
  return useMediaQuery('(hover: hover) and (pointer: fine)');
}

/** True in landscape on a short viewport, where vertical scroll is scarce. */
export function useIsShortLandscape() {
  return useMediaQuery('(max-height: 520px) and (orientation: landscape)');
}

/** `true` once the viewport is at least the given breakpoint. */
export function useAtLeast(width: number) {
  const query = useMemo(() => `(min-width: ${width}px)`, [width]);
  return useMediaQuery(query);
}
