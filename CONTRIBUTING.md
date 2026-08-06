# Contributing

The value of this skill is that everything in it is **measured**. A gotcha that
was reasoned about but never reproduced is worse than no gotcha, because an agent
will act on it with full confidence. Contributions are held to that bar.

## Repo layout

| Path | What it is | Bar for changes |
|---|---|---|
| `SKILL.md` | Routing + workflow. Loaded by name/description at startup. | Keep it short. Detail belongs in `references/`. |
| `references/*.md` | Loaded on demand. | Dense, prescriptive, actionable. |
| `assets/spine/` | Working code copied into every new project. | Must build and boot. |
| `assets/CONTRACT.template.md` | Handed to each module author. | Changes affect every generated project. |
| `scripts/` | scaffold, capture, numeric QA. | Must run from a clean machine. |

`SKILL.md` is the only file always in context. Every line there costs the agent
tokens on every task. If something is only needed once a problem appears, it goes
in `references/`.

## Test any change from a clean directory

This is non-negotiable and it is how the one real bug in v0.1 was caught: every
file was individually correct, and the scaffold still produced a project that
would not build, because `main.js` assumed a flat layout while the scaffold put
core in `src/core/`.

```bash
rm -rf /tmp/skilltest
bash scripts/scaffold.sh /tmp/skilltest
cd /tmp/skilltest
npm run build                                          # must succeed
npm run preview &
.venv/bin/python capture.py http://localhost:4173/ shots 6
.venv/bin/python check_frames.py shots                 # must exit 0
```

Expected result on an untouched scaffold: `app booted: True`, `errors: 0`, and
`6/6 frames pass`. If any of those change, your PR is not ready.

Reading a file and concluding it is correct is not testing it.

## Adding a gotcha

`references/gotchas.md` is the highest-value document here. Every entry needs all
four parts:

```markdown
## N. Short imperative title

**Symptom.** What the developer actually observes — the frame, the console text,
the conditions under which it appears and disappears.

**Cause.** The mechanism. Why this produces that symptom.

**Fix.** A code block. Show the wrong version and the right version.

**Confirm it.** The runtime experiment that proves this diagnosis, not a
suggestion to "check your shader".
```

Requirements:

- **It must have actually happened.** Include the three.js version and how you
  reproduced it. "This could cause..." is not an entry.
- **The symptom must be observable**, not internal. Agents match on symptoms.
- **The confirmation step must be executable** — a line to paste into a console
  or a `page.evaluate`, ideally one that toggles the suspected cause at runtime.
- Prefer a **minimal reproduction** over a description. If you can shrink it to a
  scaffolded project plus a five-line diff, include that diff.

If a fix is version-specific, say so. If a gotcha is fixed upstream in a later
three.js, note the version and keep the entry — people pin old versions.

## Changing the spine

`assets/spine/` ships into every project this skill creates, so a regression here
is a regression in every downstream site.

- Keep it dependency-free beyond `three` and `gsap`.
- Preserve `window.__site` — the capture harness depends on it, and removing it
  silently breaks the entire verification loop.
- Preserve the load-bearing details: renderer sized before `Post` is constructed,
  the double `resize()` on the next frame, `composer.setSize()` as the only
  resize path, and the distance-threshold camera snap across stage jumps. If you
  change one of these, explain in the PR what replaces the failure it prevents.
- Comments in the spine that explain *why* a line exists are load-bearing
  documentation. Do not strip them for tidiness.

## Proposing a new reference doc

Open an issue first. A new doc has to earn a link from `SKILL.md`, and every link
there is a routing decision the agent has to make. Good candidates cover a
distinct *phase* of the work that an agent would otherwise get wrong.

Before proposing, check the material is not a better fit as a section in an
existing doc. Six focused documents beat twelve overlapping ones.

Style:

- Open with `# Title` and one paragraph: what this covers and when to read it.
- Write for an agent that will act on it, not a human reading for pleasure.
- Tables and code blocks over prose. No filler, no "in conclusion".
- 150–350 lines. Dense, not padded.
- Every claim actionable. If a sentence does not change what the agent does,
  delete it.

## Art direction and defaults

Numeric defaults (exposure `0.82`, bloom threshold `0.80`, fog density `0.005`)
are starting points that were tuned against measured frames. Changing one is
fine — but include the before/after measurements from `check_frames.py` that
motivated it, not an opinion about how it looks.

## Scope

In scope: three.js, Vite, post-processing, scroll choreography, procedural
geometry and shaders, headless verification, agent delegation patterns.

Out of scope: React/R3F wrappers (different failure modes, different audience),
bundled 3D assets of any kind, and anything that ships third-party media.

Everything this skill produces must stay procedural and original. Do not add
content that encourages rehosting another site's assets, reproducing its copy, or
cloning branded characters.

## Pull requests

- One concern per PR.
- Include the output of the clean-directory test above.
- For a gotcha, include the reproduction and the three.js version.
- For a spine change, state which failure mode your change preserves protection
  against.
- Update `CHANGELOG.md` under `Unreleased`.

Commit messages: imperative mood, one line, scope first —
`gotchas: add KTX2 loader disposal leak`.
