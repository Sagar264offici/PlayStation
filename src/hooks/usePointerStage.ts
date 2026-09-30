import { useEffect, useRef } from 'react';
import { stage } from '@/state/stage';

/**
 * Streams the global pointer into the mutable stage.
 *
 * Writes straight to `stage` — no React state, no re-render. Values are
 * normalised device coords so the parallax maths in the render loop stays
 * resolution independent.
 */
export function usePointerStage() {
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      target.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      target.current.y = -((event.clientY / window.innerHeight) * 2 - 1);
      // Raw pointer is written straight through; the render loop damps it so
      // the camera settles instead of snapping to the cursor.
      stage.pointerX = target.current.x;
      stage.pointerY = target.current.y;
    };

    const onLeave = () => {
      target.current.x = 0;
      target.current.y = 0;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, []);
}
