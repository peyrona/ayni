# Changelog

All notable changes to Ayni are listed here. Versions follow [Semantic Versioning](https://semver.org/); until 1.0 the markup and the API may still change.

## Unreleased

- Nayive's look and languages. Colours: each scheme sets 16 colours by hand, with Nayive's names and values (`--bg`, `--card`, `--card2`, `--line`, `--text`, `--text-dim`, `--text-faint`, `--accent`, `--on-accent`, `--on-solid`, `--danger`, `--ok`, `--warn`, `--busy`, `--link`, `--shadow`); `--card-head`, `--field-line`, `--accent-soft`, `--readonly-bg`, `--track` and `--scrim` are derived. The five base colours (`--c-paper`, `--c-ink`, `--c-accent`, `--c-alert`, `--c-danger`) and the names `--surface`, `--surface-2`, `--ground`, `--ink`, `--ink-2`, `--focus`, `--placeholder`, `--accent-ink`, `--shade`, `--backdrop`, `--thumb` and `--font-ui` are gone. The focus ring is Accent. Corners (`--radius-s/m/l/pill`: 8, 12, 16 px), spacing (`--space-1..5`), shadows (`--elev-card`, `--elev-dialog`) and motion (`--tr-fast`, `--tr-move`) are tokens. Fields sit on `--card2` and type in `--field-fs` (16 px on phones). Text sizes are in rem.
- The system font replaces IBM Plex; nothing is loaded from the network.
- Light and dark: System (the default), Light, Dark and Sun mode (`Ayni.setTheme('sun')`, place from `Ayni.theme.setPlace(lat, lon)`, else the time zone's main city from `tz-geo.json`). The user's own schemes (`Ayni.theme.schemes`, `ayni-schemes`). `data-theme` on `<html>` always says which scheme is showing; Every tab follows a change; `<meta name="theme-color">` follows `--bg`; `ayni:theme` now fires on `document` for every change. The toggle shows a moon or a sun.
- Languages: new `ayni-i18n.js`, loaded first, and `i18n/<lang>.json` in English, Spanish, Portuguese, French and German. `data-i18n` and `data-i18n-attr` in the page, `Ayni.t()` and `Ayni.tf()` in code, `Ayni.i18n` (`ready`, `lang`, `setLang`, `apply`, `weekday`, `month`). Every text Ayni shows is now a key; calendar names follow the page's language. Ayni starts once the texts are in.
- Icons: Nayive's drawings for the control icons; new `sun` and `moon`; `more` is now the vertical ⋮. `Ayni.icons.add({ name: drawing })` adds an app's own icons; the gallery's demo icons use it. The old `<svg class="icon"><use href="#i-name"/></svg>` markup is no longer described.
- A round button that is a tab (`role="tab"`) shows `aria-selected="true"` like a toggle that is on.
- `Ayni.setTip(element, text)`: a new tooltip, shown at once if open; a round button's aria-label follows it.
- `Ayni.supported()`: false on a browser older than Chrome 119, Firefox 128 or Safari 18.
- Split by family, so a page loads only what it uses: `ayni-base.css` and `ayni-base.js` hold the foundations (colours, light and dark, icons, texts, start-up); `ayni.css` and `ayni.js` hold the controls until each family gets its own file pair. A family file takes the shared helpers from `Ayni.core` and registers with `Ayni.core.family({ setup, init })`.
- `Ayni.ready`: resolves once Ayni has started (after the texts are in); code that builds controls waits for it. The gallery's script is now a module that does.
- Icon rules weigh nothing (`:where`) and the span wraps its svg, so an app's own rule that sizes icons wins; a line icon's svg carries its stroke settings as attributes, so a copy taken out of its span (into a menu, a help card) draws the same.
- A missing icon is reported only if it is still missing a moment later, so icons an app adds after Ayni started give no false warning.
- Tests: `node tests/run.mjs` (headless Chromium, no packages) checks colours, contrast, light and dark, Sun mode, schemes, the five languages and the icons.
- Dialog sizes: `dialog.panel` is small, `dialog.panel.big` is big. A small modal dialog fills the screen below 480 px wide, a big dialog below 1024 px; otherwise dialogs float with their shadow. The gallery has a big dialog (Preferences).
- Desktop mode, first part: the taskbar and the window. The taskbar (`.desktop > nav.taskbar`) holds only the applications launcher at the left, the clock at the right and one chip per window between them; an app can add more gadgets (`.widget`) on either side of the clock. The user puts it at the top or the bottom from its pop-up menu, kept in localStorage (`ayni-taskbar-edge`), with `ayni:edge`. The launcher (`.panel.popup.launcher`) has a search field and lists the apps most used first (`ayni-launch`), and fires `ayni:launch`. A window (`section.panel.window`) has a title row with the app's icon, name and toolbar, and no controls of its own: minimise, maximise or restore and close are in its chip. Chips show only the app's icon, except the selected window's chip, which adds the name and those three buttons. When a window's toolbar does not fit, the tools that do not fit move into a "more" (⋯) button and its menu. Windows move by the title row and resize from any edge or corner, with no snapping; `ayni:window` and a cancelable `ayni:close` report what happens, and `Ayni.windows.*` and `Ayni.setTaskbarEdge()` do it from code. In desktop mode a modeless dialog belongs to the window that opened it: it floats above that window, moves by its title row, has no chip, hides while the window is minimised and closes with it. Desktop mode exists only from 1024 px wide: below that `.desktop` is hidden, `.no-desktop` content shows, and `Ayni.isDesktop()` and `ayni:desktopmode` tell the app. Clock: `.widget.clock`. Demo: `gallery/desktop.html`.
- New control icons: `apps`, `minimise`, `maximise`, `restore`, and `more` (moved from the gallery's demo icons), all mapped for Lucide.
- API skeletons: `Desktop`, `Taskbar`, `Launcher` and `Window`.
- Icons are pluggable. An icon is now `<span class="icon" data-icon="name"></span>` (or `Ayni.icon(name)` in code), drawn from the icon set in use. `Ayni.icons.use({ map, sprite, id, stroke, render })` swaps in another set (an SVG sprite or an icon font) and maps Ayni's names to the set's names; a name it leaves out keeps the built-in icon. `Ayni.setIcon(el, name)` changes an icon. `icons/lucide.js` is a ready-made map for Lucide, and the gallery's Icons tab switches the whole gallery between Ayni and Lucide. The old `<svg class="icon"><use href="#i-name"/></svg>` still works, with the built-in icon only.
- `ayni-icons.js` now holds only the 27 icons the controls use. The other 29 (save, print, bold, star...) moved to `gallery/demo-icons.js`, since only the gallery's examples use them. The Icons tab shows the controls' icons and where each one appears.
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
