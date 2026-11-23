# Ayni - rules for Claude

## Ayni is the source of the UI

Ayni is the UI library; apps use it, they never fork it. Nayive
(github.com/peyrona/nayive) has this repo as a git submodule at
`client/apps/shared/ayni/`: that folder IS this repo, not a copy.

- A UI change may be built and tried inside an app, but it is committed HERE,
  in Ayni, in the same task. The app then records the new Ayni commit.
- Nayive's pre-build (`tools/check-ayni.sh`) fails while this repo has
  uncommitted changes or Nayive records another Ayni commit.
- Add new items to `CHANGELOG.md` (Unreleased) and `docs/reference.md`.
- Tests: `node tests/run.mjs` (must end ALL GREEN) and
  `go -C tools run ./check-i18n -dict ../i18n`.

## Data code

Files that start with a `// DATA:` line (ayni-net.js, ayni-store.js,
ayni-doc.js, ayni-vault.js, formats/ical.js) decide what reaches the disk. A
change there is a data change: keep it minimal, and the app's data-safety
tests must be run afterwards (in Nayive the user runs them himself - never run
them for him).

## Public repo

Never put private data here: no IP addresses, ports, server user names, real
names or e-mail addresses. `deploy.local.sh` holds the private address and is
git-ignored.
