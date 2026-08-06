# Claude Code adapter

This repo works with Claude Code (v2.x) two ways. Both were verified on
Claude Code 2.1.220 with `claude plugin validate --strict` and a real
install/uninstall cycle.

## Route 1 — install as a plugin

The repo ships `.claude-plugin/plugin.json` (plugin manifest) and
`.claude-plugin/marketplace.json` (single-plugin marketplace), so the repo
itself is an installable marketplace:

```bash
# from a local checkout
claude plugin marketplace add /path/to/pi-webgl-scroll-site
# or straight from GitHub
claude plugin marketplace add <github-owner>/pi-webgl-scroll-site

claude plugin install webgl-scroll-site@pi-webgl-scroll-site
```

Check what got loaded:

```bash
claude plugin details webgl-scroll-site   # component inventory + token cost
claude plugin list
```

Uninstall / remove:

```bash
claude plugin uninstall webgl-scroll-site@pi-webgl-scroll-site
claude plugin marketplace remove pi-webgl-scroll-site
```

## Route 2 — plain skill directory

Claude Code auto-loads skills from `~/.claude/skills/<name>/SKILL.md`
(loaded as `<name>@skills-dir`). Just clone or copy the repo there:

```bash
git clone <repo-url> ~/.claude/skills/webgl-scroll-site
# or, from a checkout:
cp -R /path/to/pi-webgl-scroll-site ~/.claude/skills/webgl-scroll-site
```

It auto-loads on the next session; run `/reload-plugins` inside Claude Code
to load it immediately. To remove it, delete the directory.

Note: because `.claude-plugin/plugin.json` is present, the skills-dir copy is
treated as a plugin named `webgl-scroll-site@skills-dir` — same content,
managed with `claude plugin enable/disable`.

## Validating the manifests

```bash
claude plugin validate /path/to/pi-webgl-scroll-site --strict
claude plugin validate /path/to/pi-webgl-scroll-site/.claude-plugin/marketplace.json --strict
```

Both pass with zero warnings as shipped.
