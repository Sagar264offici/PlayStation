import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Maximum rotation in degrees. Keep low — 8 is already clearly visible. */
  max?: number;
  /** How far the content inside shifts against the tilt, in px. */
  parallax?: number;
  /** Follow the pointer with a moving highlight. */
  spotlight?: boolean;
  as?: 'div' | 'article' | 'li';
}

/**
 * Pointer-reactive card.
 *
 * A single 3D transform plus one moving highlight — both written to the same
 * element, both driven from a single `pointermove` handler, and both reset on
 * leave. No spring library, no per-card animation loop: the CSS transition
 * handles the return, which is cheaper and reads cleaner.
 */
export function TiltCard({
  children,
  className = '',
  max = 8,
  parallax = 10,
  spotlight = true,
  as: Tag = 'div',
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const node = ref.current;
      if (!node) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const rect = node.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;

      // Perspective lives on the parent so children inherit the same vanishing
      // point and do not each need their own.
      node.style.setProperty('--tilt-x', `${(0.5 - py) * max * 2}deg`);
      node.style.setProperty('--tilt-y', `${(px - 0.5) * max * 2}deg`);
      node.style.setProperty('--parallax-x', `${(px - 0.5) * parallax}px`);
      node.style.setProperty('--parallax-y', `${(py - 0.5) * parallax}px`);
      if (spotlight) {
        node.style.setProperty('--spot-x', `${px * 100}%`);
        node.style.setProperty('--spot-y', `${py * 100}%`);
      }
    },
    [max, parallax, spotlight],
  );

  const onPointerLeave = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty('--tilt-x', '0deg');
    node.style.setProperty('--tilt-y', '0deg');
    node.style.setProperty('--parallax-x', '0px');
    node.style.setProperty('--parallax-y', '0px');
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={`tilt-card ${className}`}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div className="tilt-card__body">{children}</div>
    </Tag>
  );
}