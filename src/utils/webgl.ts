/**
 * WebGL capability probe.
 *
 * Runs once on mount and reports a boolean. When false the experience swaps to
 * a designed static composition rather than an empty canvas: the same copy,
 * the same stills, the same navigation, no 3D.
 */
export function detectWebGL(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');

    if (!gl) return false;

    // Software rasterisers advertise themselves; treat them as unsupported so
    // low-end machines get the still composition instead of a 3fps experience.
    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = String(
        (gl as WebGLRenderingContext).getParameter(
          debugInfo.UNMASKED_RENDERER_WEBGL,
        ) ?? '',
      ).toLowerCase();
      if (/swiftshader|llvmpipe|software|mesa offscreen/.test(renderer)) return false;
    }

    // Release the probe context immediately.
    const lose = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context');
    lose?.loseContext();

    return true;
  } catch {
    return false;
  }
}
