# Upgrade Node, pnpm, and React Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the monorepo to current LTS Node, a supported pnpm release, and React 19 for development/examples while keeping the published library usable by React 18+ consumers.

**Architecture:** Upgrade in layered PRs so each layer is independently mergeable: (1) Node engines + CI, (2) pnpm pin within the 10.x line, (3) optional pnpm 11 migration, (4) React 19 + types + Testing Library in the workspace, (5) library peer/docs/version polish. Do not combine Node/pnpm infra with React API changes in one PR.

**Tech Stack:** Node.js, pnpm workspaces, React / React DOM, Vitest browser (Playwright), TypeScript, GitHub Actions.

## Global Constraints

- Target Node engines floor: `>=22` (drop Node 20; aligns with Actions and future pnpm 11).
- Target CI Node: `24` (current LTS “Krypton” as of plan writing; pin major only: `node-version: 24`).
- Target pnpm (required path): `pnpm@10.34.5` via root `packageManager` (latest 10.x; lockfile v9 compatible).
- Target pnpm (optional follow-up): `pnpm@11.16.0` only after Node 22+ is merged; requires `packageManager` update and moving `pnpm.overrides` out of `package.json` into `pnpm-workspace.yaml` if pnpm 11 ignores the `pnpm` field.
- Target React (workspace): `react@19.2.8`, `react-dom@19.2.8`, `@types/react@^19.2.17`, `@types/react-dom@^19.2.3`.
- Published peerDependency must remain `react: ">=18"` so React 18 apps keep installing the library; workspace *dev* React becomes 19.
- Do not bump `@bengreenier/react-user-media` package version unless Task 5 explicitly ships a release commit.
- Keep Vitest browser + Playwright as the test runner; do not switch to jsdom for this upgrade.
- Every task ends with `pnpm run lint && pnpm run build && pnpm run test` green (from repo root).
- Prefer one PR per task below (Task 3 is optional and may be deferred).

## Current baseline (main)

| Surface | Today |
|---------|--------|
| `engines.node` | `>=20` |
| CI / Pages Node | `22` |
| `packageManager` | `pnpm@10.15.1` |
| Library peer | `react: ">=18"` |
| Library / examples React | `^18.3.1` |
| `@types/react` | `^18.3.x` |

## Target end state

| Surface | Target |
|---------|--------|
| `engines.node` | `>=22` |
| CI / Pages Node | `24` |
| `packageManager` | `pnpm@10.34.5` (or `pnpm@11.16.0` if Task 3 done) |
| Library peer | `react: ">=18"` (unchanged range) |
| Workspace React | `19.2.8` |
| Types | `@types/react` / `@types/react-dom` 19.x |

## File map

| File | Role |
|------|------|
| `package.json` | Root `engines`, `packageManager`, `pnpm.overrides` |
| `pnpm-workspace.yaml` | Workspace packages; destination for overrides if pnpm 11 |
| `.github/workflows/ci_cd.yml` | Node version for build + publish |
| `.github/workflows/github_pages.yml` | Node version for docs deploy |
| `packages/react-user-media/package.json` | peer + React/types/testing-library deps |
| `packages/examples/package.json` | App React 19 + types |
| `packages/react-user-media/src/components/*Player.tsx` | `forwardRef` still valid on React 19; only change if types force it |
| `README.md` / package README | Node/React support statements |

---

### Task 1: Raise Node engines and CI to LTS 24

**Files:**
- Modify: `package.json` (`engines.node`)
- Modify: `.github/workflows/ci_cd.yml` (both `node-version` keys)
- Modify: `.github/workflows/github_pages.yml` (`node-version`)
- Modify: root `README.md` and/or `packages/react-user-media/README.md` only if they mention Node 20

**Interfaces:**
- Consumes: none
- Produces: `engines.node: ">=22"`; Actions `node-version: 24`

- [ ] **Step 1: Update engines**

In `package.json`, change:

```json
"engines": {
  "node": ">=22"
}
```

- [ ] **Step 2: Update CI Node**

In `.github/workflows/ci_cd.yml`, set both jobs:

```yaml
node-version: 24
```

In `.github/workflows/github_pages.yml`:

```yaml
node-version: 24
```

Do not change `pnpm/action-setup` in this task.

- [ ] **Step 3: Align `@types/node` override with Node 22+ types**

In root `package.json` `pnpm.overrides`, bump:

```json
"@types/node": "^22.15.0"
```

(or latest `^22` that installs cleanly; do not jump to `@types/node` 24 unless intentionally tracking Node 24 typings).

- [ ] **Step 4: Verify**

```bash
node -v   # local should be >=22
pnpm install
pnpm run lint
pnpm run build
pnpm run test
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add package.json .github/workflows/ci_cd.yml .github/workflows/github_pages.yml
git commit -m "chore(engines): require Node >=22 and run CI on Node 24"
```

**PR title:** `chore(engines): Node >=22, CI on 24`

---

