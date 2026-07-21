# Downloads all RU charging stations from OpenChargeMap using THIS computer
# (not the VPS - unreliable connection to their API from there).
# Result: ocm-ru-raw.json - upload it to the server as
# backend/prisma/seed-data/ocm-raw-dump.json, then run npm run seed there.

$ApiKey = "06dbd9b7-8a0e-4c83-a57f-8034f7e636a7"
$PageSize = 200
$MaxPages = 30
$OutFile = "ocm-ru-raw.json"

$allStations = @()

for ($page = 0; $page -lt $MaxPages; $page++) {
    $offset = $page * $PageSize
    $url = "https://api.openchargemap.io/v3/poi/?output=json&countrycode=RU&maxresults=$PageSize&offset=$offset&compact=true&verbose=false"
    Write-Host "Page $($page + 1), offset $offset..."

    try {
        $response = Invoke-RestMethod -Uri $url -Headers @{
            "User-Agent" = "proev-local-fetch/1.0"
            "X-API-Key"  = $ApiKey
            "Accept"     = "application/json"
        } -TimeoutSec 30

        if ($response.Count -eq 0) {
            Write-Host "Empty page - done."
            break
        }

        $allStations += $response
        Write-Host "  Got $($response.Count) stations (total: $($allStations.Count))"

        if ($response.Count -lt $PageSize) {
            Write-Host "Last page reached."
            break
        }
    }
    catch {
        Write-Host "Error on page $($page + 1): $_"
        Write-Host "Waiting 3 seconds before next page..."
        Start-Sleep -Seconds 3
    }

    Start-Sleep -Milliseconds 300
}

$allStations | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutFile -Encoding utf8
Write-Host ""
Write-Host "Done! Saved $($allStations.Count) stations to $OutFile"
Write-Host "Next: upload this file to the server as backend/prisma/seed-data/ocm-raw-dump.json"
