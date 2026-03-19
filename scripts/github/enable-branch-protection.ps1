param(
    [Parameter(Mandatory = $false)]
    [string]$Owner = "almashooq1",

    [Parameter(Mandatory = $false)]
    [string]$Repo = "alawael-erp",

    [Parameter(Mandatory = $false)]
    [string[]]$Branches = @("main", "master"),

    [Parameter(Mandatory = $false)]
    [string[]]$RequiredChecks = @(
        "Backend Quality Push / quality-push",
        "Backend Quality Gate / quality-gate",
        "GraphQL Quality Gate / graphql-quality",
        "Finance Module Quality Gate / finance-quality",
        "Supply Chain Quality Gate / supply-chain-backend-quality"
    ),

    [Parameter(Mandatory = $false)]
    [string]$RequiredCheck,

    [Parameter(Mandatory = $false)]
    [switch]$DryRun,

    [Parameter(Mandatory = $false)]
    [switch]$FailIfBranchMissing
)

$token = $env:GITHUB_TOKEN
$tokenMissing = [string]::IsNullOrWhiteSpace($token)

if ($tokenMissing -and -not $DryRun) {
    throw "GITHUB_TOKEN is missing. Set a PAT with repo admin permissions, then rerun."
}

if ($tokenMissing -and $DryRun) {
    Write-Warning "GITHUB_TOKEN is missing. DryRun will print planned actions only."
}

$headers = @{
    Authorization = "Bearer $token"
    Accept        = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

if (-not [string]::IsNullOrWhiteSpace($RequiredCheck)) {
    $RequiredChecks = @($RequiredChecks + $RequiredCheck)
}

$RequiredChecks = @($RequiredChecks | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)

if (-not $RequiredChecks -or $RequiredChecks.Count -eq 0) {
    throw "No required checks provided. Use -RequiredChecks with at least one status check context."
}

$body = @{
    required_status_checks = @{
        strict   = $true
        contexts = @($RequiredChecks)
    }
    enforce_admins = $true
    required_pull_request_reviews = @{
        dismissal_restrictions = @{}
        dismiss_stale_reviews = $true
        require_code_owner_reviews = $false
        required_approving_review_count = 1
        require_last_push_approval = $false
    }
    restrictions = $null
    required_linear_history = $false
    allow_force_pushes = $false
    allow_deletions = $false
    block_creations = $false
    required_conversation_resolution = $true
    lock_branch = $false
    allow_fork_syncing = $true
}

if (-not $Branches -or $Branches.Count -eq 0) {
    throw "No branches provided. Use -Branches main,master"
}

foreach ($branch in $Branches) {
    if ($DryRun -and $tokenMissing) {
        Write-Host "DryRun plan: would apply branch protection to ${Owner}/${Repo}:$branch with required checks: $($RequiredChecks -join ', ')."
        continue
    }

    $branchInfoUri = "https://api.github.com/repos/$Owner/$Repo/branches/$branch"
    $protectionUri = "https://api.github.com/repos/$Owner/$Repo/branches/$branch/protection"

    try {
        Invoke-RestMethod -Uri $branchInfoUri -Method Get -Headers $headers | Out-Null
    }
    catch {
        if ($FailIfBranchMissing) {
            throw "Branch '$branch' was not found in $Owner/$Repo."
        }

        Write-Warning "Skipping missing branch '$branch' in $Owner/$Repo."
        continue
    }

    Write-Host "Applying branch protection to ${Owner}/${Repo}:$branch ..."

    if ($DryRun) {
        Write-Host "DryRun enabled: no changes sent for '$branch'."
        continue
    }

    Invoke-RestMethod -Uri $protectionUri -Method Put -Headers $headers -ContentType "application/json" -Body ($body | ConvertTo-Json -Depth 10) | Out-Null

    Write-Host "Branch protection applied successfully for '$branch'."
}
Write-Host "Required checks: $($RequiredChecks -join ', ')"
