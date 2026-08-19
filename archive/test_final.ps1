[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$h = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Y2ZmbWFkYXRzZnl5bGRxbWRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5NzUxMSwiZXhwIjoyMTAyMzczNTExfQ.WkAWW7iXgstl4YX7be_O4K20YvyXvh0eNJ4eALpv9Wg'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Y2ZmbWFkYXRzZnl5bGRxbWRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5NzUxMSwiZXhwIjoyMTAyMzczNTExfQ.WkAWW7iXgstl4YX7be_O4K20YvyXvh0eNJ4eALpv9Wg'
    'Content-Type' = 'application/json; charset=utf-8'
    'Prefer' = 'resolution=merge-duplicates'
}
$json = '[{"id": "test-arabic-999", "title": "العربية"}]'
$body = [System.Text.Encoding]::UTF8.GetBytes($json)
Invoke-RestMethod -Uri 'https://ozcffmadatsfyyldqmdl.supabase.co/rest/v1/cards' -Method Post -Headers $h -Body $body
$res = Invoke-RestMethod -Uri 'https://ozcffmadatsfyyldqmdl.supabase.co/rest/v1/cards?id=eq.test-arabic-999&select=title' -Method Get -Headers $h
Write-Host "Result: $($res.title)"
