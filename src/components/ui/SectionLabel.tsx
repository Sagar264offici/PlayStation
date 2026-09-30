import type { ReactNode } from 'react';

/**
 * The small technical label that titles every section.
 *
 * Index + rule + name. It is the one piece of "instrument panel" language the
 * site allows, and it is kept to a single hairline so it reads as a caption
 * rather than as a HUD.
 */
export function SectionLabel({
  index,
  children,
  className = '',
}: {
  index: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`section-label ${className}`}>
      <span className="section-label__index">{index}</span>
      <span className="section-label__rule" aria-hidden="true" />
      <span className="section-label__text">{children}</span>
    </div>
  );
}

/**
 * A readout in the style of a spec sheet. Used beside the 3D callouts and in
 * the game metadata, never as a decorative badge.
 */
export function Readout({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`readout ${className}`}>
      <dt className="readout__label">{label}</dt>
      <dd className="readout__value">{value}</dd>
    </div>
  );
}

/** Full-width hairline used to separate stacked content. */
export function Rule({ className = '' }: { className?: string }) {
  return <hr className={`rule ${className}`} aria-hidden="true" />;
}
