# Скачивает все зарядные станции России из OpenChargeMap с ЭТОГО компьютера
# (не с VPS — там нестабильное соединение с их API).
# Результат — файл ocm-ru-raw.json, который нужно положить на сервер в
# backend/prisma/seed-data/ocm-raw-dump.json и запустить npm run seed —
# seed.ts автоматически подхватит его вместо сетевого запроса.

$ApiKey = "06dbd9b7-8a0e-4c83-a57f-8034f7e636a7"  # твой ключ OpenChargeMap
$PageSize = 200
$MaxPages = 30
$OutFile = "ocm-ru-raw.json"

$allStations = @()

for ($page = 0; $page -lt $MaxPages; $page++) {
    $offset = $page * $PageSize
    $url = "https://api.openchargemap.io/v3/poi/?output=json&countrycode=RU&maxresults=$PageSize&offset=$offset&compact=true&verbose=false"
    Write-Host "Страница $($page + 1), offset $offset..."

    try {
        $response = Invoke-RestMethod -Uri $url -Headers @{
            "User-Agent" = "proev.ru-local-fetch/1.0"
            "X-API-Key"  = $ApiKey
            "Accept"     = "application/json"
        } -TimeoutSec 30

        if ($response.Count -eq 0) {
            Write-Host "Пустая страница — это был конец данных."
            break
        }

        $allStations += $response
        Write-Host "  Получено $($response.Count) станций (всего: $($allStations.Count))"

        if ($response.Count -lt $PageSize) {
            Write-Host "Последняя страница (меньше $PageSize записей)."
            break
        }
    }
    catch {
        Write-Host "Ошибка на странице $($page + 1): $_"
        Write-Host "Жду 3 секунды и пробую следующую страницу..."
        Start-Sleep -Seconds 3
    }

    Start-Sleep -Milliseconds 300
}

$allStations | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutFile -Encoding utf8
Write-Host ""
Write-Host "Готово! Сохранено $($allStations.Count) станций в $OutFile"
Write-Host "Дальше: закинь этот файл на сервер как backend/prisma/seed-data/ocm-raw-dump.json"
