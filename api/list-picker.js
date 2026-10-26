/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * The one list picker for every drop-down list and combo box, on every device: Ayni never uses the native select or
 * the phone wheel. Drop-down list: typing off, picks one of the options. Combo box: typing on, the typed text filters
 * the options and may also be kept as a value of its own. The field shows the small down-pointing triangle.
 * @extends Field
 * @fires ayni:change  detail `{ value, name, field, input }` when the user picks or types a value.
 */
class ListPicker extends Field {
  /**
   * @param {HTMLElement} element  The `.picker` element (field, hidden input and popup list).
   * @param {object}  [options]  Same as Field, plus:
   * @param {boolean} [options.combo=false]  Typing on (combo box).
   * @param {Array<string|{value: string, text: string}>} [options.options]  Replaces the options in the markup.
   */
  constructor(element, options) {}

  /** @type {boolean} True for a combo box. Read-only (set in the markup or the options). */
  get combo() {}

  /** @type {string} Current value. */
  get value() {}
  set value(value) {}

  /** @type {string} Text shown in the field; in a combo box it may match no option. Read-only. */
  get text() {}

  /** @type {Array<{value: string, text: string}>} The options, in order. Setting it replaces them all. */
  get options() {}
  set options(list) {}

  /** @type {boolean} True while the list is open. */
  get isOpen() {}

  /** Opens the list, with the current value highlighted. */
  open() {}

  /** Closes the list. */
  close() {}
}
