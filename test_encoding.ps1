$text = "العربية"
$obj = @{ title = $text }
$json = $obj | ConvertTo-Json -Compress
Write-Host "Original JSON: $json"

$unescaped = [System.Text.RegularExpressions.Regex]::Replace($json, "\\u([0-9a-fA-F]{4})", {
    param($m) [char][int]("0x" + $m.Groups[1].Value)
})
Write-Host "Unescaped JSON: $unescaped"

$utf8NoBOM = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText("D:/New folder/my/test_enc.json", $unescaped, $utf8NoBOM)
Write-Host "Check the file content now."
