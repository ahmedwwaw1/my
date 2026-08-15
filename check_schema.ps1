$supabaseUrl = "https://ozcffmadatsfyyldqmdl.supabase.co"
$supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Y2ZmbWFkYXRzZnl5bGRxbWRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5NzUxMSwiZXhwIjoyMTAyMzczNTExfQ.WkAWW7iXgstl4YX7be_O4K20YvyXvh0eNJ4eALpv9Wg"
$headers = @{ "apikey" = $supabaseKey; "Authorization" = "Bearer $supabaseKey" }

$tables = @("cards", "videos", "video_chapters", "card_assets")
foreach ($t in $tables) {
    Write-Host "Table: $t"
    try {
        $res = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/$t?select=*&limit=1" -Method Get -Headers $headers
        $res | ConvertTo-Json
    } catch {
        Write-Error $_.Exception.Message
    }
}
