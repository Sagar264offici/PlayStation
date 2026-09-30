import { useEffect, useState } from 'react';
import { OrbitControls } from '@react-three/drei';
import { sharedOrbit } from '@/three/controls/sharedOrbit';
import { stage } from '@/state/stage';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { InspectionLight } from '@/components/hardware/InteractiveConsole';

/** The orbit target's height, matching where the timeline parks the hardware. */
const TARGET_Y = 0.17;

/**
 * The interactive console, mounted inside the WebGL scene.
 *
 * This has to live in the canvas rather than in the DOM because it manipulates
 * the same camera the scroll timeline is driving. It only activates while its
 * host section is the one on screen; the rest of the time it does nothing at
 * all, so there is no cost when the user is not inspecting the hardware.
 *
 * It writes its controls into `sharedOrbit`, which `CameraRig` checks every
 * frame and yields to. That indirection is what lets the scroll timeline and
 * the user's drag share one camera without either of them owning it outright.
 *
 * Accessibility note: pointer-driven 3D inspection is an enhancement, never a
 * requirement. The same information is available as text in the hardware
 * chapter, and the controls are switched off entirely under reduced motion.
 */
export function InteractiveConsoleStage({ anchor }: { anchor: string }) {
  const [active, setActive] = useState(false);
  const reduced = useReducedMotion();
  const isMobile = useIsMobile();

  /* ---- activation -------------------------------------------------------- */

  useEffect(() => {
    const element = document.getElementById(anchor);
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      // Only engage once the section genuinely owns the viewport. Without the
      // negative margins the controls would grab the camera during the
      // approach, which fights the timeline and reads as a stutter.
      { rootMargin: '-30% 0px -30% 0px', threshold: 0.01 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [anchor]);

  /* ---- seed the orbit target --------------------------------------------- */

  useEffect(() => {
    // Entering hands the camera over from the timeline, so the orbit target has
    // to be re-seeded from wherever the timeline has scrolled to. Otherwise the
    // first drag snaps the model somewhere unexpected. Doing it on the way out
    // as well means re-entering starts from the composed shot rather than from
    // wherever the user last left the model pointing, which is the disorienting
    // case.
    const instance = sharedOrbit.current;
    if (!instance) return;

    instance.target.set(stage.lookX, TARGET_Y, stage.lookZ);
    instance.update();
  }, [active]);


  const enabled = active && !reduced;

  return (
    <>
      <OrbitControls
        ref={sharedOrbit as never}
        enabled={enabled}
        makeDefault={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={isMobile ? 0.9 : 0.6}
        zoomSpeed={0.7}
        // Bounds are what stop the product being lost: the polar range keeps it
        // above the floor, the distance range keeps it in frame, and azimuth
        // keeps it from being viewed from directly behind.
        minDistance={0.6}
        maxDistance={1.55}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.68}
        minAzimuthAngle={-Math.PI * 0.7}
        maxAzimuthAngle={Math.PI * 0.7}
        target={[stage.lookX, TARGET_Y, stage.lookZ]}
      />

      {/* The rim light follows the pointer while the user is inspecting, so the
          surface responds to attention rather than only to scroll. */}
      <InspectionLight active={enabled} />
    </>
  );
}
