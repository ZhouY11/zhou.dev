# Zhou.dev Agent Instructions

## Architecture

- Follow **Astro-first** architecture.
- Keep static content, layouts, navigation, cards, lists, Markdown rendering, SEO metadata, and build-time logic in Astro.
- Introduce React only when a feature genuinely requires client-side state, lifecycle, coordinated interaction, or a complex interactive primitive.
- Before introducing a new React island, explain **Why React?**
- Do not migrate static Astro UI to React for consistency, practice, animation, or shadcn usage.
- Prefer shadcn + React Aria for justified complex React interaction primitives instead of rebuilding accessibility, keyboard navigation, or focus management manually.
- CSS owns normal responsive layout.
- Site semantic tokens are the theme source of truth; shadcn tokens are adapters, not a second theme system.
- Preserve the Chinese-first product direction and the existing Luma + Zinc visual language.

## Project Context

Before architecture, deployment, SEO, or other cross-cutting work, read:

- `docs/project/context.md`
- `docs/project/architecture.md`
- `docs/project/roadmap.md`

Treat these files and the current repository state as the project source of truth.

## Change Discipline

For non-trivial changes:

1. Inspect the relevant current files before proposing edits.
2. State the files that will change.
3. Explain the configuration/data flow end to end.
4. Do not silently overturn an established architecture decision.
5. If a previous decision must change, explicitly label it an **architecture change** and explain the reason and cost.
6. Prefer complete, production-usable implementations over fragmentary patches.
7. Run the project validation commands after implementation.
8. Review the resulting diff before proposing a commit.

## Validation

For normal application or build-system changes, run:

```bash
pnpm lint
pnpm check
pnpm build
```

## Git / GitHub

- Branch names, commit messages, PR titles, and PR descriptions are English-first.
- PR descriptions default to `Summary`, `Changes`, and `Validation`.
- Add extra PR sections only when architecture migration, compatibility, or risk documentation is genuinely needed.
- Do not update README unless explicitly requested.
- Before each commit, stage exact files and inspect:

```bash
git diff --cached --stat
git diff --cached
```
