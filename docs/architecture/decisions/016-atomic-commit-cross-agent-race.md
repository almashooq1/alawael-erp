# 16. Atomic Stage-Commit Pattern for Cross-Agent Concurrency

Date: 2026-05-19

## Status

✅ Accepted (Wave 137; documented after Waves 131 + 134 commit-absorption incidents)

## Context

During the P3-closure session (2026-05-18/19), multiple Claude agents worked
in parallel against the same git repo — one on the chatbot vertical, others
on the attendance platform. Standard workflow was:

```
1. Edit files
2. Run tests
3. Lint
4. git add <my files>
5. git commit -m "..."
```

The pre-commit hook (lint-staged + husky) saves a stash backup before
running prettier/eslint, then restores afterward. If a parallel agent's
`git commit` lands between step 4 and step 5, **lint-staged commits
EVERYTHING in the staging area** — including my staged files — under
the parallel agent's commit message.

Two waves were absorbed this way:

- **Wave 131** (LLM service registry) → absorbed into commit `3951455c8`
  ("feat(attendance): wave 131 — unified reconciliation engine v2")
- **Wave 134** (LLM telemetry persistence) → absorbed into commit
  `ebccd3ec6` ("feat(attendance): wave 134 — tamper-evident hash-chained
  audit ledger")

In both cases the file CONTENT shipped correctly; only the commit
message was wrong. But the git log narrative is now misleading —
searching for "LLM telemetry persistence" finds nothing; the absorbing
commit's message refers exclusively to attendance work.

## Decision

For any commit in a multi-agent session, use the **atomic stage-commit
pattern**:

```bash
git add <files> && git commit -m "<message>"
```

In ONE shell call. The `&&` ensures git-commit runs immediately after
git-add succeeds, in the same process tree, with no opportunity for a
parallel agent's commit to interleave.

For tool-invocation specifically (Claude Code): use ONE `Bash` tool call
that contains both `git add ... && git commit -m "..."`, not two separate
calls. The tool's process boundary is the protection.

When the commit message is long (multi-line, includes co-authored-by
trailer), use a HEREDOC:

```bash
git add <files> && git commit -m "$(cat <<'EOF'
feat(scope): subject line

Body paragraph.

Co-Authored-By: ...
EOF
)"
```

The HEREDOC stays within the single Bash call — preserves the atomicity.

## Consequences

**Easier:**

- Commit messages stick. The git log reflects the actual narrative.
- No need to coordinate with parallel agents on timing.
- Atomic pattern is also good hygiene in single-agent sessions —
  there's no downside.

**Harder:**

- If pre-commit hooks fail, the entire `git add && git commit` chain
  fails atomically — you don't have a "staged-but-not-committed" state
  to inspect. Recovery: re-edit the offending file, re-run the atomic
  command.
- The HEREDOC syntax is more verbose than a one-line `-m "message"`,
  but the readability + multi-line support more than make up for it.

**Tradeoffs:**

- We accept the slight verbosity of HEREDOCs in exchange for commit-message
  reliability. Wave 137 verified the pattern works (commit `263b830`
  landed cleanly despite multiple parallel agents active).

## Anti-pattern

```bash
# DO NOT split into two calls — parallel agent can interleave between them.
git add <files>
# ↑ parallel agent's commit can run here, absorbing your staged files
git commit -m "..."
```

## References

- Wave 131 absorption (commit `3951455c8`)
- Wave 134 absorption (commit `ebccd3ec6`)
- Wave 137 atomic success (commit `263b830`, web-admin master)
- Wave 138 atomic success (commit `c508580`, web-admin master)
