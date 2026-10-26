# Changelog

All notable changes to Ayni are listed here. Versions follow [Semantic Versioning](https://semver.org/); until 1.0 the markup and the API may still change.

## Unreleased

- Tree view, no longer deferred. Editing is switched on per tree (`data-edit="move insert delete rename hide"`), `data-lock` protects an item, an optional root (`data-root`) stays in place, `data-leaf` marks items that hold no children, and `data-hidden` items show muted and in italics only with `data-show-hidden`. Drag and drop with a line or outline marker (on touch: hold, then move), Ctrl+Shift+arrows, Cut/Copy/Paste, Insert, Delete with Undo, F2 rename in place with the field-error "!", `data-unique` names, type-ahead, multiple selection with check squares, `*`, and children loaded on demand (`data-lazy`, `ayni:load`). Each change fires a cancelable event first. Its own pop-up menu, an optional toolbar (`[role="toolbar"][data-tree]`), and `Ayni.tree(el, { root, items })` to build a tree from data and read it back.
- `ayni:select` on a tree now fires when the selection changes, with `{ item, items, path }`; opening a leaf fires `ayni:open`.
- After a long tap opens a pop-up menu, the click that the release produces is ignored on the menu too, so no menu item can be chosen by the lifting finger.
- `Ayni.contextMenu` takes `onDrag(target, event)`: moving the finger once the ring is full drags instead of opening the menu.
- New icons: `arrow-up`, `arrow-down`.
- Switch off state: a hollow track with a grey outline and a small grey thumb, so off no longer looks like disabled. Disabled off is a filled strong grey track, faded.
- Two-sided switch (`.switch-pair`): a label on each side, picks one of two options like two radio buttons. Space or a click on the track flips it; Left and Right pick a side. The gallery shows both switch uses next to their radio button and check box equivalents.
- A switch's label now sits at its left ("Visible (o)==="), so it reads differently from a check box ("[x] Visible").
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
