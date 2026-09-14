# سكربت ضغط المجلد Mastermind_Desktop
$source = "Mastermind_Desktop"
$destination = "Mastermind_Desktop.zip"

if (Test-Path $destination) {
    Remove-Item $destination
}

Compress-Archive -Path $source -DestinationPath $destination
Write-Host "تم ضغط المجلد بنجاح إلى $destination"