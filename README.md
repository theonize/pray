# Pray

A searchable, offline-ready **Progressive Web App** of curated Christian prayers
drawn from the Roman Catholic, Eastern Orthodox, Anglican, Lutheran,
Reformed/Methodist, and broader Protestant traditions.

🙏 **Live site:** https://theonize.github.io/pray/

Built with [Vite](https://vitejs.dev/) + [vite-plugin-pwa](https://vite-pwa-org.netlify.app/),
fuzzy search by [Fuse.js](https://www.fusejs.io/), and deployed to **GitHub Pages**
automatically by a **GitHub Actions** workflow.

## Features

- **Full-text fuzzy search** across titles, alternate names, prayer text, tags,
  tradition, and source — type `/` anywhere to jump to the search box.
- **Filter by tradition** with one tap.
- **A focused reading view** with reverent serif typography, plus copy, share,
  and tap-to-search tags.
- **Random prayer** for when you don't know what to pray.
- **Installable & fully offline** — the service worker precaches the whole
  collection, so it works on a plane, in a pew, or with no signal.
- **Light / dark themes** that follow your system or your explicit choice.
- **Deep links** — every prayer has its own URL (`…/pray/#the-lords-prayer`) for
  sharing and bookmarking.

## The prayer collection

All texts are **traditional, public-domain** English renderings (Douay-Rheims,
the 1662 Book of Common Prayer, the KJV, Luther's Small Catechism, standard
Orthodox liturgical English, and other historic forms). Modern copyrighted
translations are deliberately avoided.

Each entry carries its tradition, category, the occasion on which it is prayed,
its scriptural and/or historical source, and search tags. The canonical prayers
(the Lord's Prayer, the Creeds, the Jesus Prayer, the major Marian prayers,
collects, and so on) were cross-checked against their standard forms during
curation.

The data lives in [`src/data/prayers.json`](src/data/prayers.json) — a plain
array of objects:

```json
{
  "id": "the-lords-prayer",
  "title": "The Lord's Prayer",
  "altTitles": ["Our Father", "Pater Noster"],
  "tradition": "Common",
  "category": "Foundational",
  "tags": ["jesus", "kingdom", "forgiveness"],
  "text": "Our Father, who art in heaven, …",
  "language": "English (traditional)",
  "source": "Matthew 6:9–13; Luke 11:2–4",
  "occasion": "Daily; in nearly every Christian service"
}
```

To add or correct a prayer, edit that file and rebuild — the search index, the
filters, and the counts all update automatically.

## Development

```bash
npm install
npm run dev        # http://localhost:5173/pray/
npm run build      # production build into dist/
npm run preview    # preview the production build
npm run icons      # regenerate the app icons (requires Python + Pillow)
```

## Deployment

Pushes to `main` (or the active development branch) trigger
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds the
site and publishes `dist/` to GitHub Pages.

**One-time setup:** in the repository, go to **Settings → Pages** and set
**Source** to **GitHub Actions**. The workflow derives the base path from the
repository name automatically, so forks deploy correctly with no edits.

## License

Code is released under the [Apache License 2.0](LICENSE). The prayer texts are
traditional works in the public domain.
