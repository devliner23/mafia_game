# Dropping this into your Tauri project

## First, the thing that changes your plan

**Tauri's backend is Rust. There is no JavaScript runtime on the `src-tauri` side.**

You can't run the simulation "on the Tauri backend" as JS. Your three real options were:

1. **Sim runs in the webview as pure TS** ← what this does
2. Port the sim to Rust — a rewrite, and you lose the JS ecosystem
3. Bundle Node as a Tauri sidecar — adds ~50 MB, complicates signing, and buys nothing here

Option 1 is correct for this game and not a compromise. The sim is pure arithmetic over
a few dozen objects; a full 260-week career resolves in well under a millisecond. Crossing
an IPC boundary for that would make it *slower*, not faster.

So the division of labour is:

| Layer | Language | Job |
|---|---|---|
| `src/sim/` | TypeScript | The entire simulation. Pure, deterministic, no I/O |
| `src/App.tsx` | TypeScript | React UI |
| `src-tauri/src/lib.rs` | Rust | Save files, window, native OS access |

Rust does what Rust is good at, which is the stuff a browser can't do.

## Files to copy

Copy over the top of what `create-tauri-app` generated:

```
src/sim/               → new, the whole simulation
src/save.ts            → new, the Rust bridge
src/App.tsx            → replaces the template's App.tsx
src/main.tsx           → replaces (identical to template, included for completeness)
src/styles.css         → replaces App.css / index.css
src-tauri/src/lib.rs   → replaces the template's lib.rs
```

**Do not copy** `package.json`, `vite.config.ts`, `index.html`, `tsconfig.json`, or
`src-tauri/Cargo.toml` — yours are already correct. They're in this archive only because
I needed them to verify the build.

Delete the template's leftover `src/assets/` and `App.css` if you're not using them.

## One thing to check in lib.rs

The template may have generated a different plugin line depending on version. Keep whatever
yours had and only add the commands:

```rust
tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())   // ← keep YOUR line here, not mine
    .invoke_handler(tauri::generate_handler![
        save_game, load_game, list_saves, delete_save
    ])
```

If yours has a `greet` command, delete it — it's template scaffolding.

## No capability config needed

Saves are written with `std::fs` inside your own Rust commands, not through
`tauri-plugin-fs`. Tauri v2's permission system gates *plugin* APIs; commands you define
in your own `invoke_handler` are callable from the frontend without a capabilities entry.

That's a deliberate choice: had the frontend written files through the fs plugin, you'd be
granting the webview broad disk access. This way the webview can only ask for one of four
specific operations, and `slot_path()` rejects anything that isn't `[A-Za-z0-9_-]{1,64}`,
so a slot name can't escape the save directory.

## Saves are event-sourced

A save file is the seed plus the list of commands issued. Loading replays them. This is
why saves are a few KB, why they can't drift out of sync with the sim, and why every save
file doubles as a reproducible bug report you can step through.

The cost: a save is only replayable by the version of the balance data that produced it.
When you tune `src/sim/content/index.ts`, old saves replay into *different* outcomes.
Before you ship, either freeze content per save (embed the job table in the save file) or
accept that patches invalidate saves. Decide this early — it's cheap now and expensive later.

`SAVE_VERSION` and the `migrate()` hook in `save.ts` are already wired for the schema half
of that problem.

## Run it

```bash
npm install
npm run tauri dev
```

First run compiles the Rust side and takes a few minutes. After that it's fast.

## What's carried over vs. lost

**Carried over:** the whole simulation, unchanged — deterministic RNG, event-sourced engine,
crew loyalty/ambition/grudge model, three-track Ledger, coup and indictment resolution, and
the street feed as a projection over the event stream.

**Lost in the move, worth rebuilding:**

- **The 13 tests.** Add `vitest` and copy `packages/sim/src/__tests__/` from the old repo.
  The determinism test in particular is the one that catches an accidental `Math.random()`.
- **The soak runner.** This was the Phase 1 gate and the most valuable thing in the old repo.
  It runs 6,000 careers in ~4 seconds and it's how you found that the endgame is unreachable.
  Port `apps/lab/src/soak.ts` to a plain `scripts/soak.ts` and run it with `tsx`.

Without the soak you're balancing by feel, which is the thing your JS background lets you
avoid.

## The known balance bug came with it

Unchanged from the old repo: standing is `payout / 2500`, capping the best capo job at 11
standing, while underboss needs 260 and boss needs 460. Each `lay_low` costs 2 standing,
and high-rank jobs generate enough evidence to force frequent cooling — so net progress goes
negative right where the game should open up. About 0.1% of runs reach boss and none retire.

Fix in `src/sim/content/index.ts` and `RANK_STANDING` in `src/sim/engine.ts`. Both are data.
