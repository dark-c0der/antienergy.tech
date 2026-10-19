# Data sources

Antienergy is designed around public, official astronomical sources:

- [JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html) for source-backed state vectors when live browser access is available.
- [JPL Solar System Dynamics](https://ssd.jpl.nasa.gov/orbits.html) for orbital elements and planetary system metadata.
- [JPL planetary satellite catalogue](https://ssd.jpl.nasa.gov/sats/) for satellite names, designations, parents, and physical/orbital values.
- [NASA Exoplanet Archive TAP](https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html) for confirmed exoplanet catalogue fields.

## Satellite catalogue snapshot

The bundled satellite dataset is generated from the JPL [mean-elements table](https://ssd.jpl.nasa.gov/sats/elem/) and [physical-parameters table](https://ssd.jpl.nasa.gov/sats/phys_par/). It includes 460 JPL satellite entries across Earth, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto in the retrieved catalogue snapshot. The app does not silently drop provisional designations.

The physical-parameters table publishes mean radii for only a subset of satellites. Those radii are retained in kilometres and used directly for the rendered size ratio. Entries without a published radius remain in the catalogue and scene as data records, but are rendered at the minimum geometric marker and explicitly show “Unavailable”; no radius is fabricated.

## Runtime behavior

The browser does not request data every animation frame. The initial shell uses a small, versioned catalogue bundled with the site. The ephemeris engine keeps astronomical units and an explicit J2000-era fallback model. A live Horizons request is attempted only for a requested state and falls back to the bundled model when CORS, rate limits, network, or response validation prevent a live response.

The fallback is intentionally labelled as an approximate orbital-element model. It is not a substitute for a high-precision ephemeris and should not be interpreted as one.
