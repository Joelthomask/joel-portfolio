# Home hero parallax tuning

## Main controls
Open `src/components/MountainExperience.tsx` and find `PARALLAX_TUNING` near the top of the file.

- `skyDepth`: movement amount for the sky.
- `distantDepth`: movement amount for the far mountain.
- `middleDepth`: movement amount for the middle mountain.
- `frontDepth`: movement amount for the closest moving mountain.
- `response`: how quickly the layers follow the pointer. Lower is smoother/slower; higher is quicker.
- `verticalFactor`: vertical movement relative to horizontal movement.
- `overscan`: small scale increase that keeps layer edges outside the viewport while moving.

Mountain1 is the separate static foreground overlay and does not receive parallax movement.

## Image fit
- `src/components/MountainExperience.css` — `.scene-layer`: `object-fit: cover` fills the hero without side bars; `object-position` controls the crop anchor.
- `src/styles/index.css` — `.hero .mountain4-foreground-overlay`: the same fit settings for the static foreground Mountain1.
- Keep the `scale(1.06)` values in these CSS rules aligned with `PARALLAX_TUNING.overscan`.

`cover` can crop some of a 16:9 image on a wider screen, but it avoids the empty side bands caused by `contain`.
