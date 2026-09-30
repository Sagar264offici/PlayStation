import { useMediaQuery } from './useMediaQuery';

const REDUCE = '(prefers-reduced-motion: reduce)';

/**
 * Tracks `prefers-reduced-motion`.
 *
 * The brief requires more than "shorten the transition": camera travel, pointer
 * parallax, auto-rotation and particle drift all need to stand down while the
 * content itself stays intact. This hook is the single switch for that.
 */
export function useReducedMotion(): boolean {
  return useMediaQuery(REDUCE);
}
