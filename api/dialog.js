/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * A dialog (`<dialog class="panel">`), modal or not. Esc always closes it, and closing is not cancelling: changes are
 * kept. Dialogs avoid Cancel/Accept: changes apply as they are made or when the dialog closes; a dialog gets a Cancel
 * button only when a way back is needed. A dialog with only a close button has it in the title row, at the right;
 * otherwise its buttons sit in a bottom row (Cancel/Accept at the right, extra actions at the left). Enter runs the
 * default button.
 * @extends Component
 * @fires close  Native, when it closes; returnValue says how.
 */
class Dialog extends Component {
  /**
   * @param {HTMLDialogElement} element
   * @param {object}  [options]
   * @param {boolean} [options.modal=true]  Modal dialogs dim the page and close on a click on the backdrop.
   */
  constructor(element, options) {}

  /** @type {boolean} True while open. */
  get isOpen() {}

  /** @type {boolean} Whether it opens as modal. */
  get modal() {}
  set modal(on) {}

  /** @type {string} Title text. */
  get title() {}
  set title(text) {}

  /** @type {Button|null} The default button, if it has one. Read-only. */
  get defaultButton() {}

  /**
   * Opens the dialog and focuses its first control.
   * @param {HTMLElement} [opener]  Gets the focus back when it closes; the focused element when left out.
   * @returns {Promise<string>} Resolves when it closes, with the returnValue ('close', 'cancel', or a button's value).
   */
  open(opener) {}

  /**
   * Closes the dialog.
   * @param {string} [returnValue='close']
   */
  close(returnValue) {}

  /**
   * Focuses the first control with an error inside the dialog.
   * @returns {boolean} False when there is none.
   */
  focusFirstError() {}
}
