# Architecture

The site is a static, framework-free ES module application:

- `src/data/` contains normalized, versioned catalogue records.
- `src/ephemeris/` contains date handling, unit-safe positions, and source fallback logic.
- `src/main.js` owns the Three.js scene and UI composition.
- `src/styles.css` provides the responsive visual system and reduced-motion rules.
- `docs/` records source behavior, accuracy limitations, and deployment notes.

The rendering clock is independent from the wall clock. A paused scene stays on its selected timestamp. Catalogue cards and the exoplanet view are separate from the 3D scene so incomplete spatial data is not rendered as fabricated positions.
