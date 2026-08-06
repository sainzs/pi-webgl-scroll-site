# Parallel Authorship

How to build a site like this with a fleet of subagents, including the failure modes
you will actually hit. Drawn from a real run: 14 subagents on a cheap fast model
produced ~3,700 lines while the orchestrator owned the spine and every diagnosis.

## The split that works

| Give to cheap/fast workers | Keep for the orchestrator |
|---|---|
| Long procedural shader modules from a precise spec | The integration spine and contract |
| Self-contained chapter geometry | Diagnosis of any failure |
| Long-form doc/content generation | Art direction and value calibration |
| Anything with a clear pass/fail check | Integration and final verification |

Rationale: **generation parallelises and is cheap to redo; diagnosis does not
parallelise.** A worker that writes 500 lines of terrain shader is doing bounded,
checkable work. Deciding *why* the frame is black requires the whole picture.

In the real run the workers produced 81% of the tokens for 4% of the spend.
Orchestration dominated cost — so push volume down and keep diagnosis central.

## One file per agent, no shared surfaces

The single most important structural rule. Each worker gets exactly one file to
create. Nobody edits core, `main.js`, `index.html`, or another worker's file.

Result: twelve agents wrote simultaneously with **zero merge conflicts**. There is
no locking, no coordination, no rebasing — the file boundary is the lock.

Every brief must carry the prohibition explicitly:

```
Your ONLY deliverable: <root>/src/scene/terrain.js
Export: `export class Terrain { ... }`
Do not create or edit any other file.
```

## Write the spine and contract FIRST

Workers cannot integrate against a moving target. Before spawning anyone:

1. Write `state.js`, `scroll.js`, `director.js`, and `main.js`.
2. Write `CONTRACT.md`: interface, helpers, palette, measured value ranges, shader
   discipline, performance budget, verification commands.
3. Only then spawn.

## Brief template

```
Project root: <ROOT>
FIRST: read <ROOT>/CONTRACT.md in full and obey it exactly. Also read
src/core/state.js and src/core/director.js for the helpers and camera.

Your ONLY deliverable: <ROOT>/src/scene/<file>.js
Export: export class <Name>

Chapter: `<id>`. <What this chapter must show, in concrete visual terms:
forms, scale in frame, materials, motion, how it responds to chapterProgress.>

Rules: procedural geometry/shaders only, zero external assets, no new npm deps.
Do not create or edit any other file.
Verify with `node --check src/scene/<file>.js` and `npm run build`.
Then report what you did in three lines.
```

Specify **scale in frame** ("occupies 45-55% of frame height at a camera 6 units
away with a 38-degree FOV"), not just "a cube". Vague scale is the most common
cause of a useless first draft.

## Briefs must carry measured evidence

Weak brief:
> Make the terrain look better, the mountains aren't working.

Strong brief:
> Mountains are absent: the horizon is empty haze. Sky measures RGB 168-185;
> ridges must land at 120-155 and read darker than the sky. Note that FogExp2 at
> density 0.0125 is ~98% opaque at 160 units, which is erasing ridges that are
> already tall enough. Camera sits at y 2.6-4.2 looking at y=2 with a 38-degree FOV
> — compute the height a ridge at 60-160 units needs to clear the horizon.

Numbers get acted on. Adjectives get reinterpreted.

## Observed failure modes and counter-measures

| Failure | Counter-measure |
|---|---|
| Worker ignores the single most important instruction | State it **first and alone**, labelled critical. Afterwards verify mechanically (`grep` for the thing that had to change) — do not trust the report. |
| Worker over-investigates and never writes the file | Observe the transcript. Send a directive: *"STOP investigating and WRITE THE FILE NOW. Apply your current best fix in your very next action."* This unblocked a worker that had reached 222 messages. |
| Worker rewrites the whole file, silently discarding your hand-patch | Re-read the current file before editing and verify your patch survived. Never assume an edit persisted. |
| Worker reports success it did not achieve | Every claim gets verified by build, grep, or capture. Reports are hints, not evidence. |
| Worker leaves a stray dev server running | Clean up: `pkill -f vite` before your own capture, or you will screenshot the wrong build. |

## Rounds

Expect **2-3 rounds**, not one.

- **Round 1** — one worker per module, built from the contract.
- **Integration** — orchestrator builds, captures, measures. Fix core/systemic bugs
  yourself; they are usually cross-cutting and need the whole picture.
- **Round 2+** — one worker per *measured defect*, briefed with the numbers. Keep
  these narrow: one file, one list of concrete problems, explicit success criteria.

Do not re-spawn a whole module to fix a one-line clamp. Patch it yourself; a round
trip costs more than the edit.

## Practical notes

- Spawn all independent workers in a single turn, then end the turn. Handles return
  at admission, not completion.
- Poll by checking file mtime/size; observe the transcript only when a worker
  seems stuck.
- Workers may return **empty** if the provider is degraded. If several consecutive
  spawns produce nothing, stop retrying and do the work yourself — that is a
  provider failure, not a prompt problem.
- Minimise screenshots in your own context. Lean on numeric metrics and attach
  images only at decision points.
