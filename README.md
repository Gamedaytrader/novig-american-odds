# American Odds for Novig

An unofficial Chrome extension that adds American odds next to every implied-probability
percentage on [novig.com](https://novig.com).

```
44% (+127)      57% (-133)      43.5% (+130)
```

Not affiliated with, endorsed by, or connected to Novig.

## What it does

- Labels every percentage on the site — game rows, the top ticker, featured cards,
  parlay tiles, futures rails and expanded game views.
- Reads Novig's animated odometer price displays too, by working out which digit is
  currently lined up in each spinning column.
- Keeps up with live price moves and with Novig's virtualised lists (rows that render
  as you scroll) via a `MutationObserver` plus a light polling tick for the reels.
- Shrinks the label, and drops the parentheses, where a price pill is too narrow to
  fit the full form — so nothing ends up half-clipped.
- One on/off switch in the toolbar popup.

## The math

Implied probability `p` (as a percent) becomes:

| Case | Formula | Example |
| --- | --- | --- |
| `p ≥ 50` (favourite) | `-(100p / (100 - p))` | `57% → -133` |
| `p < 50` (underdog) | `+(100(100 - p) / p)` | `44% → +127` |

`0%` and `100%` are skipped — they have no finite American equivalent.

Note that Novig's two sides of a market sum to slightly more than 100%, so the two
converted numbers are the prices as quoted, not de-vigged fair odds.

## How it renders

The extension never inserts, removes or rewrites a node inside Novig's React tree.
It sets a `data-novig-ao` attribute on the element holding the price, and the label is
drawn by a CSS `::after` pseudo-element fed by `content: attr(data-novig-ao)`. React's
reconciler ignores attributes it does not own, so the app cannot be destabilised by
the extension, and toggling it off is a single attribute sweep.

## Install for testing

```bash
git clone https://github.com/Gamedaytrader/novig-american-odds.git
```

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. **Load unpacked** → select the cloned folder
4. Visit https://novig.com

## Files

```
manifest.json     MV3 manifest — storage permission only, scoped to novig.com
content.js        scanning, conversion, reel reading, fit fallbacks
content.css       label styling (inherits Novig's text colour, so themes just work)
popup.html/.js    on/off toggle
icons/            16 / 32 / 48 / 128 px
```

## Publishing

See `STORE_LISTING.md` for the listing copy, permission justifications and the
privacy answers the Chrome Web Store review form asks for.

## Privacy

No data is collected, stored off-device, or transmitted. See [PRIVACY.md](PRIVACY.md).

## Licence

MIT — see [LICENSE](LICENSE).
