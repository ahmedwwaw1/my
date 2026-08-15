$supabaseUrl = "https://ozcffmadatsfyyldqmdl.supabase.co"
$supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Y2ZmbWFkYXRzZnl5bGRxbWRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5NzUxMSwiZXhwIjoyMTAyMzczNTExfQ.WkAWW7iXgstl4YX7be_O4K20YvyXvh0eNJ4eALpv9Wg"

$headers = @{
    "apikey" = $supabaseKey
    "Authorization" = "Bearer $supabaseKey"
    "Content-Type" = "application/json; charset=utf-8"
    "Prefer" = "resolution=merge-duplicates"
}

function Upsert-Table($table, $data) {
    if ($data.Count -eq 0) { return }
    $url = "$supabaseUrl/rest/v1/$table"

    for ($i = 0; $i -lt $data.Count; $i += 50) {
        $end = $i + 49
        if ($end -ge $data.Count) { $end = $data.Count - 1 }
        $chunk = $data[$i..$end]

        $json = $chunk | ConvertTo-Json -Depth 10 -Compress
        $body = [System.Text.Encoding]::UTF8.GetBytes($json)

        try {
            Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
            Write-Host "Successfully upserted $($chunk.Count) rows to $table"
        } catch {
            Write-Warning "Chunk failed for $($table). Retrying one by one..."
            foreach ($row in $chunk) {
                $rowJson = @($row) | ConvertTo-Json -Depth 10 -Compress
                $rowBody = [System.Text.Encoding]::UTF8.GetBytes($rowJson)
                try {
                    Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $rowBody
                } catch {
                    Write-Error "Row failed in $($table): $($rowJson)"
                    if ($_.Exception.Response) {
                        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                        $responseBody = $reader.ReadToEnd()
                        Write-Error "Response: $($responseBody)"
                    }
                }
            }
        }
    }
}

$files = @(
    "D:/New folder/my/vsa.json",
    "D:/New folder/my/data.json",
    "D:/New folder/my/Time-analysis.json",
    "D:/New folder/my/technical-analysis.json",
    "D:/New folder/my/PDF-images.json"
)

$allCards = New-Object System.Collections.Generic.List[PSObject]
$allVideos = New-Object System.Collections.Generic.List[PSObject]
$allChapters = New-Object System.Collections.Generic.List[PSObject]
$allAssets = New-Object System.Collections.Generic.List[PSObject]

$cardIds = New-Object System.Collections.Generic.HashSet[string]
$videoIds = New-Object System.Collections.Generic.HashSet[string]

foreach ($filePath in $files) {
    if (-not (Test-Path $filePath)) { continue }

    $content = Get-Content $filePath -Raw -Encoding utf8
    if (-not $content) { continue }
    $data = $content | ConvertFrom-Json

    foreach ($item in $data) {
        $props = $item.psobject.properties | Select-Object -ExpandProperty Name
        if ($props -contains "__comment__" -and $props.Count -eq 1) { continue }

        $origId = $item.id
        $title = $item.title
        $category = $item.category

        if (-not $origId) {
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($title + $category)
            $hash = ([System.Security.Cryptography.MD5]::Create().ComputeHash($bytes) | ForEach-Object { $_.ToString("x2") }) -join ""
            $cardId = "$category-$($hash.Substring(0, 8))"
        } else {
            $cardId = $origId
        }

        $baseId = $cardId
        $counter = 1
        while ($cardIds.Contains($cardId)) {
            $cardId = "$baseId-$counter"
            $counter++
        }
        [void]$cardIds.Add($cardId)

        $image = if ($props -contains "image") { $item.image } elseif ($props -contains "image_url") { $item.image_url } else { "" }

        $allCards.Add([PSCustomObject]@{
            id = $cardId
            title = if ($title) { $title } else { "" }
            category = if ($category) { $category } else { "" }
            content = if ($item.content) { $item.content } else { "" }
            image_url = if ($image) { $image } else { "" }
        })

        if ($props -contains "videos") {
            $idx = 0
            foreach ($v in $item.videos) {
                $vProps = $v.psobject.properties | Select-Object -ExpandProperty Name
                $videoId = if ($vProps -contains "id") { $v.id } else { "$cardId-v-$idx" }

                $vBaseId = $videoId
                $vCounter = 1
                while ($videoIds.Contains($videoId)) {
                    $videoId = "$vBaseId-$vCounter"
                    $vCounter++
                }
                [void]$videoIds.Add($videoId)

                $allVideos.Add([PSCustomObject]@{
                    id = $videoId
                    card_id = $cardId
                    title = if ($v.title) { $v.title } else { "" }
                    url = if ($v.url) { $v.url } else { "" }
                    order_index = $idx
                })

                if ($vProps -contains "chapters") {
                    foreach ($c in $v.chapters) {
                        $allChapters.Add([PSCustomObject]@{
                            video_id = $videoId
                            chapter_time = if ($c.time) { $c.time } else { "" }
                            chapter_text = if ($c.text) { $c.text } else { "" }
                        })
                    }
                }
                $idx++
            }
        }

        if ($props -contains "links") {
            foreach ($l in $item.links) {
                $allAssets.Add([PSCustomObject]@{
                    card_id = $cardId
                    # Omit asset_type for links as it violates check constraint
                    # asset_type = "link"
                    url = if ($l.url) { $l.url } else { "" }
                    title = if ($l.text) { $l.text } else { "" }
                })
            }
        }

        if ($props -contains "images") {
            foreach ($img in $item.images) {
                $allAssets.Add([PSCustomObject]@{
                    card_id = $cardId
                    asset_type = "image"
                    url = if ($img.url) { $img.url } else { "" }
                    title = if ($img.title) { $img.title } else { "" }
                })
            }
        }

        if ($props -contains "pdfs") {
            foreach ($pdf in $item.pdfs) {
                $pdfProps = $pdf.psobject.properties | Select-Object -ExpandProperty Name
                if ($pdfProps -contains "links") {
                    foreach ($l in $pdf.links) {
                        $allAssets.Add([PSCustomObject]@{
                            card_id = $cardId
                            asset_type = "pdf"
                            url = if ($l.url) { $l.url } else { "" }
                            title = if ($l.text) { $l.text } else { "" }
                        })
                    }
                } else {
                    $allAssets.Add([PSCustomObject]@{
                        card_id = $cardId
                        asset_type = "pdf"
                        url = if ($pdf.url) { $pdf.url } else { "" }
                        title = if ($pdf.title) { $pdf.title } else { "" }
                    })
                }
            }
        }
    }
}

Write-Host "Total cards: $($allCards.Count)"
Write-Host "Total videos: $($allVideos.Count)"
Write-Host "Total chapters: $($allChapters.Count)"
Write-Host "Total assets: $($allAssets.Count)"

Write-Host "Starting migration..."
# Upsert-Table "cards" $allCards
# Upsert-Table "videos" $allVideos
# Upsert-Table "video_chapters" $allChapters
Upsert-Table "card_assets" $allAssets
Write-Host "Migration finished."
