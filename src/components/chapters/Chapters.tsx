import { LineReveal, Reveal } from '@/components/ui/Reveal';

/**
 * The two short chapters between hardware and control.
 *
 * Deliberately typographic rather than another 3D arrangement: the hardware is
 * already moving through the studio behind them, and adding more visual
 * competition here would flatten the whole timeline. Each chapter earns its
 * place by changing the *pace* — a long held line after a dense section.
 */

export function Performance() {
  return (
    <section
      className="section section--performance"
      id="scene-performance"
      data-scene="performance"
      aria-labelledby="performance-title"
    >
      <div className="section__inner performance__inner">
        <p className="chapter__index" aria-hidden="true">
          02
        </p>
        <LineReveal
          as="h2"
          id="performance-title"
          className="chapter__title"
          lines={['Faster than', 'the frame.']}
        />
        <Reveal as="p" className="chapter__body" delay={0.14}>
          A custom SSD feeding a Zen 2 core and RDNA 2 graphics. The numbers that matter are the
          ones you never see: the loading bar that does not appear, the frame that does not drop.
        </Reveal>
        <Reveal as="dl" className="chapter__stats" delay={0.1}>
          <div>
            <dt>CPU</dt>
            <dd>Zen 2 · 8C / 16T</dd>
          </div>
          <div>
            <dt>GPU</dt>
            <dd>RDNA 2 · 52 CU</dd>
          </div>
          <div>
            <dt>Memory</dt>
            <dd>16 GB GDDR6</dd>
          </div>
          <div>
            <dt>Bandwidth</dt>
            <dd>896 GB/s</dd>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Immersion() {
  return (
    <section
      className="section section--immersion"
      id="scene-immersion"
      data-scene="immersion"
      aria-labelledby="immersion-title"
    >
      <div className="section__inner chapter__inner chapter__inner--narrow">
        <p className="chapter__index" aria-hidden="true">
          03
        </p>
        <LineReveal
          as="h2"
          id="immersion-title"
          className="chapter__title"
          lines={['The room', 'changes.']}
        />
        <Reveal as="p" className="chapter__body" delay={0.14}>
          Height cues. Directional audio. Rays that stop at the right surfaces. The point is not
          spectacle — it is that you stop noticing the machine and start noticing the world.
        </Reveal>
      </div>
    </section>
  );
}
