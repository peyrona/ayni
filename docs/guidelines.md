# Ayni Design Guidelines

Version of 2026-10-26 · Frasquito

## About this book

This book is the rule set for Ayni, a CUA (Common User Access) interface built with HTML, CSS and JavaScript: every rule here has been decided by Frasquito, the decision maker, and is shown working in the [Ayni Components gallery](../gallery/index.html).

It is written for designers and developers. Designers use it to decide what a screen looks like and how it behaves. Developers use it to build controls that behave the same everywhere. Where a rule names markup (an attribute or a class), that is the way the gallery implements it today.

**How to read it.** Chapter 1 gives the principles that every other rule follows. Chapter 2 sets the foundations shared by all controls: colour, sizes, states, keyboard, touch and scrolling. Chapters 3 to 16 cover one control family each, and chapter 17 covers desktop mode. Chapter 18 lists what is still to be defined, and the appendix lists decisions that were considered and not taken, so they are not proposed again.

**Words used in this book.**

- **Panel**: the base surface of Ayni. Dialogs, menus, popups and windows are all Panels. Panels can nest, for example a dialog opened from a window.
- **Default button**: the one button in a view that Enter runs. It is the only button with a filled background.
- **Second action**: an extra action on a button, reached by double-click, long tap or Shift+Enter.
- **Touch**: a device whose main pointer is coarse (a finger). **Phone**: a touch device narrower than 600 px.
- **Mouse and keyboard**: a device with a fine pointer.

**Status.** The design of all controls listed here is closed, except for the points in chapter 18. Desktop mode (chapter 17) is being designed now: its taskbar, launcher, chips and window are decided, the rest is listed in 18.2. The accessibility work for blind and deaf users comes later.

**Browsers.** Evergreen browsers from 2024 on (Chrome, Edge, Firefox, Safari), so the native popover and dialog elements and modern CSS colour functions can be used.

## 1. Principles

Ayni aims for the best user experience by being consistent, congruent and intuitive: the same thing always looks the same, behaves the same and means the same, on every device.

1. **One look, one meaning.** A visual sign has exactly one meaning across the whole interface. A filled background means "default button" and nothing else. A small dot on a button means "second action". A small down-pointing triangle means "opens a list or popup". Colour of an icon carries meaning (danger, success, warning). No sign is reused for something else.
2. **One control per job.** There is one list picker for every drop-down list and combo box, one search field, one number field, one date field. Native browser widgets whose look or behaviour differ between browsers (select, datalist, date wheels) are not used.
3. **Apply as you go.** Changes take effect as they are made, or when a dialog closes. Accept and Cancel buttons are avoided wherever possible. A Cancel button is added only when the user really needs a way back.
4. **Nothing hidden that matters.** Every button has a tooltip. A disabled control still explains why it is disabled. Tooltips never hold the only copy of important text. On phones, where there are no tooltips, a Help dialog lists every element of the view.
5. **Same rules for mouse, keyboard and touch.** Every action can be reached with each of them. Touch adds a long tap, which always means "more for this thing".
6. **Responsive by default.** The same screens work from a 320 px phone up. Touch targets grow to 44 px on touch devices. From 1024 px wide, desktop mode with windows switches on automatically; below that there is none (see chapter 17).
7. **Built on standard parts.** Plain HTML elements first (button, input, dialog, popover, fieldset), with a small shared JavaScript helper. New controls are created only when no existing one fits.
8. **The user decides speed.** A single click never waits, except on a button that has a second action. Nothing disappears before the user can act on it: notifications pause while the pointer is on them, and errors stay until dismissed.

**Core interaction model.**

| Gesture | Means |
| --- | --- |
| Click, tap, Enter, Space | Run the action, or select the item |
| Double-click, long tap or Shift+Enter on a button with a dot | Run the button's second action |
| Long tap on an area, list item or tree item | Open its pop-up menu (same as right-click) |
| Long tap on a tree item, then move the finger | Drag the item (in a tree that allows moving) |
| Right-click, Shift+F10, Menu key | Open the pop-up menu for what is under the pointer or focus |
| Enter inside a Panel | Run that Panel's default button |
| Esc | Close the innermost popup, menu or dialog (after first clearing a search field) |
| Alt+Down or F4 in a field with a list or calendar | Open the list or calendar |

## 2. Foundations

Every control is built on the same colours, sizes, states, keys and touch rules, defined once here.

### 2.1 Colour

Each colour scheme (light and dark) defines at most five base colours. Every other colour is derived from them at runtime with CSS colour functions (color-mix and relative oklch), so a new scheme only needs five values.

| Base colour | Used for | Light | Dark |
| --- | --- | --- | --- |
| Paper | Backgrounds of Panels and fields | #ffffff | #1d232c |
| Ink | Text, icons, lines | #1b2330 | #e5e9f0 |
| Accent | Default button fill, selection, active marks (dot, triangle, active filter), links | #1f5fbf | #5b9bff |
| Alert | Focus ring, warning colour | #b86e00 | #ffb340 |
| Danger | Danger icons, errors, required mark | #b3261e | #ff7a6e |

**Derived colours** (as built in the gallery):

| Name | Derived as | Used for |
| --- | --- | --- |
| Surface 2 | Ink 5% into Paper | Panel title rows |
| Ground | Paper slightly darker, with 4% Accent | Page background behind Panels |
| Ink 2 | Ink 66% into Paper | Secondary text, quiet icons |
| Line | Ink 22% into Paper | Panel borders, separators |
| Field line | Ink 46% into Paper | Field and control borders |
| Placeholder | Ink 60% into Paper | Placeholder text |
| Accent soft | Accent 16% into Paper | Selected list rows, highlights |
| Read-only background | Ink 7% into Paper | Read-only fields and controls |
| Warning | Alert 85% into Ink | Warning icons |
| Success | Accent with hue moved to 152 (green), chroma 80% | Success icons |
| Shade, backdrop | Paper darkened to 15% lightness; backdrop is shade at 50% | Shadows, modal backdrop |

