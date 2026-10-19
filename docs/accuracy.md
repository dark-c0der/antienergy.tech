# Accuracy and display modes

The explorer uses heliocentric, ecliptic-style coordinates for the bundled fallback model. Values are represented in astronomical units (AU) in the calculation layer and converted only at the renderer boundary. In true physical scale, one astronomical unit and every published body radius use the same kilometre conversion, so the Sun is not enlarged relative to planetary distances.

**True physical scale** is the default: one kilometre conversion is used for the Sun, planets, moons, and orbital distances. This means a whole-system view naturally makes planets tiny. **Exploration scale** is an explicit readability mode that exaggerates body radii and compresses distances. Neither display mode changes the underlying catalogue values.

The current initial release interpolates a Keplerian approximation from published mean orbital elements. Live JPL Horizons state-vector support is attempted, but the result is only marked live after a valid vector response is parsed. The app never describes the fallback as exact and exposes source/coverage text in the selected-body panel.
