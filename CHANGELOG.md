# Changelog

All notable changes to this skill are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.0] - 2026-08-06

First public release. Extracted from a complete, verified build of a
scroll-driven procedural three.js site.

### Added

- `SKILL.md` — routing, six-step workflow, hard rules, and a black-frame
  symptom/cause table.
- `references/gotchas.md` — nine measured failure modes with symptom, cause,
  fix, and confirming diagnostic, plus an ordered black-frame bisect procedure.
- `references/architecture.md` — the integration spine, virtual scroll, chapter
  ranges, world stages, camera director, and seam masking.
- `references/verification.md` — headless capture loop, numeric metrics
  (channel spread, mean luminance, stddev), runtime probing recipes, and a
  definition of done.
- `references/art-direction.md` — deriving a palette from measurements, value
  range discipline, saturation policy, post-processing as grade, material
  techniques, and HUD language.
- `references/delegation.md` — parallel authorship across subagents, brief
  template, observed failure modes, and the economics of the split.
- `references/reconnaissance.md` — bundle mining and headless capture for
  studying an existing site, with an explicit originality boundary.
- `assets/spine/` — working `state`, `scroll`, `director`, `post`, and `main`,
  plus project config.
- `assets/CONTRACT.template.md` — the module contract given to each author.
- `scripts/scaffold.sh` — creates a project that builds, boots, and passes QA
  before any custom code is written.
- `scripts/capture.py` — deterministic scroll screenshots driven through
  `window.__site`; fails loudly on console and page errors.
- `scripts/check_frames.py` — numeric QA with non-zero exit for CI.
- `install.sh` — installs for pi, Prime Agent, Claude Code, or project-local.

### Fixed

- `assets/spine/main.js` imported core modules from a flat path while
  `scaffold.sh` places them in `src/core/`, so every scaffolded project failed
  to build. Caught by running the scaffold from an empty directory.

### Verified

- Scaffold → `npm run build` → boot → capture → numeric QA passes from a clean
  directory with no manual steps.
- Skill discovery confirmed in pi from `<config>/skills/`, and project-local
  from `.pi/skills/` when listed in `AGENTS.md`.
- End-to-end behavioural test: an agent on a different model, in an empty
  directory with no access to the source project, correctly diagnosed the
  `transmission` + `EffectComposer` black frame and reproduced the bisect
  procedure from the skill alone.

[Unreleased]: https://github.com/sainzs/pi-webgl-scroll-site/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/sainzs/pi-webgl-scroll-site/releases/tag/v0.1.0