### Task 2: Bump pnpm 10.15.1 → 10.34.5

**Files:**
- Modify: `package.json` (`packageManager` only)
- Modify: `pnpm-lock.yaml` (via install; expect churn)

**Interfaces:**
- Consumes: Task 1 Node floor (CI already on 22+/24)
- Produces: `packageManager: "pnpm@10.34.5"`

- [ ] **Step 1: Update packageManager**

```json
"packageManager": "pnpm@10.34.5"
```

- [ ] **Step 2: Enable Corepack / install that pnpm**

```bash
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm -v   # expect 10.34.5
```

- [ ] **Step 3: Refresh lockfile**

```bash
rm -rf node_modules packages/*/node_modules
pnpm install
```

Expected: lockfileVersion stays `'9.0'`; install succeeds.

- [ ] **Step 4: Verify**

```bash
pnpm run lint && pnpm run build && pnpm run test
```

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(pnpm): bump packageManager to 10.34.5"
```

**PR title:** `chore(pnpm): bump to 10.34.5`

**Note:** Leave workflows without an explicit `version:` key so `pnpm/action-setup` continues to read `packageManager` (avoids the dual-version failure fixed in #12).

---

### Task 3 (optional): Migrate to pnpm 11

Defer unless you explicitly want pnpm 11 now. Requires Node `>=22.13` (satisfied by Task 1).

**Files:**
- Modify: `package.json` — remove nested `"pnpm": { "overrides": ... }` block after moving it
- Modify: `pnpm-workspace.yaml` — add overrides / allowBuilds as required by pnpm 11
- Modify: `package.json` `packageManager` → `pnpm@11.16.0`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: Task 1 + Task 2 green on main
- Produces: pnpm 11 toolchain; same workspace scripts

- [ ] **Step 1: Move overrides into workspace file**

Current root `package.json` contains:

```json
"pnpm": {
  "overrides": {
    "@types/node": "^22.5.0",
    "prettier": "^3.3.3",
    "playwright": "^1.46.1",
    "tsup": "^8.2.4",
    "typescript": "^5.5.4",
    "vite": "^5.4.2",
    "vitest": "^2.0.5",
    "@vitest/browser": "^2.0.5",
    "typedoc": "^0.26.6",
    "typedoc-github-theme": "^0.1.2"
  }
}
```

Move to `pnpm-workspace.yaml` (pnpm 11 prefers settings here):

```yaml
packages:
  - 'packages/*'

overrides:
  '@types/node': ^22.15.0
  prettier: ^3.3.3
  playwright: ^1.46.1
  tsup: ^8.2.4
  typescript: ^5.5.4
  vite: ^5.4.2
  vitest: ^2.0.5
  '@vitest/browser': ^2.0.5
  typedoc: ^0.26.6
  typedoc-github-theme: ^0.1.2
