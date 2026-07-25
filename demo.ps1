# Buduje frontend i odpala Django + ngrok pod jednym publicznym URL.
# Uruchamiaj z katalogu glownego repo: .\demo.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "Buduje frontend..." -ForegroundColor Cyan
Push-Location "$root\frontend"
npm run build
Pop-Location

Write-Host "Startuje Django (DEBUG=False, serwuje zbudowany frontend)..." -ForegroundColor Cyan
$env:DJANGO_SETTINGS_MODULE = "config.settings.dev"
$env:DEBUG = "False"
$env:ALLOWED_HOSTS = "*"
$env:CSRF_TRUSTED_ORIGINS = "https://*.ngrok-free.app,https://*.ngrok.io"

& "$root\.venv\Scripts\Activate.ps1"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; `$env:DJANGO_SETTINGS_MODULE='config.settings.dev'; `$env:DEBUG='False'; `$env:ALLOWED_HOSTS='*'; `$env:CSRF_TRUSTED_ORIGINS='https://*.ngrok-free.app,https://*.ngrok.io'; & '$root\.venv\Scripts\Activate.ps1'; python manage.py runserver 0.0.0.0:8000 --insecure --noreload"

Start-Sleep -Seconds 3

Write-Host "Startuje ngrok..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "ngrok http 8000"

Start-Sleep -Seconds 3
try {
    $tunnels = (Invoke-RestMethod http://127.0.0.1:4040/api/tunnels).tunnels
    $url = ($tunnels | Where-Object { $_.proto -eq "https" }).public_url
    Write-Host "`nDemo dostepne pod: $url" -ForegroundColor Green
} catch {
    Write-Host "Nie udalo sie pobrac URL automatycznie - sprawdz okno ngrok albo http://127.0.0.1:4040" -ForegroundColor Yellow
}

Write-Host "Django i ngrok dzialaja w osobnych oknach PowerShell. Zamknij je, zeby zatrzymac demo." -ForegroundColor DarkGray
