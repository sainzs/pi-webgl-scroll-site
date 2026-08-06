# opencode adapter

[opencode](https://opencode.ai) has **native skill support** — no adapter file
needed. It discovers `skills/<name>/SKILL.md` folders, lists them in the built-in
`skill` tool's `<available_skills>` catalogue, and loads the full SKILL.md
on demand when the agent calls `skill({ name: "webgl-scroll-site" })`.

Verified on opencode **1.18.11** (macOS) against the live docs at
<https://opencode.ai/docs/skills/>.

## Install (recommended): symlink into a skills directory

Global — available in every opencode session:

```bash
mkdir -p ~/.config/opencode/skills
ln -sfn /path/to/pi-webgl-scroll-site ~/.config/opencode/skills/webgl-scroll-site
```

Per-project — available only inside one repo:

```bash
mkdir -p .opencode/skills
ln -sfn /path/to/pi-webgl-scroll-site .opencode/skills/webgl-scroll-site
```

opencode also reads the Claude Code / agents-standard locations, so if you
already installed this skill for another tool, it is picked up for free:

- `~/.claude/skills/webgl-scroll-site/` or `.claude/skills/…`
- `~/.agents/skills/webgl-scroll-site/` or `.agents/skills/…`

Requirements (all already satisfied by this repo's `SKILL.md`):

- The folder name must equal the frontmatter `name` (`webgl-scroll-site`).
- Frontmatter must contain `name` and `description`; `license` and `metadata`
  are optional and other fields are ignored.

### Verify

```bash
opencode run 'Load the webgl-scroll-site skill with the skill tool, then answer with a single word: which three.js material property does it forbid when using an EffectComposer?'
# expected answer: transmission
```

(Tested on this method: the model called the `skill` tool and answered
`transmission`.)

## Alternative: always-on via `instructions`

If you want the skill text injected into **every** session instead of loaded
on demand, add it to `opencode.json` (project-local or
`~/.config/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": ["/path/to/pi-webgl-scroll-site/SKILL.md"]
}
```

This burns ~context on unrelated tasks, so prefer the skills directory.
A third option — referencing the skill from `AGENTS.md` with a "read this file
when building WebGL scroll sites" note — also works but relies on the model
choosing to `read` the file.

## Notes

- Relative paths inside SKILL.md (`scripts/scaffold.sh`, `references/*.md`,
  `assets/*`) resolve against the skill directory; the symlink preserves this.
- Gate access with pattern permissions if desired:
  `{ "permission": { "skill": { "webgl-scroll-site": "allow" } } }`.