```

Remove the `"pnpm": { ... }` key from `package.json`.

- [ ] **Step 2: Bump packageManager**

```json
"packageManager": "pnpm@11.16.0"
```

```bash
corepack prepare pnpm@11.16.0 --activate
pnpm -v
```

- [ ] **Step 3: Clean install**

```bash
rm -rf node_modules packages/*/node_modules
pnpm install
pnpm peers check || true
```

- [ ] **Step 4: Verify browser tests especially**

```bash
pnpm run lint && pnpm run build && pnpm run test
```

If React hooks fail with `Cannot read properties of null (reading 'useRef')` under Vitest, prefer fixing Vitest `server.deps.inline` / alias **only if** you still use a node environment; this repo’s Playwright browser runner usually avoids that class of bug. Do not switch to `node-linker=hoisted` unless tests fail and a minimal fix is documented in the PR.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore(pnpm): migrate to pnpm 11.16.0"
```

**PR title:** `chore(pnpm): upgrade to v11`

---

### Task 4: Upgrade workspace React to 19 (keep peer `>=18`)

**Files:**
- Modify: `packages/react-user-media/package.json`
- Modify: `packages/examples/package.json`
- Modify: `pnpm-lock.yaml`
- Possibly modify: `packages/react-user-media/src/components/AudioPlayer.tsx`, `VideoPlayer.tsx` **only if** TypeScript 19 types break `forwardRef` / `DetailedHTMLProps` usage
- Possibly modify: specs if React 19 Strict Mode double-invoke surfaces new flakes

**Interfaces:**
- Consumes: Task 2 (or 3) pnpm
- Produces: workspace React 19; published peer still `>=18`

- [ ] **Step 1: Update library package.json deps**

In `packages/react-user-media/package.json`:

```json
"peerDependencies": {
  "react": ">=18"
},
"devDependencies": {
  "@types/react": "^19.2.17",
  "@types/react-dom": "^19.2.3",
  "react": "19.2.8",
  "@testing-library/react": "^16.3.2"
}
```

Keep other deps; bump only React-related entries shown. Leave `react-dom` out of the library package unless a test import requires it (browser tests currently use React; add `react-dom@19.2.8` as a devDependency if install warns about a missing peer for Testing Library).

- [ ] **Step 2: Update examples**

In `packages/examples/package.json`:

```json
"dependencies": {
  "react": "19.2.8",
  "react-dom": "19.2.8",
  "@bengreenier/react-user-media": "workspace:^"
},
"devDependencies": {
  "@types/react": "^19.2.17",
  "@types/react-dom": "^19.2.3"
}
```

- [ ] **Step 3: Install and typecheck**

```bash
pnpm install
pnpm --filter @bengreenier/react-user-media exec tsc -p ./tsconfig.lib.json --noEmit
pnpm --filter @bengreenier/react-user-media exec tsc -p ./tsconfig.types.json --noEmit
pnpm --filter examples exec tsc -b --pretty false
```

Fix any React 19 type errors in players. Preferred minimal fixes:

- Keep `forwardRef` (still supported); do not refactor to “ref as prop” unless types force it.
- If `DetailedHTMLProps` / `srcObject` typing changes, adjust the `Omit<..., "src" | "srcObject">` props interfaces only.

- [ ] **Step 4: Run full suite; harden flakes if needed**

```bash
pnpm run lint && pnpm run build && pnpm run test
```

If Strict Mode double-mount causes recorder/media flakes, prefer `waitFor` over longer sleeps (pattern already used in recorder specs). Do not disable Strict Mode in examples.

- [ ] **Step 5: Smoke examples app**

```bash
pnpm --filter examples build
```

Expected: Vite production build succeeds.

- [ ] **Step 6: Commit**

```bash
git add packages/react-user-media/package.json packages/examples/package.json pnpm-lock.yaml
# plus any src/spec fixes
git commit -m "chore(react): develop and test against React 19"
```

**PR title:** `chore(react): upgrade workspace to React 19`

---

### Task 5: Docs, peer clarity, and optional release bump

**Files:**
- Modify: `README.md`, `packages/react-user-media/README.md`
- Modify: `packages/react-user-media/package.json` (`version` only if releasing)
- Optional: add CI matrix job for React 18 + 19 (see Step 3)

**Interfaces:**
- Consumes: Task 4 complete
- Produces: documented support matrix; optional `0.1.3` release

- [ ] **Step 1: Document support**

Add a short “Requirements” section to `packages/react-user-media/README.md`:

```markdown
## Requirements

- Node.js 22+
- React 18 or 19 (`peerDependencies`: `react >= 18`)
- Secure context / modern browser APIs for `getUserMedia`, `getDisplayMedia`, and `enumerateDevices`
```

Mirror one line in the root README if it lists consumer requirements.

- [ ] **Step 2 (optional but recommended): React 18 compatibility job**

In `.github/workflows/ci_cd.yml`, after the existing build job succeeds path is fine; alternatively add a matrix to `build`:

```yaml
strategy:
  matrix:
    react: ["18.3.1", "19.2.8"]
```

And a step before test:

```bash
pnpm --filter @bengreenier/react-user-media add -D react@${{ matrix.react }}
pnpm --filter @bengreenier/react-user-media test
```

Only add this if the workflow stays under ~10 minutes; otherwise document manual `pnpm add -D react@18.3.1` verification in the PR body instead of automating.

- [ ] **Step 3: Decide version bump**

If publishing after these upgrades:

```json
"version": "0.1.3"
```

Commit message: `chore(release): 0.1.3`

If not publishing yet, skip version bump.

- [ ] **Step 4: Final verification**

```bash
pnpm run lint && pnpm run build && pnpm run test
pnpm --filter examples build
```

- [ ] **Step 5: Commit docs (and version if any)**

```bash
git add README.md packages/react-user-media/README.md packages/react-user-media/package.json
git commit -m "docs: note Node 22+ and React 18/19 support"
```

**PR title:** `docs: Node 22+ and React 18/19 support`

---

## Suggested PR / merge order

1. Task 1 — Node engines + CI 24  
2. Task 2 — pnpm 10.34.5  
3. Task 3 — pnpm 11 (**optional**; can skip forever and stay on 10.34.x)  
4. Task 4 — React 19 workspace  
5. Task 5 — docs / optional release  

## Risk notes

- **pnpm 11 + React 19 + Vitest/jsdom** has known dual-package / hooks null issues in some setups. This repo’s Playwright browser tests reduce that risk; still treat Task 3 as optional.
- **Peer `>=18`** remains correct after developing on React 19; do not narrow the peer to `^19` unless intentionally dropping React 18 consumers.
- **Node 20 consumers of the repo tooling** (contributors) must upgrade local Node; the published npm package has no Node runtime dependency beyond browser APIs.

## Self-review checklist

- [x] Spec coverage: Node, pnpm, React each have tasks; optional pnpm 11 isolated  
- [x] No TBD placeholders; exact versions pinned  
- [x] packageManager / engines / peer ranges consistent across tasks  
- [x] Verification commands spelled out per task  
