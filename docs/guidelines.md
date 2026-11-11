# Ayni Design Guidelines

Version of 2026-10-28 · Frasquito

## About this book

This book is the rule set for Ayni, a CUA (Common User Access) interface built with HTML, CSS and JavaScript: every rule here has been decided by Frasquito, the decision maker, and is shown working in the [Ayni Components gallery](../gallery/index.html).

It is written for designers and developers. Designers use it to decide what a screen looks like and how it behaves. Developers use it to build controls that behave the same everywhere. Where a rule names markup (an attribute or a class), that is the way the gallery implements it today.

**How to read it.** Chapter 1 gives the principles that every other rule follows. Chapter 2 sets the foundations shared by all controls: colour, type and icons, sizes, states, keyboard, touch, scrolling, language, helpers and pages inside frames. Chapters 3 to 16 cover one control family each, and chapter 17 covers desktop mode. Chapter 18 covers the page around the controls, and chapter 19 lists what is still to be defined, and the appendix lists decisions that were considered and not taken, so they are not proposed again.

**Words used in this book.**

- **Panel**: the base surface of Ayni. Dialogs, menus, popups and windows are all Panels. Panels can nest, for example a dialog opened from a window.
- **Default button**: the one button in a view that Enter runs. It is the only button with a filled background.
- **Second action**: an extra action on a button, reached by double-click, long tap or Shift+Enter.
- **Touch**: a device whose main pointer is coarse (a finger). **Phone**: a touch device narrower than 600 px.
- **Mouse and keyboard**: a device with a fine pointer.

**Status.** The design of all controls listed here is closed, except for the points in chapter 19. Desktop mode is covered in chapter 17. The accessibility work for blind and deaf users comes later.

**Browsers.** Evergreen browsers from 2024 on: Chrome and Edge 119, Firefox 128, Safari 18 or newer. They all have the native popover and dialog elements and the modern CSS colour functions Ayni needs. On an older browser `Ayni.supported()` returns false, so the page can tell the user to update.

## 1. Principles

Ayni aims for the best user experience by being consistent, congruent and intuitive: the same thing always looks the same, behaves the same and means the same, on every device.

1. **One look, one meaning.** A visual sign has exactly one meaning across the whole interface. A filled background means "default button" and nothing else. A small dot on a button means "second action". A small down-pointing triangle means "opens a list or popup". Colour of an icon carries meaning (danger, success, warning). No sign is reused for something else.
2. **One control per job.** There is one list picker for every drop-down list, filtered list and combo box, one search field, one number field, one date field. Native browser widgets whose look or behaviour differ between browsers (select, datalist, date wheels) are not used.
3. **Apply as you go.** Changes take effect as they are made, or when a dialog closes. Accept and Cancel buttons are avoided wherever possible. A Cancel button is added only when the user really needs a way back.
4. **Nothing hidden that matters.** Every button has a tooltip. A disabled control still explains why it is disabled. Tooltips never hold the only copy of important text. Every view has a Help button (?) that explains its buttons in words, on every device; on touch, where there are no tooltips, it is the way to learn what a button does.
5. **Same rules for mouse, keyboard and touch.** Every action can be reached with each of them. Touch adds a long tap, which always means "more for this thing".
6. **Responsive by default.** The same screens work from a 320 px phone up. On touch devices every target takes at least 44 px, as an invisible hit area around what is drawn. From 1024 px wide, desktop mode with windows switches on by default; below that there is none, unless the app sets its own rule (see chapter 17).
7. **Built on standard parts.** Plain HTML elements first (button, input, dialog, popover, fieldset), with a small shared JavaScript helper. New controls are created only when no existing one fits.
8. **The user decides speed.** A single click never waits, except on a button that has a second action. Nothing disappears before the user can act on it: notifications pause while the pointer is on them, and errors stay until dismissed.

**Core interaction model.**

| Gesture | Means |
| --- | --- |
| Click, tap, Enter, Space | Run the action, or select the item |
| Double-click, long tap or Shift+Enter on a button with a dot | Run the button's second action |
| Long tap on an area or tree item | Open its pop-up menu (same as right-click) |
| Ctrl+click (⌘+click) on a list item | Add it to the picks, or take it out (8.4) |
| Long tap on a list item | Start picking: each tap then adds or removes an item (8.4) |
| Long tap on a tree item, then move the finger | Drag the item (in a tree that allows moving) |
| Right-click, Shift+F10, Menu key | Open the pop-up menu for what is under the pointer or focus |
| Enter inside a Panel | Run that Panel's default button |
| Esc | Close the innermost popup, menu or dialog (a search field with text is cleared first; an empty folded search folds) |
| Ctrl+F (⌘F on Mac) | Open the view's search, or a document's find bar |
| Alt+N | New item (a new folder) in the view |
| Alt+Down or F4 in a field with a list or calendar | Open the list or calendar |

## 2. Foundations

Every control is built on the same colours, sizes, states, keys and touch rules, defined once here.

### 2.1 Colour

Each colour scheme, light and dark, sets the colours below by hand. A few more are derived from them at runtime with CSS colour functions (color-mix and relative oklch). An app can set any of them, set by hand or derived, to give itself its own look.

| Colour | Used for | Light | Dark |
| --- | --- | --- | --- |
| `--bg` | Page background behind Panels | #D8D0C0 | #1E1F23 |
| `--card` | Panels: dialogs, menus, popups, windows | #E3DCCC | #25272B |
| `--card2` | Fields, inner cards, chips | #F2ECDF | #2F3034 |
| `--line` | Panel borders, separators | #86714B | #424349 |
| `--text` | Text, icons | #242732 | #E7E7E9 |
| `--text-dim` | Secondary text, quiet icons, field labels, placeholders | #484C5B | #9597A1 |
| `--text-faint` | Done items, disabled text | #5E6472 | #6B6E77 |
| `--accent` | Default button fill, selection, focus ring, active marks (dot, active filter) | #61410A | #1F80B1 |
| `--on-accent` | Text and icons on an Accent fill | #F9F9FB | #0D0F17 |
| `--on-solid` | Icons on a solid Success or Danger fill, a switch's knob | #FFFFFF | #FFFFFF |
| `--danger` | Danger icons, errors, required mark | #9C4150 | #D9707D |
| `--ok` | Success icons, "saved" | #2E6B4E | #7BA88F |
| `--warn` | Warning icons, "offline, changes waiting" | #8A5A0B | #E0A21E |
| `--busy` | "Sending or fetching data" | #1C5FA6 | #2179CF |
| `--link` | Links | #1A4F9E | #5B9DF9 |
| `--shadow` | Shadow colour | black at 14% | black at 35% |

**Derived colours** (the same formulas serve both schemes):

| Colour | Derived as | Used for |
| --- | --- | --- |
| `--card-head` | Text 5% into Card | Panel title rows |
| `--field-line` | Text 50% into Card 2 | Field and control borders |
| `--accent-soft` | Accent 16% into Card | Selected list rows, highlights |
| `--readonly-bg` | Text 7% into Card | Read-only fields and controls |
| `--track` | Accent 18% into Bg | The empty part of a bar (progress, slider) |
| `--scrim` | Black at 50% | Modal backdrop |

**Hover and pressed tints** mix Text into the colour below (`color-mix(in srgb, var(--text) N%, transparent)`), so the same rule gives a light tint on dark and a dark tint on light. Accent never means hover: it means active, selected or default.

**Contrast targets:** text and placeholders at least 4.5:1 against what they sit on; focus ring and field borders at least 3:1. Both schemes meet them. Text faint is lower on purpose: it is only for things that are off or done (disabled text, done items), which the rule does not cover. Text that must be read never uses it. Field borders use Field line, not Line, because Line on Card 2 reaches only 1.3:1 in the dark scheme.

**Schemes.** Light and dark are the two built-in schemes. A user can make their own schemes and pick one for light and one for dark; a scheme sets Bg, Card, Card 2, Line, Accent and On accent, and everything else keeps the built-in value. The schemes are kept on the device (`ayni-schemes`), and a page can also hand Ayni a scheme from code.

**The scheme dialog.** `ayni-schemes.css` and `ayni-schemes.js`, optional, give the dialog: the list of schemes, editing with the whole page as a live preview, a warning (never a block) when the Accent is hard to see, new schemes, delete with Undo, and which scheme serves light and which dark. At least one of each kind stays. It ships four schemes: Oscuro and Beige, the two built-in ones, and Noche and Niebla. Open it with `Ayni.schemeDialog()`.

**Identity colours.** People, habits and anything told apart at a glance get one of eight fixed hues by index: `data-c="0"` to `"7"` sets `--id-color`, and the page paints with it. They are not theme colours: the same in light and dark, and white text reads on all of them. To get a colour from a name, the same one on every device: `Ayni.colorFor(name)` gives one of eight tile colours, `Ayni.hueOf(name)` a hue, `Ayni.hash(name, mod)` the number behind them.

**Choosing light or dark.** There are four modes:

- **System** (the default): follows the setting of the phone or computer, and changes with it.
- **Light** or **Dark**: the user's own choice.
- **Sun**: light by day, dark by night, worked out from where the device is. It goes light once the sun is 5° above the horizon and dark once it is 4° below, so it does not switch while the sky is still dim. The page gives Ayni the place (rounded to about 10 km, kept only on the device); without one, Ayni uses the main city of the device's time zone.

For Sun, `Ayni.theme.askPlace()` asks the device where it is, from a user's press, and says whether it did; `Ayni.theme.refreshPlace()` updates it quietly, only with leave already given. Without a place, the main city of the time zone serves.

A round button in the title row (a toggle, `data-theme-toggle`) switches between light and dark: it shows a moon while light is on and a sun while dark is on, and its tooltip says what it will do ("Dark mode"). Pressing it is a choice by hand, so it also ends System and Sun modes. The choice is kept on the device (`ayni-theme`) and every open tab and window of the same site follows it at once. The browser's own bar (`<meta name="theme-color">`) takes the Bg colour. Each change fires `ayni:theme` on `document`, so a page can repaint widgets that CSS cannot reach.

**No flash.** A short inline script in the page's `<head>` applies the saved choice, or the system's, before the first paint. From then on `data-theme` on `<html>` always says which scheme is showing (`light` or `dark`), so a page can style either one with a plain selector.

**Colour carries meaning only through icons and borders.** Danger, success and warning colour the icon of a button, never its fill. Errors colour the border of the field or group and a small red "!" circle that holds the message.

### 2.2 Type and icons

- **Font:** the system's own interface font (`--font-sans`: San Francisco on Apple, Segoe UI on Windows, Roboto on Android). Monospaced text (paths, code, ids): the system's monospaced font (`--font-mono`). Ayni loads no font from the network, so it works offline and tells no font server who is using it. An app may load its own font and set `--font-sans`.
- **Sizes** are in rem, so they follow the browser's text size:

| Text | Size | Weight |
| --- | --- | --- |
| App title | 1.1 rem, Accent | Bold |
| Dialog title | 1.15 rem | Bold |
| Body text, list rows | 0.9 rem | Normal |
| Field label, extra details | 0.8 rem, Text dim | Normal |
| Section label | 0.72 rem, Text dim, capitals, letter spacing 0.06 em | Bold |
| Text typed into a field (`--field-fs`) | 0.77 rem; 16 px on phones | Normal |

  On phones every field uses 16 px: with anything smaller, Safari on iPhone zooms the page in when the field gets the focus and never zooms back out.
- **Dates** shown to a person are always written YYYY-MM-DD. Month and day names (in the calendar) follow the page's language (2.8).
- **Icons** are drawn on one 24 × 24 grid with rounded ends, and take their colour from the text. The stroke is 2 px; an icon may use another width when it reads better. They are used at 16, 20, 24 and 32 px. The drawings are Nayive's.
- **Names** are plain English words, joined with a hyphen when there are several: `close`, `more`, `eye-off`, `arrow-up`, `folder-plus`, `save-as`.
- An icon is written in the page as `<span class="icon" data-icon="name"></span>`; code uses `Ayni.icon(name)`. No SVG is pasted into a page.
- Ayni ships only the icons its controls need. An app adds its own set (`Ayni.icons.add`), and can replace the whole set with another one (Lucide, an icon font...) by mapping Ayni's icon names to that set's names; a name the other set lacks keeps Ayni's icon.
- Status icons: Information, Success, Warning and Error, each in its meaning colour.

**More icons.** `ayni-icons-more.js`, optional, adds about 400 for apps: an editor's toolbars, a player, files, a desktop. No SVG is pasted into a page: `<span class="icon" data-icon="bold"></span>`, with `style="--icon:18px"` for another size, or `Ayni.icon('bold', '', 18)` in code. `Ayni.icon` works from the first script on.

### 2.3 Sizes and spacing

