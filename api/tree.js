/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * A tree view (`role="tree"`). It only browses unless the page switches editing on, one feature at a time (move,
 * insert, delete, rename, hide); an item with `lock` can't be moved, deleted or renamed, and a read-only tree can't
 * change at all. Optional fixed root, leaves, hidden items (shown muted and in italics with showHidden), children
 * loaded on first open, drag, Ctrl+Shift+arrows, cut/copy/paste, in-place rename with F2, delete with an Undo
 * notification. Mirrors the controller that Ayni.tree() returns today.
 *
 * Every change made by the user fires a cancelable event first; calling preventDefault() stops it. The methods
 * below change the tree directly and fire nothing.
 * @extends Field
 * @fires ayni:select      detail `{ item, items, path }` when the selection changes.
 * @fires ayni:open        detail `{ item, path }` on a double-click or Enter on a leaf.
 * @fires ayni:load        detail `{ item, id, path, done(items), fail(text) }` on the first open of a lazy item.
 * @fires ayni:move        Cancelable, before a move: `{ items, parent, index }`.
 * @fires ayni:insert      Cancelable, before an insert or paste: `{ items, parent, index, name, copy, from, undo }`.
 * @fires ayni:delete      Cancelable, before a delete: `{ items }`.
 * @fires ayni:rename      Cancelable, before a rename: `{ item, from, to }`.
 * @fires ayni:hide        Cancelable, before hiding or showing: `{ items, hidden }`.
 * @fires ayni:showhidden  detail `{ on }` when showHidden changes.
 */
class Tree extends Field {
  /**
   * Wraps the tree in the markup or, when `options.items` is given, builds its items from data first.
   * @param {HTMLElement} element  The `role="tree"` element.
   * @param {object}  [options]  Same as Field, plus:
   * @param {TreeItemData|null} [options.root]   Optional fixed root item.
   * @param {TreeItemData[]}    [options.items]  Top-level items (the root's children when there is a root).
   * @param {boolean} [options.icons=true]       Shows the item icons.
   * @param {Array<'move'|'insert'|'delete'|'rename'|'hide'>} [options.edit]  Editing features switched on.
   * @param {boolean} [options.multiple=false]   Multiple selection.
   * @param {boolean} [options.unique=false]     Sibling names must differ when renaming.
   * @param {Menu}    [options.menu]             Pop-up menu for the items.
   */
  constructor(element, options) {}

  /** @type {string[]} Ids of the selected items. */
  get value() {}
  set value(ids) {}

  /** @type {Array<'move'|'insert'|'delete'|'rename'|'hide'>} Editing features switched on. */
  get edit() {}
  set edit(features) {}

  /** @type {boolean} Multiple selection. */
  get multiple() {}
  set multiple(on) {}

  /** @type {boolean} Sibling names must differ when renaming. */
  get unique() {}
  set unique(on) {}

  /** @type {boolean} Shows the hidden items, muted and in italics. */
  get showHidden() {}
  set showHidden(on) {}

  /** @type {HTMLElement|null} The root item, if the tree has one. Read-only. */
  get root() {}

  /** @type {HTMLElement|null} The item with the keyboard focus. */
  get current() {}
  set current(item) {}

  /** @type {HTMLElement[]} The selected items. Read-only: use select(). */
  get selected() {}

  /**
   * Replaces every item.
   * @param {{root?: TreeItemData|null, items: TreeItemData[], icons?: boolean}} data
   */
  build(data) {}

  /**
   * Returns the whole tree as data, in the shape build() takes.
   * @returns {{root: TreeItemData|null, items: TreeItemData[], icons?: boolean}}
   */
  data() {}

  /**
   * Adds an item.
   * @param {HTMLElement|null} parent  Parent item; null for the top level (inside the root, when there is one).
   * @param {TreeItemData} item
   * @param {number} [index]           Position among the siblings; at the end when left out.
   * @returns {HTMLElement} The new item.
   */
  add(parent, item, index) {}

  /**
   * Removes an item with its children (no Undo).
   * @param {HTMLElement} item
   */
  remove(item) {}

  /**
   * Renames an item.
   * @param {HTMLElement} item
   * @param {string} name
   */
  rename(item, name) {}

  /**
   * Moves an item.
   * @param {HTMLElement} item
   * @param {HTMLElement|null} parent
   * @param {number} index  Position among the new siblings.
   */
  move(item, parent, index) {}

  /**
   * Hides or shows an item.
   * @param {HTMLElement} item
   * @param {boolean} [on=true]
   */
  hide(item, on) {}

  /**
   * Opens a folder, loading its children first if it is lazy.
   * @param {HTMLElement} item
   */
  expand(item) {}

  /**
   * Closes a folder.
   * @param {HTMLElement} item
   */
  collapse(item) {}

  /** Opens every folder; lazy folders that never loaded stay closed. */
  expandAll() {}

  /** Closes every folder. */
  collapseAll() {}

  /**
   * Opens the folders above an item and scrolls it into view.
   * @param {HTMLElement} item
   */
  reveal(item) {}

  /**
   * Selects items (only the last one in single selection).
   * @param {...HTMLElement} items
   */
  select(...items) {}

  /**
   * Finds an item by its id.
   * @param {string} id
   * @returns {HTMLElement|null}
   */
  find(id) {}

  /**
   * Names of an item and its ancestors, from the top.
   * @param {HTMLElement} item
   * @returns {string[]}
   */
  pathOf(item) {}

  /**
   * Starts renaming an item in place, as F2 does.
   * @param {HTMLElement} item
   */
  startRename(item) {}

  /** Reads the markup again after the page changed it directly. */
  refresh() {}
}

/**
 * One tree item as data, as Tree.build() takes it and Tree.data() returns it.
 * @typedef {object} TreeItemData
 * @property {string}  name
 * @property {string}  [id]
 * @property {string|false} [icon]  Icon id, or false for none.
 * @property {boolean} [leaf]       Can't hold children.
 * @property {boolean} [hidden]
 * @property {boolean} [lock]       Can't be moved, deleted or renamed.
 * @property {boolean} [disabled]
 * @property {boolean} [open]
 * @property {boolean} [lazy]       Its children load the first time it opens (ayni:load).
 * @property {TreeItemData[]} [children]
 */
