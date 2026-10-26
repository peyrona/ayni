/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * A round, icon-only button with a tooltip. Wraps an existing `<button class="btn">`.
 *
 * Rules it enforces:
 * - Every button has a tooltip.
 * - Meaning (danger, ok, warn) is shown by the icon colour; the background fill only marks the default button.
 * - A danger button is never the default.
 * - A button that opens a popup shows the triangle and can't have a second action.
 * - A button with a second action shows the dot; its single click waits about 250 ms so that a double-click runs
 *   only the second action. A long tap (touch) or Shift+Enter also runs it.
 *
 * @example
 * const save = new Ayni.Button(document.querySelector('#save'), { tip: 'Save', icon: 'save', isDefault: true });
 * save.on('press', async () => { save.busy('Saving…'); await store(); save.idle(); });
 *
 * @fires ayni:press  detail `{ second, label }`: `second` is true for the second action, `label` names the action.
 */
class Button extends Component {
  /**
   * @param {HTMLButtonElement} element
   * @param {object}  [options]
   * @param {string}  [options.tip]              Tooltip. Defaults to the element's data-tip.
   * @param {string}  [options.icon]             Icon id from ayni-icons.js.
   * @param {'normal'|'danger'|'ok'|'warn'} [options.kind='normal']  Meaning, shown by the icon colour.
   * @param {boolean} [options.isDefault=false]  The filled default button of its panel (Enter runs it).
   * @param {string}  [options.secondAction]     What the second action does; shows the dot.
   * @param {string}  [options.popup]            Id of the popup or menu it opens; shows the triangle.
   * @param {boolean} [options.toggle=false]     Holds an on/off state (pressed).
   * @throws {Error} If the options break a rule (danger + default, popup + second action).
   */
  constructor(element, options) {}

  /** @type {string} Tooltip text. */
  get tip() {}
  set tip(text) {}

  /** @type {string} Icon id. */
  get icon() {}
  set icon(id) {}

  /** @type {'normal'|'danger'|'ok'|'warn'} Meaning of the button. Setting danger removes the default mark. */
  get kind() {}
  set kind(kind) {}

  /** @type {boolean} Whether it is its panel's default button. Throws on a danger button. */
  get isDefault() {}
  set isDefault(on) {}

  /** @type {string|null} Label of the second action, or null for none. Throws on a button that opens a popup. */
  get secondAction() {}
  set secondAction(label) {}

  /** @type {string|null} Id of the popup or menu it opens, or null. Throws if the button has a second action. */
  get popup() {}
  set popup(id) {}

  /** @type {boolean|null} For a toggle button, whether it is pressed; null for a plain button. */
  get pressed() {}
  set pressed(on) {}

  /** @type {boolean} True while the spinner shows. Read-only: use busy() and idle(). */
  get isBusy() {}

  /**
   * Swaps the icon for a spinner and shows `label` as the tooltip.
   * @param {string} label  What is going on, e.g. "Saving…".
   */
  busy(label) {}

  /** Brings back the icon and the tooltip it had before busy(). */
  idle() {}

  /**
   * Disables the button and says why in its tooltip, e.g. "Delete: nothing selected".
   * @param {string} [reason]
   */
  disable(reason) {}

  /** Enables the button and brings back its normal tooltip. Same as `enabled = true`. */
  enable() {}

  /** Runs the main action as if clicked, without the 250 ms wait. Does nothing while disabled or busy. */
  press() {}

  /** Runs the second action. Does nothing on a button without one, or while disabled or busy. */
  pressSecond() {}
}
