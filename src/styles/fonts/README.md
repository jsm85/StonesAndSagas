# Self-hosted fonts

Three open-licence typefaces, latin subsets only, served from this repository
rather than from Google Fonts. Self-hosting removes a third-party request from
every page load and a source of layout shift; the whole set is ~55 KB, which is
cheaper than the connection setup it replaces.

Only weights the site actually uses are committed. IBM Plex Mono ships at 400
alone — a 500 subset was fetched and then dropped, because nothing sets mono to
medium and the browser reported the face as never loaded.

| File | Family | Weights | Used for |
| --- | --- | --- | --- |
| `michroma-latin-400.woff2` | Michroma | 400 | Wordmark and display numerals |
| `space-grotesk-latin-var.woff2` | Space Grotesk | 400–700 (variable) | Headings and body text |
| `ibm-plex-mono-latin-400.woff2` | IBM Plex Mono | 400 | Labels, stamps, metadata |

All three are licensed under the SIL Open Font License 1.1 — see `OFL.txt`,
which must stay alongside the font files. None of them are Marvel-owned or
Marvel-associated faces, so they carry no fan-content risk.

The files are the `latin` subsets Google Fonts serves (`unicode-range`
`U+0000–00FF` plus common punctuation). They are referenced from
`../theme.css` by relative path, so Vite fingerprints them and rewrites the URL
with the `/StonesAndSagas/` base applied at build time. That is why they live
under `src/` and not `public/` — a `public/` path would need a base prefix that
plain CSS cannot interpolate.

To refresh a subset, request the CSS from Google Fonts with a browser user
agent, take the `/* latin */` block's `woff2` URL, and download it.