**Contrast targets** (checked on both schemes): text and placeholder at least 4.5:1 against Paper; focus ring and field borders at least 3:1.

**Light and dark.** A round moon button in the title row (a toggle, tooltip "Dark mode") switches between the two schemes. Until the user chooses, the scheme follows the system setting; the choice is then remembered on that device.

**Colour carries meaning only through icons and borders.** Danger, success and warning colour the icon of a button, never its fill. Errors colour the border of the field or group and a small red "!" circle that holds the message.

### 2.2 Type and icons

- Interface font: IBM Plex Sans, falling back to the system UI font. Monospaced text: IBM Plex Mono.
- Icons are drawn on one 24 × 24 grid with a 2 px stroke and rounded ends, and take their colour from the text. They are used at 16, 20, 24 and 32 px. The current icons are placeholders (see chapter 18).
- Ayni ships only the icons its controls need (32). An app adds its own, and can replace the whole set with another one (Lucide, an icon font...) by mapping Ayni's icon names to that set's names; a name the other set lacks keeps Ayni's icon.
- Status icons: Information, Success, Warning and Error, each in its meaning colour.

### 2.3 Sizes and spacing

| Item | Mouse and keyboard | Touch |
| --- | --- | --- |
| Control height (fields, list picker) | 32 px | 44 px |
| Push button (circle) | 36 px, icon 18 px | 44 px |
| Toolbar and notification buttons | 30 px | 44 px |
| Buttons inside a field | 26 px, icon 15 px | 44 px |
| List rows, menu items, calendar days | Compact | At least 44 px high |
| Corner radius | Panels 6 px, controls 4 px, buttons round | Same |
| Panel padding / gap | 16 px / 12 px | Same |

