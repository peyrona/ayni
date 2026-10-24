# Changelog

All notable changes to Ayni are listed here. Versions follow [Semantic Versioning](https://semver.org/); until 1.0 the markup and the API may still change.

## Unreleased

- The library is now called Ayni. Files renamed to `ayni.css`, `ayni.js` and `ayni-icons.js`; the global is `window.Ayni`; events are `ayni:*`; shared layer ids are `ayni-help`, `ayni-err`, `ayni-tip` and `ayni-toasts`; the status hook is `data-ayni-status`; the saved theme key is `ayni-theme`.

## 0.1.0 (2026-10-22)

First version as a library, split out of the CUA Components gallery (version 55 of the published page).

- `ayni.css`: the look of every control, the five-colour light and dark schemes, the touch sizes.
- `ayni.js`: the behaviour of every control. It wires up the page on load, `Ayni.init(root)` wires up later content, and controls report what happened with `ayni:*` events instead of writing to the page.
- `ayni-icons.js`: the example icon sprite, injected into the page so icons also work from `file://`.
- `docs/guidelines.md`: the Ayni Design Guidelines book; `docs/accessibility-backlog.md`: accessibility work planned for later.
- `gallery/`: the gallery now loads the library. It behaves as version 55: the same 68 scripted steps give the same page and status bar at desktop and phone widths, and every element has the same computed style in light, dark and touch.

Changes that come with the split:

- The shared layers have library ids: `ayni-help` (info popups), `ayni-err` (field errors), `ayni-tip` (tooltips), `ayni-toasts` (notifications). `ayni.js` creates them when a page leaves them out.
- New markup hooks replace fixed ids: `data-ayni-status` (status bar message), `data-theme-toggle` (light/dark button), `data-reveal` (show password), `data-hash` (tabs kept in the address).
- Modeless dialogs close with Esc through the library (it was wired to the Find dialog only).
- F10 focuses whichever menu bar is visible.
