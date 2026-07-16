$files = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts","*.css"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $updated = $content -replace '#00f2fe', '#22c55e' `
                        -replace '#4facfe', '#16a34a' `
                        -replace '0c1426', '0a160c' `
                        -replace 'bg-\[#0d1527\]', 'bg-[#0c1f0f]' `
                        -replace 'from-\[#0d1527\]', 'from-[#0c1f0f]' `
                        -replace '122342', '0f2d17'
    if ($updated -ne $content) {
        Set-Content -Path $file.FullName -Value $updated
        Write-Host ("Updated: " + $file.Name)
    }
}
Write-Host "Color replacement complete."
