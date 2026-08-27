# Chrome Web Store listing kit

Everything below is ready to paste into the Chrome Web Store developer dashboard. The
only thing still outstanding is a public URL for the privacy policy — see the checklist
at the bottom.

## Item details

**Name** (45 char max)
> American Odds for Novig

**Short description** (132 char max)
> Unofficial: shows American odds (+127 / -133) beside every probability percentage on Novig.

**Category:** Sports (alternative: Tools)
**Language:** English (United States)

**Detailed description**

> Novig prices its markets as probability percentages. If you think in American odds,
> this extension does the conversion for you, in place, everywhere on the site.
>
> Every percentage on novig.com gets the American equivalent right next to it:
>
>   44% (+127)   57% (-133)   16% (+525)
>
> • Works across game rows, the top ticker, featured cards, parlay tiles, futures
>   rails and expanded game views.
> • Reads Novig's animated rolling price displays as well as plain text prices.
> • Keeps up with live price movement and with rows that load as you scroll.
> • Shrinks the label automatically where a price tile is too narrow, so nothing
>   gets cut off.
> • One on/off switch in the toolbar.
>
> No account, no sign-in, no setup. The extension makes no network requests, collects
> nothing, and runs only on novig.com.
>
> Odds shown are converted from the prices Novig displays; the two sides of a market
> sum to slightly more than 100%, so these are quoted prices, not de-vigged fair odds.
> Always confirm the price in Novig's own interface before placing an order.
>
> This is an independent extension. It is not affiliated with, endorsed by, or
> connected to Novig in any way. "Novig" is used only to describe what the extension
> works with.

## Privacy tab answers

**Single purpose**
> Display American-odds equivalents next to the probability percentages shown on
> novig.com.

**Permission justification — `storage`**
> Stores one boolean: whether the user has the extension switched on. Nothing else is
> written and nothing leaves the browser.

**Permission justification — host access (`https://novig.com/*`)**
> The content script must read the text of Novig's own pages to find the percentages
> it converts, and must be able to style those elements to show the result. No other
> site is matched.

**Remote code:** No — all code is contained in the package.

**Data usage:** Tick nothing. Then check the three certification boxes:
> - I do not sell or transfer user data to third parties, apart from the approved use cases
> - I do not use or transfer user data for purposes that are unrelated to my item's single purpose
> - I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** host `PRIVACY.md` (GitHub Pages, a Gist, or any public URL) and
paste the link. A privacy policy URL is required whenever an item requests permissions.

## Screenshots to capture (1280×800 PNG, at least one, up to five)

1. A game list on novig.com with several rows labelled — the clearest "before/after" shot.
2. An expanded game view showing the big rolling price with its label.
3. The toolbar popup open, showing the toggle and the conversion legend.

Take these at a 1280×800 browser viewport so no resizing is needed. Avoid capturing a
logged-in account balance or any personal information.

## Before you submit

- [x] Repo: https://github.com/Gamedaytrader/novig-american-odds
- [ ] Host PRIVACY.md and paste its URL into the listing
- [ ] Verify the developer account email (one-time $5 registration fee applies)
- [ ] Upload `novig-american-odds-v1.0.0.zip`

Review for a single-site extension with only `storage` is usually quick, but a first
submission from a new developer account can take several days.
