## Problem

The current `apple-touch-icon.png` is 1024×1024, but the actual CareNest logo tile is drawn as a smaller rounded square sitting on a darker purple background. When iOS applies its own rounded-corner mask on top, the result is a "tile inside a tile" — a small icon floating in empty space.

Apple's spec: the icon should be a full-bleed 1024×1024 square. iOS handles rounding automatically; the source must NOT include its own rounded frame or background padding.

## Fix

1. Detect the inner rounded-square panel in the current icon (the lighter purple area containing the logo) and crop tightly to its bounding box.
2. Resize that crop to 1024×1024 so the logo + light-purple background fills the entire canvas edge-to-edge.
3. Re-upload via `lovable-assets create` and overwrite `src/assets/apple-touch-icon.png.asset.json`. No code changes needed — `__root.tsx` already imports from that asset pointer.

## Note for the user

iOS aggressively caches home-screen icons. After publishing, the existing shortcut must be removed and re-added to pick up the new icon.
