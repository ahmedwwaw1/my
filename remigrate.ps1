[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$utf8 = New-Object System.Text.UTF8Encoding($false)

$supabaseUrl = "https://ozcffmadatsfyyldqmdl.supabase.co"
$supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Y2ZmbWFkYXRzZnl5bGRxbWRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5NzUxMSwiZXhwIjoyMTAyMzczNTExfQ.WkAWW7iXgstl4YX7be_O4K20YvyXvh0eNJ4eALpv9Wg"

$h = @{
    'apikey' = $supabaseKey
    'Authorization' = "Bearer $supabaseKey"
    'Content-Type' = 'application/json; charset=utf-8'
}

function Delete-Table($table, $filter) {
    Write-Host "Deleting $table with filter $filter..."
    $url = "$supabaseUrl/rest/v1/$table?$filter"
    try {
        Invoke-WebRequest -Uri $url -Method Delete -Headers $h -ErrorAction Stop
        Write-Host "  Success"
    } catch {
        Write-Warning "  Failed: $($_.Exception.Message)"
    }
}

function Upsert-Table($table, $data) {
    if ($data.Count -eq 0) { return }
    $url = "$supabaseUrl/rest/v1/$table"
    Write-Host "Upserting to $table ($($data.Count) rows)..."

    $chunkSize = 30
    for ($i = 0; $i -lt $data.Count; $i += $chunkSize) {
        $end = $i + $chunkSize - 1
        if ($end -ge $data.Count) { $end = $data.Count - 1 }
        $chunk = $data[$i..$end]

        $json = $chunk | ConvertTo-Json -Depth 10 -Compress
        # Fix escapes
        $json = [System.Text.RegularExpressions.Regex]::Replace($json, "\\u([0-9a-fA-F]{4})", {
            param($m) [char][int]("0x" + $m.Groups[1].Value)
        })

        $body = $utf8.GetBytes($json)
        try {
            $headers = $h.Clone()
            $headers.Add("Prefer", "resolution=merge-duplicates")
            Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body -ErrorAction Stop
            Write-Host "  Sent rows $($i+1) to $($end+1)"
        } catch {
            Write-Error "  Failed: $($_.Exception.Message)"
        }
    }
}

# Data processing
$files = @("vsa.json", "data.json", "Time-analysis.json", "technical-analysis.json", "PDF-images.json")
$allCards = New-Object System.Collections.Generic.List[PSObject]
$allVideos = New-Object System.Collections.Generic.List[PSObject]
$allChapters = New-Object System.Collections.Generic.List[PSObject]
$allAssets = New-Object System.Collections.Generic.List[PSObject]

foreach ($f_name in $files) {
    $path = "D:/New folder/my/$f_name"
    if (-not (Test-Path $path)) { continue }
    $content = [System.IO.File]::ReadAllText($path, $utf8)
    $data = $content | ConvertFrom-Json
    foreach ($item in $data) {
        $props = $item.psobject.properties.Name
        if ($props -contains "__comment__" -and $props.Count -eq 1) { continue }

        $c_id = if ($item.id) { $item.id } else { "$($item.category)-$($item.title.Substring(0, [Math]::Min(10, $item.title.Length)))" }
        $allCards.Add([PSCustomObject]@{ id=$c_id; title=$item.title; category=$item.category; content=$item.content; image_url=$item.image })

        if ($props -contains "videos") {
            foreach ($v in $item.videos) {
                $v_id = if ($v.id) { $v.id } else { "$c_id-v-$($v.title.Substring(0, [Math]::Min(10, $v.title.Length)))" }
                $allVideos.Add([PSCustomObject]@{ id=$v_id; card_id=$c_id; title=$v.title; url=$v.url })
                if ($v.chapters) {
                    foreach ($c in $v.chapters) {
                        $allChapters.Add([PSCustomObject]@{ video_id=$v_id; chapter_time=$c.time; chapter_text=$c.text })
                    }
                }
            }
        }
        if ($props -contains "links") {
            foreach ($l in $item.links) { $allAssets.Add([PSCustomObject]@{ card_id=$c_id; asset_type="pdf"; url=$l.url; title=$l.text }) }
        }
        if ($props -contains "images") {
            foreach ($img in $item.images) { $allAssets.Add([PSCustomObject]@{ card_id=$c_id; asset_type="image"; url=$img.url; title=$img.title }) }
        }
        if ($props -contains "pdfs") {
            foreach ($pdf in $item.pdfs) {
                if ($pdf.links) {
                    foreach ($l in $pdf.links) { $allAssets.Add([PSCustomObject]@{ card_id=$c_id; asset_type="pdf"; url=$l.url; title=$l.text }) }
                } else {
                    $allAssets.Add([PSCustomObject]@{ card_id=$c_id; asset_type="pdf"; url=$pdf.url; title=$pdf.title })
                }
            }
        }
    }
}

Delete-Table "video_chapters" "video_id=not.is.null"
Delete-Table "card_assets" "card_id=not.is.null"
Delete-Table "videos" "id=not.is.null"
Delete-Table "cards" "id=not.is.null"

Upsert-Table "cards" $allCards
Upsert-Table "videos" $allVideos
Upsert-Table "video_chapters" $allChapters
Upsert-Table "card_assets" $allAssets

Write-Host "`nFinal Verification..."
$test = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/cards?select=title&limit=1" -Method Get -Headers $h
Write-Host "Card Title (Raw Bytes):"
$bytes = $utf8.GetBytes($test.title)
$bytes | ForEach-Object { "{0:X2}" -f $_ }
