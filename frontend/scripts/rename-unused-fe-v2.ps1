# Frontend rename: handles three safe patterns
#   1. "is defined but never used" with "Allowed unused args" → function args
#   2. "is defined but never used" with "Allowed unused vars" → plain `const X = ...`
#      (skip if line contains `{ ... X ... }` object-destructuring)
#   3. "is assigned a value but never used" with "Allowed unused elements of array destructuring patterns"
#      → array destructuring positional, safe
$json = npx eslint src --format json 2>$null
$data = $json | ConvertFrom-Json
$renames = @()
foreach ($file in $data) {
  $contentLines = (Get-Content -Raw -Encoding utf8 $file.filePath) -split "`r?`n"
  foreach ($msg in $file.messages) {
    if ($msg.ruleId -ne 'no-unused-vars') { continue }
    if ($msg.message -notmatch "^'(\w+)'") { continue }
    $name = $matches[1]
    if ($name -match '^_') { continue }
    $isArrayDestr = $msg.message -match 'array destructuring'
    $isArgs = $msg.message -match 'Allowed unused args'
    $isCaught = $msg.message -match 'Allowed unused caught errors'
    $isVars = $msg.message -match 'Allowed unused vars must match'
    if (-not ($isArrayDestr -or $isArgs -or $isCaught -or $isVars)) { continue }
    if ($isVars) {
      # Skip object destructuring: line has `{` before name and `}` after on same line
      $li = $msg.line - 1
      if ($li -ge 0 -and $li -lt $contentLines.Count) {
        $line = $contentLines[$li]
        $col = $msg.column - 1
        $before = $line.Substring(0, [Math]::Min($col, $line.Length))
        $after = if ($col -lt $line.Length) { $line.Substring($col) } else { '' }
        $openBrace = $before.LastIndexOf('{')
        $closeBraceBefore = $before.LastIndexOf('}')
        if ($openBrace -gt $closeBraceBefore -and $after -match '[},]') {
          # Looks like object destructuring shorthand → SKIP
          continue
        }
      }
    }
    $renames += [PSCustomObject]@{ File=$file.filePath; Line=$msg.line; Col=$msg.column; Name=$name }
  }
}
$byFile = $renames | Group-Object File
Write-Host "Files: $($byFile.Count); Total renames: $($renames.Count)"
$changedFiles = 0
$totalRenamed = 0
foreach ($g in $byFile) {
  $p = $g.Name
  $orig = Get-Content -Raw -Encoding utf8 $p
  $lines = $orig -split "`r?`n"
  $localCount = 0
  foreach ($r in ($g.Group | Sort-Object Line -Descending)) {
    $li = $r.Line - 1
    if ($li -lt 0 -or $li -ge $lines.Count) { continue }
    $line = $lines[$li]
    $col = $r.Col - 1
    $name = $r.Name
    if ($col + $name.Length -le $line.Length -and $line.Substring($col, $name.Length) -eq $name) {
      $before = $line.Substring(0, $col)
      $after = $line.Substring($col + $name.Length)
      $lines[$li] = $before + '_' + $name + $after
      $localCount++
    }
  }
  if ($localCount -gt 0) {
    $newContent = $lines -join "`n"
    if ($orig.EndsWith("`n") -and -not $newContent.EndsWith("`n")) { $newContent = $newContent + "`n" }
    Set-Content -Encoding utf8 -NoNewline -Path $p -Value $newContent
    $changedFiles++
    $totalRenamed += $localCount
  }
}
Write-Host "Changed files: $changedFiles; Renamed: $totalRenamed"
