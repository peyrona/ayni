# Ayni API (skeletons)

A proposal for the programming interface of Ayni: one vanilla JavaScript class per component. These files are
**skeletons only**: each class has its constructor, properties and methods, every body is empty, and everything is
documented with JSDoc (`/** … */`). Nothing here is loaded by `ayni.js` yet.

## How it works

- A class **wraps markup that is already in the page**; it never builds its own markup. The one exception is `Tree`,
  which can build its items from data, as `Ayni.tree()` already does.
- `Ayni.init()` keeps wiring the page as today and creates one instance per control. `Ayni.get(element)` returns it.
- State is exposed as properties (`button.tip = 'Save'`, `field.value`), actions as methods (`dialog.open()`).
  Setting a value from code never fires a change event.
- The `ayni:*` DOM events stay as they are; `on()` and `off()` are a shorthand for them.
- Rules live in the class: for example, `Button` refuses a danger button as the default, and a second action on a
  button that opens a popup.

```js
const save = new Ayni.Button(document.querySelector('#save'), { tip: 'Save', icon: 'save', isDefault: true });
save.on('press', async () => { save.busy('Saving…'); await store(); save.idle(); });
```

## Classes

| Class | Extends | File | What it wraps |
| --- | --- | --- | --- |
| `Component` | | `component.js` | Base of every control: element, enabled, focus, events, destroy |
| `Button` | Component | `button.js` | Round icon button: tooltip, kind, default, second action, popup, busy |
| `Field` | Component | `field.js` | Base of every control with a value: value, read-only, required, error |
| `TextField` | Field | `text-field.js` | One-line text field, with buttons inside it |
| `PasswordField` | TextField | `password-field.js` | Password with the show/hide button |
| `SearchField` | TextField | `search-field.js` | Search field: magnifier, clear, optional filter |
| `TextArea` | TextField | `text-area.js` | Multi-line text: optional count and auto-grow |
| `NumberField` | Field | `number-field.js` | Number with − and + |
| `CheckBox` | Field | `check-box.js` | Check box |
| `Switch` | CheckBox | `switch.js` | One-sided switch |
| `RadioGroup` | Field | `radio-group.js` | Radio buttons, and the two-sided switch |
| `Slider` | Field | `slider.js` | Slider with its value |
| `ListBox` | Field | `list-box.js` | List, single or multiple selection |
| `ListPicker` | Field | `list-picker.js` | Drop-down list and combo box |
| `Tree` | Field | `tree.js` | Tree view, with editing |
| `Calendar` | Field | `calendar.js` | Calendar |
| `DateField` | TextField | `date-field.js` | Date, typed or picked |
| `DateTimeField` | DateField | `date-time-field.js` | Date and time |
| `Tabs` | Component | `tabs.js` | Tabs and their panels |
| `Dialog` | Component | `dialog.js` | Dialog, modal or not |
| `Splitter` | Component | `splitter.js` | Splitter between two panes |
| `Menu` | Component | `menu.js` | Popup menu and pop-up (context) menu |
| `MenuBar` | Component | `menu-bar.js` | Menu bar |
| `Toolbar` | Component | `toolbar.js` | Toolbar |
| `Desktop` | Component | `desktop.js` | Desktop mode: the window area and the taskbar |
| `Taskbar` | Component | `taskbar.js` | Taskbar on any screen edge: launcher, window chips, widgets |
| `Launcher` | Component | `launcher.js` | Applications popup with search |
| `Window` | Component | `window.js` | Window: title row with icon, name and toolbar; controls in its chip |

`namespace.js` holds `window.Ayni`: the classes plus the page-wide services, which are not controls and stay plain
functions (`init`, `get`, `toast`, `status`, `setTheme`, `isDark`, `isTouch`, `setTouchPreview`, `fillHelp`,
`focusFirstError`, `dates`).

## Not classes

- Plain markup and CSS: labels, the info label, tooltips (`data-tip`), group boxes and the read-only look. Field
  errors are the `error` property of `Field`.
- Plain markup: the clock widget (`.widget.clock`) and app widgets (`.widget`).
- Left out on purpose: the data table (its own project) and
  the accessibility work (after the design is closed, see `docs/accessibility-backlog.md`).

## Load order

Base classes first: `component.js`, `button.js`, `field.js`, `text-field.js`, then the rest (`desktop.js` after `taskbar.js` and `window.js`), and `namespace.js` last.
