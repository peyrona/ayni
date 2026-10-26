/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * Base class of every control that holds a value the user edits: text fields, number and date fields, check boxes,
 * switches, radio groups, sliders, lists, list pickers and trees. Adds the read-only state and the field error.
 *
 * Field error rule: a control with an error gets the Danger border and a small red "!" inside it; the message floats
 * in a popup when the "!" is clicked or the control gets the focus.
 * @extends Component
 */
class Field extends Component {
  /**
   * @param {HTMLElement} element  The control's root element.
   * @param {object}  [options]
   * @param {boolean} [options.readOnly=false]  Starts read-only.
   * @param {boolean} [options.required=false]  An empty value is an error on check().
   * @param {(value: *) => string|null} [options.validate]  Returns an error message, or null when the value is valid.
   */
  constructor(element, options) {}

  /** @type {*} The control's value; each subclass says its type. Setting it from code never fires a change event. */
  get value() {}
  set value(value) {}

  /**
   * @type {boolean} True keeps the value visible (no border, soft tint, full-contrast text, focusable, selectable and
   * copyable) but unchangeable. Not the same as disabled, which is faded and not focusable.
   */
  get readOnly() {}
  set readOnly(on) {}

  /** @type {boolean} Whether an empty value is an error. */
  get required() {}
  set required(on) {}

  /** @type {string|null} Error message, or null for none. Setting a message shows the red "!". */
  get error() {}
  set error(message) {}

  /**
   * Runs the required and validate rules and sets or clears `error`.
   * @returns {boolean} True when the value is valid.
   */
  check() {}

  /** Opens the error popup of this control, if it has an error. */
  showError() {}
}