| Item | Mouse and keyboard | Touch |
| --- | --- | --- |
| Control height (fields, list picker) | 32 px | 44 px |
| Fields and list pickers in a toolbar | 30 px | Hit area 44 px |
| Push button (circle) | 36 px, icon 18 px | Drawn 36 px, hit area 44 px |
| Small button (`.sm`, in rows and cards) | 30 px, icon 15 px | Drawn 30 px, hit area 44 px |
| Toolbar and notification buttons | 30 px (36 px in a tall toolbar, `[role="toolbar"].tall`, for an app's title row) | Drawn the same, hit area 44 px |
| Buttons in a dialog's bottom row | 36 px | 44 px |
| Buttons inside a field | 26 px, icon 15 px | Hit area 44 px |
| List rows, menu items, calendar days | Compact | At least 44 px high |
| Panel padding / gap | 16 px / 12 px | Same |

**Corners** (one scale, nothing else is used):

| Name | Radius | Used for |
| --- | --- | --- |
| `--radius-s` | 8 px | Fields, small buttons, chips |
| `--radius-m` | 12 px | Inner cards, list rows, menus, popups |
| `--radius-l` | 16 px | Dialogs, windows, page cards |
| `--radius-pill` | fully round ends | Pills, round tags |

Buttons and avatars are circles.

**Spacing** comes in multiples of 4: `--space-1` to `--space-5` are 4, 8, 12, 16 and 24 px. Gaps, padding and margins between parts use them.

**Shadows:** `--elev-card` for popups, menus and page cards, `--elev-dialog` for dialogs over the scrim.

**Motion** is quick and plain, with no entrance animations: `--tr-fast` (0.12 s) for colour, background and opacity, `--tr-move` (0.15 s) for movement. When the system asks for less motion, nothing moves.

**Touch targets.** On touch devices every touchable thing has a hit area of at least 44 × 44 px, and separate targets keep at least 8 px apart. Buttons keep their drawn size and get the rest as an invisible hit area, so more fits in a phone's title row; only the buttons of a dialog's bottom row are drawn at 44 px. Things that should look small (the info "i", a tab's close button, the splitter glyphs) do the same. Tiled targets such as list rows, menu items and calendar days need no gap between them.

**Very narrow phones** (below 360 px, touch): calendar days are drawn 6 px smaller inside their full 44 px cell, and popups keep 4 px from the screen edge, so the date picker fits a 320 px screen without scrolling.

### 2.4 States

Every control shows each state with the same look.

| State | Look | Behaviour |
| --- | --- | --- |
| Normal | Border in Field line colour | Fully interactive |
| Focus | 2 px ring in the Accent colour, 2 px outside the control (fields: border turns Accent) | Shown on keyboard focus |
| Disabled | Faded to 45% opacity | Does nothing. Fields and list items cannot be focused. Buttons can (see 3.6) |
| Read-only | No border, soft tint (Read-only background), text at full contrast | Can be focused, selected and copied; value cannot change |
| Loading | Short centred line with a spinner: "Loading…" | Control is marked busy |
| Empty | Short centred line: "No files" | Nothing to pick |
| Error | Danger border, plus a small red "!" circle; the message opens in a popup from it (4.7) | Message says how to fix it; border, "!" and popup disappear once fixed |
| Busy (buttons) | Spinner replaces the icon in the same circle | Clicks ignored; tooltip says what is running |

A disabled group box fades everything inside it at once. A read-only field never says "(read only)" in its label: the look says it. Read-only pickers hide their triangle, and read-only date fields hide the calendar button.

### 2.5 Keyboard

- Tab moves between controls; composite controls (lists, toolbars, tab rows, menu bars, radio groups) are one Tab stop, and arrow keys move inside them.
- Enter inside a Panel runs its default button, except in a text area, on another button or item, or while a list or menu is open.
- Esc closes the innermost popup, menu or dialog. In a search field with text the first Esc only clears it; on an empty folded search Esc folds it (4.5).
- Ctrl+F (⌘F on Mac) opens the view's search and puts the cursor in it, even from inside a text field; in a document it opens the find bar, Ctrl+H with its replace row (4.6).
- Shift+Enter on a button with a dot runs its second action.
- Alt+Down or F4 opens a list picker or calendar.
- Shift+F10 or the Menu key opens a pop-up menu. F10 focuses the menu bar. In a menu, Right opens a submenu and Left closes it; Tab closes the menu.
- Ctrl+Page Down / Ctrl+Page Up switch tabs from anywhere inside the Panel.
- Ctrl+Z (⌘Z on Mac) runs the Undo on screen, outside text fields (11.2).
- Alt+N makes a new item in the view (a folder, an album), F2 renames, Delete deletes. A view's main list takes its keys while the focus is on the title row's buttons too (8.4).
- In a guided tour, Right goes on, Left goes back and Esc ends the tour (15.3).
- On Mac, Ctrl in shortcuts reads ⌘.

### 2.6 Touch

- A device counts as touch when its main pointer is coarse; Ayni marks the page with the class `touch` on `<html>`. An app can switch it by hand (a tablet with a mouse plugged in, a preview), and every touch rule follows. Sizes switch to the touch values above.
- There are no tooltips on touch. The Help button (?) in the title row explains every button instead (chapter 15).
- **Long tap** (hold 500 ms) means "more for this thing": on a button with a dot it runs the second action; on an area or a tree item it opens that element's pop-up menu; on a list item it starts picking (8.4). While holding, a ring paints in around the button (or at the finger) over the hold time. The menu opens when the finger lifts. Moving more than 10 px before the ring is full cancels the long tap (the page scrolls); in a tree that allows moving, moving the finger after the ring is full drags the item instead (16.5).
- On phones (below 600 px), lists of the list picker open as a sheet at the bottom of the screen, kept above the on-screen keyboard.

### 2.7 Scrolling

Every container (Panel bodies, dialogs, menus, popups, lists, tables, panes) can scroll vertically and horizontally, and shows a scrollbar only when its content does not fit. Menus and popups are never larger than the screen: they scroll instead.

### 2.8 Language

Every text Ayni shows (tooltips, "Loading…", the calendar's month names, the guided tour) comes in the page's language. Ayni ships English, Spanish, Portuguese, French and German.

- **No text lives in the code.** Every text is a key in one file per language (`i18n/<lang>.json`). Ayni has its own files, and an app keeps its own beside them; both are read with the same functions.
- **In the page:** `<span data-i18n="key"></span>` for text, `data-i18n-attr="title:key, aria-label:key2"` for attributes. Content added later is translated by `Ayni.i18n.apply(element)`, and on its own when it is added to the page.
- **In code:** `Ayni.t(key)`, and `Ayni.tf(key, { n: 3 })` for texts with `{n}` places.
- **Which language:** the user's choice when there is one (`ayni-lang`, kept on the device), else the first of the browser's languages the page offers, else English. Changing it reloads the page, in every open tab.
- **Missing texts:** a key missing in a language falls back to the page's reference language (English for Ayni's own texts; an app names its own), then to the key itself.
- **No half-translated screen:** the language script loads first, without `defer`, and keeps the page hidden until the texts are in, for 2.5 s at most, so a dead network never leaves a blank screen. Ayni itself starts only then, and `Ayni.ready` says when: code that builds controls or text waits for it.

### 2.9 Helpers

`ayni-util.js` holds the small jobs every app writes again. It loads right after `ayni-i18n.js`, without `defer`, and every page needs it, because Ayni's own files use it. It does nothing on loading but define its functions, so a service worker can load it too.

| Job | Calls |
|---|---|
| Build a node | `Ayni.h(tag, props, ...kids)`: `props` is `{ class, text, html, on: { click }, attrs, data, anyProperty }`, or just the class as a string, and a null or false one is skipped. Kids are nodes, text, numbers, lists, and null or false (skipped). `html` is for your own icons only, never for data |
| Text into HTML and CSS | `Ayni.esc(text)`; `Ayni.cssEsc(text)`, `Ayni.cssUrl(url)` for a quoted string or a `url("...")` |
| Paths | `Ayni.extOf`, `Ayni.baseName`, `Ayni.dirOf`, `Ayni.stripExt`; `Ayni.followPath(path, pairs)`, where a path is after moves |
| Names | `Ayni.uniqueName(name, taken)` gives "photo (2).jpg"; `Ayni.slugify(text, fallback, max)` gives "cordoba-2026" |
| Showing amounts | `Ayni.fmtBytes(n)` gives "1.5 KB", "15 MB", with the page's decimal mark; `Ayni.fmtClock(seconds)` gives "1:05", "1:02:05"; `Ayni.fmtRuntime(seconds)` gives "1 h 30 min" |
| Waiting | `Ayni.sleep(ms)`; `Ayni.pool(items, n, worker)` runs `worker` over the items, at most `n` at a time |
| Leaving the page | `Ayni.copyText(text)`: to the clipboard, also on plain HTTP, where it has to go through a hidden field; the promise fails when neither way works. `Ayni.saveFile(data, name, type)` hands a Blob or a text to the device as a download. `Ayni.saveUrl(url, name)` does the same with an address |
| The device | `Ayni.isMac`, `Ayni.isIOS()` |
| Dates | `Ayni.dates.pad(n)`, `.iso(date)`, `.parseIso(text)`, `.today()` (the device's day as `YYYY-MM-DD`, never the UTC day), `.zone(fallback)` (the device's time zone, `UTC` when it will not say), `.zones()` (every zone the browser knows). The date formatters come with `ayni-fields.js` |

### 2.10 A page inside a frame

A page may run inside another page: a pane of a bigger view, or a whole app in a window (17.4). `Ayni.frame` says which, and the page's own CSS can ask the same on `<html>`:

| Case | `Ayni.frame` | `<html>` |
|---|---|---|
| The page is the whole tab | `embedded: false`, `windowed: false` | nothing |
| A pane of another page | `embedded: true`, `windowed: false` | `.is-embedded`, and `.is-embedded-wide` while the top window is wider than a phone (641 px or more), when the host shows its panes side by side |
| A window of a desktop | `embedded: true`, `windowed: true` | `.is-windowed` |

**The host says what a frame is:** a frame that is a window carries `data-ayni-window`, set before its `src`. A frame without it is a pane. A foreign site that frames the page counts as a pane too.

`Ayni.frame.owner()` is the window that owns the address bar: the top one when framed by a page of the same site, the page itself otherwise. "Go home" and "sign in again" navigate it, so they leave the frame instead of opening inside it.

Things that belong to the whole screen (an update bar, a first-visit mark) show only where `Ayni.frame.embedded` is false.

## 3. Buttons

Every button is a circle with an icon and no text label, and every button has a tooltip that names its action. There are two exceptions: the text button (3.9), kept for wide calls to action that an icon cannot say, and the large button (3.10), for the main choices of a launcher or a home screen.

This applies to push buttons and toggle buttons. It does not apply to tabs, menu items, menu bar items, radio buttons or check boxes, which keep their text.

### 3.1 Look

- Round, icon only. The tooltip (and the accessible name) says what it does: "Save", "Print (Ctrl+P)".
- **At rest a button has no border and no fill, and its icon is in Text dim.** It shows itself when it matters: on hover a grey tint (Text mixed into what is below) comes in and the icon takes the full Text colour; when pressed the tint is a little stronger and the button moves down 1 px. Accent never means hover.
- **A bordered button** (`.bordered`) is the option for a button that stands alone on a plain surface: a Card disc with a thin border and a full-colour icon.
- **Background fill marks only the default button.** There is at most one default button per view, and Enter runs it. It is an Accent disc with the icon in On accent.
- **Meaning goes in the icon colour:** red (Danger) for destructive actions, green (Success) for approve or confirm, amber (Warning) for caution. Neutral buttons use Text dim at rest.
- **One icon per meaning:** confirm is a check (✓), close is ×, delete is the bin, help is "?", new is "+". The same action never takes another icon, and these icons never mean anything else.
- **A danger button is never the default.** In a confirmation, the safe choice is the default. Ayni removes the default mark from any danger button and warns developers in the console.
- **Sizes** (2.3): 36 px, icon 18 px; small (`.sm`) 30 px, icon 15 px, for buttons in list rows and cards. On touch the drawn size stays and the hit area grows to 44 px.

### 3.2 Toggle buttons

A toggle button holds an on/off state (Bold, Favourite, the Day / Week / Month views). It looks like a push button. When on, it has a soft Accent tint behind an Accent icon; it is never filled, since a fill means the default button. The state is `aria-pressed`, so screen readers say it too. For a setting that takes effect at once, prefer a switch (chapter 5).

### 3.3 Buttons that open a popup

A button that opens a menu or popup shows a small down-pointing triangle at its lower right, as a combo box does, always in the same colour as the button's icon. The triangle stays small (9 × 6 px on a 36 px button). Ayni adds it to every button that opens one. Such a button can never have a second action, so it never shows the dot.

The "more" button (⋮, three dots one above the other) is the one exception: its dots already say "a menu of more things", so it shows no triangle.

A button that opens a dialog gets no marker: no triangle and no dot. Its tooltip ends with an ellipsis ("Rename…", "Delete file…") to show that a dialog follows. Like a popup button, it can never have a second action.

### 3.4 Second action

A button may have one second action, for example Print (first action) and Print with the last settings (second action).

- **Reached by:** double-click with a mouse, long tap (500 ms) on touch, Shift+Enter on the keyboard.
- **Marked by:** a small solid dot in the Accent colour at the lower right of the button, on every device. Nothing else marks it.
- **Timing:** a single click on a button with a dot waits about 250 ms in case a second click follows. A double-click runs only the second action, never the first. Taps and Enter act at once. Buttons without a dot never wait. (Browsers cannot read the system double-click time, so 250 ms is fixed.)
- **Hold feedback:** while the finger holds, a ring paints in around the button over the hold time.
- **Tooltip:** generated from both actions and the ways to reach them. Mouse and keyboard: "Print · Double-click or Shift+Enter: Print with the last settings". Touch (in the Help card): "Print · Hold: Print with the last settings".
- **Never on a button that opens a popup, menu or dialog.** Ayni strips the second action from such buttons and warns.
- **Use it only where it helps:** a second action is a shortcut for people who know it; the first action must make sense alone.

### 3.5 Default button

Enter anywhere inside a Panel clicks that Panel's default button. It does not when the focus is in a text area, on another button or item, or while a list or menu is open. One shared helper does this for every Panel: no dialog needs its own Enter handling.

### 3.6 Disabled buttons

A disabled button is faded to 45%, the same on every button. Clicks and Enter are ignored, but it stays focusable and its tooltip still shows and says why it is off: "Paste: nothing copied yet". A default button can be disabled until the input is valid: it stays filled but faded. Markup: `aria-disabled="true"`, never the `disabled` attribute (which hides the button from the keyboard and its tooltip).

### 3.7 Busy buttons

While its action runs, a button is busy: a spinner replaces the icon in the same circle (the size does not change), clicks are ignored, and the tooltip shows what is running ("Saving…"). When the action ends the icon and tooltip come back. A failure is shown with the usual error notification. Use it for every button that waits on a server: it also stops a second click from sending twice.

### 3.8 Buttons over pictures

A button that sits on a photo or a video (an editor's tools, a player's controls) is a glass disc (`.on-media`): a dark see-through disc with a white icon, readable on any picture, in both schemes.

### 3.9 Text buttons

A text button carries a short label, with an optional icon before it. It is for a wide call to action whose meaning an icon cannot carry ("Extract here", "Add stage", "Show all 240 photos") and for a choice row (below). It never goes in a toolbar or a title row, where every button is round.

- **Look:** a pill (fully round ends) with the same states as a round button: no fill at rest, grey tint on hover, a fill only when it is the default button.
- **Kinds:** plain (`.btn.text`), with a border (`.bordered`), with a dashed border for "add one more" rows (`.dashed`), and small (`.sm`).
- **Label:** a verb first, two or three words, no full stop. It is the accessible name, so no tooltip is needed unless it adds something.
- **Choice row:** a row of small bordered text buttons that are toggles (3.2): the filters of a list (All, Unread, Groups), one of a few choices (Equal, Shares, Percent), several of a few (the days of a week). Their labels are nouns. On is the soft Accent tint of a toggle, never a fill. For one of a few, pressing one turns the others off. The row wraps. It stays on the page and the view does not change: tabs change the page (12.1), and a longer list of choices is a list picker (7).

### 3.10 Large buttons

A large button is a big icon with its name under it, for the main choices of a launcher or a home screen ("Chat", "Photos", "Sudoku"). It never goes in a toolbar or a title row.

- **Look:** a rounded box, not a circle, with the same states as a round button: no fill at rest, grey tint on hover, faded when disabled. The 40 px icon is in Accent, at rest too; the name is in Text dim, and Text on hover.
- **Name:** always visible, so it is the accessible name and no tooltip is needed.
- **Popup:** one that opens a popup shows the triangle of 3.3 at the box's lower right.
- **Width:** up to 110 px, less on narrow screens; `--large-w` changes the top limit.
- **Border:** `.bordered` adds the plain edge, for large buttons on a card.
- It can be a link (`<a class="btn large">`) as well as a button.

### 3.11 For developers

| Need | Markup |
| --- | --- |
| Button | `.btn` with an icon, `aria-label` and `data-tip` (Ayni fills in `aria-label` from `data-tip` when it is missing) |
| Small | `.btn.sm` |
| With a border | `.btn.bordered` |
| Large | `.btn.large` with an icon and a `<span>` for its name; `.btn.large.bordered` with an edge |
| Default | `.btn.primary` (one per view) |
| Meaning | `.danger`, `.ok`, `.warn` |
| Toggle | `aria-pressed` |
| Opens a popup | `popovertarget` or `aria-haspopup` (the triangle is added by CSS; not on the "more" button) |
| Second action | `data-alt="Print with the last settings"` |
| Disabled | `aria-disabled="true"`, not the `disabled` attribute |
| Busy | `Ayni.setBusy(button, "Saving…")`, then `Ayni.setBusy(button, false)` |
| New tooltip | `Ayni.setTip(button, "Pause")`: the tooltip and the button's name change together |
| Over a picture | `.btn.on-media` |
| Text button | `button.btn.text` with an optional icon and the label |
| Choice row | `.choices` (`role="group"` with a name) holding `button.btn.text.sm.bordered` with `aria-pressed` |
| A dialog's buttons | written in the page with their class and icon (`.btn.primary` + check, `.btn` + close, `.btn.danger` + bin); nothing rewrites them when the page loads |

## 4. Text, number and search fields

A text field shows a short hint in its placeholder, a longer one in the info "i" next to its label, can hold round buttons inside its border, and never adds a line below it.

### 4.1 Text field

- **Look:** one look for every text, password, number, date and time field: the Field colour, a 1 px Field line border, the small corner, 32 px high (44 px on touch, 2.3). The pointer over it darkens the border to Text dim; the focus turns it Accent with the focus ring (2.4). Browser autofill keeps the field's own colours: no white box in the dark scheme.
- **Label:** every field has a visible label above it, 4 px over the field, linked to it; clicking the label focuses the field. A required field shows a red mark (Danger) after its label.
- **In a form:** fields stack 12 px apart. Two or more short fields that belong together (Port and Security, From and To) can share a row; the row wraps on a narrow screen, and no field in it gets narrower than 120 px.
- **Hint:** a short one goes in the placeholder ("As it appears on your ID", "name@example.com"). A longer one goes in the info "i" next to the label (14.2). Never a line below the field. A dialog may open with one short paragraph above its fields, saying what it is for.
- **Buttons inside the field:** one or more round, quiet buttons can sit inside the border, at the start and/or the end (show password, clear, calendar, filter, the up / down pair of a search). They follow every button rule: icon only, tooltip, 44 px on touch.
- **Error:** a Danger border and a red "!" inside the field, whose popup says how to fix it (4.7). Nothing is added below the field.
- **Read-only:** no border, soft tint, text at full contrast, normal text cursor. It can be focused (with the focus ring), and its text can be selected and copied. The label does not say "read only".
- **Disabled:** faded to 45%, cannot be focused.
- **In a toolbar** (a cell's name box, a formula bar, a margin width): the same field, at the toolbar's 30 px height, with no label above it; its tooltip names it.

### 4.2 Password field

A text field with a show/hide button at its end. The button is a toggle, pressed while the password is shown; its icon is an eye, crossed out while shown, and its tooltip says what a press does ("Show password", "Hide password"). Pressing it keeps the cursor in the field.

### 4.3 Text area

Multi-line text, same rules as the text field, at least 80 px high. The character count is optional, per text area: show it when the user benefits from seeing how much room is left, and leave it out otherwise (a length limit can exist without a count). When shown, it sits on the bottom border of the field, near the right end, as a small tag with a rounded border. Its background is fully opaque, so neither the border nor the text shows through it.

Auto-grow is optional, per text area. With it the field starts at its normal height and grows with its text up to a maximum (240 px by default), then scrolls. It has no resize grip, since the height follows the text. Without it, the user can resize the field vertically with the grip at its bottom-right corner. Both options can be combined.

### 4.4 Number field (spin button)

A number in a range, laid out as − field +. Every number field is one, in forms and in toolbars alike; the browser's own small arrows are never used.

- **Keys:** Up and Down step by 1 step; Page Up and Page Down by 10 steps; Home and End jump to the minimum and maximum.
- **Buttons:** − and + step by 1. Holding one repeats: the first step at once, then every 150 ms after 400 ms, then every 50 ms after 1.5 s. − is disabled at the minimum, + at the maximum. On touch each has a 44 px hit area.
- **Out of range or invalid input is not corrected.** It shows the usual field error, in the page's language: "Between 1 and 99."
- **Decimal mark:** both comma and point are accepted; the one the user typed is kept for display. The page always gets the number itself, never the typed text.
- **Label:** say the range and step when they matter: "Weight in kg (0–50, steps of 0.5)".
- **Empty:** a number that may stay empty says what empty means in its label ("Quota in GB, empty = no limit"); empty is then a value, never an error.
- **Width:** only − value +, nothing more. The box holds the longest value the limits allow, or 2 digits with no limit, and grows for anything longer. The buttons are 24 px. So no page sets a width and no number field has a placeholder.

### 4.5 Search field

Every search field in Ayni is the same control, and every one finds by the same rule.

- **What it finds:** words in any order ("bill light"), "an exact phrase" in quotes, and -word to leave out. Accents and case are ignored; ß is ss, œ is oe, æ is ae and ’ is '. German umlauts match both ways: "Müller" finds "Mueller" and "Mueller" finds "Müller". A "-" inside a word (e-mail) or on its own is just a letter. A server that searches for the page folds its text the same way.
- **Filters as the user types.** A field whose words go to a server that only answers on request (a dictionary) searches on Enter instead, and only that field has a Go button (magnifier) inside. A field that filters as you type has no magnifier inside: a button that does nothing typing doesn't do would only look pressable.
- **Its tooltip** says how to search (the rule above), unless its words go to a server with rules of its own (a mail server).
- **Down** moves from the field to the first result.

**Folded, in a title row.** At rest only a Search button (magnifier) shows, in the toolbar's place for Search (9.8). Pressing it, or Ctrl+F, opens the field in its place with the cursor in it; the field takes the room the row has left, up to 360 px. If that is under 180 px, tools leave into More by rank until it fits, and come back when it folds (9.9). A search the app opens by itself (from a link) opens without the cursor, so no phone keyboard pops up.

**Inside the field, at the right end, in this order:**

- **Count:** "12 / 300" (shown / all), dim, while the field holds text; "0" when nothing matches. Screen readers announce it.
- **Filter button** (optional): opens a menu of filters, or a dialog when the filters need fields of their own (From, dates). Its icon is grey while no filter is on and Accent while any is; its tooltip says which ("Filter: fruits") or how many ("Filters: 2"). The field stays usable with a filter on.
- **Up / down pair** (optional), for a view that finds its hits in place instead of filtering (a calendar, a conversation): the count reads "3 / 12" (this hit / all hits), Enter goes to the next hit and Shift+Enter to the previous one; the pair is faded while there is nothing to step to.
- **Close (×):** in a folded search, always shown: it clears the field and folds it in one press. In a plain search field (in a dialog, a popup, a list picker) it is a clear button, shown only while there is text, and the field stays.

**Esc:** with text, the first Esc only clears it; the field stays open with the cursor in it. With the field empty, Esc folds it, or closes the popup or dialog a plain field sits in. An Esc that clears never reaches the dialog behind.

### 4.6 Find bar

Finding inside a document (a text, a spreadsheet) uses a find bar: a strip above the document, not a dialog, so the document stays in view and can be edited.

- **Find row:** a search field (4.5) with the count "3 / 12", the up / down pair, Match case (Aa, a toggle), a ▾ toggle that shows the replace row, and Close. Close is the bar's only ×: the field has no clear button of its own (Esc clears it). Nothing found reads as a red "0".
- **Replace row:** the replacement field, then Replace and Replace all (text buttons, 3.9). Replace all is one action the user can undo.
- **Keys:** Ctrl+F opens it, Ctrl+H opens it with the replace row; Enter goes to the next match and Shift+Enter to the previous one, and the cursor stays in the bar; Esc as in 4.5, then closes the bar.
- **Marks:** every match in view is marked, the current one more strongly, and the document scrolls to the current one.
- **Closing** puts the cursor back in the document, on the last match.

### 4.7 Errors

Space is precious, so an error never adds a line below the field: it shows as a Danger border and a small red "!" whose popup holds the message.

- **Border:** the field's border turns Danger.
- **Error mark:** a small red "!" in a circle, drawn like the info "i" (14.2), sits inside the field at its end.
- **Message:** shown in a floating popup next to the "!", saying how to fix the value ("Enter a full address, like name@example.com."). It opens by itself while the field has focus. Otherwise it opens when the user clicks, taps or hovers over the "!".
- **On submit:** focus goes to the first wrong field, so its message shows at once.
- **When fixed:** the border, the "!" and the popup all disappear.
- **Groups** (radio and check groups, lists): the "!" sits next to the group's title or label, and the group border turns Danger. A list without a label shows its "!" inside its top-right corner, as inside a text field.
- **Touch:** the "!" keeps its small look with a 44 px invisible hit area.
- **Info and error together:** the "i" (help) stays next to the label; the "!" (error) sits inside the field. Each keeps one meaning.
- **A message about no single field** ("Wrong user or password.", "The server did not answer. Try again.") is a Danger line at the bottom of the dialog or form, above its buttons. It goes as soon as the user changes something or tries again. A wrong value is never reported this way: it belongs to its field.

### 4.8 Editing in place

A line of text that can be renamed where it stands (a document's name in its title row, a task in a list). At rest it is plain text; the pointer over it shows a soft tint and the text cursor. A click, or F2, turns it into a field in exactly the same box, so nothing on the screen moves; the field has an Accent border while it is being edited. Enter or leaving the field keeps the new text; Esc puts the old one back. An empty or invalid text is not kept, and the field shows the error (4.7). A line that cannot be renamed now (a finished task) keeps the box but loses the tint and the cursor.

### 4.9 For developers

| Need | Markup or code |
| --- | --- |
| A field | `input.input` or `textarea.input`: the class gives the look; Ayni never styles a bare `input` |
| Label and field | `.field` with a `label[for]` and the field; a Panel's body spaces its `.field`s 12 px apart (its gap) |
| Fields side by side | `.field-row` around two or more `.field`s |
| Fields stacked outside a Panel body | `.fields` around them (a part of a form, a page's own form): the same 12 px |
| Required | `span.req` after the label's text |
| Lead paragraph of a dialog | `p.hint` at the top of the dialog's `.body`, before its fields |
| A message about no single field | `p.form-error` at the bottom of the body (`hidden` while there is nothing to say) |
| Field error | `aria-invalid="true"` plus `aria-describedby` pointing at a `.error` element with the message; `if (Ayni.focusFirstError(root)) return;` before sending: it checks the typed date, time and number fields again (a value sent with Enter never left its field) and puts the focus on the first wrong one |
| Password with show/hide | `.input-group` with the `input.input[type="password"]` and a `.btn[data-reveal]`; Ayni sets its icon, tooltip and pressed state |
| Number field | `.input-group.spin` around its `input.input` with `data-min`, `data-max`, `data-step` (or `type="number"` with `min`, `max`, `step`: Ayni turns it into a text box); Ayni makes the − and + buttons and the message when the page leaves them out; `data-optional` makes empty a value; a step fires the native `input` and `change` (once a held button is let go); `ayni:change { value }` gives the number (`null` when empty) |
| Editing in place | `span.inline-text` at rest, swapped for `input.input.inline` while editing (`.is-editable` on the span when it can be renamed) |
| A field in a toolbar | an `.input` or `.spin` inside `[role="toolbar"]` takes the toolbar's height by itself |
| Search field | `.input-group.search-field` with an `input.input[type="search"]` and a `[data-clear]` button; Ayni wires it |
| Folded search in a title row | `.input-group.search-field.fold` right after its Search button (`.btn[data-search]`) |
| Filter button | `.btn.filter-btn` inside the field: `popovertarget` for a menu, or the page opens its dialog on `click`; `.is-active` while a filter is on |
| Search on Enter only | `data-enter` on the field; its Go button (`.btn[data-go]`) is made at the end when the page has none |
| Options, count and steps | `Ayni.searchField(field, { filter, filterTip, step, onClose, tip, toggle })`, returns `{ open(quiet), close(quiet), isOpen(), count(text), canStep(on), clear(), filtered(what) }`; `step(d)` gets -1 or +1; `tip: false` drops the how-to-search tooltip |
| Which filter is on | `filtered(2)` (tooltip "Filters: 2"), `filtered('fruits')` ("Filter: fruits"), `filtered(0)` (none); the icon turns Accent while one is on |
| The rule in code | `Ayni.matcher(text)`: `null` when nothing is asked, else a test `m(itemText)` with `m.terms` and `m.not`; `Ayni.fold(text)` for one string |
| What was typed | `ayni:search { text, test }` on the field after each change (on Enter for `data-enter`); `ayni:searchclose` once it is emptied and folded or closed |
| Find bar | an empty element above the document; `Ayni.findBar(bar, { find(text, { matchCase }), step(d), replace(text, all), selected(), onClose })` fills it (`.find-bar[role="search"]`) and returns `{ open(withReplace, text), close(), isOpen(), count(at, total) }`; `selected()` gives the document's selected words for the field |
| Ctrl+F (⌘F) | Ayni handles it: the open popup or dialog the cursor is in, else the top modal dialog, else the page; there a find bar (Ctrl+H with its replace row), else the first folded search, else the first plain one. A page that handles the key itself calls `preventDefault()` first |

## 5. Choice and range controls

Radio buttons, check boxes, switches and sliders keep their text labels and follow the shared states.

### 5.1 Radio buttons

Pick exactly one from a small set, grouped in a group box with a title. Arrow keys move the choice. The whole group is one Tab stop. A choice that is not available is disabled and its label can say why ("A3 (not available)").

### 5.2 Check boxes

Pick any number. A parent box over a set of child boxes shows a mixed state when only some children are checked; checking it checks all.

### 5.3 Switches

A switch is its own control, not a restyled radio button or check box, and it takes effect at once. Use a switch for settings, and a toggle button (3.2) for tools such as Bold. It has two uses:

- **One-sided: on or off, the same job as one check box.** One label, at the left of the switch: "Visible (o)===" does what "[x] Visible" does. Off is hollow: a grey outline with a small grey thumb. On is filled with the accent colour, with a full thumb. Disabled off is a filled strong grey track, faded like every disabled control, so it never looks like an enabled off switch.
- **Two-sided: one of two options, the same job as two radio buttons.** A label on each side, and the thumb points at the chosen one: "Dark (o)=== Light" picks Dark, "Dark ===(o) Light" picks Light, like "(o) Dark ( ) Light". Neither side means "off", so the track keeps the accent colour on both sides, and the chosen label is shown at full contrast. Use it only when the two options are a natural pair (Dark/Light, Metric/Imperial); for three or more, or for options that need explaining, use radio buttons.
- **In a list of settings** the switch sits at the end of its row, and its label (with its info mark, if any) at the start, so the switches line up down the list: "Show the date (i) ······ (o)===". Markup: `label.switch.end`.
- **Keys:** a switch is one Tab stop. Space flips it. On a two-sided switch, Left (or Up) picks the left option and Right (or Down) the right one, without wrapping.
- **Mouse and touch:** clicking the switch or its label flips a one-sided switch. On a two-sided switch, clicking the track flips it and clicking a label picks that option. On touch, every label and the track have a 44 px hit area.
- **States:** disabled and read-only look as for every control (5.5).

### 5.4 Slider

A value in a range where the exact number matters less than its position. The current value shows next to it ("60%"). Arrow keys step it, Page Up and Page Down jump. A slider can have named stops shown under it (Draft, Low, Medium, High, Best). Use a number field (4.4) when the exact number matters.

- **Look:** a thin 4 px line in the Track colour with a 12 px Accent dot; on touch the dot is drawn 20 px and the slider has a 44 px hit area. The browser's own drawing is never used.
- **Focus:** the focus ring (2.4) goes round the dot.
- **Players** (a song's position, the volume) use the same slider; a position that is not known yet is disabled.
- **Markup:** `.slider-row` with the `input[type="range"]` and an `output` for the value.

### 5.5 States

- **Disabled:** faded, cannot be changed.
- **Read-only:** soft tint, no border; the value is visible but cannot be changed.
- **Error** on a radio or check group: the group border turns Danger and a red "!" sits next to the group title; its popup holds the message ("Choose how to ship the order.", "Tick the box to go on.").

## 6. Date, time and calendar

Dates are typed as YYYY-MM-DD (times as 24-hour HH:MM) or picked from the Ayni calendar and time popup, the same on every device; weeks start on Monday. The device's own date and time pickers are never used. The page always gets the value in that same form, whatever the language.

### 6.1 Date field

- A text field with the placeholder "YYYY-MM-DD" and a calendar button inside, at the end.
- The calendar opens with the button, or with Alt+Down or F4 while in the field (the same keys as the list picker). When it closes, focus returns to the field.
- A wrongly typed date shows the field error: "Use the form YYYY-MM-DD, like 2026-10-20."
- Read-only: tint, no border, and the calendar button is hidden. Disabled: faded, and the calendar button is disabled with the tooltip "Choose date: not available".
- **Year optional** (a birthday): MM-DD is accepted too, and the calendar's foot has a "No year" switch. A date without a year is shown as MM-DD and given to the page as --MM-DD.

### 6.2 Time field

- A text field with the placeholder "HH:MM" (24 hours) and a clock button inside, at the end.
- The button, or Alt+Down or F4 in the field, opens a popup with an hour spinner and a minute spinner, as in 6.3. Minutes step by 5. The time applies as soon as it changes; Esc or a click outside closes the popup, and the focus returns to the field.
- A wrongly typed time shows the field error: "Use the form HH:MM, like 09:30."
- A date field and a time field can sit side by side (a start and an end); each keeps its own popup.
- Read-only and disabled: as the date field.

### 6.3 Date and time field

- Typed as "YYYY-MM-DD HH:MM" (24 hours).
- The popup holds the calendar plus an hour spinner and a minute spinner. Minutes step by 5; steps carry over midnight (23:55 + 5 minutes moves to 00:00 of the next day).
- The day and the time apply as soon as they change. There is no Accept button. Esc or a click outside closes the popup.

### 6.4 Calendar

The calendar has no foot row: its one head reads "November ▾ 2026 ▾" on the left (look) and Today, previous, next on the right (act).

| Action | Mouse or touch | Keyboard |
| --- | --- | --- |
| Move by day / week | — | Left, Right / Up, Down |
| Previous / next month | Arrow buttons at the right of the head | Page Up / Page Down |
| Pick a day | Click or tap | Enter |
| Pick a month | Click the month name: a 12-month grid appears | — |
| Pick a year | Click the year: a 12-year grid appears | — |
| Back to the days | Picking a month or year, or clicking the same name again, returns to the days | Esc in the month or year grid |
| Today | Today button (in the head, before the arrows) jumps to today and picks it | — |
| Close | Click outside | Esc |

**Week numbers.** A calendar can start each row with its ISO week number (week 1 holds the year's first Thursday).

**View only.** A calendar that shows dates and picks nothing (a month opened from a clock): days take no press and no focus; the arrows, Page Up and Page Down, the month and year grids and Today still move it. Today only goes to today's month.

**Limits.** A calendar can have a minimum and maximum date. Days, months, years and arrows outside the range look disabled and cannot be picked (for example "only the next 60 days").

**On touch** each day has a 44 px cell. Below 360 px wide the days are drawn 6 px smaller inside that cell so the calendar fits a 320 px screen.

### 6.5 For developers

| Need | Markup or code |
| --- | --- |
| Date field | `.input-group.date-field` with an `input.input` and its calendar `.btn`; `Ayni.dateField(input, { popup, onChange, noYear })`; `noYear: true` allows a date without a year (`--MM-DD`) |
| Time field | `.input-group.time-field` with an `input.input` and its clock `.btn`; `Ayni.timeField(input, { popup, onChange })` gives `HH:MM` |
| Date and time | `Ayni.dateTimeField(input, { popup, value, onChange })` |
| Inline calendar | `Ayni.calendar(element, onPick)`; without `onPick` it is view only; `data-weeks` on the element shows the week numbers |
| The value | each call returns a controller whose `value` is `YYYY-MM-DD`, `--MM-DD` (no year), `HH:MM` or `''`, and whose `set(value)` puts one in; `onChange` gets the same, on a pick and when a typed value is taken (the field is left, or `Ayni.focusFirstError` checks it); the date helpers are in `Ayni.dates` |
| What the page writes | only the `.input-group` and its `input.input`: Ayni makes the button, the popup (right after the field, so it lives in the field's dialog), the error message and the placeholder, in the page's language, when the page leaves them out |

## 7. List picker: drop-down list, filtered list and combo box

One Ayni list picker serves every drop-down list, filtered list and combo box, on every device; the browser's native select, datalist and scrolling wheels are never used.

### 7.1 Three modes

|  | Drop-down list | Filtered list | Combo box |
| --- | --- | --- | --- |
| Use for | One choice from a short, fixed set (Priority, Paper size) | One choice from a long set (time zone, currency, language) | A value that can be typed or picked (City, Font size) |
| Typing | Off. A letter jumps to the first match, even while the list is closed | On. The list shows only the items that match, by the search rule (4.5) | On. The list shows only the suggestions that match, by the search rule (4.5) |
| Free text | Not possible | Not possible: text that names no item gets the error "!" (4.7), and the value stays as it was | Kept when nothing matches |
| Enter | Picks the highlighted item | Picks the highlighted item (the first match while typing) | Picks the highlighted suggestion, or keeps what was typed |

A list of more than about 15 items is a filtered list, not a drop-down list.

A list whose pick runs an action at once (open one of the recent files) is not a list picker: it is a button with a menu (9). A list picker only holds a value.

### 7.2 Behaviour

- **Look:** a field with an Accent triangle at its end, marking the list. It shows the chosen item's text; the page gets the item's value, which can differ (a language code behind its name).
- **Name:** a picker is named by its label. In a toolbar or a menu row, where there is no label, by its tooltip or the row's text.
- **Opening:** click or tap the field, or press Alt+Down or F4 (in a filtered list and a combo box, Down also opens the full list). Up and Down on a closed drop-down list open it; they never change the value unseen.
- **Where the list opens:** in a popup Panel below the field, or above it when there is no room below. On phones (touch, below 600 px) it opens as a sheet at the bottom of the screen, kept above the on-screen keyboard.
- **Inside the list:** arrows move, Enter picks, Esc closes; type-ahead as in lists (8.3). Rows are 44 px high on touch.
- **Headings:** a long list can be split under headings (Frequent, All currencies). A heading is not an item: it cannot be picked, and arrows and type-ahead skip it.
- **Short text:** an item can show a shorter text in the closed field than in the list (the field says "USD", the list says "USD · US dollar"), where the field has little room.
- **An item that cannot be picked now** (a style the document lacks) shows faded; the pointer and the keys pass over it.
- **Nothing chosen:** the field shows a dim placeholder ("Pick a folder"), or nothing at all where nothing fits (a selection of text in several fonts).
- **A value the list does not hold:** the page can show one (a font the document uses but the list does not name); it is shown in the field, never added to the list.
- **Form value:** a hidden input carries the picked value, so forms submit it like a normal field.
- **States:** disabled is faded; read-only shows the value on a tint without border and hides the triangle.

### 7.3 In a toolbar and in a menu

- **In a toolbar** (a font and its size): the picker takes the toolbar's 30 px height and sits on the toolbar without a fill, with a thin line round it so it shows where it ends; under the pointer it gets the same grey tint as the toolbar's buttons. Its tooltip names it.
- A picker in a toolbar never keeps the focus: after a pick, Enter or Esc, the focus goes back to where it was before (the document and its caret stay as they were), as the toolbar's buttons never take it. Opened with the pointer, the list does not take the focus away from the document.
- When the toolbar does not fit (9.9), a picker that leaves goes into More as a submenu of its items, with the chosen one ticked. Typing a free value (a combo box) is only possible while it is on the toolbar.
- **In a menu row** (a setting at the end of a row of the More menu), the list opens over the menu, and a pick does not close the menu.

### 7.4 For developers

| Need | Markup or code |
| --- | --- |
| A picker in the page | `.picker` with `data-picker="list"`, `"filter"` or `"combo"`: a hidden `input`, a `div.input[role="combobox"]` (an `input.input` for typing modes) and a `.panel.popup.picker-pop[popover]` holding `ul[role="listbox"]` with `li[role="option"]` (`data-value` when the value is not the text, `data-short` for the short text, `li.heading` for a heading) |
| A picker built in code | `Ayni.picker(element, { mode, options, value, placeholder, onChange })` on an empty `.picker`, or on one written in the page; `options` is a list of `{ value, text, short, disabled }`, `{ heading }`, or plain strings |
| The controller | `value`, `text`, `options` (setting it replaces the items at any time), `set(value, text)` (a `text` shows a value the list does not hold), `choose(value)` (as a user pick: the event fires; for a menu that mirrors the picker), `disabled`, `isOpen`, `open()`, `close()` |
| What was picked | `ayni:change { value, text, name, field, input }` on the `.picker`, and `onChange(value, text)`; never fired by `set()` |
| Its name | `label[for]` on the field, or on the `.picker` (Ayni points it at the field it makes), or `aria-label` / `data-tip` on the `.picker` |
| Saved as it changes | `Ayni.autoSave(picker, save)`: each pick saves; a failed save puts the old value back |
| In a toolbar | any `.picker` inside `[role="toolbar"]`; `data-rank` as for any tool (9.9) |
| In a menu row | `.menu-field` inside the `.panel.menu`: the `label`, then the `.picker` |
| A filtered list's error | Ayni makes the `.error` and the "!" (with `ayni-fields.js`); `Ayni.focusFirstError` checks the typed text too |

## 8. Lists

There are two kinds of list:

- **Item lists** are what a view shows: files, mails, bookmarks, photos. You pick some items and act on them, the way a file manager works. A view has one main list.
- **Pick lists** sit in a dialog or a form and only ask for a choice: one country, or the people to share with. These are list boxes.

### 8.1 Label

A visible label above a list is optional. If present it names the list and clicking it moves focus to the list. If absent, the list still has a hidden name for assistive technology, and an error "!" goes inside the list's top-right corner (8.9).

### 8.2 Single selection

Arrow keys, Home and End move the selection. The selected item has the soft Accent tint (8.9).

### 8.3 Type-ahead

- Letters typed within 500 ms build one search: "me" reaches México.
- Accents and case are ignored, folded as in the search field (4.5).
- Repeating one letter cycles through the items that start with it.
- It works in pick lists, the list picker, trees, and item lists whose actions do not use plain letters. In an item list where a letter runs an action (S stars, R replies), the letters run the actions and there is no type-ahead.

### 8.4 Picking in an item list

- **Mouse:** a click picks that item alone. Ctrl+click (⌘ on Mac) adds or removes one item. Shift+click picks a range from the last anchor, and Ctrl+Shift+click adds that range. A click on empty space clears the picks. A double-click or Enter opens the item; a middle click can open it in a new tab where that makes sense.
- **The tick:** a small square at the start of each item. With a mouse it shows on hover and on picked items, and a click on it adds or removes that item. On touch it shows only while picking. In a grid of cards it sits in the card's corner and, outside a desktop window, always shows, with a mouse or on touch.
- **Keyboard:** the arrows move and pick the item they reach; Shift+arrows extend the range; Ctrl+arrows move the focus only, and Space then adds or removes the focused item. Home, End, Page Up and Page Down jump. Ctrl+A (⌘A) picks every item shown. Esc clears the picks. In a grid, the arrows move by place on the screen. Shift+F10 or the Menu key opens the pop-up menu.
- The keys of a view's main list work while the focus is on the title row's buttons too (after pressing Delete in the toolbar, the Delete key still works). They do not work while a text field, a menu or a dialog has the focus.
- **Touch:** a tap opens an item. A long tap starts picking: the squares show on every item, that item is picked, and each tap then adds or removes one. Esc or the × of the count stops.
- A button inside an item (a star, a play button, a tag) does its own job; it never picks the item.
- When the list is drawn again (new data, a search), the picks that are still there stay picked. When a search closes, the first picked item is scrolled into view.

### 8.5 Picked items in the title row

While items are picked, the title row shows their group first (9.8):

- The **count** with its × (clears the picks; Esc too). A press on the number scrolls to the next picked item, which flashes once.
- **Select all**, which becomes **Unselect all** while every item shown is picked.
- **Every action** of the items' pop-up menu as a round button, in the menu's order, with a gap between the menu's groups. An action that cannot run on these items is disabled and its tooltip says why; an action only for some kinds of item (Extract, for a .zip) hides instead.
- What does not fit goes into More by rank (9.9). The pop-up menu, these buttons and the keys come from one list of actions, so they always agree.

### 8.6 Pick lists

- A pick list is a list box. With several choices allowed, a small square at the left of each item is always shown, and a click or Space adds or removes the item: each item is a choice of its own. Single-choice lists never show the square.
- Shift+click or Shift+arrows choose a range, and Ctrl+A (⌘A) chooses all. Page Up and Page Down jump one visible page.
- A choice that covers everything ("Everybody") is a switch above the list, and the list greys out while it is on.
- A few independent options in a form (the kinds of place to show on a map) are check boxes (5.2), not a list.

### 8.7 Pop-up menu on items

Right-click, Shift+F10 or the Menu key opens the item's pop-up menu (chapter 9). Right-click on an item that is not picked picks only that one first; on the empty area it offers the area's actions (New, Paste, Select all). On touch a long tap starts picking instead (8.4); the actions are in the title row (8.5).

### 8.8 Drag and drop

- **Mouse and pen only.** Drag an item, or all the picked items when the dragged one is picked. Drop it on a folder (the row is outlined in Accent) or between two rows where the list keeps an order (an Accent line with a dot). The list scrolls by itself near its edges, and Esc cancels.
- Items can be dropped from a list onto a folder of the tree beside it, and files from the computer drop the same way.
- A place that refuses the items shows no marker; dropping there says why ("A folder cannot go inside itself").
- **On touch** a list has no dragging: the scroll stays sure, and Move to… (16.10) does the job.

### 8.9 States

| State | Look |
| --- | --- |
| Picked or selected item | Soft Accent tint. Full Accent marks only where you are (the open folder in a tree) and the chosen item of a list picker |
| Disabled list or item | Faded, ignores the pointer |
| Read-only | Soft tint, no border; choices visible, not changeable |
| Loading | A spinner row: "Loading…" |
| Empty | A short centred line: "No files" |
| Error | Danger border and a red "!" next to the list's label (inside the top-right corner when the list has no label); its popup says "Pick at least one file to attach." |

Rows are 44 px tall on touch. The tree view follows the same states (chapter 16).

### 8.10 For developers

| Need | Markup or code |
| --- | --- |
| A pick list | `ul.lb[role="listbox"]` with `[role="option"]` items; `aria-multiselectable="true"` for several; listen for `ayni:change` |
| An item list | `Ayni.list(element, { row, idOf, bar, actions, area, open, preview, clickOpens, openMiddle, pickable, count, grid, drag, tree, main, onSelect })`, returns `{ ids, has, set, clear, selectAll, toggle, refresh, redraw, focus, menu, picking, setActions, run, key, items }` |
| One action | `{ id, label, icon, key, rank, group, danger, noBar, hideOff, where, when, why, run }`: `label` may be a function of the ids (Star / Unstar); `where()` false hides it in this view; `when(ids)` false disables it, `why(ids)` says why; `noBar` keeps it out of the title row; `hideOff` hides it instead of disabling it; `run(ids, event)` does it |
| The picked group | an empty `.tb-group` in the title row, passed as `bar`; Ayni fills it and fits the row (9.9) |
| Picked state | `aria-selected` on each row; the list has `.picking` while touch picking is on |
| Dropping on rows | `Ayni.dropZone(host, { sel, target, can, drop })`: `can(ids, id, row, event)` gives `'inside'`, `'before'`, `'after'`, `false`, or `{ zone, ok: false }` for a place that refuses (the drop still comes, so the page can say why) |

## 9. Menus, popups and toolbars

Menus and popups are Panels that open next to what opened them, in the top layer: above everything, a dialog too. Under a button they hang below it (above it when there is no room), lined up with the button's left edge, or with its right edge when the button sits in the right half of the screen; beside a side taskbar they open next to it (17.1); a pop-up menu opens at the pointer. Only one is open at a time (a submenu stays with its menu). They close with Esc, a press outside, a pick, Tab (menus), when the page scrolls or resizes (9.6), and when the window loses the focus (another window or frame was clicked).

**The page keeps its focus.** Opening a menu or popup with the mouse or a finger, or pressing inside one, never takes the focus off the page: an editor's caret and a sheet's selected cells stay where they were, so the command acts on them. Fields inside a popup take the focus as usual. Opened from the keyboard, the first item takes the focus, and closing gives it back to the button.

### 9.1 Menu bar and pull-down menus

- Menu bar items keep their text (File, Edit, View).
- F10 focuses the bar. Left and Right move between menus, Down opens one. While one menu is open, moving the pointer along the bar switches to the next.
- An app may offer the menu bar as an alternative to its toolbar, the user's choice; every menu item then runs the same action as its toolbar button, never a copy of it.

### 9.2 Menu items

- One row per item: the icon slot, the text, and the keyboard shortcut at the right (Ctrl+S; ⌘S on Mac). The icon slot is always there, empty when the item has no icon, so all the texts line up. Shortcuts are hidden on touch.
- Kinds: plain actions, check items (Toolbar, Status bar), radio items (one of a set: a view, a sort order) and submenu items (9.3). Check and radio items show their tick in a column of its own before the icon; the icon stays.
- A **danger** item (Delete) shows its text and icon in the Danger colour.
- **Separators** group related items. A **caption** (small, dim text) may head a group ("Sort by").
- A **disabled** item is faded and the arrow keys skip it; its tooltip says why ("Paste: nothing copied").
- Under the pointer a row takes a grey tint, as buttons do; Accent is kept for active, selected and default. The row the keyboard is on also shows the Accent focus ring.
- Rows are compact with a mouse and at least 44 px high on touch.
- Up and Down move (wrapping round), Home and End jump, Enter or Space picks.

### 9.3 Submenus

- A submenu item shows a small arrow (›) at its right, and opens a second menu next to it: at its right, or at its left when there is no room. On a screen too narrow for either (a phone) it opens just below its item, so the item stays in sight.
- It opens when the pointer rests on the item, on a click or tap, or with Right. Left or Esc closes it and the focus goes back to its item.
- **One level only.** A submenu never holds another submenu.
- Use one for a long set of choices that belong to one item: font, size, colour, zoom, recent files. Actions used often stay in the main menu.

### 9.4 Pop-up menu

- Opens the actions for what is under the pointer or focus: right-click, Shift+F10 or the Menu key. It works on areas, list items and tree items. The menu acts on the item it was opened on: that item joins the selection, or becomes it.
- **On touch**, a long tap on an area or a tree item opens its pop-up menu (the ring fills while holding, and the menu opens when the finger lifts). On a list item a long tap starts picking instead (8.4): the actions for the picked items are in the title row (8.5).

### 9.5 Popups with controls

- A popup can hold any control: text fields, search fields, radio buttons, switches, sliders, check boxes, lists. Changes apply as they are made (no Accept button). When the content is taller or wider than the popup, it scrolls. Esc or a click outside closes it. Headings split a long popup into groups, and a popup of settings may grow to the height of the screen.
- **Tool group:** one toolbar button stands for a run of related tools (the six alignments, the borders) and opens a popup holding them. They are the real tools, with their own tooltips and states; pressing one runs it and closes the popup. While a toggle inside is on (Wrap text), the group button shows as on too, so the state can be seen with the popup shut.

### 9.6 Closing on scroll and resize

Open menus and popups close when the page, or any container outside them, scrolls, or when the window resizes. Scrolling inside the popup does not close it. Dialogs and bottom sheets are not affected. On touch, a resize that only changes the height (the on-screen keyboard appearing while typing) is ignored.

### 9.7 Toolbar

- A row of round tool buttons (30 px; 36 px in a title row), each with a 44 px hit area on touch.
- Tools come in **groups**. A thin line is drawn between two groups that show; a group with nothing showing takes no room and no line. Nobody places a separator by hand.
- The whole toolbar is one Tab stop; Left and Right move between tools, Home and End jump. A field inside it (a search field) is a Tab stop of its own.
- Tools can be push buttons, toggle buttons (Bold, Italic), a button that opens a menu or popup (with its triangle; the More button has none), a field, or a list picker (a font and its size, 7.3).
- A disabled tool is faded but keeps its tooltip, which says why ("Underline: not available for headings").
- In a title row the toolbar sits plain on the row. A toolbar on its own (above a tree) is a tinted strip with a border.

### 9.8 The title row

The title row of a view or window shows what you look at on the left and what you do on the right:

- **Left:** Back (←, only in a sub-view), the app's icon, the title, the open file's name, the view switch (Day / Week / Month as toggles) and a pager. The view switch is toggle buttons with one pressed (`aria-pressed`), never tabs: a tab needs its page right below it, so tabs do not sit in a title row.
- **Right**, in groups, in this order: the actions for the picked items (8.5), Search (folded, 4.5), New (+), the app's tools, then the system group: More (⋮), Settings, Help (?).
- A view opened by a toggle in the title row (a bin) is left with that same toggle, not with Back.

### 9.9 A toolbar that does not fit

- Every tool has a **rank**: 1 is the last to leave. While the title row does not fit on one line, the tool with the highest rank leaves first (of two equal ranks, the later one). The order never changes; the rest close up.
- The tools that left are listed in the **More** (⋮) menu, at the start of the system group, in toolbar order, with a line between groups, and below them the app's own menu items. With nothing to list, there is no More button.
- Search never leaves while nothing is picked. While items are picked, their actions get the room.
- An open search needs at least 180 px: while it has less, tools leave into More by rank as above, and they come back when it folds. Nothing ever just vanishes.
- A list picker that leaves is a submenu of its items in More, the chosen one ticked (7.3).
- A tool run from More comes back to the row while it is in use (its menu or field is open), and leaves again on the next press elsewhere.
- They come back as the row widens. Desktop windows work the same way (17.3).

### 9.10 For developers

| Need | Markup or code |
| --- | --- |
| A menu | `.panel.menu[popover][role="menu"]` with `button[role="menuitem"]` items: `.icon`, the text, `<kbd>Ctrl+S</kbd>` |
| Open it from a button | `popovertarget="id"` on the button (Ayni adds `aria-haspopup` and the triangle) |
| Item kinds | `role="menuitemcheckbox"` or `role="menuitemradio"` with `aria-checked`; `.danger`; `[role="separator"]`; `.caption` |
| Disabled item | `aria-disabled="true"` and `data-tip` saying why |
| Submenu | an item with `aria-haspopup="menu"` and `data-submenu="id"` naming another `.panel.menu` |
| What was picked | `ayni:action { item, menu, act }` on the menu; `ayni:choose` for a radio item |
| A page menu filled as it opens | `Ayni.fillMenu(menu, items)` in the menu's `beforetoggle` (rows as for `Ayni.menuAt`; a menu bar's menus) |
| A menu built in code | `Ayni.menuAt(items, { anchor, x, y, keyboard, onClose })`: under `anchor`, or at `x`, `y`; `keyboard: true` focuses the first item. Items: `{ id, label, icon, key, danger, disabled, why, checked, sub, run }`, `{ sep: true }`, `{ caption }`; `sub` is a list of items, or a function that returns one when it opens. Returns `{ close() }` |
| Pop-up menu on an area | `Ayni.contextMenu(area, { menu, target, keyTarget, onDrag })` |
| Long tap that picks | `Ayni.longTap(area, selector, (item, x, y) => …)`: the same ring and timing; the click its release leaves is swallowed |
| Shortcut text | `Ayni.keyLabel('Ctrl+C')`: "Ctrl+C", or "⌘C" on Mac |
| Shortcut on a button's tooltip | `Ayni.keyHints([{ el: 'printBtn', label: () => Ayni.keyLabel('Ctrl+P') }], phone)`: adds " (Ctrl+P)", or takes it off on a phone; safe to run again after a tooltip is rewritten |
| A menu bar from a list | `Ayni.menuBar(bar, { menus })`: `menus` is `[{ key or label, items }]`, `items` the rows of `Ayni.menuAt`, read each time a menu opens; returns `{ build, openAt, close, isOpen }` |
| A popup | `.panel.popup.controls[popover]`, opened with `popovertarget`; `h4` heads a group; `.tall` lets it grow to the height of the screen; `Ayni.showPopup(popup, button)` opens one from code, as its button would |
| Tool group | `.panel.popup.tools[popover]` holding the real `.btn` tools; `data-lit-by="id id"` on the group button names the toggles that light it |
| Toolbar | `[role="toolbar"]` (one Tab stop, wired by Ayni) with `.tb-group` children; the lines between groups are Ayni's |
| Title row toolbar that fits | `data-rank="n"` on each tool or group (the Search button of a folded search: `data-search`, so it stays while nothing is picked); `Ayni.fitBar(row, { more: () => items, btn })` adds the app's own More items and can use the app's own More button |
| Keep a popup open on scroll | listen for `ayni:dismiss` on it and call `preventDefault()` |

## 10. Dialogs

A dialog applies its changes as they are made or when it closes, closes with Esc, and has Accept or Cancel only when there is no other way.

### 10.1 Rules

1. **Esc always closes a dialog**, as if its Close button were pressed. Closing is not cancelling: changes are kept.
2. **Only the dialog's own buttons and Esc close it.** A click on the dimmed page around it does nothing: one stray tap must not lose what was typed.
3. **Avoid Accept and Cancel wherever possible.** Apply each change as it is made, or when the dialog closes. Invalid input is not applied, and its field shows why (4.7). A change that could not be saved goes back to what it was, and a line at the bottom of the dialog says why.
4. **No Cancel means none is needed.** No Undo notification follows the closing of a dialog. If the user needs a way back, the dialog gets a Cancel button. The one exception is a delete pressed inside the dialog: it acts at once, with no second "Are you sure?", and its Undo shows after the dialog closes (11.2).
5. **The title row** holds the title, then any small tools (a switch, a step counter, icon buttons), then Close at the right when Close is the only button. A long title wraps; it never runs under the buttons.
6. **Otherwise all buttons go in a bottom row**, Close included: the usual ones (Close, Accept, Cancel, the main action) aligned right, any extra actions in the same row aligned left.
7. **Enter runs the default button** (3.5). In a confirmation the safe choice is the default; a danger button never is.
8. **The default button can be disabled until the input is valid:** it stays filled but faded, can be focused, and its tooltip says why ("Save: type a name first"). An empty name is never an answer.
9. **The caret starts in the first field.** When a dialog opens, its first field takes the focus, so the user can type at once; a text field opens with the caret after its text. A field in the title row is skipped unless it is the only one. A field that appears later (after loading) takes the focus when it appears. The focus never starts on a button: a stray Enter on Close would close the dialog. A dialog with no field takes the focus itself. A dialog that puts the focus somewhere else on purpose keeps it.
10. **Moving:** on a computer or tablet a floating dialog can be dragged by its title row (not by its buttons), and always stays inside the window. It opens centred every time. Full-screen dialogs and dialogs on phones (640 px wide or less) do not move.
11. Dialogs can open from other Panels and nest; Esc closes the innermost one only. Anything that pops up from a dialog (a menu, a list, a calendar, a tooltip) shows above it.
12. **A lock screen stays on top.** A dialog that opens while the screen is locked goes under the lock.

### 10.2 Kinds of dialog

| Kind | Example | Buttons |
| --- | --- | --- |
| Message | "Upload complete" | Close in the title row |
| Settings, applied at once | Gallery settings | Close in the title row; every change applies at once |
| Applied on close | Rename file | Close in the title row; the new name applies when the dialog closes (Close or Esc); an invalid name is not applied |
| Question | "Name of the new album" | One field. Bottom row: Cancel (Close icon, also Esc) and Accept (default, faded while the field is empty) |
| Confirmation | "Delete contract.pdf?" | Bottom row: Cancel (Close icon, also Esc) and the action (Accept, or Delete as danger). A danger action is never the default: the focus starts on Cancel. A third choice ("Don't save") may sit between them. Used only when a change cannot be applied live |
| Modeless | Find in files (a desktop window) | Close in the title row. Stays open while the user keeps working, no backdrop. Finding inside a document is the find bar (4.6), not a dialog |

Modal dialogs dim the page behind them with the backdrop colour. In desktop mode a modeless dialog belongs to the window that opened it (17.3).

### 10.3 Dialog size and screen width

Dialogs are **small** (a message, a confirmation, a few fields) or **big** (a long form, a list, an editor). A small dialog is as wide as its content needs, between 300 and 460 px. A big one is 880 × 640 px. Neither is ever wider or taller than the screen: a dialog taller than the screen scrolls inside.

| Screen width | Small dialog | Big dialog |
| --- | --- | --- |
| Below 1024 px | Floating, with shadow | Full screen |
| 1024 px and wider | Floating, with shadow | Floating, with shadow |

A small dialog stays a centred card on every screen; on a phone it takes the full width less a margin. On a phone (640 px wide or less, or 520 px high or less) its bottom row sticks to the bottom edge while the dialog scrolls, so its buttons are always in reach.

A floating dialog shows its title row and bottom row plain on the dialog's colour. A full-screen dialog keeps both, as tinted strips with a line, and has no border, corners or shadow.

### 10.4 For developers

| Need | Markup or code |
| --- | --- |
| A dialog | `dialog.panel` (small) or `dialog.panel.big`, with `header` (`h2`, tools, Close), `.body` and `footer` (`.extra` holds the left-hand buttons) |
| Open it | any element with `data-open-dialog="id"`, or `dialog.showModal()` |
| Its Close button | `.btn[data-close]` with the close icon, written in the header (the only button) or the footer; a click on it closes the dialog after the page's own handler, unless that handler calls `preventDefault()`; Esc presses it |
| Close it from code | `dialog.close()`; the dialog fires `close` however it closed |
| Built in code | `Ayni.dialog({ title, big })` returns `{ dialog, body, footer, show(), close() }` |
| A button made in code | `Ayni.dialogButton(role, tip, icon)`; role `close`, `primary`, `danger` or `''` |
| Confirmation | `await Ayni.confirm({ title, body, confirm, danger, other, cancel })`: `true`, `false`, or `'other'` for the third choice |
| Message | `await Ayni.alert({ title, body })`; `body` keeps its line breaks |
| Choose a folder | `await Ayni.pickFolder({ title, note, root, rootName, load, create, rename, remove, failed, noFolders, onOpen })`: the id, or `null`; the app owns the data (16.10), Ayni the dialog; `onOpen(ctl)` gives `{ task(promise), rekey(from, to), isOpen() }` for an Undo that comes later |
| Choose a file | `await Ayni.pickFile({ title, dir, rootName, list, sizeText, okTip })`: the node, or `null`; `list(dir)` gives `[{ id, name, dir, size }]` |
| Password | `await Ayni.ask({ password: true, title, lead, label, verify, min, okTip, noTip })`: the password as typed, or `null`; `verify` asks twice for a new one, at least `min` (8) characters; the eye needs the fields family; nothing is kept |
| Question | `await Ayni.ask({ title, label, placeholder, value, hint, max, check })`: the trimmed text, or `null` when cancelled; `check(text)` returns the answer, or `false` to keep the dialog open |
| A field saved as it changes | `Ayni.autoSave(field, save, { wait, msg, done })`: `field` is a field, a switch or a list picker (`.picker`); `save(value)` returns a promise; typing waits `wait` ms (700); a failed save puts the old value back and shows `msg` |
| Focus somewhere else on open | focus it yourself when opening; Ayni then leaves the focus alone |
| A lock screen | `dialog.lock` (a Panel or a full-screen dialog of its own): stays above every other dialog and notification; Esc never closes a dialog under it |

Ayni sizes, focuses and moves every `dialog.panel`, whether it was opened by markup or by code; there is nothing to add per dialog.

## 11. Feedback: tooltips, notifications, progress and status bar

Feedback never hides the only copy of important information and never disappears before the user can act on it.

### 11.1 Tooltips

- Appear after half a second of hover, or at once on keyboard focus. Esc hides them.
- Every button has one. It names the action, and may add the shortcut in brackets ("Print (Ctrl+P)") or a short explanation ("Share: sends a copy to everyone in the list"). The middle dot "·" is kept for the second action (3.4).
- They are Ayni's own (`data-tip`), not the browser's `title`: they show at once on keyboard focus, look the same everywhere and also show on a disabled button.
- A disabled control's tooltip says why it is off. A second-action button's tooltip names both actions (3.4).
- Tooltips never hold the only copy of important text.
- On touch there are no tooltips: the Help card replaces them (chapter 15).

### 11.2 Notifications (toasts)

| Rule | Value |
| --- | --- |
| Position | Bottom right. On phones (below 600 px) bottom centre, full width less the 16 px gutters, lifted above a bar along the bottom of the screen (a player, a message box) |
| Kinds | Information, success, warning, error, each with its status icon |
| Time on screen | 6 s, paused while the pointer is on the notification or the focus is inside it |
| Errors | Stay until the user closes them |
| Close | Every notification has a round close button |
| Several at once | They stack, the newest nearest the corner, at most 3. A fourth one makes the oldest leave; errors and the Undo are the last to go |
| Text | Left-aligned beside the icon; one short sentence, an error also says what to do |

**Which kind:**

| Kind | For | Example |
| --- | --- | --- |
| Success | An action the user asked for is done | "Moved to the bin." |
| Information | News the user did not cause | "The list was merged with the copy on the server." |
| Warning | Done, with a catch | "Saved on this device only. It goes up when you are back online." |
| Error | It failed | "Could not save notes.txt. Check your connection and try again." |

**Undo.** An action that can be taken back runs at once and shows a notification with an Undo button (the undo icon and the word "Undo"); there is no confirmation dialog.

- **One Undo at a time.** A new Undo makes the older one final: its notification leaves.
- **Final** means the Undo is gone for good: its 6 s are up, the user closed it, a new Undo replaced it, the page asked for it (an editor or a game on its next key or move, so the Undo cannot throw the new work away), or the page is closing. Then the action's last step runs, once (for example, a delete that only hid the item now really deletes it). A closing page still sends that step; the page can say it must not (a sent mail whose draft keeps it).
- **News never makes an Undo final.** Other notifications stack beside it.
- **Ctrl+Z** (⌘Z on Mac) runs the Undo while its notification is on screen, outside text fields and in pages that do not handle Ctrl+Z themselves. Once the notification is gone, Ctrl+Z does nothing here: the action is final. With a keyboard the notification shows the hint "Ctrl+Z also undoes"; on touch it does not.

A notification may have one other action instead of Undo ("Switch", "Retry"): a text button with its icon and word, like Undo.

A delete pressed inside a dialog acts at once and shows its Undo after the dialog closes. Closing a dialog in any other way (×, Esc, applied on close) brings no Undo (10.1).

### 11.3 Progress

A bar with a percentage when the amount is known ("Uploading photo.jpg 35%"); a spinner with a short text when it is not ("Loading…"). A button whose action is running shows the busy state (3.7).

A long job that is not tied to one button (uploads, downloads, work on many items) shows a **progress notification** in the same stack: its text, a bar below it and, when the job can be stopped, a Stop button (the close icon, tooltip "Stop"). With no end known the fill slides along the bar; when the system asks for less motion it stands still, striped. It appears only after the job has run 600 ms, so a quick one never flashes, has no time limit, and leaves when the job ends. It does not count towards the 3. A failure ends it with the usual error notification.

### 11.4 Status bar

A strip along the bottom of a Panel. It shows what stays true: the selection and its totals ("Sum 1,240", "Count 8") and where the user is ("Ln 12, Col 4", "UTF-8"). Cells are parted by thin lines, and the bar scrolls sideways when they do not fit. A tab row at the bottom of a document (12.1) sits at the start of the bar, on the same line.

The result of an action is a notification (11.2), because the eye is rarely on the bottom edge. A page may also keep its last action in the first cell ("Saved ana-morales.json"), but never as the only word about it.

### 11.5 Shared messages

Every control uses the same three messages: a spinner row while loading, a short centred line when there is nothing to show ("No messages"), and an error line in the Danger colour that says what to do ("Could not load the messages. Check the connection.").

### 11.6 For developers

| Need | Code |
| --- | --- |
| A notification | `Ayni.toast('ok', 'Moved to the bin.')`; kinds `info`, `ok`, `warn`, `err` (an `err` stays; `persist: true` keeps any kind) |
| With Undo | `Ayni.toast('ok', 'Deleted.', { undo: () => putBack(), final: () => reallyDelete() })`: `final` runs once when the Undo is final (11.2) |
| A closing page must not run `final` | add `keepOnLeave: true` |
| Make the Undo on screen final now | `Ayni.settleUndo()` (an editor or a game on its next key) |
| Another action | `{ action: { label: 'Switch', icon: 'apps', run } }` |
| Close it from code | `Ayni.toast()` returns `{ close() }` |
| Progress | `const job = Ayni.progress('Uploading photo.jpg', { pct: 0, onStop })`; `job.set(text, pct)` (`pct` null: no end known); `job.end()` |
| Lift above a bottom bar on phones | set `--toasts-lift` (for example `64px`) on the page |

The page needs no element for notifications: Ayni makes its own layer, above dialogs.

## 12. Tabs, group boxes and More fields

Tabs split one Panel into pages; group boxes put a border and a title around related controls; a More fields line folds away the rarely used half of a long form.

### 12.1 Tabs

- **When:** tabs change the page below them. A filter or a choice that leaves the page in place is a choice row (3.9); another look at the same content is the view switch (9.8).
- **Look:** folder-style tabs. Tabs are outlined; the selected one joins its page and has an Accent edge at its top.
- **Icon:** a tab may have one icon at its left, before its text.
- **Many tabs:** when they do not fit, the tab row scrolls sideways, and the selected tab always scrolls into view. The mouse wheel over the row scrolls it sideways. There is no overflow list button, and the row never wraps to a second line.
- **Long names:** a tab is 190 px wide at most. A longer name ends in an ellipsis, and the tooltip gives it in full.
- **In a dialog:** the tab row stays at the top of the dialog's body, under the title row; only the page below it scrolls.
- **At the bottom:** the sheets of a document may sit in a tab row under the page, at the start of the status bar (11.4). The row hangs from the page: the tabs are upside down, and the Accent edge of the selected one is at its bottom.
- **One view, many tabs:** a tab may have no panel of its own, when one view is drawn again for the selected tab (the sheets of a workbook).
- **Renaming and moving:** a page may let the user rename a tab in place with a double-click, and drag it along the row. A mouse drags at once; a finger holds still first, so a swipe still scrolls the row.
- **Keys:** Left and Right switch pages inside the tab row. Ctrl+Page Down and Ctrl+Page Up go to the next and previous tab (wrapping) from anywhere inside that Panel; with tabs inside tabs, the innermost tab set around the focus wins. Ctrl+Tab is left to the browser.
- **Closable tabs:** a small round close button (×) at the right of the tab, with a tooltip ("Close Details"). Delete (on the focused tab) or a middle click also closes it. The neighbour tab takes over. After any tab closes, even one that was not selected, focus goes to the selected tab.
- **Disabled tab:** faded, arrow keys skip it, tooltip says why ("Billing: needs an account").
- **On touch:** tabs are 44 px high, and the close button keeps its small look with a larger invisible hit area.

### 12.2 Group boxes

A border with a title (Shipping address, Delivery) around related controls. Radio and check groups always sit in one. A disabled group box fades everything inside at once. An error on the group colours its border Danger, with the red "!" next to its title (4.6).

### 12.3 More fields

A long form folds its rarely used half behind one line: a small pill with a chevron at the start of a thin rule ("More fields"). Pressed, the fields open below it, the chevron turns and the pill reads "Fewer fields". A form that holds something in the folded half opens unfolded, so nothing is hidden. It is not for one or two fields, which simply stay in the form.

### 12.4 Empty states, section labels and card rows

- **Empty state:** what a list shows with nothing to list: the app's glyph, faint, a bold line saying what is missing, a quieter line saying what to do, and at most one text button.
- **Section label:** a small uppercase heading over a group of fields or rows. It is the only place for uppercase. It is dimmer than a button, so it never reads as one.
- **Card row:** a row on its own card, for items that stand alone (an account, a trip). Hover firms up its border; a picked one takes the soft Accent tint (8.9).

### 12.5 For developers

| Need | Markup or call |
| --- | --- |
| Empty state | `.empty-state` with an icon, `p.empty-title` and a `p`; toggle it with `hidden` |
| Section label | `.section-label` |
| Card row | `.card-row` |
| Tabs in the page | `[role="tablist"]` with `[role="tab"]` and `[role="tabpanel"]`, linked by `aria-controls`; Ayni wires them when the page loads |
| Tabs from code | `Ayni.tabs(list, { items, value, onSelect, onClose, scope, hash })` returns `{ value, tabs, select(value), set(items, value), add(item, index), close(value), setTabEnabled(value, on, why) }`. An item is `{ value, label, icon, tip, panel, closable, disabled, why }` |
| No panel of its own | leave `panel` (or `aria-controls`) out; the page draws its one view in `onSelect` |
| Keys from a wider place | `scope`: the element whose Ctrl+Page Down and Ctrl+Page Up move the tabs (the panel around the row by default) |
| Tab row under the page | `.bottom` on the tablist; inside `.statusbar` it is the first child |
| From code, no event | `select()`, `set()` and `value = ` fire nothing; a user's pick fires `ayni:tabselect` and `onSelect(value, tab)` |
| Group box | `fieldset.group` with a `legend` |
| More fields | `button.more-toggle` with `aria-expanded` and `aria-controls` (Ayni writes its parts); `Ayni.moreFields(button, { more, less, onToggle })` returns `{ open, set(on) }`; a user's press fires `ayni:more` |

## 13. Splitter

A splitter is a bar between two panes, side by side or top and bottom, that the user drags to resize them; three small glyphs in its middle collapse either pane or reset both.

- **Look:** a 13 px bar, wide enough to hold its glyphs, in the title-row colour, soft Accent under the pointer and while dragged. Every bar looks the same.
- **Sizes:** a side pane is sized in pixels, so it keeps its width as the window grows and the other pane takes the rest. Two panes that share the room are sized in percent. Each pane has limits the bar stops at, and either pane can be the sized one.
- **Remembered:** the size and the collapsed pane are kept on this device, saved when the drag ends. Each bar in the page has its own.
- **Glyphs:** centred on the bar, three small solid glyphs with no circle, no background and no button styling. On a side-by-side bar, ◂ and ▸ are stacked with the dot between them; on a top/bottom bar, ▴ and ▾ sit in a row with the dot between. Glyph boxes are 10 px with a 4 px gap (about 6 px between the glyphs); triangles 7 × 9 px, dot 7 px.
- **Arrows** send the bar to that end, collapsing that pane ("Collapse left pane"). An arrow is disabled when its pane is already collapsed. The bar stays, with its glyphs, to bring the pane back.
- **Dot** resets both panes to their default sizes ("Reset sizes"). It is a solid dot here even though a dot on a button means second action: on the splitter it is not a button.
- **Rest of the bar** is dragged to resize.
- **Short bar:** when the bar is too short for three glyphs, only the dot shows.
- **No glyphs:** a view with its own button that shows or hides the pane has a bar without glyphs: one action, one control. The drag, the keys and the double-click stay.
- **Keyboard:** focus the bar; arrow keys move it (Left and Right side by side, Up and Down top and bottom), Home and End go to the limits, Enter collapses or restores the first pane.
- **Mouse:** double-click on the bar resets both panes.
- **Touch:** each glyph has its own 44 px along the bar, so a finger cannot land on the wrong one, and the invisible hit areas reach 44 px across it. The bar is still dragged above and below the glyphs; a bar too short for that (under 220 px) shows only the dot. A double tap on the bar also resets.
- **Tooltips:** the bar says "Drag to resize"; each glyph names what it does.
- **Phones:** one pane at a time and no bar. The other pane is a view of its own or a sheet (16.9).
- **Embedded pages:** while the bar is dragged, frames in the page ignore the pointer, so the drag never gets lost over them.

### 13.1 For developers

| Need | Markup or call |
| --- | --- |
| Panes the bar owns | `.split` (`.split.rows` for top and bottom) with two `.pane` and a `.splitter` between them; `data-default` is the first pane's size in percent. Ayni wires it when the page loads |
| A bar in the page's own layout | `Ayni.splitter(bar, options)`: for a grid, or a pane that leaves for a sheet on a phone. `.split` is built on it |
| What to size | `pane`, and `other` for the pane across the bar; `side: 'last'` when `pane` is after the bar (a drag right narrows it); `rows: true` for a top and bottom bar |
| Size | `unit: 'px'` (default) or `'%'`, `min`, `max`, `def`; `size` and `collapsed` to start from when nothing is saved. Without `def`, a reset gives `null`, and the page's CSS decides |
| Applying it | Ayni gives a collapsed pane `hidden` and lets the other fill the room. `set(size, collapsed)`, where `collapsed` is `'first'`, `'last'` or `null`, applies the size the page's way (a custom property, a grid); without it Ayni sets the pane's width or height |
| Remembering | `key`: a localStorage key, or a function that returns one. The size is stored as a plain number and the collapsed pane under `key + '.fold'`. Or `save(size, collapsed)` when the page keeps them itself |
| When there is nothing to drag | `off()` returns true (a phone layout) |
| Without glyphs | `glyphs: false` |
| After a user action | `onChange(size, collapsed)`, and `ayni:split` on the bar with `{ action, pane, message }` |
| The controller | `{ size, collapsed, collapse(pane), restore(), reset(), reload() }`; `reload()` reads the saved size again (the device turned and `key` changed) |

## 14. Labels and info label

Every control has a visible label, and any control can have a small "i" that opens short help.

### 14.1 Labels

- Every control has a visible label, above it for fields, at the right of the box for radio buttons and check boxes, at the left of a switch (a two-sided switch has one on each side). The label is linked to the control, and clicking it moves focus to the control.
- Exceptions: list boxes may go without a visible label (8.1); buttons have no visible label and use their tooltip instead, and so does a field in a toolbar (4.1).
- A required field shows a red mark after its label.
- Extra words about a control never go on a line under it: a short hint is the field's placeholder, a longer one is the info label (14.2).
- A static label shows a fixed value that is not a control ("Account 0042-1187").

### 14.2 Info label

- A small "i" icon in a circle, 16 px, in the link colour (`--link`), placed right after the label of any control (in a list of settings: text, then the "i", then the switch at the row's end). It turns Accent while its popup is open or under the pointer.
- It opens a small popup with one or two sentences of help ("Choose when the driver can come. Morning is 9:00 to 13:00, afternoon is 16:00 to 20:00."). The popup is not a dialog: no ×, no dimmed page, nothing blocked.
- **With a mouse** the popup opens on hover, so the texts can be read by sweeping the dots, and stays open while the pointer is on the "i" or on the popup. A click pins it: from then on it behaves as on touch.
- **On touch, and pinned:** a tap or Enter opens it; a second tap, a tap elsewhere, Esc, a scroll or a resize closes it. Esc closes only the popup, never the dialog under it.
- Line breaks in the text are kept, and a web address in it becomes a link that opens in a new tab.
- Inside a dialog the popup belongs to that dialog, so it can be read and its links pressed.
- On touch it keeps its small look with a 44 px invisible hit area. Its accessible name is "What is this?"; it has no tooltip (the popup is the tip).
- Use it for help that does not fit in a placeholder; anything longer belongs in a dialog.

### 14.3 Tags

A tag is a small read-only word on an item: a genre, a label, "Today". Pill shape, no hover, not a Tab stop. A tag that can be pressed is a text button (3.9). The markup is `span.tag`.

## 15. Help, guided tour and first-visit marks

Every view explains itself: a Help button opens a card that says what each button does, the card can start a guided tour that walks the screen button by button, and a brand-new user is shown, once, where the help is.

### 15.1 Help button

- A round button with the "?" icon, on every device, last in the system group of the title row (9.8). Its tooltip is "Help".
- It opens the view's Help card. In a document app it may open a Help menu instead (Statistics, Keyboard shortcuts, the card as "Toolbar buttons", the tour).
- The guided tour always ends on it, so the user knows where to find the help again.

### 15.2 Help card

- A small dialog (10.3) with the view's name as its title and the Close button (×) in the title row; Esc closes it. A long card scrolls under its title row.
- From the top: one or more short paragraphs on what the view is for; the **See the tour** text button (with a play icon), when the view has a tour; one row per button; an optional tip line at the end.
- **A row** shows a small copy of the round button (its icon, in its colour: primary, danger, ok, warn; the triangle of a popup button), the button's tooltip in bold, and a sentence that says what it does. The sentences are written by hand for each view, never built from the button's kind.
- Rows come in the order the page gives, grouped under section headings (a line, then a subtitle). A row whose button this layout does not have is left out. A row may explain a gesture or an idea with no single button behind it ("Hold a message to answer it"): it gives its own icon and name.
- A view with two screens (a list and one open item) has one card for each; the "?" opens the one on screen.
- **Never on its own.** The card opens only from the "?". The one exception is a home page, which may open it on every visit with a **Don't show again** button at the bottom until the user presses it. Something more important on a first visit (setting a password) holds the card back for that page load.

### 15.3 Guided tour

- Started only by the card's **See the tour** button or the Help menu's row; never on its own, not even on a first visit.
- **Spotlight:** the page is dimmed except the element being explained, which gets a ring. A bubble next to it (under it, else over it, else inside a big area such as a month grid) shows an optional icon and title, the text, a short note when needed, "3 of 12", **Back**, **Next** (**Done** on the last step) and ×. With nothing to point at, the bubble sits in the middle.
- **Nothing is skipped.** A button behind a menu, a folded search, a tab or the More menu (9.9) is reached the way a user would: the tour opens what hides it, lights it there (the note says "In the More menu"), and closes it again on leaving. A button that is not there yet (no items) gets a dashed ring on the area where it will appear, its icon in the bubble and the note "Not here yet: this is where it appears". Only a step that this layout lacks entirely is left out.
- **Tap steps:** for a thing the user must try (a row's tick), the lit element itself takes the tap and its action runs; the note says "Tap it to go on", and Next taps it for them.
- A step about the picked items' actions picks the first item, and lets it go after the last such step.
- Presses on the dimmed page do nothing and never reach the page behind. Right goes on, Left goes back, Esc or × ends the tour; the focus sits on Next.
- The tour stays on top of the menus and dialogs it opens.
- **Shared steps** have one text for every view: the search (Search button), More, the tick of a row, the picked group in the title row, and the Help button. A view lists only its own steps; the card's rows can be its steps as they are.

### 15.4 First-visit marks

- The first time anyone opens a page of the site (one flag for the whole site), a dimmed layer rings the two or three things a newcomer never finds alone (the way home, the Help button) and hangs a bubble with one sentence off each.
- Each bubble's × first counts down from 9; only then it works, and Esc is held for that time too, so the marks cannot be swatted away unread.
- They count as seen when the count ends, not when they open or close: whoever leaves earlier meets them again on the next page.
- Taps on the layer do nothing. Bubbles keep clear of each other and of the ringed things, joined to their target by a thin line when they had to move; they follow resizes and scrolling.
- They wait while a dialog holds the screen, and are not shown on a page that lacks their targets (that page does not use up the flag).

### 15.5 For developers

| Need | Markup or code |
| --- | --- |
| The Help button | `.btn[data-help-open]` with the `help` icon, in the system group of the title row |
| The card | `Ayni.help({ title, lead, rows, tip, tour })`: `lead` is a text or a list of paragraphs; calling it again replaces the card (a view with two screens) |
| A row | `{ sel, text }` (glyph and name come from the button `sel` finds); `name` and `icon` (or `svg`) for a row with no button, or to tell two look-alike buttons apart; `{ section: 'Title' }` starts a group; `tour: false` keeps a row out of the tour, `tour: { … }` makes it a step with its own fields |
| Open it from code | `Ayni.help.show()` |
| A Help menu on the "?" | `Ayni.help({ …, menu: true })`: the "?" opens the page's own menu (`popovertarget`); `Ayni.help.items()` gives its card ("Toolbar buttons") and tour rows, for `Ayni.fillMenu` or `Ayni.menuAt` |
| Home page card | `autoShow: true, key: 'flag-name'` adds Don't show again and opens it on each visit until pressed; `Ayni.help.hold()` holds it back for this page load |
| The tour | `tour: [steps]` in `Ayni.help` (a function that returns them, or `true` = the card's rows); `Ayni.tour(steps, card)` starts one from code (`'rows'` reads `card`, by default the view's) |
| A shared step of the page's own | `Ayni.tour.add(name, () => step)`; with `'first'` as a third argument it starts every tour (a way home) |
| A step | `'rows'` (the card's rows), a shared step (`'search'`, `'more'`, `'pick'`, `'picked'`, `'help'`), `{ use: 'pick', … }` (a shared step with some fields changed), or `{ sel, text, title, tap, open, ghost, icon, optional, picked, before, after }` |
| Step fields | `sel`: what to light (the first one on screen); `tap`: the user taps it; `open`: a button, or a chain of them, that shows `sel`; `ghost`: the area to ring while `sel` is missing, with `icon` in the bubble; `optional`: dropped when the layout lacks it; `picked`: needs a picked item; `before` / `after`: anything else the step sets up or puts back |
| A menu row standing for a hidden button | `data-menu="<the button's id>"` on the row: the tour lights the row |
| First-visit marks | `Ayni.coach([{ els: [elements], text }], { key, secs })`: `false` when already seen or the targets are missing; `{ force: true }` shows them again (a demo) |
| Info label | `button.info-tip[data-help]` (Ayni draws the icon and wires it); `Ayni.init(element)` for one added later |

## 16. Tree view

A tree shows items inside items, such as folders and files or the sections of a book. It is a list (chapter 8) with levels: it follows the same label, selection, type-ahead and state rules, and adds opening, closing and, when the page allows it, editing.

A tree is used in two ways:

- **To go somewhere** (a navigation tree): the folders in a side pane beside an item list. The tree shows where you are, and a click goes there.
- **To choose or edit** (a selection tree): the tree is the thing being worked on, as in an outline, or it asks for a choice.

### 16.1 What the page switches on

- `data-nav` makes a navigation tree (16.4).
- A tree only browses unless the page switches editing on, one feature at a time: moving, inserting, deleting, renaming and hiding (`data-edit="move insert delete rename hide"`). A tree that only allows renaming, for example, never offers to delete.
- A locked item (`data-lock`) cannot be moved, deleted or renamed, even in an editable tree. Its actions stay visible but disabled, and their tooltip says "Contracts is locked".
- A read-only tree allows no change at all.
- A page that keeps its data on a server can leave the tree's own editing off and give the tree the actions of its item list instead (16.7): its dialogs, its checks, its saving.

### 16.2 Root, folders and leaves

- **Root (optional).** A tree either has one top item that holds everything ("My files") or shows several items at the top level. The root opens and closes, but it is never moved, deleted or hidden; it can be renamed only where renaming is allowed and it is not locked. Without a root, new top-level items come from the pop-up menu of the tree's empty area, or from the toolbar.
- **Folders and leaves.** Any item can hold children (as in an outline). Items that never can, such as files, are leaves (`data-leaf`). Something dropped, pasted or inserted on a leaf goes right after it.
- A triangle before the name shows that an item has children; it points right when closed and down when open.
- **Extras on a row:** a count after the name (unread mails), one small button at the row's end (show or hide a folder), and a tooltip. A heading row ("Labels") only opens and closes; it is never a place to go.

### 16.3 Hidden items

- A hidden item (`data-hidden`) is not shown, the keyboard skips it, and its children are hidden with it.
- The tree can show hidden items: the page turns this on, or the user does with "Show hidden items" in the tree's pop-up menu. Hidden items then show muted and in italics, and they work as usual. This is different from disabled, which is faded and does nothing.
- Where hiding is allowed, the item's menu and the toolbar offer Hide, or Show for an item that is already hidden.

### 16.4 Selection, opening and keyboard

- **Navigation tree:** a click, Enter or Space goes to the item, and the tree marks it as where you are (full Accent). The arrows only move the focus, so walking down the tree never loads a folder at each key press.
- **Selection tree:** single selection by default: the selection follows the focus, as in a list. Multiple selection makes it a pick list with levels (8.6): a check square after the triangle, always shown; click or Space adds or removes, Shift+click and Shift+arrows choose a range, Ctrl+A (⌘A) chooses every shown item.
- Up and Down move; Home and End go to the first and last shown item; Page Up and Page Down jump one visible page. Right opens a folder, or enters an open one; Left closes it, or goes to the parent. Disabled and hidden items are skipped.
- A folder opens and closes with a click on its triangle (on touch, the area around it counts), or a double-click. In a selection tree Enter opens and closes it too. A click on a folder that is already selected does nothing more, so nothing opens by accident.
- A double-click or Enter on a leaf opens it: the tree tells the page (`ayni:open`).
- Type-ahead as in the lists (8.3). `*` opens every folder at the same level.
- Beside an item list, Tab and Left (from the list's first column) move between the tree and the list.

### 16.5 Moving items

- **Mouse and pen: drag and drop.** Drag an item, or all the selected items when the dragged one is selected. While dragging, an Accent **line between rows** shows that the items will go before or after a row (the upper and lower quarter of the row; half and half on a leaf), and a row **outlined in Accent** shows that they will go inside it (its middle half). Over an open folder, the lower part means "first inside it". Holding over a closed folder for 0.7 s opens it. Near the top or bottom edge the tree scrolls by itself. Items cannot be dropped inside themselves; no marker shows there, and dropping there says why. Esc cancels the drag. Dragging always moves; to copy, use Copy and Paste.
- Items dragged from the item list beside the tree drop on its folders with the same markers (8.8). Dragging between two trees is not supported.
- **Keyboard.** Ctrl+Shift+Up and Ctrl+Shift+Down (⌘⇧ on Mac) move the item one place among its siblings. Ctrl+Shift+Left moves it out, right after its parent; Ctrl+Shift+Right moves it into the folder just above it, as its last child. Alt+arrows are not used, because Alt+Left is "back" in browsers.
- **Cut, Copy and Paste.** Ctrl+X or Ctrl+C, then Ctrl+V: the items go inside the focused folder, at its end, or right after the focused leaf. Cut items look muted until they are pasted; Esc cancels the cut.
- **Touch.** In a tree that allows moving, hold an item: the ring fills as for any long tap. Lift the finger and the pop-up menu opens; move the finger once the ring is full and the item is dragged, with the same markers. Moving before the ring is full scrolls the tree as usual. The item's menu also has Move up, Move down, Cut and Paste, so every move is possible without dragging. A navigation tree has no dragging on touch: Move to… (16.10) does the job.

### 16.6 Insert, delete and rename

- **Insert:** New in the pop-up menu, Alt+N, or the toolbar. The new item goes inside the focused folder, at its end, and the folder opens; on a leaf it goes right after it. It starts in rename mode with its default name selected ("New folder"); Esc removes it again.
- **Delete:** the Delete key, the menu or the toolbar. It removes the item with all its children. There is no confirmation dialog: a notification with Undo stays 6 s (Ctrl+Z also undoes while it shows), as for every undoable action (11.2). The focus goes to the next item, or the previous one, or the parent.
- **Rename:** F2, the menu or the toolbar. The name becomes a text field in place, with the text selected. Enter or leaving the field saves; Esc cancels. An empty name, or a name a sibling already has when the tree asks for unique names (`data-unique`), shows the usual red "!" with its popup (4.7), and the field stays open. There is no "slow second click" to rename, so nothing is renamed by accident.
- A tree that uses its item list's actions (16.1) renames and creates through the page's own dialogs, with the same keys (F2, Alt+N, Delete).

### 16.7 Pop-up menu and toolbar

- An editable tree has its own pop-up menu with what it allows: New, Rename, Hide or Show; Cut, Copy, Paste; Move up, Move down; Show hidden items; Delete. Each item shows its shortcut. Items that cannot act on the chosen item are disabled. The menu acts on the item it was opened on: that item joins the selection, or becomes it. A page can give its own menu instead (`data-menu`).
- A tree beside an item list can share the list's actions (8.5): a folder's pop-up menu is the list's menu for that folder, and the list's keys (F2, Delete, Ctrl+C…) act on the focused folder. A row can have no menu (a heading, the root of a mail account).
- On touch, a long tap on a tree item opens its pop-up menu (it does not start picking).
- A page can put a small toolbar above the tree (optional) with round icon-only buttons and tooltips: New (the default button), Rename, Hide/Show and Delete (danger icon colour, never the default). A button that cannot act on the current item is disabled, and its tooltip says why ("Delete: the top item stays in place").

### 16.8 Loading on demand

A folder can load its children the first time it opens (`data-lazy`): a "Loading…" row with a spinner shows inside the folder until the page delivers them. If loading fails, the row says so, and closing and opening the folder tries again.

### 16.9 On phones

A tree in a side pane does not take room on a phone (below 640 px): a button in the title row slides it in from the left over a dimmed page. Going to a place closes it again, and so do Esc and a tap on the dimmed page. Its rows are 44 px tall.

### 16.10 Picking a place: Move to…

Move to…, Copy to… and Save in… open a dialog with the same tree in a box, opened down to where the items are now, with that place lit. A click lights a folder; a double-click, Enter or the dialog's default button picks it. Places that cannot take the items (a folder into itself) are faded and skipped. A short line under the title can say what will happen, and change with the lit folder. On touch this replaces dragging.

**Choosing a folder or a file.** Where an app needs a place or a file, not a move, the same tree opens as a dialog. Choosing a folder: the arrow opens and closes, a click lights a folder, a double click or Enter chooses it, and three buttons in the corner delete, rename and create folders, so nobody has to leave for that. While a name is typed the dialog is the name form, and × drops the name, not the dialog. Choosing a file goes one folder at a time, a crumb on top, folders first, each file with its size.

### 16.11 States and look

The tree uses the shared states (2.4 and 8.9): disabled items are faded and skipped, a read-only tree has the soft tint and allows no change, a loading tree shows the spinner row, an empty tree says so in the middle, and an error colours its border and puts the red "!" next to its label.

Inside a side pane the tree sits plain on the pane and fills it; in a form or a dialog it is boxed (border and Panel colour). Rows are 30 px tall with a mouse and 44 px on touch. A long name ends in "…" in a pane of fixed width.

### 16.12 For developers

- Every change the user makes is announced to the page before it happens (`ayni:move`, `ayni:insert`, `ayni:delete`, `ayni:rename`, `ayni:hide`), and the page can refuse it, for example when the server says no. The tree also tells the page about selection (`ayni:select`), opening a leaf (`ayni:open`), loading (`ayni:load`) and showing hidden items (`ayni:showhidden`).
- A tree can be written as markup or built from data (`Ayni.tree(element, { root, items })`), and it can give its current shape back as data, to save it. An item from data: `{ id, name, icon, leaf, hidden, lock, disabled, open, lazy, root, children, count, tail: { icon, tip, on }, heading, noMenu, noDrag, tip }`.
- A navigation tree drawn by the page from its own data: `Ayni.tree(element, { nav: true, items, current, go, isOpen, setOpen, menu, keys, drag, drop, tail, sheet })`. `current()` names where you are, `go(id)` goes there, `isOpen`/`setOpen` keep the open folders in the page, `menu(id, x, y)` opens a row's menu, `keys: true` lets the item list's keys act on the focused folder (the list names the tree with its own `tree` option), `drag(id)` gives the ids a row drags, `drop` is a `dropZone` setting (8.10), `sheet` is the side pane that slides in on phones. The page calls `build()` after its data changes.
- `Ayni.pickNode({ title, items, current, lit, disabled, okLabel, note, extra })` opens Move to… and resolves with the picked id, or `null`.

## 17. Desktop mode

Desktop mode gives Ayni a desktop like other operating systems: windows on a work area, and a taskbar. Two components make it: the **taskbar** and the **window**. The gallery's [desktop page](../gallery/desktop.html) shows them working.

**When it is on.** By default from 1024 px wide; below that there are no taskbar and no windows, and the app shows its normal screens. An app that needs another rule (a height too, a mouse, a tablet held upright, the user's own choice) sets it itself: the desktop then shows whatever the width, and leaving it is the app's job. A phone never gets a desktop.

### 17.1 Taskbar

- One bar, always visible, kept clean: only the launcher button at the start, the gadgets at the end, and the window chips filling everything between them. Gadgets are the clock and whatever else the app adds (weather, battery, countdowns...).
- **The user decides which edge of the screen it sits on: bottom, top, left or right.** Bottom is the default, and the choice is kept for next time. The choice is made from the taskbar's pop-up menu (right-click, long tap, Shift+F10 or the Menu key), or in the app's own settings when it has them; never in both, one control per job.
- **Size.** 48 px by default; an app may let the user pick from 36 to 72 px. On touch it is at least 56 px. On a side edge this size is its width.
- **On a side edge** the bar is a column: launcher on top, chips below it, gadgets at the foot, each gadget stacking its parts.
- Windows never cover it. A maximised window fills the space the taskbar leaves.
- When there are more chips than fit, the window selector scrolls, along the bar; its scrollbar shows only when needed, and never on a side bar, which has no room for one (the wheel or a finger moves it). Every chip can always be reached.
- **What opens from the bar opens off it**, on the desktop's side: above a bottom bar, below a top bar, beside a side bar. A popup taller than the room it has scrolls; it never covers the bar.

### 17.2 Applications launcher

- A button at the start of the taskbar: round and filled, the launcher being the taskbar's default button, or the app's own logo. Like every button that opens a popup, it shows the small triangle; a logo does not.
- It opens a popup with a search field at the top and the apps below it, as a list with icon and name. The most used apps come first.
- Typing filters the list, by the search rule (4.5). Down and Up move between the field and the apps, Enter in the field opens the first match, and typing a letter while on the list goes back to the field.
- Picking an app closes the popup and opens the app. Esc or a click outside closes it, like any popup.
- An app may use its own launcher instead (a page of tiles); it still opens from this button and off the bar.

### 17.3 Window

- A window is a Panel, with rounded corners. It has two parts: the **title row** and the **content**.
- The title row starts at the top left with the app's icon and the app's name, followed by the app's toolbar.
- **A window has no minimise, maximise or close buttons of its own.** They are in the window's chip in the taskbar, and show while that window is selected.
- **Window chips**: one chip per open window. Every chip shows only the app's icon (the name is in its tooltip), except the chip of the selected window, which also shows the name of what the window shows (the document, or else the app) and the window buttons: minimise, maximise (restore while maximised) and close. An app may add window buttons of its own. On a side bar no chip shows a name, there is no room: the selected chip stacks its buttons under the icon.
- **Chip states.** A chip is a rectangle with rounded corners (`--radius-s`). The selected chip is drawn on the card colour. A minimised window's icon is greyed. An app may put a small mark on a chip (unread messages, a question waiting).
- The content scrolls vertically and horizontally, with scrollbars only when needed, as every container does (2.7).
- **A toolbar that does not fit:** the app's icon and name never shrink. The tools leave by rank into the More (⋮) menu, as in every title row (9.9). They come back as the window widens.
- **Moving and resizing:** drag the title row (not its toolbar buttons) to move a window; drag any edge or corner to resize it, down to a minimum size. Double-click the title row to maximise or restore. Dragging to a screen edge does nothing special (windows that hold whole pages may offer it: 17.4). The title row always stays inside the work area.
- **Modeless dialogs** belong to the window that opened them: such a dialog floats above its window inside the work area, moves by its title row, has no chip of its own, hides while its window is minimised and closes when its window closes. Modal dialogs dim the whole screen, as everywhere (10.3 says when they fill it).
- Selecting a window (clicking it, its chip, or moving the focus into it) brings it to the front. The selected window's title row keeps the heading tint; the others take the content colour, and their app icon greys.

### 17.4 Windows that hold whole pages

An app made of separate pages shows each in a frame, one per window. **Ayni's code does not do this**: the window engine of such an app is the app's own, because it has to reach into its own pages and knows what they save. The app takes the taskbar, chips and gadgets from Ayni (17.5) and follows these rules.

- **Title row.** The page's own top row is the title row, when it holds the app's icon and name; the window adds one only when the page has none. A press on an empty spot of that row moves the window once it has moved 4 px, so a click on a file name still edits it. A double-click maximises.
- **Frames take the pointer away.** While a window moves or resizes, frames ignore the pointer. A press or the focus inside a frame selects its window, and closes what is open on the bar.
- **Closing may wait.** The window asks its page first; the page may ask the user, with the window in front, and may keep it open.
- **Modal dialogs** belong to the page, so they dim only their window. While that window is behind others, its chip shows a mark, so the question is not forgotten.
- **One document, one window.** A file already open is brought to the front, never opened in a second window that would save over the first.
- **Windows come back.** Open windows return after a reload with their pages, places and sizes. A new window of an app opens where that app's last one closed.
- **Touch.** The on-screen keyboard shortens the front window so the field stays in sight; only the look changes, never the saved size.
- **Switching.** Alt pressed and let go alone shows every window, the last used first. Keys typed in a frame never reach the page around it, so every frame is listened to.
- **Frames say they are windows.** Each one carries `data-ayni-window`, so the page inside knows it (2.10): its own row is the title row, and "go home" opens the launcher instead of leaving the desktop.

Three options an app may offer, per device, with any of them left out:

- **Sticky windows.** A window dropped on an edge of the work area takes that half; a dotted area shows it first. Dragged away, it gets its old size back.
- **Tile.** One switch for the whole desk: every window not minimised gets a place, none on top of another, none left over. Columns of equal width, and stacks of equal height inside them, the first windows in the bigger places. Windows opened or closed deal the desk out again. Switched off, every window goes back exactly as it was. On touch, a screen held upright tiles by itself.
- **Scale.** Per window: made smaller than it was at full size, the window shrinks like a picture of itself, instead of rearranging its content. Maximised, it is always at full size.

### 17.5 For developers

Markup: `.desktop[data-edge]` (`top`, `bottom`, `left` or `right`) holds `main.area` (the windows) and `nav.taskbar` (the launcher `.btn.primary[popovertarget]`, `.chips`, and `.widgets` with the clock and any other gadget). A window is `section.panel.window` with `header > .app` (icon and `h2`) and `header > [role="toolbar"]`, then `.body`. The launcher is `.panel.popup.launcher` with a `.search-field` and `.apps > button[data-app]`. The clock is `.widget.clock`; any gadget is a `.widget`, a button too. Ayni adds the chips and the edge menu itself; a window added later is wired with `Ayni.init(window)`.

The bar's size is `--bar-h` on `.desktop`.

Events: `ayni:edge { edge }`, `ayni:launch { app, item }`, `ayni:window { window, state }` (open, select, minimise, maximise, restore, close) and `ayni:close`, cancelable, before a window closes. From code: `Ayni.windows.select(w)`, `minimise`, `maximise`, `restore`, `close`, `title(w, text)` (names what the window shows), `chip(w)` (the chip, to add the app's own buttons to its `.chip-ctl`), and `Ayni.setTaskbarEdge(desktop, edge)`. The edge is kept in localStorage as `ayni-taskbar-edge`, the launch counts as `ayni-launch`.

By default `.desktop` hides below 1024 px and anything marked `.no-desktop` shows only there. `Ayni.isDesktop()` says whether desktop mode is on, and `ayni:desktopmode { on }` fires on `document` when the width crosses 1024 px. `data-mode="app"` on `.desktop` means the app has its own rule: nothing hides it.

**An app with its own window engine (17.4)** loads `ayni-desktop.css` and not `ayni-desktop.js`, and writes the bar itself:

```html
<div class="desktop" data-edge="bottom" data-mode="app">
  <main class="area"></main>
  <nav class="taskbar">
    <button class="btn">…</button>
    <div class="chips">
      <div class="chip" role="group" aria-label="Report.docx" aria-current="true">
        <button class="chip-main"><span class="icon" data-icon="file"></span><span>Report.docx</span></button>
        <span class="chip-ctl"><button class="btn" data-win="min" aria-label="Minimise" data-tip="Minimise">…</button>…</span>
      </div>
    </div>
    <div class="widgets"><button class="widget">…</button></div>
  </nav>
</div>
```

`aria-current="true"` marks the selected chip, `.min` a minimised one. `.chip-ctl` holds any number of `.btn`.

## 18. The app shell

`ayni-shell.css` and `ayni-shell.js`, optional, are the page around the controls, for an app that takes its whole window. Load the pair after `ayni-base`.

### 18.1 Two shells

Each app takes one, never both:

- **Tool** (`.app`): a full-height column. The title row on top, and the work area (a grid, an editor, a map) fills the rest and does its own scrolling.
- **Card** (`.page > .page-inner > .card`): one centred column that reads like a sheet of paper, 460 px at most. On a phone (480 px and under) it loses its border, corners and shadow and goes edge to edge. A `.card` on its own keeps its box at every width.

### 18.2 The title row

`.topbar` in a tool, `.header` in a card, and they look the same: same padding, gaps, icon size and divider. A card's stays in view while the list scrolls under it, and its height is in `--win-head-h` for the page's own sticky heads.

The order is the same in every app: **look on the left, act on the right.** Left: the back arrow of a sub-view, `.app-icon`, `<h1>`, what is open, the view switch (`.tb-modes`), a pager. Right, in `.topbar-actions` or `.header-actions`: the actions on the picked items, search, New, the app's tools, then More, settings and Help (9.7).

- The name is Accent, 1.1 rem, bold, and is never cut: it wraps first.
- On a phone the fixed app name is hidden and the icon stays, so the tools get the room; the icon then sits in an Accent circle, drawn in On-accent; screen readers still get the name. A title that says what is open stays. A window as narrow as a phone keeps its name.
- `.view-bar` is a row of toolbar groups of its own, under the title row.
- A thin line between two groups is drawn for you; never place one by hand.

### 18.3 Two layouts, one break

PC and tablet are the default. **Phones are 640 px and under**, in every app, and there is no second phone break. An app may add a pane break, the width at which a side pane no longer fits; that is not a phone.

On a phone the title row keeps the name; what does not fit leaves by rank for the More menu or wraps; side panes become a sheet; a dialog taller than the screen scrolls inside; every text field is at least 16 px, so the phone never zooms; nothing is wider than the screen.

### 18.4 A page inside a frame

`Ayni.frame` says what the page is (2.10). In a pane the host shows the name, so the page hides its own icon and name, and on a wide host the icon comes back as the label of the pane. A window keeps its icon and name: that row is the title bar, with an empty strip after the name to grab it by. In a pane or a window a card fills its frame.

### 18.5 The icon and name go home

Both are one button back to the app's home: only the pointer and a light hover show it, and nothing moves. A real control in the row keeps its own job. A pane's icon is only its label.

### 18.6 Export to PDF

No library: the page writes a plain, light sheet and the browser's print dialog saves it ("Save as PDF"). A plain Ctrl+P still prints the page itself.

### 18.7 What the app says about itself

- **The connection plug.** One plug, drawn seated in its socket or pulled out, so the state reads without its colour: green plugged in, blue a transfer running, gold unplugged with changes waiting, red unplugged with an error. It takes no room while all is well. When the link has been bad for 3 s it floats as a round chip just off the end of the bar, and stays green 1.5 s when the link is back. A frame shows none: its host shows one.
- **The space card.** Stays until closed, bottom centre, over the page and under notifications. When it shows is the app's: only it knows its space.
- **The unread dot.** A red dot on the app's icon's top-right corner. It blinks 5 times when new news comes, also with reduced motion: it is a short signal, not decoration.

### 18.8 Sharing, uploads and writing

- **Sharing** (`ayni-share`). One dialog: who has it, with a × to take it back and Undo; who else could have it, as a pick list, with Everybody on top; for a folder, a switch that lets them add files; and, when the app asks, a link anyone can open, made as the dialog opens.
- **Uploads** (`ayni-upload.js`). All the uploads of a burst share one progress notification, shown only after 600 ms, so a small one shows nothing. Before a long upload, the app asks whether there is room; when emptying the bin would make room, the user is offered that, and only what the bin held when asked is deleted.
- **Writing** (`ayni-compose`). Marks in a short message: `*bold*`, `_italic_`, `~strike~`, `- ` lists. Messages stay plain text. An emoji panel. Emoticons become emoji once the space after them is typed, and a Backspace right after gives the emoticon back.
- **Calendar views** (`ayni-calview.css`). The look of FullCalendar in Ayni's colours. The engine is the app's: it has its own licence.

### 18.9 Installed apps

- **The install offer** says what you get, not a one-line bar. Where the browser can install, one button; on iOS and Android, the real steps. The automatic one speaks only when an install is really possible, never over another dialog; "Not now" lasts this visit, "Don't show again" for good. By hand it always opens and always says something.
- **The browser warning** speaks when the browser is too old, or forgets what it is told. A warning, never a wall.
- **The update bar.** A new version is offered, never forced: the page may hold unsaved work.
- **The session bar.** Session gone, one bar, one way out, never a redirect on its own.
- **Low battery.** A dialog in front of all, at 15% or less and not charging, once per drop. Plugging in closes it.
- **The screen locker.** After the chosen idle minutes an animation covers the page, and only the password takes it away. The lock lives in the browser: it covers the open pages, not the session.

### 18.10 For developers

| Need | Code |
| --- | --- |
| The way home | `const apply = Ayni.homeLinks({ go, tip, heads, not, onIcon })`, then `apply()`, and `apply(root)` for a part drawn later. `go(event)` goes home; `tip` is the key of the icon's tooltip; `heads` the title rows, `.topbar, .header` by default; a name inside `not` stays plain; `onIcon(element)` runs for each icon marked. Marked items get `.home-link` |
| Export to PDF | A hidden `<div id="printRoot">`, the page in `#app`, then `Ayni.printPage(html, title, hintKey)`: `title` seeds the file name, `hintKey` is the key of the text that says what to pick |
| The plug | A `.sync-indicator`, `Ayni.plug.draw(root)` for one built later, `Ayni.plug.set(element, state, { titles, tapHint })`, or `Ayni.plug.listener(options)` for a store's `onState`. States: `synced`, `loading`, `saving`, `offline`, `pending`, `needs-auth`, `conflict`, anything else is an error. `Ayni.plug.bars` lists what counts as a bar |
| The space card | `Ayni.spaceCard({ title, used, how, items, action: { label, icon, run } })`, in `ayni-status.js`, with `ayni-status.css` |
| The unread dot | `const dot = Ayni.badge(selector)`, then `dot.set(n, blink)`, `dot.place()`, `dot.showing()` |
| Sharing | `Ayni.share({ path, app, title, canAdd, link, lead, peopleHead, api, users })`; see the head of `ayni-share.js`. `Ayni.share.rowButton(name, title, action)` |
| Uploads | `Ayni.uploads({ event, onBurst })` listens for the app's transport; `Ayni.ensureRoom(need, { space, binIds, empty })` |
| Writing | `Ayni.marks`, `Ayni.emojiPanel(pick)`, `Ayni.smileys(textarea)` |
| Installed apps | `Ayni.pwa.config({ app, logo, keys, apkRef, apkKey, held, page, signIn })`, then `offerInstall({ manual })`, `installMode()`, `isStandalone()`, `warnBrowser()`, `pingUpdate()`, `watchBattery()`, `sessionExpired()`, `b64ToU8(key)`, `samePushKey(sub, key)`, `inAndroidApp()` |
| Screen locker | Set `window.AyniLockerConfig`, load `ayni-locker.js` in `<head>` without `defer`, then `AyniLocker.settings()`, `.save(part)`, `.lock()`, `.define(id, fn)`. It ships `lockers/clock.js`, `matrix.js`, `life.js` |
| The clip's panel | `Ayni.attachPanel(items, onPick)`, in `ayni-dialogs.js`: `items` are `{ icon: node, label, color: 0-8, act }` |
| Touch | `--hit` is 44 px on a coarse pointer, for a page's own hit pads |

### 18.11 The data side

`ayni-net.js`, `ayni-store.js` and `ayni-boot.js` keep an app's data safe when the network is not. A save goes to the screen and the device first, and to the server when it can: a page closed, a train tunnel or a lost session never loses it. Two devices that change the same file are told apart by its version, and nothing is written over a change the page has not seen. `AyniDoc` adds a document on top: autosave, a draft on the device for one with no name yet, one window per document.

`window.AyniNames` (keys, cookies, the API's address, its headers, the upload event's name - `upload`, "ayni:upload" by default) is read when the files load. `sample/server.mjs` shows what the server must answer.

## 19. To be defined

These points are known and deliberately left open; each will get its own decision and then its own chapter or rule.

### 19.1 Low-priority review items

The low-priority items of the gap review have not been reviewed. They will be taken up only if Frasquito asks.

### 19.2 Accessibility for blind and deaf users, right-to-left, High Contrast

To be done after the full design is closed:

- **Screen readers:** announcing errors, notifications and status; calendar roles; reaching disabled menu items; naming shortcuts; linking long tooltips; reaching tab pages with nothing to focus.
- **Deaf users:** captions and visual alternatives once sound or video is added (none is used today).
- **Right-to-left languages** (Arabic, Hebrew): logical CSS properties, mirrored icons and markers, swapped Left and Right keys.
- **Windows High Contrast mode:** redraw selection, check squares, switches, the triangle and the dot with borders and system colours.

The full list is kept in [accessibility-backlog.md](accessibility-backlog.md).

## Appendix: decisions not taken

These were considered and turned down; they are listed so they are not proposed again.

| Idea | Decision |
| --- | --- |
| Alt+letter hot keys (underlined mnemonics) | Dropped for good |
| Submenus inside submenus | Not taken: one level (9.3) |
| A long tap on a list item opening its pop-up menu | Replaced: it starts picking, and the actions are in the title row (8.4, 8.5); right-click still opens the menu |
| A click on an item in an item list adding it to the picks | Not taken: a click picks that item alone, Ctrl+click adds or removes (8.4); only pick lists add on a click (8.6) |
| Tick squares on every row of an item list, all the time | Not taken: on hover and on picked rows with a mouse, only while picking on touch; always shown only in pick lists |
| A full Accent fill on picked rows | Replaced: a soft Accent tint; full Accent marks where you are and a list picker's choice (8.9) |
| Type-ahead in a list whose actions use plain letters | Not taken: there the letters run the actions (8.3) |
| The Insert key for a new item | Replaced: Alt+N (Mac keyboards have no Insert key) |
| Arrows in a navigation tree going to each folder they reach | Not taken: the arrows move, a click, Enter or Space goes (16.4) |
| Dragging list items on touch | Not taken: it fights the scroll; Move to… does the job (8.8) |
| An "Everybody" row at the top of a pick list | Replaced: a switch above the list, which greys the list while on (8.6) |
| An Accent fill on the menu row under the pointer | Dropped: a grey tint, as on buttons |
| Big 44 px menu rows with a mouse | Not taken: compact rows; 44 px on touch |
| A tick drawn in place of the item's icon | Dropped: the tick has its own column, and the icon stays |
| The first menu item taking the focus on a mouse click | Dropped: only from the keyboard; the caret and selection stay put |
| Tools leaving an overfull toolbar from its end | Replaced: by rank (9.9) |
| Separators placed by hand in a toolbar | Replaced: a line between groups, drawn by Ayni |
| Closing a dialog by a click on the dimmed page around it | Dropped: one stray tap would lose what was typed; only the dialog's buttons and Esc close it |
| Small dialogs full screen on phones | Not taken: a small dialog stays a centred card; only big dialogs fill the screen, below 1024 px |
| Dragging a dialog from any free spot | Not taken: by its title row only |
| Tinted title and button strips on floating dialogs | Not taken: plain on the dialog; strips only on full-screen dialogs |
| Moving a lone Close button into the title row when the page loads | Dropped: it is written there in the page |
| Pills as tabs | Not taken: a row of pills reads as a filter; tabs change the page and look like folder tabs (12.1) |
| A tab row that wraps to a second line | Not taken: the row scrolls sideways, and tabs keep their place (12.1) |
| Tabs in a title row | Not taken: a tab needs its page right below it; the title row has the view switch (9.8) |
| A full Accent fill on a pressed choice | Replaced: the soft tint of a toggle; a fill means the default button (3.9) |
| The status bar as the place for the result of an action | Replaced: a notification; the bar shows what stays true (11.4) |
| Glyphs on a bar and a button that folds the same pane | Not taken: one action, one control (13) |
| The status bar saying why a dialog's input was not applied | Replaced: the field's error (4.7), or a line at the bottom of the dialog when no single field is wrong (a dialog has no status bar) |
| A line under a field for its error | Replaced: a Danger border and a "!" inside the field, with a popup (4.7) |
| A grey hint line under a field | Replaced: the placeholder for a short hint, the info "i" for a longer one (4.1) |
| Field look given to every bare input by its tag | Not taken: a field is `.input`, so check boxes, editors and table cells keep their own look |
| The browser's own number arrows | Replaced: the − field + number field (4.4) |
| The browser's own slider drawing | Replaced: a thin line with a dot (5.4) |
| Undo notification after a dialog closes | Rejected: a dialog that needs a way back gets a Cancel button (a delete inside it is the one exception, 10.1) |
| Ctrl+Z after the Undo notification has gone | Dropped: by then the action is final (11.2) |
| One notification at a time, the newest replacing the last | Dropped: they stack, at most 3, so news never ends an Undo |
| Notifications at the bottom centre on wide screens | Not taken: bottom right; bottom centre only on phones |
| Undo as an icon only, or as a word only | Not taken: the icon and the word |
| Errors that leave on their own | Dropped: an error stays until closed |
| Overflow ▾ button listing all tabs | Removed: not needed; the row scrolls and the wheel scrolls it |
| Tooltips the pointer can move onto | Dropped |
| Filter name as a chip in the search field, in place of the text | Dropped: the filter icon turns Accent, its tooltip says how many, and the field stays usable |
| A magnifier inside a search field that filters as you type | Dropped: it does nothing typing doesn't do; only a field that searches on Enter has a Go button |
| One Esc clearing and folding a search at once | Not taken: the first Esc clears, the next folds; the × does both in one press |
| A modeless Find dialog for finding in a document | Replaced: the find bar above the document (4.6) |
| Tools vanishing while an open search needs their room | Replaced: they go into More by rank (9.9) |
| Ctrl+/ to reach the search | Dropped: Ctrl+F in every view |
| Ring with a dot, or a second ring, to mark a second action | Rejected: a single small dot |
| Hold-to-peek or notifications to show tooltips on touch | Rejected: the Help card |
| A Help button on touch devices only | Replaced: on every device; it also starts the tour, and the card says more than a tooltip (15.1) |
| A Help list built by scanning the screen, with sentences made from each button's kind | Dropped: the card's rows are written by hand for each view (15.2) |
| A plain icon on each Help card row | Not taken: a small copy of the round button, in its colour (15.2) |
| A guided tour that opens on a first visit | Rejected: only from the card or the Help menu (15.3) |
| Skipping a tour step whose button is hidden or missing | Not taken: the tour opens what hides it, or rings where it will appear (15.3) |
| First-visit marks with a × that works at once | Not taken: it counts down 9 s first (15.4) |
| An info label that opens only on a click | Replaced: with a mouse it opens on hover, a click pins it (14.2) |
| A letter "i" drawn in an Accent circle | Replaced: an "i" icon in the link colour (14.2) |
| Native select, datalist, or the device's own date and time pickers and wheels | Rejected: the Ayni list picker (7), calendar and time popup (6) |
| A drop-down list whose pick runs an action (Recent files…) | Replaced: a button with a menu; a list picker only holds a value (7.1) |
| A combo box that keeps any text, for a long fixed list (time zones) | Replaced: the filtered list, which only takes an item of the list (7.1) |
| Up and Down changing a closed drop-down's value unseen | Dropped: they open the list (7.2) |
| A filled field, or an Accent wash under the pointer, for a list picker in a toolbar | Not taken: no fill, a thin line, the grey tint of the toolbar's buttons (7.3) |
| The taskbar only at the top or the bottom | Replaced: any of the four edges (17.1) |
| Desktop mode decided by the width alone | Replaced: the default; an app may set its own rule (chapter 17) |
| A selected chip with only the icon and its buttons | Not taken: it also names what the window shows, except on a side bar (17.3) |
| Snapping or tiling for every window | Not taken: options for windows that hold whole pages (17.4); plain windows move freely |
| A window engine for pages inside Ayni | Not taken: it would need a hook for each thing done inside a page; the app keeps its engine and takes the bar from Ayni (17.4) |
| A year box in the calendar | Not taken: the title steps to months, then years (6.4) |
| Longer notification time than 6 s | Not taken: 6 s with pause on hover |
| Knob on the splitter | Replaced by the three glyphs |
| Text labels on every button | Not used: icon-only round buttons with tooltips; text buttons only for wide calls to action (3.9) |
| An accent wash on hover | Dropped: a grey tint; Accent means active, selected or default |
| A filled disc for a toggle that is on | Dropped: a soft tint; a fill means the default button |
| Buttons drawn 44 px on touch | Dropped: drawn size kept, 44 px hit area (only a dialog's bottom row is drawn at 44 px) |
| Filled green and red buttons (phone calls) | Not in Ayni: an app with call screens keeps its own |
| Fonts from Google Fonts (IBM Plex) | Dropped: the system font, nothing loaded from the network |
| Five base colours, everything else derived | Replaced: each scheme sets its colours by hand (2.1); a few are still derived |
| An amber focus ring | Dropped: the focus ring is Accent |
| Data table | Out of this book: it will be a separate project |
