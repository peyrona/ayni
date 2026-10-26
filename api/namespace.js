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
   * Shows a notification. It closes after 6 s (pausing while the pointer is over it) unless it persists; errors
   * persist by default. It always has a close button. With an Undo action it also says "Ctrl+Z also undoes", and
   * Ctrl+Z keeps working after it is gone, until another undoable action replaces it.
   * @param {'info'|'ok'|'warn'|'err'} kind
   * @param {string} text
   * @param {object} [options]
   * @param {{label: string, icon: string, run: () => void}} [options.action]  One action button, e.g. Undo.
   * @param {boolean} [options.persist]  Stays until closed. True by default for 'err'.
   * @returns {{close: () => void}}
   */
  toast(kind, text, options) {},

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
