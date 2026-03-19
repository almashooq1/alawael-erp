# Branch Protection Quick Start

## Goal
Require the backend CI gate before merge.

## 1) Set token (PowerShell)

Create a classic or fine-grained token with repository administration permission, then set it in your shell:

```powershell
$env:GITHUB_TOKEN = "<your_token_here>"
```

## 2) Apply protection

```powershell
./scripts/github/enable-branch-protection.ps1
```

Defaults target:
- Owner: `almashooq1`
- Repo: `alawael-erp`
- Branches: `main`, `master` (missing branches are skipped by default)
- Required status checks:
	- `Backend Quality Push / quality-push`
	- `Backend Quality Gate / quality-gate`

## Optional: custom values

```powershell
./scripts/github/enable-branch-protection.ps1 -Owner "my-org" -Repo "my-repo" -Branches "main","release" -RequiredChecks "Backend Quality Push / quality-push","Backend Quality Gate / quality-gate"
```

## Dry run (no changes)

```powershell
./scripts/github/enable-branch-protection.ps1 -DryRun
```

Dry run works even if `GITHUB_TOKEN` is not set; it only prints the planned actions.

## Strict mode (fail on missing branch)

```powershell
./scripts/github/enable-branch-protection.ps1 -FailIfBranchMissing
```
