# Deployment

The project is static and can be deployed to GitHub Pages, Cloudflare Pages, Netlify, or any equivalent free static host. The custom domain should point `antienergy.tech` to the chosen host and the host should serve the repository root as the site directory.

Before publishing:

1. Run a local static server from the repository root, for example `python3 -m http.server 4173`.
2. Verify the explorer, catalogue, exoplanet search, reduced-motion behavior, and mobile layout.
3. Configure the host's custom-domain setting and HTTPS.
4. Add a `CNAME` file containing `antienergy.tech` if using GitHub Pages.

No credentials, account system, payment service, or application server is required for the core experience.
