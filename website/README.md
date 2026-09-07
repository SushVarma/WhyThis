# WhyThis marketing site

A plain static website — no build step, no framework, no dependency on any
Claude/Anthropic hosting. Four pages sharing one stylesheet and one script:

```
website/
  index.html        Home
  about.html         About
  prospectus.html    Business prospectus
  contact.html       Contact (mailto-based form)
  assets/
    styles.css
    site.js          demo tabs (home) + contact form (contact)
    favicon.svg
```

## Preview locally

Just open `index.html` in a browser — everything is relative paths and works
straight off disk. For a closer-to-production preview (some browsers restrict
`file://` fonts/requests), serve it locally instead:

```bash
cd website
python -m http.server 8080
# then open http://localhost:8080
```

## Deploy it — pick one

**Vercel** (recommended, free tier, custom domain support)
```bash
npm i -g vercel
cd website
vercel --prod
```
No config needed — Vercel auto-detects a static site and serves `index.html`.

**Netlify**
```bash
npm i -g netlify-cli
cd website
netlify deploy --prod --dir .
```
Or just drag the `website` folder onto https://app.netlify.com/drop.

**GitHub Pages**
1. Push this repo to GitHub.
2. Repo Settings → Pages → Deploy from a branch → select the branch and
   `/website` as the folder (or move these files to a dedicated `gh-pages`
   branch / a separate repo root, since Pages serves from repo root or `/docs`
   by default — `/website` as a custom path is supported in the Pages UI).

**Any other static host** (S3+CloudFront, Cloudflare Pages, a plain nginx
box, etc.) — just upload the contents of this folder. There's no backend, no
environment variables, and no build command required.

## Custom domain

All three services above support adding a custom domain for free (Vercel and
Netlify both handle SSL automatically). Point your domain's DNS at whichever
you choose, following that service's instructions.

## Editing content

Each page is self-contained HTML — edit the file directly. Shared look and
feel lives in `assets/styles.css`; the only interactive behavior (the
example-question tabs on the homepage, and the contact form) lives in
`assets/site.js`. The contact form currently opens the visitor's email client
via a `mailto:` link — swap this for a real form backend (Formspree, a small
serverless function, etc.) if you want submissions captured without relying
on the visitor's email client.
