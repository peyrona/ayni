<div align="center">

# Ayni : Modern web CUA

**One way of working, on every screen.**

A consistent, modern and intuitive user-interface library where every control follows the same rules.
Plain HTML, CSS and JavaScript. No framework, no build step, nothing to install.

[**Open the gallery**](https://peyrona.github.io/ayni/gallery/) · [Read the design guidelines](docs/guidelines.md) · [Quick start](#quick-start)

</div>

![The Ayni gallery in light mode: round icon buttons, radio buttons, check boxes, switches and the second-action dot](docs/gallery-light.png)

## Why Ayni

Most interfaces grow one screen at a time, and every screen invents its own little habits. Ayni starts from the other end: first the rules, then the controls that obey them. The result is an interface that feels the same everywhere.

- **Consistent.** One look per state across every control. Disabled is always faded, read-only is always a soft tint, an error is always a red border with a small "!".
- **Congruent.** Each sign means one thing. A filled button is the default, and nothing else. A small dot means "this button has a second action". A small triangle means "this opens something".
- **Intuitive.** Things work the way people already expect: Esc closes, Enter runs the default button, typing jumps to a match in any list, and a long tap means "more for this thing".

## What makes it different

**Round, icon-only buttons.** Every button is a circle with an icon and a tooltip. Colour carries meaning (red for danger, green for success, amber for warning), and a danger button is never the default.

**A second action, clearly marked.** A small dot on a button says it also takes a double-click, a long tap on touch screens, or Shift+Enter. The tooltip names both actions, and a ring fills in while you hold.

**Five colours make a theme.** Each scheme, light and dark, is defined by five base colours: paper, ink, accent, alert and danger. Every other colour is worked out from them in the browser, so a new brand is five values away. Light and dark follow the system until the user picks one.

**Touch-first, not touch-afterwards.** On a touch screen every target grows to at least 44 × 44 px. Tooltips give way to a Help button that lists everything on the screen and explains it. Drop-down lists become bottom sheets that stay above the on-screen keyboard.

**Dialogs without the Cancel/OK dance.** Changes apply as they are made, or when the dialog closes. Esc always closes a dialog, and an extra button appears only when it is really needed.

**Errors that don't push the layout around.** Nothing is added below a field. The border turns red, a small "!" appears inside the field, and the message pops up while you are in the field.

**Nothing to build.** Three files, `ayni.css`, `ayni.js` and `ayni-icons.js`, work straight from disk or from any static web server. The target is evergreen browsers from 2024 on.

![The Ayni gallery in dark mode: sliders, a date field, the calendar and the date-and-time popup](docs/gallery-dark.png)

## What's inside

| Family | Controls |
| --- | --- |
| **Buttons** | Push buttons, default and busy buttons, toggles, popup buttons, second-action buttons, radio buttons, check boxes with a mixed state, switches |
| **Lists** | Single and multiple selection lists with type-ahead, drop-down list, combo box, all with one list picker on every device |
| **Texts** | Text fields with buttons inside, search field with filter, password show/hide, text area with a counter, number field, progress, info labels |
| **Pickers** | Slider, date field, date and time, a calendar with month and year views and date limits |
| **Menus** | Menu bar, pull-down menus, pop-up menus (right-click, long tap, Shift+F10), toolbar, popups that hold any control |
| **Feedback** | Tooltips, notifications with Undo (and Ctrl+Z that keeps working afterwards), status bar, loading and empty states |
| **Layout** | Panels, tabs (closable, scrollable, keyboard-friendly), group boxes, a splitter with collapse and reset, scrolling everywhere |
| **Desktop** | Taskbar glued to any screen edge, applications launcher with search, one chip per window with its controls, clock widget, windows with a title row toolbar (in progress) |
| **Dialogs** | Message, live settings, apply on close, confirmation, modeless |

Everything works from the keyboard, with a mouse and by touch, and every state is shown in the gallery.

## Quick start

Copy `ayni.css`, `ayni.js` and `ayni-icons.js` next to your page:

```html
<link rel="stylesheet" href="ayni.css">
<script src="ayni-icons.js" defer></script>
<script src="ayni.js" defer></script>

<button class="btn primary" aria-label="New" data-tip="New">
  <span class="icon" data-icon="plus"></span>
</button>
```

That's it: the library finds its controls when the page loads. Then open [`gallery/index.html`](gallery/index.html), find the control you need and copy its markup.

## The gallery

The gallery is the living reference. It shows every control in every state, in light and dark, with a **Touch preview** switch so you can try the touch layout with a mouse. Open it [online](https://peyrona.github.io/ayni/gallery/) (once GitHub Pages is turned on for this repository), or open `gallery/index.html` straight from your disk.

The rules behind every control are in the [Ayni Design Guidelines](docs/guidelines.md) book. The book says what the rules are, and the gallery shows them working.

## Roadmap

Ayni is at version 0.1.0. The design is still being closed, so the markup and the API may change before 1.0.

- [ ] **The final icon set.** The built-in icons are examples. Any other set can already be plugged in (see [Icons](#icons)).
- [ ] **Desktop mode.** From 1024 px wide, Ayni will switch on its own to a desktop with windows and a taskbar. Under way: the taskbar (glued to any screen edge, with the launcher, one chip per window and widgets) and the window are in, see the [desktop page](https://peyrona.github.io/ayni/gallery/desktop.html).
- [x] **Tree view.** Optional root, hidden items, drag and drop, keyboard moves, cut/copy/paste, insert, delete with Undo, rename in place and loading on demand.
- [ ] **Accessibility for everyone.** Screen readers, captions, right-to-left languages and Windows High Contrast come once the design is closed.

---

# Reference

## Using the library

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
  <link rel="stylesheet" href="ayni.css">
  <script src="ayni-icons.js" defer></script>
  <script src="ayni.js" defer></script>
  <script src="app.js" defer></script>
</head>
<body>
  <section class="panel">
    <header><h2>Invoices</h2></header>
    <div class="body">
      <button class="btn primary" aria-label="New" data-tip="New"><span class="icon" data-icon="plus"></span></button>
    </div>
  </section>
</body>
</html>
```

Load the scripts with `defer`, in this order. When the page has loaded, `ayni.js` wires up every control it finds. For content added later, call `Ayni.init(element)`; a control is never wired twice, so calling it again is safe.

The markup of each control is the one in `gallery/index.html`: copy a specimen from there and change its text. The main building blocks are:

| Control | Markup |
| --- | --- |
| Panel (the base surface of windows, dialogs, menus and popups) | `.panel` with `header`, `.body` and `footer` |
| Button (round, icon only, always with a tooltip) | `button.btn` with `aria-label` and `data-tip`; `.primary` marks the default button; `.danger`, `.ok`, `.warn` colour the icon; `.quiet` has no border |
| Toggle button | `.btn` with `aria-pressed` and `data-toggle` |
| Switch (on/off, like one check box) | `label.switch` with the text, then `input[type="checkbox"][role="switch"]` |
| Two-sided switch (two options, like two radio buttons) | `.switch-pair[role="radiogroup"]` with `label > input[type="radio"]`, `span.track`, `label > input[type="radio"]` |
| Second action (double-click, long tap, Shift+Enter) | `data-alt="what it does"` on a `.btn`; listen for `ayni:press` |
| Busy button | `Ayni.setBusy(button, 'Saving…')`, then `Ayni.setBusy(button, false)` |
| Disabled button | `aria-disabled="true"` (stays focusable, its tooltip says why) |
| Tooltip | `data-tip` on any element |
| Info label | `button.info-tip` with `popovertarget="ayni-help"` and `data-help` |
| Tabs | `[role="tablist"]` with `[role="tab"]` and `[role="tabpanel"]`; `data-closable` and a `[data-close]` span for closable tabs; `data-hash` keeps the tab in the address |
| List box | `ul.lb[role="listbox"]`, `aria-multiselectable="true"` for several |
| Drop-down list and combo box | `.picker` with `data-picker="list"` or `data-picker="combo"` |
| Text field with buttons inside | `.input-group` |
| Search field | `.input-group.search-field` with a `[data-clear]` button |
| Password with show/hide | a `.btn` with `data-reveal` inside the `.input-group` |
| Text area that grows with its text (optional) | `textarea.input[data-autogrow]`; set `--autogrow-max` to change the 240px limit |
| Text area with a count (optional) | `.ta-wrap` with `textarea[maxlength]` and `.ta-count`; a plain `textarea.input` has none |
| Number field | `.input-group.spin` with `data-min`, `data-max`, `data-step` on the input |
| Field error | `aria-invalid="true"` plus `aria-describedby` pointing at a `.error` element with the message |
| Menu, pop-up menu | `.panel.menu[popover][role="menu"]` with `[role="menuitem"]` buttons; menu bar is `[role="menubar"]` |
| Popup with controls | `.panel.popup.controls[popover]` |
| Dialog | `dialog.panel`; any element with `data-open-dialog="id"` opens it |
| Splitter | `.split` (`.split.rows` for top and bottom) with two `.pane` and a `.splitter` between them |
| Light/dark toggle | `data-theme-toggle` on a button |
| Status bar | `.statusbar`; mark the message cell with `data-ayni-status` |
| Desktop | `.desktop[data-edge]` with `main.area` and `nav.taskbar` (launcher `.btn.primary[popovertarget]`, `.chips`, `.widgets`); see `gallery/desktop.html` |
| Window | `section.panel.window` inside `.area`: `header` with `.app` (icon and `h2`) and `[role="toolbar"]`, then `.body`. Its chip is added by Ayni |
| Launcher | `.panel.popup.launcher[popover]` with a `.search-field` and `.apps > button[data-app]` |
| Clock widget | `.widget.clock` (any app widget is a `.widget`) |

A few controls need one call because they take options:

```js
Ayni.toolbar(document.querySelector('#my-toolbar'));                 // one Tab stop, arrows move
Ayni.calendar(element, (date) => { … });                             // inline calendar
Ayni.dateField(input, { popup, onChange: (date) => { … } });         // YYYY-MM-DD field with a calendar popup
Ayni.dateTimeField(input, { popup, value, onChange: (date) => { … } }); // YYYY-MM-DD HH:MM
Ayni.contextMenu(area, { menu, target: (event) => ({ name, back }) });  // right-click, long tap, Shift+F10
```

### Events

Controls tell the page what happened with DOM events that bubble, so one listener on `document` can serve the whole page.

| Event | Fired on | `event.detail` |
| --- | --- | --- |
| `ayni:change` | `.lb` list box | `{ selected }`: the texts of the selected items |
| `ayni:change` | `.picker` | `{ value, name, field, input }` |
| `ayni:press` | `.btn[data-alt]` | `{ second, label }`; use it instead of `click` on these buttons |
| `ayni:action` | `.panel.menu` | `{ item, menu, act }`: the chosen item, the menu's name, its `data-act` |
| `ayni:choose` | `.panel.menu` | the chosen `menuitemradio` |
| `ayni:tabselect`, `ayni:tabclose` | `[role="tablist"]` | the tab |
| `ayni:select` | `[role="tree"]` | `{ item, items, path }`: the focused item, all selected items, the focused item's path of names |
| `ayni:open` | `[role="tree"]` | `{ item, path }`: a leaf opened with a double-click or Enter |
| `ayni:move` | `[role="tree"]` | `{ items, parent, index }`, before the move; `preventDefault()` refuses it |
| `ayni:insert` | `[role="tree"]` | `{ items, parent, index, name }` for a new item, `{ …, copy: true, from }` for a paste, `{ items, undo: true }` for an Undo; cancelable |
| `ayni:delete` | `[role="tree"]` | `{ items }`; cancelable |
| `ayni:rename` | `[role="tree"]` | `{ item, from, to }`; cancelable |
| `ayni:hide` | `[role="tree"]` | `{ items, hidden }`; cancelable |
| `ayni:showhidden` | `[role="tree"]` | `{ on }` |
| `ayni:load` | `[role="tree"]` | `{ item, id, path, done(items), fail(text) }`: a `data-lazy` folder opened for the first time |
| `ayni:split` | `.split` | `{ action, pane, message }` |
| `ayni:theme` | the toggle button | `{ theme }` |
| `ayni:edge` | `.desktop` | `{ edge }`: the user glued the taskbar to another edge |
| `ayni:launch` | `.launcher` | `{ app, item }`: an app was picked |
| `ayni:window` | `.panel.window` | `{ window, state }`: open, select, minimise, maximise, restore or close |
| `ayni:close` | `.panel.window` | `{ window }`, before it closes; cancelable |
| `ayni:dismiss` | an open menu or popup, before the page scroll or a resize closes it | cancel it with `preventDefault()` to keep the popup |

### JavaScript API

Everything lives on `window.Ayni`: `init`, `status(text)`, `toast(kind, text, { action, persist })`, `setBusy`, `place(popup)`, `contextMenu`, `toolbar`, `tree(element, { root, items })` (returns the tree's controller: `data()`, `add`, `remove`, `rename`, `move`, `hide`, `showHidden`, `select`, `selected`, `path`), `calendar`, `dateField`, `dateTimeField`, `fillHelp(body, entries)` (the touch Help dialog), `focusFirstError(root)`, `isTouch()`, `setTouchPreview(on)`, `isDark()`, `setTheme('light' | 'dark' | null)`, `icon(name)`, `setIcon(element, name)`, `icons.use(set)` (see [Icons](#icons)), `windows.select(w)`, `windows.minimise(w)`, `windows.maximise(w)`, `windows.restore(w)`, `windows.close(w)`, `setTaskbarEdge(desktop, edge)`, the date helpers in `Ayni.dates`, and `version`.

### Icons

An icon is `<span class="icon" data-icon="name"></span>`, and `Ayni.icon(name)` returns the same markup for code. Ayni draws it from the icon set in use; `Ayni.setIcon(element, name)` changes it.

`ayni-icons.js` holds only the 31 icons the controls need: `apps`, `arrow-down`, `arrow-up`, `calendar`, `check`, `chev-down`, `chev-right`, `close`, `copy`, `cut`, `edit`, `error`, `eye`, `eye-off`, `file`, `filter`, `folder`, `help`, `info`, `maximise`, `minimise`, `minus`, `ok`, `paste`, `plus`, `restore`, `search`, `today`, `trash`, `undo` and `warn` (also in `Ayni.icons.names`). Your app brings its own icons: SVG symbols with the id `i-<name>` anywhere in the page, as `gallery/demo-icons.js` does for the gallery.

To use another icon set, give Ayni a map from its names to the set's names:

```js
Ayni.icons.use({
  sprite: 'icons/sprite.svg',          // SVG symbols, as markup or a URL (a URL is fetched, so not from file://)
  id: 'icon-{name}',                   // the symbol ids in that sprite; default '{name}'
  stroke: true,                        // the set draws with lines, like Ayni's own; default: filled shapes
  map: { close: 'x', search: 'magnifier', save: 'floppy' },
});
// An icon font instead of a sprite:
Ayni.icons.use({ render: (name) => `<i class="bi bi-${name}"></i>`, map: { close: 'x-lg', search: 'search' } });
```

Any name the map leaves out keeps Ayni's own icon (or your app's `i-<name>` symbol), and the console lists the control icons the set does not map. `Ayni.icons.use(null)` goes back to the built-in set. Every icon on the page is redrawn, so the set can change at any time.

A ready-made map for [Lucide](https://lucide.dev), which has the same style as Ayni's icons, is in `icons/lucide.js`. Load it after `ayni.js`, then call `Ayni.icons.use(Ayni.icons.lucide)`. It fetches Lucide's sprite from a CDN; pass `sprite` to use your own copy. The gallery's Icons tab switches the whole gallery between Ayni and Lucide.

Older markup, `<svg class="icon"><use href="#i-name"/></svg>`, still works but always shows the built-in icon.

### Colours

Each scheme, light and dark, is defined by five base colours at the top of `ayni.css`: `--c-paper` (backgrounds), `--c-ink` (text), `--c-accent` (selection, default button), `--c-alert` (focus ring, warnings) and `--c-danger` (errors, destructive actions). Every other colour is derived from them, so a new scheme is five new values. The page follows the system setting until the user picks light or dark; the choice is kept in `localStorage` under `ayni-theme`.

## Files

| File | What it is |
| --- | --- |
| `ayni.css` | The look of every control, both colour schemes and the touch sizes |
| `ayni.js` | The behaviour of every control |
| `ayni-icons.js` | The built-in icons, only those the controls use (24×24 grid, 2px stroke) |
| `icons/lucide.js` | Map from Ayni's icon names to [Lucide](https://lucide.dev)'s, for `Ayni.icons.use()` |
| `api/` | Proposed programming interface: one class per component, skeletons only (see `api/README.md`) |
| `gallery/` | The gallery page, with its own layout and demo wiring (not needed by apps); `gallery/desktop.html` shows desktop mode |
| `docs/guidelines.md` | The Ayni Design Guidelines: every rule, chapter by chapter |
| `docs/accessibility-backlog.md` | Accessibility work planned for after the design is closed |
| `docs/*.png` | Images for this page |
| `CHANGELOG.md` | What changed in each version |

## Licence

Apache 2.0.
