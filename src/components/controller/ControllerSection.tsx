import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, ease } from "@/animations/gsap";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { LineReveal, Reveal } from "@/components/ui/Reveal";
import { models, stills } from "@/data/assets";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * The control chapter.
 *
 * Opens in near-total darkness so the controller's silhouette resolves out of
 * the black before anything is readable — the blue rim light arrives first, then
 * the form, then the labels. It closes by handing the controller back to the
 * main composition, which is what the timeline does next.
 */

interface Feature {
  id: string;
  label: string;
  detail: string;
  /** Position over the controller, in viewport percentages. */
  x: number;
  y: number;
  side: "left" | "right";
  at: number;
}

const FEATURES: Feature[] = [
  {
    id: "haptics",
    label: "Haptic feedback",
    detail:
      "A dual actuator motor reproduces textures, impacts and resonance. The controller reports feeling, not just buttons.",
    x: 30,
    y: 42,
    side: "right",
    at: 0.12,
  },
  {
    id: "triggers",
    label: "Adaptive triggers",
    detail:
      "Variable resistance along the length of each trigger. Draw a bowstring and it actually resists, release it and it lets go.",
    x: 26,
    y: 58,
    side: "right",
    at: 0.36,
  },
  {
    id: "precision",
    label: "Precision control",
    detail:
      "Motion sensing at 500 Hz with adaptive resistance on the sticks. Fine correction without drift.",
    x: 33,
    y: 68,
    side: "right",
    at: 0.6,
  },
  {
    id: "input",
    label: "Immersive input",
    detail:
      "Create-to-Play broadcast: a button press becomes an action on screen, and the controller finds a home in your hands.",
    x: 29,
    y: 33,
    side: "right",
    at: 0.82,
  },
];

export function ControllerSection() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const rows = node.querySelectorAll<HTMLElement>("[data-control-callout]");
    if (reduced || !rows.length) return;

    // Same staggered reveal as the hardware chapter: dark first, then form,
    // then each annotation in turn.
    const context = gsap.context(() => {
      const slice = (fraction: number) => () =>
        `top+=${(1 - fraction) * window.innerHeight * 1.5} top`;

      rows.forEach((row) => {
        const at = Number(row.dataset.at ?? 0);
        const isAnnotation = row.classList.contains("control-callout");

        if (isAnnotation) {
          const leader = row.querySelector<HTMLElement>(
            ".control-callout__leader",
          );
          const marker = row.querySelector<HTMLElement>(
            ".control-callout__marker",
          );
          const label = row.querySelector<HTMLElement>(
            ".control-callout__text",
          );

          gsap.set(row, { opacity: 0 });
          if (leader)
            gsap.set(leader, { scaleX: 0, transformOrigin: "right center" });
          if (marker) gsap.set(marker, { scale: 0.4, opacity: 0 });
          if (label) gsap.set(label, { x: 12, opacity: 0 });

          const show = () =>
            gsap
              .timeline({ defaults: { ease: ease.cinematic } })
              .to(row, { opacity: 1, duration: 0.35 })
              .to(marker, { scale: 1, opacity: 1, duration: 0.7 }, 0)
              .to(leader, { scaleX: 1, duration: 0.85 }, 0.1)
              .to(label, { x: 0, opacity: 1, duration: 0.6 }, 0.3);

          const hide = () => {
            gsap.set(row, { opacity: 0 });
            if (leader) gsap.set(leader, { scaleX: 0 });
            if (marker) gsap.set(marker, { scale: 0.4, opacity: 0 });
            if (label) gsap.set(label, { x: 12, opacity: 0 });
          };

          ScrollTrigger.create({
            trigger: node,
            start: slice(at + 0.04),
            end: slice(at + 0.4),
            onEnter: show,
            onLeaveBack: hide,
          });
          return;
        }

        gsap.set(row, { opacity: 0, x: 22 });
        ScrollTrigger.create({
          trigger: node,
          start: slice(at + 0.06),
          end: slice(at + 0.5),
          onEnter: () =>
            gsap.to(row, {
              opacity: 1,
              x: 0,
              duration: 0.95,
              ease: ease.cinematic,
            }),
          onLeaveBack: () => gsap.set(row, { opacity: 0, x: 22 }),
        });
      });
    }, node);

    return () => context.revert();
  }, [reduced]);

  return (
    <section
      ref={root}
      className="section section--control"
      id="scene-control"
      data-scene="control"
      aria-labelledby="control-title"
    >
      <div className="section__inner control__inner">
        <header className="control__header">
          <SectionLabel index="04">Control</SectionLabel>
          <LineReveal
            as="h2"
            id="control-title"
            className="control__title"
            lines={["Held,", "not", "used."]}
          />
          <Reveal as="p" className="control__intro" delay={0.14}>
            The controller is the last piece of hardware that still has to be an
            object. It has to feel right in the hand, which is a different
            problem from feeling fast.
          </Reveal>
        </header>

        <div className="control__features" data-control-callout-wrap>
          {FEATURES.map((feature, i) => (
            <Reveal
              key={feature.id}
              className="control-feature"
              data-control-callout
              data-at={feature.at}
              delay={i * 0.04}
            >
              <span className="control-feature__index">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="control-feature__body">
                <h3 className="control-feature__label">{feature.label}</h3>
                <p className="control-feature__detail">{feature.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <div className="control__annotations" aria-hidden="true">
        {FEATURES.map((feature) => (
          <div
            key={feature.id}
            className="control-callout"
            data-control-callout
            data-at={feature.at}
            style={
              {
                "--callout-x": `${feature.x}%`,
                "--callout-y": `${feature.y}%`,
              } as never
            }
          >
            <span className="control-callout__marker">
              <span className="control-callout__marker-ring" />
              <span className="control-callout__marker-core" />
            </span>
            <span className="control-callout__leader" />
            <span className="control-callout__text">
              <span className="control-callout__label">{feature.label}</span>
            </span>
          </div>
        ))}
      </div>

      <p className="visually-hidden">
        Controller supplied as a {models.controller.triangles.toLocaleString()}{" "}
        triangle mesh with full PBR texture set, shown in a still at{" "}
        <a href={stills.controller}>the reference render</a>.
      </p>
    </section>
  );
}