**Touch targets.** On touch devices every touchable thing has a hit area of at least 44 × 44 px, and separate targets keep at least 8 px apart. Things that should look small (the info "i", a tab's close button, the splitter glyphs) keep their small look and get a larger invisible hit area. Tiled targets such as list rows, menu items and calendar days need no gap between them.

**Very narrow phones** (below 360 px, touch): calendar days are drawn 6 px smaller inside their full 44 px cell, and popups keep 4 px from the screen edge, so the date picker fits a 320 px screen without scrolling.

### 2.4 States

Every control shows each state with the same look.

| State | Look | Behaviour |
| --- | --- | --- |
| Normal | Border in Field line colour | Fully interactive |
| Focus | 2 px ring in the Alert colour, 2 px outside the control (fields: border turns Accent) | Shown on keyboard focus |
| Disabled | Faded to 45% opacity | Does nothing. Fields and list items cannot be focused. Buttons can (see 3.6) |
| Read-only | No border, soft tint (Read-only background), text at full contrast | Can be focused, selected and copied; value cannot change |
| Loading | Short centred line with a spinner: "Loading…" | Control is marked busy |
| Empty | Short centred line: "No files" | Nothing to pick |
| Error | Danger border, plus a small red "!" circle; the message opens in a popup from it (4.6) | Message says how to fix it; border, "!" and popup disappear once fixed |
| Busy (buttons) | Spinner replaces the icon in the same circle | Clicks ignored; tooltip says what is running |

A disabled group box fades everything inside it at once. A read-only field never says "(read only)" in its label: the look says it. Read-only pickers hide their triangle, and read-only date fields hide the calendar button.

### 2.5 Keyboard

- Tab moves between controls; composite controls (lists, toolbars, tab rows, menu bars, radio groups) are one Tab stop, and arrow keys move inside them.
- Enter inside a Panel runs its default button, except in a text area, on another button or item, or while a list or menu is open.
- Esc closes the innermost popup, menu or dialog. In a search field the first Esc clears the text.
- Shift+Enter on a button with a dot runs its second action.
- Alt+Down or F4 opens a list picker or calendar.
- Shift+F10 or the Menu key opens a pop-up menu. F10 focuses the menu bar.
- Ctrl+Page Down / Ctrl+Page Up switch tabs from anywhere inside the Panel.
- Ctrl+Z (⌘Z on Mac) undoes the last undoable action, outside text fields.
- On Mac, Ctrl in shortcuts reads ⌘.

### 2.6 Touch

- A device counts as touch when its main pointer is coarse. Sizes switch to the touch values above.
- There are no tooltips on touch. Each view has a round Help button in its title row instead (chapter 15).
- **Long tap** (hold 500 ms) means "more for this thing": on a button with a dot it runs the second action; on an area, list item or tree item it opens that element's pop-up menu. While holding, a ring paints in around the button (or at the finger) over the hold time. The menu opens when the finger lifts. Moving more than 10 px before the ring is full cancels the long tap (the page scrolls); in a tree that allows moving, moving the finger after the ring is full drags the item instead (16.5).
- On phones (below 600 px), lists of the list picker open as a sheet at the bottom of the screen, kept above the on-screen keyboard.

### 2.7 Scrolling

Every container (Panel bodies, dialogs, menus, popups, lists, tables, panes) can scroll vertically and horizontally, and shows a scrollbar only when its content does not fit. Menus and popups are never larger than the screen: they scroll instead.

## 3. Buttons

Every button is a circle with an icon and no text label, and every button has a tooltip that names its action.

This applies to push buttons and toggle buttons. It does not apply to tabs, menu items, menu bar items, radio buttons or check boxes, which keep their text.

### 3.1 Look

- Round, icon only. The tooltip (and the accessible name) says what it does: "Save", "Print (Ctrl+P)".
- **Background fill marks only the default button.** There is at most one default button per view, and Enter runs it. All other buttons have a Paper background and a thin border, or no border when quiet (in title rows and inside fields).
- **Meaning goes in the icon colour:** red (Danger) for destructive actions, green (Success) for approve or confirm, amber (Warning) for caution. Neutral buttons use the Ink colour.
- **A danger button is never the default.** In a confirmation, the safe choice is the default. The gallery removes the default mark from any danger button and warns developers in the console.

### 3.2 Toggle buttons

A toggle button holds an on/off state (Bold, Favourite). It looks like a push button and shows "on" with a pressed look. For a setting that takes effect at once, prefer a switch (chapter 5).

### 3.3 Buttons that open a popup

A button that opens a menu or popup shows a small down-pointing triangle in the Accent colour at its lower right, as a combo box does. The triangle stays small (9 × 6 px on a 36 px button). Such a button can never have a second action, so it never shows the dot.

A button that opens a dialog gets no marker: no triangle and no dot. Its tooltip ends with an ellipsis ("Rename…", "Delete file…") to show that a dialog follows. Like a popup button, it can never have a second action.

### 3.4 Second action

A button may have one second action, for example Print (first action) and Print with the last settings (second action).

- **Reached by:** double-click with a mouse, long tap (500 ms) on touch, Shift+Enter on the keyboard.
- **Marked by:** a small solid dot in the Accent colour at the lower right of the button, on every device. Nothing else marks it.
- **Timing:** a single click on a button with a dot waits about 250 ms in case a second click follows. A double-click runs only the second action, never the first. Taps and Enter act at once. Buttons without a dot never wait. (Browsers cannot read the system double-click time, so 250 ms is fixed.)
- **Hold feedback:** while the finger holds, a ring paints in around the button over the hold time.
- **Tooltip:** generated from both actions and the ways to reach them. Mouse and keyboard: "Print · Double-click or Shift+Enter: Print with the last settings". Touch (in the Help dialog): "Print · Hold: Print with the last settings".
- **Never on a button that opens a popup, menu or dialog.** The gallery strips the second action from such buttons and warns.

### 3.5 Default button

Enter anywhere inside a Panel clicks that Panel's default button. It does not when the focus is in a text area, on another button or item, or while a list or menu is open. One shared helper does this for every Panel: no dialog needs its own Enter handling.

### 3.6 Disabled buttons

A disabled button is faded to 45%. Clicks and Enter are ignored, but it stays focusable and its tooltip still shows and says why it is off: "Paste: nothing copied yet". A default button can be disabled until the input is valid: it stays filled but faded.

### 3.7 Busy buttons

While its action runs, a button is busy: a spinner replaces the icon in the same circle (the size does not change), clicks are ignored, and the tooltip shows what is running ("Saving…"). When the action ends the icon and tooltip come back. A failure is shown with the usual error notification.

### 3.8 For developers

| Need | Markup in the gallery |
| --- | --- |
| Button | `.btn` with an icon, `aria-label` and `data-tip` |
| Default | `.btn.primary` (one per view) |
| Meaning | `.danger`, `.ok`, `.warn` |
| Toggle | `aria-pressed` |
| Opens a popup | `popovertarget` or `aria-haspopup` (triangle is added by CSS) |
| Second action | `data-alt="Print with the last settings"` |
| Disabled | `aria-disabled="true"`, not the `disabled` attribute |
| Busy | `Ayni.setBusy(button, "Saving…")`, then `Ayni.setBusy(button, false)` |

## 4. Text, number and search fields

A text field shows its hint in the placeholder, can hold round buttons inside its border, and never adds a message below it.

### 4.1 Text field

- **Label:** every field has a visible label above it, linked to it; clicking the label focuses the field. A required field shows a red mark (Danger) after its label.
- **Hint:** goes in the placeholder ("As it appears on your ID", "name@example.com"), never in a message below the field.
- **Buttons inside the field:** one or more round, quiet buttons can sit inside the border, at the start and/or the end (show password, clear, calendar, filter, search). They follow every button rule: icon only, tooltip, 44 px on touch.
- **Error:** a Danger border and a red "!" inside the field, whose popup says how to fix it (4.6). Nothing is added below the field.
- **Read-only:** no border, soft tint, text at full contrast, normal text cursor. It can be focused (with the focus ring), and its text can be selected and copied. The label does not say "read only".
- **Disabled:** faded to 45%, cannot be focused.

### 4.2 Password field

A text field with a show/hide button at its end. The button is a toggle (pressed while the password is shown).

### 4.3 Text area

Multi-line text, same rules as the text field. The character count is optional, per text area: show it when the user benefits from seeing how much room is left, and leave it out otherwise (a length limit can exist without a count). When shown, it sits on the bottom border of the field, near the right end, as a small tag with a rounded border. Its background is fully opaque, so neither the border nor the text shows through it.

Auto-grow is optional, per text area. With it the field starts at its normal height and grows with its text up to a maximum (240 px by default), then scrolls. It has no resize grip, since the height follows the text. Without it, the user can resize the field vertically with the grip at its bottom-right corner. Both options can be combined.

### 4.4 Number field (spin button)

A number in a range, laid out as − field +.

- **Keys:** Up and Down step by 1 step; Page Up and Page Down by 10 steps; Home and End jump to the minimum and maximum.
- **Buttons:** − and + step by 1. Holding one repeats: the first step at once, then every 150 ms after 400 ms, then every 50 ms after 1.5 s. − is disabled at the minimum, + at the maximum.
- **Out of range or invalid input is not corrected.** It shows the usual field error: "Between 1 and 99."
- **Decimal mark:** both comma and point are accepted; the one the user typed is kept for display.
- **Label:** say the range and step when they matter: "Weight in kg (0–50, steps of 0.5)".

### 4.5 Search field

Every search field in Ayni is the same control.

- Filters as the user types.
- The magnifier sits at the right edge. An optional filter button sits just before it; a clear button appears before that once there is text.
- **Filter button:** opens a menu of filters. Its icon is grey while no filter is active and Accent while one is active; its tooltip names the filter ("Filter: all fruits").
- **Esc:** the first Esc clears the field and stops there. A second Esc (field already empty) closes the popup or dialog the field sits in.

### 4.6 Errors

Space is precious, so an error never adds a line below the field: it shows as a Danger border and a small red "!" whose popup holds the message.

- **Border:** the field's border turns Danger.
- **Error mark:** a small red "!" in a circle, drawn like the info "i" (14.2), sits inside the field at its end.
- **Message:** shown in a floating popup next to the "!", saying how to fix the value ("Enter a full address, like name@example.com."). It opens by itself while the field has focus. Otherwise it opens when the user clicks, taps or hovers over the "!".
- **On submit:** focus goes to the first wrong field, so its message shows at once.
- **When fixed:** the border, the "!" and the popup all disappear.
- **Groups** (radio and check groups, lists): the "!" sits next to the group's title or label, and the group border turns Danger. A list without a label shows its "!" inside its top-right corner, as inside a text field.
- **Touch:** the "!" keeps its small look with a 44 px invisible hit area.
- **Info and error together:** the "i" (help) stays next to the label; the "!" (error) sits inside the field. Each keeps one meaning.

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
- **Keys:** a switch is one Tab stop. Space flips it. On a two-sided switch, Left (or Up) picks the left option and Right (or Down) the right one, without wrapping.
- **Mouse and touch:** clicking the switch or its label flips a one-sided switch. On a two-sided switch, clicking the track flips it and clicking a label picks that option. On touch, every label and the track have a 44 px hit area.
- **States:** disabled and read-only look as for every control (5.5).

### 5.4 Slider

A value in a range where the exact number matters less than its position. The current value shows next to it ("60%"). Arrow keys step it, Page Up and Page Down jump. A slider can have named stops shown under it (Draft, Low, Medium, High, Best). Use a number field (4.4) when the exact number matters.

### 5.5 States

- **Disabled:** faded, cannot be changed.
- **Read-only:** soft tint, no border; the value is visible but cannot be changed.
- **Error** on a radio or check group: the group border turns Danger and a red "!" sits next to the group title; its popup holds the message ("Choose how to ship the order.", "Tick the box to go on.").

## 6. Date, time and calendar

Dates are typed as YYYY-MM-DD (times as 24-hour HH:MM) or picked from the Ayni calendar; weeks start on Monday.

### 6.1 Date field

- A text field with the placeholder "YYYY-MM-DD" and a calendar button inside, at the end.
- The calendar opens with the button, or with Alt+Down or F4 while in the field (the same keys as the list picker). When it closes, focus returns to the field.
- A wrongly typed date shows the field error: "Use the form YYYY-MM-DD, like 2026-10-20."
- Read-only: tint, no border, and the calendar button is hidden. Disabled: faded, and the calendar button is disabled with the tooltip "Choose date: not available".

### 6.2 Date and time field

- Typed as "YYYY-MM-DD HH:MM" (24 hours).
- The popup holds the calendar plus an hour spinner and a minute spinner. Minutes step by 5; steps carry over midnight (23:55 + 5 minutes moves to 00:00 of the next day).
- The day and the time apply as soon as they change. There is no Accept button. Esc or a click outside closes the popup.

### 6.3 Calendar

| Action | Mouse or touch | Keyboard |
| --- | --- | --- |
| Move by day / week | — | Left, Right / Up, Down |
| Previous / next month | Arrow buttons beside the title | Page Up / Page Down |
| Pick a day | Click or tap | Enter |
| Pick a month | Click the month title: a 12-month grid appears | — |
| Pick a year | Click the title again: a 12-year grid appears | — |
| Back to the days | Picking a month or year returns to the days | Esc in the month or year grid |
| Today | Today button (bottom left) jumps to today and picks it | — |
| Close | Click outside | Esc |

**Limits.** A calendar can have a minimum and maximum date. Days, months, years and arrows outside the range look disabled and cannot be picked (for example "only the next 60 days").

**On touch** each day has a 44 px cell. Below 360 px wide the days are drawn 6 px smaller inside that cell so the calendar fits a 320 px screen.

## 7. List picker: drop-down list and combo box

One Ayni list picker serves every drop-down list and every combo box, on every device; the browser's native select, datalist and scrolling wheels are never used.

### 7.1 Two modes

|  | Drop-down list | Combo box |
| --- | --- | --- |
| Use for | One choice from a fixed set (Priority) | A value that can be typed or picked (City) |
| Typing | Off. A letter jumps to the first match, even while the list is closed | On. The list shows only the suggestions that match, ignoring accents and case |
| Free text | Not possible | Kept when nothing matches |
| Enter | Picks the highlighted item | Picks the highlighted suggestion, or keeps what was typed |

### 7.2 Behaviour

- **Look:** a field with an Accent triangle at its end, marking the list.
- **Opening:** click or tap the field, or press Alt+Down or F4 (in a combo box, Down also opens the full list).
- **Where the list opens:** in a popup Panel below the field, or above it when there is no room below. On phones (touch, below 600 px) it opens as a sheet at the bottom of the screen, kept above the on-screen keyboard.
- **Inside the list:** arrows move, Enter picks, Esc closes; type-ahead as in lists (8.3). Rows are 44 px high on touch.
- **Form value:** a hidden input carries the picked value, so forms submit it like a normal field.
- **States:** disabled is faded; read-only shows the value on a tint without border and hides the triangle.

## 8. Lists

A list box shows items to choose from; single-select lists choose one, multi-select lists show a check square on each item.

### 8.1 Label

A visible label above a list is optional. If present it names the list and clicking it moves focus to the list. If absent, the list still has a hidden name for assistive technology, and an error "!" goes inside the list's top-right corner (8.6).

### 8.2 Single selection

Arrow keys, Home and End move the selection. The selected item has the Accent soft background.

### 8.3 Type-ahead (all lists and the drop-down list)

- Letters typed within 500 ms build one search: "me" reaches México.
- Accents and case are ignored.
- Repeating one letter cycles through the items that start with it.

### 8.4 Multiple selection

- A small check-box-like square at the left of each item shows that several can be chosen; it is checked when the item is selected. Single-select lists never show the square.
- Click or Space toggles an item.
- Shift+click or Shift+arrows select a range from the last anchor.
- Ctrl+A (⌘A on Mac) selects all.
- Page Up and Page Down jump one visible page.

### 8.5 Pop-up menu on items

Right-click, Shift+F10, the Menu key, or a long tap on touch opens the item's pop-up menu (chapter 9).

### 8.6 States

| State | Look |
| --- | --- |
| Disabled list or item | Faded, ignores the pointer |
| Read-only | Soft tint, no border; choices visible, not changeable |
| Loading | A spinner row: "Loading…" |
| Empty | A short centred line: "No files" |
| Error | Danger border and a red "!" next to the list's label (inside the top-right corner when the list has no label); its popup says "Pick at least one file to attach." |

The tree view follows the same states (chapter 16).

## 9. Menus, popups and toolbars

Menus and popups are Panels that open next to what opened them, close with Esc or a click outside, and close when the page scrolls or resizes.

### 9.1 Menu bar and pull-down menus

- Menu bar items keep their text (File, Edit, View).
- F10 focuses the bar. Left and Right move between menus, Down opens one.
- Menu items show their keyboard shortcut at the right (Ctrl+S). Separators group related items.
- Items can be plain actions, check items (Toolbar, Status bar) or radio items (one of a set, as in the search filter menu).
- A disabled item is faded and the arrow keys skip it.
- There are no submenus (see the appendix).

### 9.2 Pop-up menu

Opens the actions for what is under the pointer or focus: right-click, Shift+F10 or the Menu key; on touch, a long tap (the ring fills while holding, and the menu opens when the finger lifts). It works on areas, list items and tree items.

### 9.3 Popups with controls

A popup can hold any control: text fields, search fields, radio buttons, switches, sliders, check boxes, lists. Changes apply as they are made (no Accept button). When the content is taller or wider than the popup, it scrolls. Esc or a click outside closes it.

### 9.4 Closing on scroll and resize

Open menus and popups close when the page, or any container outside them, scrolls, or when the window resizes. Scrolling inside the popup does not close it. Dialogs and bottom sheets are not affected. On touch, a resize that only changes the height (the on-screen keyboard appearing while typing) is ignored.

### 9.5 Toolbar

- A row of round tool buttons (30 px; 44 px on touch), with separators between groups.
- The whole toolbar is one Tab stop; arrow keys move between tools.
- Tools can be push buttons, toggle buttons (Bold, Italic) or a button that opens a menu (More, with its triangle).
- A disabled tool is faded but keeps its tooltip, which says why ("Underline: not available for headings").

## 10. Dialogs

A dialog applies its changes as they are made or when it closes, closes with Esc, and has Accept or Cancel only when there is no other way.

### 10.1 Rules

1. **Esc always closes a dialog.** Closing is not cancelling: changes are kept.
2. **Avoid Accept and Cancel wherever possible.** Apply each change as it is made, or when the dialog closes. Invalid input is not applied, and the status bar says why.
3. **No Cancel means none is needed.** No Undo notification follows a dialog. If the user needs a way back, the dialog gets a Cancel button.
4. **Close as the only button** sits in the title row, at the right.
5. **Otherwise all buttons go in a bottom row**, Close included: the usual ones (Close, Accept, Cancel, the main action) aligned right, any extra actions in the same row aligned left.
6. **Enter runs the default button** (3.5). In a confirmation the safe choice is the default; a danger button never is.
7. **The default button can be disabled until the input is valid:** it stays filled but faded, can be focused, and its tooltip says why ("Save: type a name first").
8. Dialogs can open from other Panels and nest.

### 10.2 Kinds of dialog

| Kind | Example | Buttons |
| --- | --- | --- |
| Message | "Upload complete" | Close in the title row |
| Settings, applied at once | Gallery settings | Close in the title row; every change applies at once |
| Applied on close | Rename file | Close in the title row; the new name applies when the dialog closes (Close or Esc); an invalid name is not applied |
| Confirmation | "Delete contract.pdf?" | Bottom row: Keep (default, also Esc) and Delete (danger, never default). Used only when a change cannot be applied live |
| Modeless | Find | Stays open while the user keeps working, no backdrop. Bottom row: Close and Find next at the right, List all matches at the left |

Modal dialogs dim the page behind them with the backdrop colour. How modeless dialogs behave in desktop mode is still to be defined (chapter 18).

## 11. Feedback: tooltips, notifications, progress and status bar

Feedback never hides the only copy of important information and never disappears before the user can act on it.

### 11.1 Tooltips

- Appear after half a second of hover, or at once on keyboard focus. Esc hides them.
- Every button has one. It names the action, and may add the shortcut ("Print (Ctrl+P)") or a short explanation ("Share: sends a copy to everyone in the list").
- A disabled control's tooltip says why it is off. A second-action button's tooltip names both actions (3.4).
- Tooltips never hold the only copy of important text.
- On touch there are no tooltips: the Help dialog replaces them (chapter 15).

### 11.2 Notifications (toasts)

| Rule | Value |
| --- | --- |
| Position | Bottom right |
| Kinds | Information, success, warning, error, each with its status icon |
| Time on screen | 6 s, paused while the pointer is on the notification |
| Errors | Stay until the user dismisses them |
| Close | Every notification has a round close button |
| Undo | A notification with Undo also shows the hint "Ctrl+Z also undoes" (⌘Z on Mac). The shortcut still undoes after the notification has gone, outside text fields |

No Undo notification follows the closing of a dialog (10.1).

### 11.3 Progress

A bar with a percentage when the amount is known ("Uploading photo.jpg 35%"); a spinner with a short text when it is not ("Loading…"). A button whose action is running shows the busy state (3.7).

### 11.4 Status bar

A strip along the bottom of a Panel. It shows the last action ("Saved ana-morales.json"), the selection, and where the user is ("Ln 12, Col 4", "UTF-8"). It is also where an "applied on close" dialog explains why an input was not applied.

### 11.5 Shared messages

Every control uses the same three messages: a spinner row while loading, a short centred line when there is nothing to show ("No messages"), and an error line in the Danger colour that says what to do ("Could not load the messages. Check the connection.").

## 12. Tabs and group boxes

Tabs split one Panel into pages; group boxes put a border and a title around related controls.

### 12.1 Tabs

- **Look:** folder-style tabs. Tabs are outlined; the selected one joins its page and has an Accent edge at its top.
- **Icon:** a tab may have one icon at its left, before its text.
- **Many tabs:** when they do not fit, the tab row scrolls sideways, and the selected tab always scrolls into view. The mouse wheel over the row scrolls it sideways. There is no overflow list button.
- **Keys:** Left and Right switch pages inside the tab row. Ctrl+Page Down and Ctrl+Page Up go to the next and previous tab (wrapping) from anywhere inside that Panel; with tabs inside tabs, the innermost tab set around the focus wins. Ctrl+Tab is left to the browser.
- **Closable tabs:** a small round close button (×) at the right of the tab, with a tooltip ("Close Details"). Delete (on the focused tab) or a middle click also closes it. The neighbour tab takes over. After any tab closes, even one that was not selected, focus goes to the selected tab.
- **Disabled tab:** faded, arrow keys skip it, tooltip says why ("Billing: needs an account").
- **On touch:** tabs are 44 px high, and the close button keeps its small look with a larger invisible hit area.

### 12.2 Group boxes

A border with a title (Shipping address, Delivery) around related controls. Radio and check groups always sit in one. A disabled group box fades everything inside at once. An error on the group colours its border Danger, with the red "!" next to its title (4.6).

## 13. Splitter

A splitter is a bar between two panes, side by side or top and bottom, that the user drags to resize them; three small glyphs in its middle collapse either pane or reset both.

- **Glyphs:** centred on the bar, three small solid glyphs with no circle, no background and no button styling. On a side-by-side bar, ◂ and ▸ are stacked with the dot between them; on a top/bottom bar, ▴ and ▾ sit in a row with the dot between. Glyph boxes are 10 px with a 1 px gap (about 3 px between the glyphs); triangles 7 × 9 px, dot 7 px.
- **Arrows** send the bar to that end, collapsing that pane ("Collapse left pane"). An arrow is disabled when its pane is already collapsed.
- **Dot** resets both panes to their default sizes ("Reset sizes"). It is a solid dot here even though a dot on a button means second action: on the splitter it is not a button.
- **Rest of the bar** is dragged to resize.
- **Short bar:** when the bar is too short for three glyphs, only the dot shows.
- **Keyboard:** focus the bar; arrow keys move it (Left and Right side by side, Up and Down top and bottom), Home and End go to the limits, Enter collapses or restores the first pane.
- **Mouse:** double-click on the bar resets both panes.
- **Touch:** the glyphs keep their close spacing. Invisible hit areas reach 19 px across the bar and the arrows reach 34 px past the ends (44 px in all); the dot's area stays small. A double tap on the bar also resets.
- **Tooltips:** the bar says "Drag to resize"; each glyph names what it does.

## 14. Labels and info label

Every control has a visible label, and any control can have a small "i" that opens short help.

### 14.1 Labels

- Every control has a visible label, above it for fields, at the right of the box for radio buttons and check boxes, at the left of a switch (a two-sided switch has one on each side). The label is linked to the control, and clicking it moves focus to the control.
- Exceptions: list boxes may go without a visible label (8.1); buttons have no visible label and use their tooltip instead.
- A required field shows a red mark after its label.
- A static label shows a fixed value that is not a control ("Account 0042-1187").

### 14.2 Info label

- A small plain-text "i" in a 12 px circle, about the height of the capital letters of the label, placed right after the label of any control.
- Its tooltip is "What is this?".
- Click it, or focus it and press Enter, to open a popup with short help ("Choose when the driver can come. Morning is 9:00 to 13:00, afternoon is 16:00 to 20:00."). Esc or a click elsewhere closes it.
- On touch it keeps its small look with a 44 px invisible hit area.
- Use it for help that does not fit in a placeholder; keep the text to one or two sentences.

## 15. Help dialog on touch devices

On touch devices there are no tooltips; a round Help button in the title row of each view opens a dialog that explains every element of that view.

- **Button:** round, "?" icon, shown only on touch devices, in the title row.
- **Contents:** every element of the current view, grouped by section. Each entry shows the element's icon, its tooltip text and a short explanation.
- **Explanation:** taken from the element's own help text when it has one; otherwise built from what it is: default button, danger, opens a popup, opens a dialog, toggle, second action ("Hold: Print with the last settings"), disabled and why.
- **Closing:** Esc, or the close button in the title row.
- **Rejected alternatives:** showing the tooltip while holding (hold-to-peek) and showing it as a notification. A long tap is reserved for "more for this thing".
- **For developers:** every new control needs a tooltip (`data-tip`), plus a help text (`data-help`) when the built explanation would be weak, and touch CSS that meets 44 × 44 px.

## 16. Tree view

A tree shows items inside items, such as folders and files or the sections of a book. It is a list (chapter 8) with levels: it follows the same label, selection, type-ahead and state rules, and adds opening, closing and, when the page allows it, editing.

### 16.1 What the page switches on

- A tree only browses unless the page switches editing on, one feature at a time: moving, inserting, deleting, renaming and hiding (`data-edit="move insert delete rename hide"`). A tree that only allows renaming, for example, never offers to delete.
- A locked item (`data-lock`) cannot be moved, deleted or renamed, even in an editable tree. Its actions stay visible but disabled, and their tooltip says "Contracts is locked".
- A read-only tree allows no change at all.

### 16.2 Root, folders and leaves

- **Root (optional).** A tree either has one top item that holds everything ("My files") or shows several items at the top level. The root opens and closes, but it is never moved, deleted or hidden; it can be renamed only where renaming is allowed and it is not locked. Without a root, new top-level items come from the pop-up menu of the tree's empty area, or from the toolbar.
- **Folders and leaves.** Any item can hold children (as in an outline). Items that never can, such as files, are leaves (`data-leaf`). Something dropped, pasted or inserted on a leaf goes right after it.
- A triangle before the name shows that an item has children; it points right when closed and down when open.

### 16.3 Hidden items

- A hidden item (`data-hidden`) is not shown, the keyboard skips it, and its children are hidden with it.
- The tree can show hidden items: the page turns this on, or the user does with "Show hidden items" in the tree's pop-up menu. Hidden items then show muted and in italics, and they work as usual. This is different from disabled, which is faded and does nothing.
- Where hiding is allowed, the item's menu and the toolbar offer Hide, or Show for an item that is already hidden.

### 16.4 Selection, opening and keyboard

- Single selection by default: the selection follows the focus, as in a list.
- Multiple selection works as in the lists (8.4): a check square after the triangle, click or Space toggles, Shift+click and Shift+arrows select a range, Ctrl+A (⌘A) selects every shown item.
- Up and Down move; Home and End go to the first and last shown item; Page Up and Page Down jump one visible page. Right opens a folder, or enters an open one; Left closes it, or goes to the parent. Disabled and hidden items are skipped.
- A folder opens and closes with a click on its triangle (on touch, the area around it counts), a double-click, or Enter. A click on a folder that is already selected does nothing more, so nothing opens by accident.
- A double-click or Enter on a leaf opens it: the tree tells the page (`ayni:open`).
- Type-ahead as in the lists (8.3). `*` opens every folder at the same level.

### 16.5 Moving items

- **Mouse and pen: drag and drop.** Drag an item, or all the selected items when the dragged one is selected. While dragging, an Accent **line between rows** shows that the items will go before or after a row (the upper and lower quarter of the row; half and half on a leaf), and a row **outlined in Accent** shows that they will go inside it (its middle half). Over an open folder, the lower part means "first inside it". Holding over a closed folder for 0.7 s opens it. Near the top or bottom edge the tree scrolls by itself. Items cannot be dropped inside themselves; no marker shows there. Esc cancels the drag. Dragging always moves; to copy, use Copy and Paste. Dragging between two trees is not supported.
- **Keyboard.** Ctrl+Shift+Up and Ctrl+Shift+Down (⌘⇧ on Mac) move the item one place among its siblings. Ctrl+Shift+Left moves it out, right after its parent; Ctrl+Shift+Right moves it into the folder just above it, as its last child. Alt+arrows are not used, because Alt+Left is "back" in browsers.
- **Cut, Copy and Paste.** Ctrl+X or Ctrl+C, then Ctrl+V: the items go inside the focused folder, at its end, or right after the focused leaf. Cut items look muted until they are pasted; Esc cancels the cut.
- **Touch.** Hold an item: the ring fills as for any long tap. Lift the finger and the pop-up menu opens; move the finger once the ring is full and the item is dragged, with the same markers. Moving before the ring is full scrolls the tree as usual. The item's menu also has Move up, Move down, Cut and Paste, so every move is possible without dragging.

### 16.6 Insert, delete and rename

- **Insert:** New in the pop-up menu, the Insert key, or the toolbar. The new item goes inside the focused folder, at its end, and the folder opens; on a leaf it goes right after it. It starts in rename mode with its default name selected ("New folder"); Esc removes it again.
- **Delete:** the Delete key, the menu or the toolbar. It removes the item with all its children. There is no confirmation dialog: a notification with Undo stays 6 s ("Ctrl+Z also undoes"), as for every undoable action (11.2). The focus goes to the next item, or the previous one, or the parent.
- **Rename:** F2, the menu or the toolbar. The name becomes a text field in place, with the text selected. Enter or leaving the field saves; Esc cancels. An empty name, or a name a sibling already has when the tree asks for unique names (`data-unique`), shows the usual red "!" with its popup (4.6), and the field stays open. There is no "slow second click" to rename, so nothing is renamed by accident.

### 16.7 Pop-up menu and toolbar

- An editable tree has its own pop-up menu with what it allows: New, Rename, Hide or Show; Cut, Copy, Paste; Move up, Move down; Show hidden items; Delete. Each item shows its shortcut. Items that cannot act on the chosen item are disabled. The menu acts on the item it was opened on: that item joins the selection, or becomes it. A page can give its own menu instead (`data-menu`).
- A page can put a small toolbar above the tree (optional) with round icon-only buttons and tooltips: New (the default button), Rename, Hide/Show and Delete (danger icon colour, never the default). A button that cannot act on the current item is disabled, and its tooltip says why ("Delete: the top item stays in place").

### 16.8 Loading on demand

A folder can load its children the first time it opens (`data-lazy`): a "Loading…" row with a spinner shows inside the folder until the page delivers them. If loading fails, the row says so, and closing and opening the folder tries again.

### 16.9 States

The tree uses the shared states (2.4 and 8.6): disabled items are faded and skipped, a read-only tree has the soft tint and allows no change, a loading tree shows the spinner row, an empty tree says so in the middle, and an error colours its border and puts the red "!" next to its label.

### 16.10 For developers

- Every change the user makes is announced to the page before it happens (`ayni:move`, `ayni:insert`, `ayni:delete`, `ayni:rename`, `ayni:hide`), and the page can refuse it, for example when the server says no. The tree also tells the page about selection (`ayni:select`), opening a leaf (`ayni:open`), loading (`ayni:load`) and showing hidden items (`ayni:showhidden`).
- A tree can be written as markup or built from data (`Ayni.tree(element, { root, items })`), and it can give its current shape back as data, to save it.

## 17. Desktop mode

Desktop mode gives Ayni a desktop like other operating systems: windows on a work area, and a taskbar. From 1024 px wide it switches on automatically. **Below 1024 px there is no desktop mode**: no taskbar and no windows; the app shows its normal screens, as on phones and tablets. Two components make it: the **taskbar** and the **window**. The gallery's [desktop page](../gallery/desktop.html) shows them working.

### 17.1 Taskbar

- One bar, always visible, kept clean: only the launcher button at the left, the clock at the right, and the window chips filling everything between them. An app can add more gadgets (weather, network...) on either side of the clock.
- **The user decides whether it sits at the top or the bottom** of the screen (left and right are not offered). The choice is made from the taskbar's pop-up menu (right-click, long tap, Shift+F10 or the Menu key) and is kept for next time. Bottom is the default.
- Windows never cover it. A maximised window fills the space the taskbar leaves.
- When there are more chips than fit, the window selector scrolls; its scrollbar shows only when needed.

### 17.2 Applications launcher

- A round, filled button at the start of the taskbar (the launcher is the taskbar's default button). Like every button that opens a popup, it shows the small triangle.
- It opens a popup with a search field at the top and the apps below it, as a list with icon and name. The most used apps come first.
- Typing filters the list (accents and case don't matter). Down and Up move between the field and the apps, Enter in the field opens the first match, and typing a letter while on the list goes back to the field.
- Picking an app closes the popup and opens the app. Esc or a click outside closes it, like any popup.

### 17.3 Window

- A window is a Panel, with rounded corners. It has two parts: the **title row** and the **content**.
- The title row starts at the top left with the app's icon and the app's name, followed by the app's toolbar.
- **A window has no minimise, maximise or close buttons of its own.** They are in the window's chip in the taskbar, and show while that window is selected.
- **Window chips**: one chip per open window. Every chip shows only the app's icon (the name is in its tooltip), except the chip of the selected window, which also shows the app's name and the three window buttons: minimise, maximise (restore while maximised) and close. A minimised window's icon is greyed.
- The content scrolls vertically and horizontally, with scrollbars only when needed, as every container does (2.7).
- **A toolbar that does not fit:** the app's icon and name never shrink. The tools that do not fit move, from the end, into a round "more" (⋯) button at the end of the title row; its menu lists them with their icon and tooltip text. They come back as the window widens.
- **Moving and resizing:** drag the title row (not its toolbar buttons) to move a window; drag any edge or corner to resize it, down to a minimum size. Double-click the title row to maximise or restore. There is no snapping: dragging to a screen edge does nothing special. The title row always stays inside the work area.
- Selecting a window (clicking it, its chip, or moving the focus into it) brings it to the front. (Proposal, see 18.2: the selected window's title row keeps the heading tint; the others take the content colour, and their app icon greys.)

### 17.4 For developers

Markup: `.desktop[data-edge]` holds `main.area` (the windows) and `nav.taskbar` (the launcher `.btn.primary[popovertarget]`, `.chips`, and `.widgets` with the clock and any other gadget). A window is `section.panel.window` with `header > .app` (icon and `h2`) and `header > [role="toolbar"]`, then `.body`. The launcher is `.panel.popup.launcher` with a `.search-field` and `.apps > button[data-app]`. The clock is `.widget.clock`. Ayni adds the chips and the edge menu itself; a window added later is wired with `Ayni.init(window)`.

Events: `ayni:edge { edge }`, `ayni:launch { app, item }`, `ayni:window { window, state }` (open, select, minimise, maximise, restore, close) and `ayni:close`, cancelable, before a window closes. From code: `Ayni.windows.select(w)`, `minimise`, `maximise`, `restore`, `close`, and `Ayni.setTaskbarEdge(desktop, edge)`. The edge is kept in localStorage as `ayni-taskbar-edge`, the launch counts as `ayni-launch`.

Below 1024 px `ayni.css` hides `.desktop`; anything marked `.no-desktop` shows only there. `Ayni.isDesktop()` says whether desktop mode is on, and `ayni:desktopmode { on }` fires on `document` when the width crosses 1024 px.

## 18. To be defined

These points are known and deliberately left open; each will get its own decision and then its own chapter or rule.

### 18.1 Icon set

The built-in icons are placeholders that show the style (24 px grid, 2 px stroke, rounded ends). The real icon set is still to be chosen. Since any set can be plugged in with a name map (a ready-made one exists for Lucide, which has the same style), the choice no longer blocks apps.

### 18.2 Desktop mode, the rest

Being decided one point at a time. The desktop page already shows a first proposal for each. Chips (what is decided is in 17.3): the selected one is outlined with an accent edge facing the work area; clicking a chip selects its window, and clicking the selected chip minimises it. Still open as well: how modeless dialogs behave in desktop mode.

### 18.3 Low-priority review items

The low-priority items of the gap review have not been reviewed. They will be taken up only if Frasquito asks.

### 18.4 Accessibility for blind and deaf users, right-to-left, High Contrast

To be done after the full design is closed:

- **Screen readers:** announcing errors, search result counts, notifications and status; calendar roles; reaching disabled menu items; naming shortcuts; linking long tooltips; reaching tab pages with nothing to focus.
- **Deaf users:** captions and visual alternatives once sound or video is added (none is used today).
- **Right-to-left languages** (Arabic, Hebrew): logical CSS properties, mirrored icons and markers, swapped Left and Right keys.
- **Windows High Contrast mode:** redraw selection, check squares, switches, the triangle and the dot with borders and system colours.

The full list is kept in [accessibility-backlog.md](accessibility-backlog.md).

## Appendix: decisions not taken

These were considered and turned down; they are listed so they are not proposed again.

| Idea | Decision |
| --- | --- |
| Alt+letter hot keys (underlined mnemonics) | Dropped for good |
| Submenus (cascading menus) | Rejected for good |
| Undo notification after a dialog closes | Rejected: a dialog that needs a way back gets a Cancel button |
| Overflow ▾ button listing all tabs | Removed: not needed; the row scrolls and the wheel scrolls it |
| Tooltips the pointer can move onto | Dropped |
| Filter name as a chip in the search field | Dropped: the filter icon turns Accent instead |
| Ring with a dot, or a second ring, to mark a second action | Rejected: a single small dot |
| Hold-to-peek or notifications to show tooltips on touch | Rejected: the Help dialog |
| Native select, datalist or date wheels | Rejected: the Ayni list picker and calendar |
| Longer notification time than 6 s | Not taken: 6 s with pause on hover |
| Knob on the splitter | Replaced by the three glyphs |
| Text labels on buttons | Not used: icon-only round buttons with tooltips |
| Data table | Out of this book: it will be a separate project |
