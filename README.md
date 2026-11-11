# Brian's Media Archive

Every movie, show, and game I've watched or played, scored out of 100 and tiered S through F.

Live at **https://brian-matute.github.io/media/**

## Adding something

1. Open the **Entry builder** (`add.html`, linked in the site footer), pick Movie / Show / Game, and fill in the form.
2. Copy the entry it writes and paste it right before the last `]` in:
   - `data/media.json` for movies and shows
   - `data/games.json` for games
3. Drop the poster in `images/posters/` (or a game cover in `images/games/`) with the same file name.
4. Optional: right-click `tools/make-thumbs.ps1` → **Run with PowerShell**. It makes small fast-loading copies in `images/thumbs/` and `images/large/`. If you skip it, the site just uses the original image.
5. Commit and push in GitHub Desktop.

## Collections

Franchises live in `data/collections.json`. Each one has an `id`, a `title`, a short `blurb`, and either or both of:

- `"ids"`: exact entry ids, e.g. `["the-batman", "joker"]`
- `"match"`: words to look for in titles, e.g. `["Star Wars"]` picks up anything with "Star Wars" in the name, including future entries

Directors and creators with three or more titles get their own collection automatically.

## Entry fields

| Field | Movies & shows | Games |
|---|---|---|
| `id` | short unique name, e.g. `the-dark-knight` | same |
| `title`, `year`, `rating` (0–100), `tier` (S/A/B/C/D/F), `genre` (separate with ` • `) | ✓ | ✓ |
| `type` | `Movie` or `Show` | not needed |
| `poster` / `cover` | `poster` file name | `cover` file name or full image link |
| `director` / `developer` | `director` (several names: separate with ` • `) | `developer` |
| `progress` / `status` | `progress` for shows, e.g. `Completed`, `Finished S2` | `status`, e.g. `Beaten`, `100%`, `Playing` |
| `dateWatched` / `dateCompleted` | `dateWatched` | `dateCompleted` |
| `platform`, `hours` | | ✓ |
| `review` | your thoughts (optional) | same |
| `imdb`, `rottenTomatoes`, `link` | links (optional) | `link` |

## How it's built

Plain HTML, CSS, and JavaScript modules with no build step, so GitHub Pages serves the files as they are.

- `index.html` is the whole app. The URL picks the page: `?view=library`, `?view=tiers`, `?view=collections`, `?view=stats`, `?title=<id>`, `?game=<id>`, `?collection=<id>`.
- `css/style.css` holds the design system and every component.
- `js/main.js` handles routing and page transitions, `js/data.js` loads and shapes the data, `js/ui.js` and `js/fx.js` hold shared pieces and animations, `js/search.js` is the Ctrl+K search, and `js/views/` has one file per page.
- `details.html` only forwards old `details.html?id=` links to their new address.

To preview locally, serve the folder with any static server (for example VS Code's Live Server). Opening `index.html` straight from disk won't load the JSON.
