$SupabaseUrl = "https://ozcffmadatsfyyldqmdl.supabase.co"
$SupabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Y2ZmbWFkYXRzZnl5bGRxbWRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5NzUxMSwiZXhwIjoyMTAyMzczNTExfQ.WkAWW7iXgstl4YX7be_O4K20YvyXvh0eNJ4eALpv9Wg"

$Headers = @{
    "apikey" = $SupabaseKey
    "Authorization" = "Bearer $SupabaseKey"
    "Content-Type" = "application/json; charset=utf-8"
}

function Delete-TableData($Table) {
    Write-Host "Deleting $Table..."
    $Url = "$SupabaseUrl/rest/v1/$Table?id=not.is.null"
    try {
        # Using curl.exe for DELETE as it's more reliable for simple DELETEs
        curl.exe -X DELETE "$Url" -H "apikey: $SupabaseKey" -H "Authorization: Bearer $SupabaseKey"
        Write-Host "Deleted $Table success"
    } catch {
        Write-Host "Error deleting $Table"
    }
}

function Insert-TableData($Table, $Data) {
    if ($Data.Count -eq 0) {
        Write-Host "No data for $Table"
        return
    }
    Write-Host "Inserting $($Data.Count) records into $Table..."
    $Url = "$SupabaseUrl/rest/v1/$Table"

    # Chunking to avoid large payload issues
    $ChunkSize = 50
    for ($i = 0; $i -lt $Data.Count; $i += $ChunkSize) {
        $End = [Math]::Min($i + $ChunkSize - 1, $Data.Count - 1)
        $Chunk = $Data[$i..$End]
        $Body = $Chunk | ConvertTo-Json -Depth 10 -Compress
        $Utf8Body = [System.Text.Encoding]::UTF8.GetBytes($Body)
        try {
            Invoke-RestMethod -Uri $Url -Method Post -Headers $Headers -Body $Utf8Body
        } catch {
            Write-Host "Error inserting chunk into $($Table): $_"
            if ($_.Exception.Response) {
                $StreamReader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                Write-Host $StreamReader.ReadToEnd()
            }
        }
    }
    Write-Host "Finished $Table"
}

$Files = @("vsa.json", "data.json", "Time-analysis.json", "technical-analysis.json", "PDF-images.json")
$BasePath = "D:/New folder/my"

$AllCards = New-Object System.Collections.Generic.List[PSCustomObject]
$AllVideos = New-Object System.Collections.Generic.List[PSCustomObject]
$AllChapters = New-Object System.Collections.Generic.List[PSCustomObject]
$AllAssets = New-Object System.Collections.Generic.List[PSCustomObject]

$CardIds = New-Object System.Collections.Generic.HashSet[string]
$VideoIds = New-Object System.Collections.Generic.HashSet[string]

foreach ($File in $Files) {
    $Path = Join-Path $BasePath $File
    if (-not (Test-Path $Path)) {
        Write-Host "File not found: $Path"
        continue
    }
    Write-Host "Reading $File..."
    $Content = Get-Content $Path -Raw -Encoding UTF8
    $Data = $Content | ConvertFrom-Json

    foreach ($Item in $Data) {
        # Skip items without title
        if (-not $Item.title) { continue }

        $Title = $Item.title
        $CardId = if ($Item.id) { $Item.id } else { "$($Item.category)-$($Title.Substring(0, [Math]::Min(10, $Title.Length)))" }

        if (-not $CardIds.Contains($CardId)) {
            $AllCards.Add([PSCustomObject]@{
                id = $CardId
                title = $Title
                category = if ($Item.category) { $Item.category } else { "" }
                content = if ($Item.content) { $Item.content } else { "" }
                image_url = if ($Item.image) { $Item.image } else { "" }
            })
            $CardIds.Add($CardId) | Out-Null
        }

        if ($Item.videos) {
            foreach ($v in $Item.videos) {
                $VTitle = if ($v.title) { $v.title } else { "" }
                $VUrl = if ($v.url) { $v.url } else { "" }
                if (-not $VTitle -and -not $VUrl) { continue }

                $VId = if ($v.id) { $v.id } else { "$CardId-v-$($VTitle.Substring(0, [Math]::Min(10, $VTitle.Length)))" }

                if (-not $VideoIds.Contains($VId)) {
                    $AllVideos.Add([PSCustomObject]@{
                        id = $VId
                        card_id = $CardId
                        title = $VTitle
                        url = $VUrl
                    })
                    $VideoIds.Add($VId) | Out-Null

                    if ($v.chapters) {
                        foreach ($ch in $v.chapters) {
                            $AllChapters.Add([PSCustomObject]@{
                                video_id = $VId
                                chapter_time = if ($ch.time) { $ch.time } else { "" }
                                chapter_text = if ($ch.text) { $ch.text } else { "" }
                            })
                        }
                    }
                }
            }
        }

        if ($Item.links) {
            foreach ($l in $Item.links) {
                $AllAssets.Add([PSCustomObject]@{
                    card_id = $CardId
                    asset_type = $null
                    url = if ($l.url) { $l.url } else { "" }
                    title = if ($l.text) { $l.text } else { "" }
                })
            }
        }

        if ($Item.images) {
            foreach ($img in $Item.images) {
                $AllAssets.Add([PSCustomObject]@{
                    card_id = $CardId
                    asset_type = "image"
                    url = if ($img.url) { $img.url } else { "" }
                    title = if ($img.title) { $img.title } else { "" }
                })
            }
        }

        if ($Item.pdfs) {
            foreach ($pdf in $Item.pdfs) {
                $AllAssets.Add([PSCustomObject]@{
                    card_id = $CardId
                    asset_type = "pdf"
                    url = if ($pdf.url) { $pdf.url } else { "" }
                    title = if ($pdf.title) { $pdf.title } else { "" }
                })
            }
        }
    }
}

# Delete existing data - SKIPPED since manually cleaned
# Delete-TableData "video_chapters"
# Delete-TableData "card_assets"
# Delete-TableData "videos"
# Delete-TableData "cards"

# Migration
Insert-TableData "cards" $AllCards
Insert-TableData "videos" $AllVideos
Insert-TableData "video_chapters" $AllChapters
Insert-TableData "card_assets" $AllAssets

Write-Host "`nVerifying migration..."
$VerifyUrl = "$SupabaseUrl/rest/v1/cards?select=title&limit=10"
$Verify = Invoke-RestMethod -Uri $VerifyUrl -Headers $Headers
Write-Host "Sample titles from database (check for Arabic):"
foreach ($v in $Verify) {
    Write-Host " - $($v.title)"
}
