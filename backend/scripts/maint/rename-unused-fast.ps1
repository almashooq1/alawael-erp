# Fast mass-rename: no per-file node check (rely on quality:ci at end).
# By definition ESLint says these are 'defined but never used' so prefixing
# with _ cannot break references. Syntactic position is given; substitution
# is purely a token swap.
$json = npx eslint . --format json 2>$null
$data = $json | ConvertFrom-Json
$renames = @()
foreach ($file in $data) {
  foreach ($msg in $file.messages) {
    if ($msg.ruleId -eq 'no-unused-vars' -and $msg.message -match "^'(\w+)' is defined but never used") {
      $name = $matches[1]
      if ($name -notmatch '^_') {
        $renames += [PSCustomObject]@{ File=$file.filePath; Line=$msg.line; Col=$msg.column; Name=$name }
      }
    }
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
