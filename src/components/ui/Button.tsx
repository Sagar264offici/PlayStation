import { forwardRef, useCallback, useRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

/* -------------------------------------------------------------------------- */
/* Magnetic                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Magnetic attraction.
 *
 * The element drifts toward the cursor while it is nearby, and compresses on
 * press. The pull is deliberately small — a couple of pixels at most, and never
 * more than 18% of the element's own size — because the effect stops reading as
 * premium the moment it becomes noticeable for its own sake.
 */
function useMagnetic<T extends HTMLElement>(strength = 0.28) {
  const ref = useRef<T>(null);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<T>) => {
      const node = ref.current;
      if (!node) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const rect = node.getBoundingClientRect();
      const x = event.clientX - (rect.left + rect.width / 2);
      const y = event.clientY - (rect.top + rect.height / 2);

      const limitX = Math.min(rect.width * strength, 22);
      const limitY = Math.min(rect.height * strength, 14);

      node.style.transform = `translate3d(${clamp(x, limitX)}px, ${clamp(y, limitY)}px, 0)`;
    },
    [strength],
  );

  const onPointerLeave = useCallback(() => {
    const node = ref.current;
    if (node) node.style.transform = 'translate3d(0, 0, 0)';
  }, []);

  return { nodeRef: ref, onPointerMove, onPointerLeave };
}

const clamp = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v));

/* -------------------------------------------------------------------------- */
/* Button                                                                      */
/* -------------------------------------------------------------------------- */

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  /** Trailing element, e.g. an arrow that shifts on hover. */
  trailing?: ReactNode;
  magnetic?: boolean;
  fullWidth?: boolean;
  /** Render as an anchor. Requires `href`. */
  href?: string;
  ariaLabel?: string;
}

/**
 * The primary action element.
 *
 * Squared corners, a hairline border, and a fill that wipes up from the bottom
 * on hover. No shadows, no gradients, no glow — the accent is used as a thin
 * edge and a small dot, not as a wash.
 *
 * Renders as a real `<button>` or a real `<a>` depending on `href`; never one
 * nested inside the other.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    children,
    trailing,
    magnetic = true,
    fullWidth = false,
    href,
    ariaLabel,
    className = '',
    type = 'button',
    ...rest
  },
  forwardedRef,
) {
  const { nodeRef, onPointerMove, onPointerLeave } = useMagnetic<HTMLElement>(
    variant === 'ghost' ? 0.18 : 0.28,
  );

  const setRefs = useCallback(
    (node: HTMLElement | null) => {
      nodeRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node as HTMLButtonElement);
      else if (forwardedRef) forwardedRef.current = node as HTMLButtonElement;
    },
    [forwardedRef, nodeRef],
  );

  const classes = `btn btn--${variant} btn--${size}${fullWidth ? ' btn--full' : ''} ${
    href ? 'btn--link' : ''
  } ${className}`;

  const inner = (
    <>
      <span className="btn__fill" aria-hidden="true" />
      <span className="btn__label">{children}</span>
      {trailing ? <span className="btn__trailing">{trailing}</span> : null}
    </>
  );


  if (href) {
    const anchorProps = magnetic ? { onPointerMove, onPointerLeave } : {};

    return (
      <a
        ref={setRefs as unknown as React.Ref<HTMLAnchorElement>}
        href={href}
        className={classes}
        aria-label={ariaLabel}
        {...anchorProps}
      >
        {inner}
      </a>
    );
  }

  const buttonProps = magnetic ? { onPointerMove, onPointerLeave } : {};

  return (
    <button ref={setRefs} type={type} className={classes} {...buttonProps} {...rest}>
      {inner}
    </button>
  );
});

/* -------------------------------------------------------------------------- */
/* Arrow                                                                       */
/* -------------------------------------------------------------------------- */

export function Arrow({ direction = 'right' }: { direction?: 'right' | 'down' | 'up-right' }) {
  const path = {
    right: 'M2 8h12M9 3l5 5-5 5',
    down: 'M8 2v12M3 9l5 5 5-5',
    'up-right': 'M3 13L13 3M6 3h7v7',
  }[direction];

  return (
    <svg
      className="arrow"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="square"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}
