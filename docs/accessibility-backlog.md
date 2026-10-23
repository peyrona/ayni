# Deferred until the design is closed: blind and deaf users, High Contrast mode, right-to-left

Frasquito decided on 2026-10-22 to handle all work for blind and deaf users (screen readers, ARIA, live regions, announcements, captions) **after the full Ayni design is closed**. On the same day Frasquito postponed right-to-left (RTL) language support and Windows High Contrast mode the same way. Do not forget them.

These items come from the review of the components gallery (the "gap review") and keep their original numbers.

## Removed items

| # | Control | Item | What is missing |
| --- | --- | --- | --- |
| 35 | Text field | Errors are not announced | When the email error appears, a screen reader says nothing; needs a live region or `aria-errormessage`. |
| 38 | Search field | Result count not announced | The filtered result line is not a live region, so screen reader users don't hear how many matched. |
| 46 | Calendar | Calendar for screen readers | `aria-selected` sits on buttons, where it is not valid; today has no `aria-current="date"`; the month live region is rebuilt on each change, so it may not be read. |
| 48 | Date field | Date popup has no dialog role | The date-and-time popup is a dialog for screen readers, the date-only popup is not. |
| 54 | Menus | Disabled menu items are skipped | Arrow keys jump over Redo, so screen reader users never learn it exists; usual practice is to focus it and say it is unavailable. |
| 60 | Notifications | Notifications may not be read aloud | Each notification creates its own live region together with the text, which many screen readers skip; use one live region that is always on the page. |
| 61 | Status bar | Status bar is too talkative | The whole strip is live, so every tab and selection change is read aloud; only the message part should be. |
| 67 | Tabs | Tab page with nothing to focus | Pages like "No comments yet" can't be reached with Tab, so screen readers may skip them (give the tab panel `tabindex="0"`). |

## Right-to-left languages

| # | Control | Item | What is missing |
| --- | --- | --- | --- |
| 9 | All | Right-to-left languages (Arabic, Hebrew) | The CSS uses left/right instead of start/end (padding-left, left, margin-left:auto, text-align:left), the switch knob slides by a fixed amount, chevrons don't flip, the dot/triangle and notification corner don't mirror, and Left/Right keys in tabs, menu bar, toolbar, splitter and calendar aren't swapped. Fix: logical CSS properties, flip directional icons under `[dir=rtl]`, swap Left/Right in key handlers. |

## Windows High Contrast mode

| # | Control | Item | What is missing |
| --- | --- | --- | --- |
| 10 | All | Windows High Contrast (forced colours) mode | Selected list items, the multi-select check square, the switch, the popup triangle and the second-action dot are drawn as backgrounds, which that mode removes, so they vanish. Fix: a `@media (forced-colors: active)` block that redraws them with borders and system colours (Highlight, ButtonText). |

## Parts removed from items that stay in the report

| # | Item | Screen reader part taken out |
| --- | --- | --- |
| 23 | Toggle labels | The password button changes both its name (Show/Hide) and its pressed state, so a screen reader hears "Hide password, pressed". Pick one. |
| 42 | Text area limit | The character count is not announced. |
| 44 | Progress states | The spinner says "Loading" twice (its `aria-label` plus the visible text). |
| 51 | Slider details | Volume is read as "60", not "60 percent" (needs `aria-valuetext`). |
| 55 | Menu type-ahead and shortcuts | The shortcuts shown (Ctrl+S) are not given to screen readers (`aria-keyshortcuts`). |
| 59 | Undo vanishes in 6 seconds | Screen reader users also can't reach the notification in time. |
| 62 | Tooltips you can point at | A long tooltip like Share's is not linked to the button (`aria-describedby`), so screen readers only hear "Share". |
| 11 | One pattern for disabled buttons | Stays in the report as is; when this is done, check that the button name is read and that it says why it is off. |

Nothing in the gallery uses sound or video yet, so there are no items for deaf users so far; captions and visual alternatives to sounds belong here when media is added.
