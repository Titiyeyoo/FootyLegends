# Footy Legends — Test Suite

Unit tests for critical pure-logic functions of the game.

## ⚠️ IMPORTANT — Sync warning

The functions in `helpers/extracted.js` are **copied** from
`footy-legends-v2.html`. They are NOT imported. This is by design (avoids
modifying production code), BUT it means:

> **If you change a function in production, you MUST update
> `helpers/extracted.js` too. Otherwise tests pass but production breaks.**

Each function in `extracted.js` has a comment block listing source-file line
numbers — please update these comments when making changes.

## How to run

```bash
cd tests
npm install     # one-time
npm test        # runs all tests once
npm run test:watch   # auto-rerun on file changes
```

## What's covered

| File | Tests | What |
|---|---|---|
| `tryMatch.test.js` | 21 | String normalization, fuzzy match, ambiguous surnames, accents, typo detection |
| `discovery.test.js` | 11 | Adding players, ordering, migration of legacy users, unlock threshold (50) |
| `blindAndPub.test.js` | 13 | Blind draft pool selection, re-roll mechanics, pub mode team advancement |

**Total: 45 tests, ~3 seconds runtime.**

## What's NOT covered

These have heavy DOM dependencies and are tested manually:

- `calculateChemistry()` — uses globals `slots`, `captainIdx`
- `render()`, `updateCounter()` — pure DOM
- All animations and overlays
- `lockInXI()` — needs full game state

## When tests catch a real bug

Document it in commit message. Already caught:

- **2026-04-25**: `addDiscovered()` was creating duplicate entries in
  `fl_discovered_order` because the migration in `getDiscoveredOrder()` ran
  with the new player already in the set but not the order. Fix: read order
  BEFORE updating the set.
