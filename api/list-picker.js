/* Ayni API, skeleton only (2026-10-26; updated 2026-11-02 for the pickers family): every body is empty. See api/README.md.
   The working code is Ayni.picker(element, options) in ayni-pickers.js, which returns this controller. */

/**
 * The one list picker for every drop-down list, filtered list and combo box, on every device: Ayni never uses the
 * native select or the phone wheel. Drop-down list: typing off, picks one of the items. Filtered list: typing narrows
 * the list, only an item is taken. Combo box: typing on, the typed text filters the suggestions and may also be kept
 * as a value of its own. The field shows the chosen item's text (or its short text) and the small down-pointing
 * triangle; the page gets the item's value.
 * @extends Field
 * @fires ayni:change  detail `{ value, text, name, field, input }` when the user picks or types a value (never on `set`).
 */
class ListPicker extends Field {
  /**
   * @param {HTMLElement} element  The `.picker` element: empty (Ayni writes its parts) or written in the page.
   * @param {object}  [options]  Same as Field, plus:
   * @param {'list'|'filter'|'combo'} [options.mode='list']  Drop-down list, filtered list or combo box.
   * @param {Array<string|{value: string, text: string, short?: string, disabled?: boolean}|{heading: string}>} [options.options]  The
   *   items, with optional headings; replaces the items in the markup.
   * @param {string}  [options.value]  The value to show at first.
   * @param {string}  [options.placeholder]  Shown dim while nothing is chosen.
   * @param {boolean} [options.disabled=false]
   * @param {function(string, string)} [options.onChange]  `(value, text)` on a user pick, as `ayni:change`.
   */
  constructor(element, options) {}

  /** @type {'list'|'filter'|'combo'} Read-only (set in the markup or the options). */
  get mode() {}

  /** @type {string} Current value. Setting it is `set(value)`. */
  get value() {}
  set value(value) {}

  /** @type {string} The chosen item's full text, the text given to `set`, or what was typed in a combo box. Read-only. */
  get text() {}

  /** @type {Array<{value: string, text: string, short?: string}>} The items, in order, without headings. Setting it
   *  replaces them all (headings may be included). */
  get options() {}
  set options(list) {}

  /**
   * Shows a value without telling the page. `text` shows a value the list does not hold (a font the document uses);
   * an empty value shows the placeholder.
   * @param {string} value
   * @param {string} [text]
   */
  set(value, text) {}

  /**
   * Picks a value as the user would, for a menu that mirrors the picker (a Format menu's Font): fires `ayni:change`
   * and `onChange`, as a pick in the list does.
   * @param {string} value
   * @param {string} [text]
   */
  choose(value, text) {}

  /** @type {boolean} Faded, not focusable, never opens. */
  get disabled() {}
  set disabled(on) {}

  /** @type {boolean} True while the list is open. */
  get isOpen() {}

  /** Opens the list, with the current value highlighted. */
  open() {}

  /** Closes the list. */
  close() {}
}
