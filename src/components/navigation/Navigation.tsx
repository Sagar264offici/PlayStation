import { useCallback, useEffect, useRef, useState } from 'react';
import { scenes, brand } from '@/data/assets';
import { useUi, ui } from '@/state/stage';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { gsap, ease } from '@/animations/gsap';

/**
 * Floating navigation.
 *
 * An original instrument-panel bar, not a system menu: a monogram, five
 * numbered destinations, and a single indicator that travels between them. On
 * phones it becomes a fullscreen overlay with the destinations set large
 * enough to hit and the same indicator carried across.
 *
 * The bar hides on scroll-down and returns on scroll-up so it never fights the
 * content, and it stays out of the way entirely inside the boot sequence.
 */
export function Navigation() {
  const phase = useUi((s) => s.phase);
  const booted = useUi((s) => s.booted);
  const activeScene = useUi((s) => s.activeScene);
  const navOpen = useUi((s) => s.navOpen);
  const isMobile = useIsMobile();

  const barRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const lastScroll = useRef(0);
  const [hidden, setHidden] = useState(false);

  const visible = phase === 'experience' && booted;

  /* ---- hide on scroll down, show on scroll up ------------------------- */
  useEffect(() => {
    if (!visible || navOpen) return;

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScroll.current;
      // Ignore micro-scrolls and the very top of the page.
      if (Math.abs(delta) > 6 && y > 140) {
        setHidden(delta > 0);
      } else if (delta < -6) {
        setHidden(false);
      }
      lastScroll.current = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [visible, navOpen]);

  /* ---- bar entrance --------------------------------------------------- */
  useEffect(() => {
    const node = barRef.current;
    if (!node || !visible) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(node, { clearProps: 'all' });
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        node,
        { y: -28, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, delay: 0.35, ease: ease.cinematic },
      );
    }, node);

    return () => context.revert();
  }, [visible]);

  /* ---- moving indicator ------------------------------------------------ */
  useEffect(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!list || !indicator) return;

    const move = () => {
      const active = list.querySelector<HTMLElement>('[data-active="true"]');
      if (!active) return;

      const listRect = list.getBoundingClientRect();
      const rect = active.getBoundingClientRect();

      gsap.to(indicator, {
        x: rect.left - listRect.left,
        width: rect.width,
        duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0.55,
        ease: ease.cinematic,
      });
    };

    move();
    // Re-measure when the overlay opens, the fonts settle, or the bar resizes.
    const observer = new ResizeObserver(move);
    observer.observe(list);
    const timer = window.setTimeout(move, 600);
    document.fonts?.ready.then(move).catch(() => undefined);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [activeScene, navOpen, isMobile]);

  /* ---- keyboard: escape closes the overlay ---------------------------- */
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') ui.set({ navOpen: false });
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [navOpen]);

  const go = useCallback((anchor: string) => {
    ui.set({ navOpen: false });
    const target = document.getElementById(anchor);
    if (!target) return;
    target.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }, []);

  // The nav mirrors the storyboard, minus the boot scene the user just left.
  const destinations = scenes.filter((scene) => scene.id !== 'boot');

  return (
    <>
      <header
        ref={barRef}
        className={`nav${hidden ? ' is-hidden' : ''}${navOpen ? ' is-open' : ''}`}
        data-visible={visible}
        aria-hidden={!visible}
      >
        <div className="nav__inner">
          <a
            className="nav__mark"
            href="#scene-hardware"
            onClick={(e) => {
              e.preventDefault();
              go('scene-hardware');
            }}
            aria-label={`${brand.wordmark} — back to top`}
          >
            <span className="nav__monogram" aria-hidden="true">
              <span />
              <span />
            </span>
            <span className="nav__wordmark">{brand.name}</span>
          </a>

          <nav className="nav__nav" aria-label="Sections">
            <ul ref={listRef} className="nav__list">
              <span ref={indicatorRef} className="nav__indicator" aria-hidden="true" />
              {destinations.map((scene) => (
                <li key={scene.id}>
                  <a
                    className="nav__link"
                    href={`#${scene.anchor}`}
                    data-active={activeScene === scene.id}
                    aria-current={activeScene === scene.id ? 'true' : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      go(scene.anchor);
                    }}
                  >
                    <span className="nav__index">{scene.index}</span>
                    <span className="nav__text">{scene.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="nav__aside">
            <SoundToggle />
            <button
              type="button"
              className="nav__burger"
              aria-expanded={navOpen}
              aria-controls="nav-overlay"
              onClick={() => ui.set({ navOpen: !navOpen })}
            >
              <span className="nav__burger-lines" aria-hidden="true">
                <span />
                <span />
              </span>
              <span className="visually-hidden">{navOpen ? 'Close menu' : 'Open menu'}</span>
            </button>
          </div>
        </div>
      </header>

      {navOpen ? (
        <div className="nav-overlay" id="nav-overlay" role="dialog" aria-modal="true" aria-label="Menu">
          <ul className="nav-overlay__list">
            {destinations.map((scene, index) => (
              <li key={scene.id} className="nav-overlay__item" style={{ '--i': index } as never}>
                <a
                  className="nav-overlay__link"
                  href={`#${scene.anchor}`}
                  data-active={activeScene === scene.id}
                  onClick={(e) => {
                    e.preventDefault();
                    go(scene.anchor);
                  }}
                >
                  <span className="nav-overlay__index">{scene.index}</span>
                  <span className="nav-overlay__label">{scene.label}</span>
                  <span className="nav-overlay__arrow" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <path d="M4 12h15M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="nav-overlay__foot">{brand.disclaimer}</p>
        </div>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Sound                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Ambient audio is opt-in and off by default — nothing on this site ever
 * autoplays with sound. The control exists so the capability is there if audio
 * is added later, and it is labelled honestly.
 */
function SoundToggle() {
  const soundOn = useUi((s) => s.soundOn);
  const [available] = useState(false);

  return (
    <button
      type="button"
      className="sound-toggle"
      data-on={soundOn}
      disabled={!available}
      aria-pressed={soundOn}
      onClick={() => ui.set({ soundOn: !soundOn })}
      title={available ? (soundOn ? 'Sound on' : 'Sound off') : 'Ambient audio not included in this build'}
    >
      <span className="sound-toggle__bars" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="sound-toggle__label">{soundOn ? 'Sound on' : 'Sound off'}</span>
    </button>
  );
}
