/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * window.Ayni: the classes, plus the page-wide services that are not controls and so stay plain functions.
 * @namespace Ayni
 */
const Ayni = {
  /** @type {string} Library version. */
  version: '0.1.0',

  Component, Button, Field, TextField, PasswordField, SearchField, TextArea, NumberField,
  CheckBox, Switch, RadioGroup, Slider, ListBox, ListPicker, Tree,
  Calendar, DateField, DateTimeField, Tabs, Dialog, Splitter, Menu, MenuBar, Toolbar,
  Desktop, Taskbar, Launcher, Window,

  /**
   * Wires every control inside `root` and creates its instance. Runs on the whole page when it loads; call it again
   * for content added later. A control is never wired twice.
   * @param {ParentNode} [root=document]
   */
  init(root) {},

  /**
   * Returns the instance of a control, creating it if the element was never wired.
   * @param {HTMLElement|string} element  The element, or a selector.
   * @returns {Component|null} Null when the element is not an Ayni control.
   */
  get(element) {},

  /**
   * Shows a notification (ayni-toasts.js). It closes after 6 s (pausing while the pointer is over it) unless it
   * persists; errors persist by default. It always has a close button. Notifications stack.
   * With `undo` it has an Undo button and says "Ctrl+Z also undoes"; Ctrl+Z works while it shows. One Undo at a time:
   * it becomes final when its time is up, it is closed, a newer Undo comes, settleUndo() is called or the page
   * closes; then `final` runs, once.
   * @param {'info'|'ok'|'warn'|'err'} kind
   * @param {string} text
   * @param {object} [options]
   * @param {() => void} [options.undo]  Puts the action back.
   * @param {() => void} [options.final]  Runs once when the Undo is final (e.g. the real delete).
   * @param {boolean} [options.keepOnLeave]  A closing page does not run `final`.
   * @param {{label: string, icon: string, run: () => void}} [options.action]  One other action button ("Retry").
   * @param {boolean} [options.persist]  Stays until closed. True by default for 'err'.
   * @returns {{close: () => void}}  close() on an Undo makes it final.
   */
  toast(kind, text, options) {},

  /** The Undo on show (if any) is final now: its `final` runs (an editor or a game on its next key). */
  settleUndo() {},

  /**
   * Shows a progress notification (ayni-toasts.js) once the job has run 600 ms; it stays until end().
   * @param {string} text
   * @param {object} [options]
   * @param {number|null} [options.pct]  0-100, or null when no end is known (the fill slides).
   * @param {() => void} [options.onStop]  Adds a Stop button.
   * @returns {{set: (text: string, pct: number|null) => void, end: () => void}}
   */
  progress(text, options) {},

  /**
   * Builds a dialog in code (ayni-dialogs.js): a `dialog.panel` with a title row, a body and a bottom row.
   * @param {object} [options]
   * @param {string} [options.title]
   * @param {boolean} [options.big]  A big dialog (lists, editors).
   * @param {string} [options.cls]  More classes.  @param {string} [options.id]
   * @returns {{dialog: HTMLDialogElement, header: HTMLElement, body: HTMLElement, footer: HTMLElement,
   *   place: (buttons: HTMLButtonElement[]) => void, show: () => void, close: () => boolean}}
   *   place() puts a lone Close in the title row, other buttons in the bottom row; show() opens it as modal;
   *   close() closes and removes it, true only the first time.
   */
  dialog(options) {},

  /**
   * A dialog button made in code (ayni-dialogs.js).
   * @param {'close'|'primary'|'danger'|''} role  'close' is marked data-close: Esc presses it.
   * @param {string} tip  Tooltip and name.
   * @param {string} [icon]  Instead of the role's icon (close, check, trash).
   * @returns {HTMLButtonElement}
   */
  dialogButton(role, tip, icon) {},

  /**
   * Asks for a confirmation (ayni-dialogs.js). A danger action is never the default; Esc means Cancel.
   * @param {object|string} options  { title, body, confirm, danger, other, otherIcon, cancel }, or the body text.
   * @returns {Promise<true|false|'other'>}
   */
  confirm(options) {},

  /**
   * Shows a message with Close in its title row (ayni-dialogs.js).
   * @param {object|string} options  { title, body, confirm }, or the body text.
   * @returns {Promise<void>}
   */
  alert(options) {},

  /**
   * Asks for one text, a name (ayni-dialogs.js). An empty field is never an answer.
   * @param {object} options  { title, label, placeholder, value, hint, max, okTip, ids: { input, ok, cancel } }
   * @param {(text: string) => (string|false)} [options.check]  The answer for the text, or false to keep asking.
   * @returns {Promise<string|null>}  null when cancelled.
   */
  ask(options) {},

  /**
   * Saves a dialog field as it changes (ayni-dialogs.js): on change, and after `wait` ms of typing.
   * A failed save puts the last good value back and shows "Could not save." in `msg`.
   * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field
   * @param {(value: string|boolean) => Promise<void>} save
   * @param {object} [options]  { wait = 700, msg, fail, done(value) }
   * @returns {{saved: (value: string|boolean) => void}}  Tell it a value the app stored itself.
   */
  autoSave(field, save, options) {},

  /**
   * A menu built from a list (ayni-menus.js), under a button or at a point. Items run after the menu has closed.
   * @param {Array<{id?: string, label: string, icon?: string, key?: string|string[], danger?: boolean, disabled?: boolean,
   *   why?: string, checked?: boolean, sub?: Array|Function, run?: (e: Event) => void}|{sep: true}|{caption: string}>} items
   *   `checked` true or false makes a check item; `sub` is a submenu (one level), or a function that returns it.
   * @param {object} [options]  { anchor, x, y, keyboard, onClose }; keyboard: true focuses the first item.
   * @returns {{close: () => void}|null}  null when nothing was shown.
   */
  menuAt(items, options) {},

  /**
   * A long tap that acts while the finger is still down (ayni-menus.js), as picking in a list does: the ring fills
   * for the hold time, then fn runs; the click its release leaves is swallowed.
   * @param {HTMLElement} area
   * @param {string} selector  The elements a long tap counts on.
   * @param {(el: HTMLElement, x: number, y: number) => void} fn
   */
  longTap(area, selector, fn) {},

  /**
   * A shortcut as menus and tooltips show it (ayni-menus.js): "Ctrl+C", or "⌘C" on Mac, in the page's language.
   * @param {string|string[]} keys  An array gives its first one.
   * @returns {string}
   */
  keyLabel(keys) {},

  /**
   * Makes a title row fit (ayni-menus.js): tools with `data-rank` leave, highest first, into one More menu at the start
   * of the system group (`.tb-group.tb-sys`), listed in toolbar order, then the app's own items.
   * @param {HTMLElement|string} row
   * @param {object} [options]  { more: () => items (as for menuAt), btn: the app's own More button }
   * @returns {{fit: () => void, later: () => void, set: (options: object) => void, items: () => Array, button: HTMLButtonElement}}
   */
  fitBar(row, options) {},

  /**
   * Markup of one icon, `<span class="icon" data-icon="name">`, drawn from the icon set in use.
   * @param {string} name  An Ayni icon name, or the app's own (a symbol with id "i-<name>", or a name in the set's map).
   * @returns {string}
   */
  icon(name) {},

  /**
   * Changes the icon of an element, or of the first icon inside it (a button, a menu item).
   * @param {HTMLElement} element
   * @param {string} name
   */
  setIcon(element, name) {},

  /** Icon sets. */
  icons: {
    /** @type {string[]} The icon names the controls use. A set's map should cover all of them. */
    names: [],

    /**
     * Plugs in another icon set and redraws every icon on the page; null goes back to the built-in set. A name the
     * map leaves out keeps the built-in icon, and the console lists the control icons the set does not map.
     * @param {object|null} set
     * @param {Object<string, string>} set.map  Ayni name → the set's name.
     * @param {string} [set.sprite]  SVG symbols, as markup or a URL to fetch.
     * @param {string} [set.id='{name}']  Symbol id in the sprite.
     * @param {boolean} [set.stroke=false]  The set draws with lines, like Ayni's own icons.
     * @param {(name: string) => string} [set.render]  Instead of a sprite: markup for one icon, e.g. an icon font.
     * @returns {Promise<void>} Rejects when the sprite cannot be fetched.
     */
    use(set) {},
  },

  /**
   * Writes the status line (the element with data-ayni-status).
   * @param {string} text
   */
  status(text) {},

  /**
   * Sets light or dark mode, or follows the system again. The choice is kept in localStorage ('ayni-theme').
   * @param {'light'|'dark'|'system'} theme
   */
  setTheme(theme) {},

  /** @returns {boolean} True while dark mode shows. */
  isDark() {},

  /** @returns {boolean} True from 1024 px wide, where desktop mode exists; ayni:desktopmode { on } fires when it changes. */
  isDesktop() {},

  /** @returns {boolean} True on touch devices, or while the touch preview is on. */
  isTouch() {},

  /**
   * Shows the page as on a touch device, to try it on a desktop.
   * @param {boolean} on
   */
  setTouchPreview(on) {},

  /**
   * Fills the help dialog used on touch, where there are no tooltips: every element of the view with its icon, its
   * tooltip and a short explanation (data-help on an element gives its own).
   * @param {HTMLElement} body  The dialog's body.
   * @param {Array<[string, HTMLElement]>} entries  [group name, element] pairs, in order.
   */
  fillHelp(body, entries) {},

  /**
   * Focuses the first control with an error inside `root`.
   * @param {ParentNode} [root=document]
   * @returns {boolean} False when there is none.
   */
  focusFirstError(root) {},

  /** Date helpers shared by the date controls. */
  dates: {
    /**
     * @param {Date} date
     * @returns {string} YYYY-MM-DD
     */
    iso(date) {},

    /**
     * @param {string} text  YYYY-MM-DD
     * @returns {Date|null} Null when it is not a valid date.
     */
    parseIso(text) {},

    /**
     * @param {Date} date
     * @returns {string} e.g. "Monday, 26 October 2026"
     */
    formatLong(date) {},

    /**
     * @param {Date} date
     * @returns {string} YYYY-MM-DD HH:MM
     */
    formatDateTime(date) {},

    /**
     * @param {string} text  YYYY-MM-DD HH:MM
     * @returns {Date|null} Null when it is not valid.
     */
    parseDateTime(text) {},
  },
};
