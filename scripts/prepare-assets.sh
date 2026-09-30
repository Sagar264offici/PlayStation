#!/usr/bin/env bash
#
# Prepare web-ready assets in public/assets from the raw ./assets drop.
#
# Raw source textures are 4096x4096 PNG (the gamepad normal map alone is 7.7 MB).
# Shipping those raw would be ~18 MB of texture payload, so this script:
#   - resamples every map to a size that still holds up at full-screen
#   - encodes colour maps to WebP (visually lossless at q92, ~10x smaller)
#   - encodes data maps (normal / roughness / metalness) to WebP lossless,
#     which keeps the exact pixel values glTF/three.js expects
#   - copies the FBX meshes and the intro video across untouched
#
# Idempotent: re-running overwrites in place. Run it after dropping new
# source files into ./assets.
#
# Platform: macOS only. This script shells out to `sips` (Apple's image
# resampler) and `cwebp`, and neither has a Linux build. Vercel's builders run
# Linux, so this script must never be part of a cloud build — the optimised
# public/assets output is committed instead and the deploy only runs
# `npm run build`. The guard below turns that constraint into a clear message
# rather than a wall of "command not found".

set -euo pipefail

for tool in sips cwebp; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "error: '$tool' not found." >&2
    echo >&2
    echo "This pipeline is macOS-only (sips + cwebp are Apple/unix binaries with" >&2
    echo "no Linux build). It must not run on CI or on Vercel's Linux builders." >&2
    echo >&2
    echo "The optimised public/assets/ output is committed to the repository, so" >&2
    echo "deploys only need 'npm run build'. Re-run this script locally on a Mac" >&2
    echo "after changing anything under assets/." >&2
    echo >&2
    echo "To install the missing tool: brew install webp   # cwebp" >&2
    exit 1
  fi
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/assets"
MODELS="$SRC/PlayStation_5_Game_Console"
DEST="$ROOT/public/assets"

console_dir="$MODELS/playstation_5_console"
gamepad_dir="$MODELS/playstation_5_gamepad"

# Display size (px) for the longest edge. 2048 keeps micro-detail on the
# console's vented fins and the gamepad's stick caps while staying sharp on
# a 4K display at arm's length.
TEX_SIZE=2048

mkdir -p "$DEST/models" "$DEST/textures" "$DEST/preview"

log() { printf '  %s\n' "$*"; }

echo "Preparing assets -> public/assets"

# --------------------------------------------------------------------------- #
# Meshes (binary FBX, already compact)
# --------------------------------------------------------------------------- #
for pair in \
  "ps5-console:$console_dir/Play_Station_5_Game_Console.fbx" \
  "ps5-controller:$gamepad_dir/Playstation_5_Gamepad.fbx"
do
  name="${pair%%:*}"
  file="${pair#*:}"
  if [[ -f "$file" ]]; then
    cp -f "$file" "$DEST/models/$name.fbx"
    log "model  $name.fbx  ($(du -h "$file" | cut -f1))"
  else
    echo "  !! missing $file" >&2
  fi
done

# --------------------------------------------------------------------------- #
# Textures
# --------------------------------------------------------------------------- #

# resize <src> <stem> <quality>  — sips resamples, cwebp encodes.
encode() {
  local src="$1" out="$2" quality="$3" width="$4"
  local tmp
  tmp="$(mktemp -t tex).png"

  sips -s format png -Z "$width" "$src" --out "$tmp" >/dev/null

  # A quality of "lossless" is honoured literally. Data maps need this: a lossy
  # encode of a normal map corrupts the direction maths, and quantised
  # roughness/metalness bands visibly into posterised patches under a rim light.
  if [[ "$quality" == "lossless" ]]; then
    cwebp -quiet -lossless -z 9 "$tmp" -o "$out"
  else
    cwebp -quiet -q "$quality" "$tmp" -o "$out"
  fi

  rm -f "$tmp"

  log "$(basename "$out")  $(du -h "$out" | cut -f1)"
}

for pair in \
  "console:$console_dir/texture/PS5_Console" \
  "gamepad:$gamepad_dir/texture/PS5_Gamepad"
do
  out_name="${pair%%:*}"
  base="${pair#*:}"
  dir="$(dirname "$base")"

  [[ -d "$dir" ]] || { echo "  !! missing $dir" >&2; continue; }

  # Colour: lossy WebP is fine, it is a base-colour map.
  [[ -f "${base}_Color.png" ]] && \
    encode "${base}_Color.png" "$DEST/textures/${out_name}_color.webp" 92 "$TEX_SIZE"

  # Data maps: must stay lossless or normal-map math and PBR response drift.
  [[ -f "${base}_Roughness.png" ]] && \
    encode "${base}_Roughness.png" "$DEST/textures/${out_name}_roughness.webp" lossless "$TEX_SIZE"

  [[ -f "${base}_Metalness.png" ]] && \
    encode "${base}_Metalness.png" "$DEST/textures/${out_name}_metalness.webp" lossless "$TEX_SIZE"

  [[ -f "${base}_Normal.png" ]] && \
    encode "${base}_Normal.png" "$DEST/textures/${out_name}_normal.webp" lossless "$TEX_SIZE"
done

# --------------------------------------------------------------------------- #
# Reference stills
# --------------------------------------------------------------------------- #
for pair in \
  "console:$console_dir/ps5_game_console.png" \
  "console-render:$MODELS/ps5_game_console.png" \
  "controller:$gamepad_dir/ps5_gamepad.png"
do
  name="${pair%%:*}"
  file="${pair#*:}"
  if [[ -f "$file" ]]; then
    sips -s format jpeg -s formatOptions 82 -Z 1400 "$file" \
      --out "$DEST/preview/${name}.jpg" >/dev/null
    log "preview ${name}.jpg  $(du -h "$DEST/preview/${name}.jpg" | cut -f1)"
  fi
done

# --------------------------------------------------------------------------- #
# Video
# --------------------------------------------------------------------------- #
if [[ -f "$SRC/videoplayback.webm" ]]; then
  cp -f "$SRC/videoplayback.webm" "$DEST/video/intro.webm" 2>/dev/null || {
    mkdir -p "$DEST/video"
    cp -f "$SRC/videoplayback.webm" "$DEST/video/intro.webm"
  }
  log "video  intro.webm  $(du -h "$DEST/video/intro.webm" | cut -f1)"
else
  echo "  !! missing $SRC/videoplayback.webm" >&2
fi

# Drop a poster frame from the intro so the opening has something to show while
# the video buffers.
if command -v ffmpeg >/dev/null && [[ -f "$DEST/video/intro.webm" ]]; then
  ffmpeg -y -v error -ss 00:00:01.2 -i "$DEST/video/intro.webm" \
    -frames:v 1 -q:v 4 "$DEST/preview/intro-poster.jpg" 2>/dev/null && \
    log "preview intro-poster.jpg" || log "(no ffmpeg, skipping intro poster)"
else
  log "(ffmpeg unavailable, skipping intro poster)"
fi

echo "Done. public/assets is ready."
