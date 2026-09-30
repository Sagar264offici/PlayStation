import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/sections.css';
import './styles/responsive.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container #root not found');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/**
 * Fonts are loaded from a stylesheet, not a JS import, so text paints
 * immediately in the fallback face and swaps once Space Grotesk arrives. The
 * layout is built on `clamp()` and generous line heights specifically so that
 * swap does not reflow anything meaningfully.
 */
if (document.fonts?.ready) {
  document.fonts.ready.then(() => {
    document.documentElement.classList.add('fonts-ready');
  });
}
