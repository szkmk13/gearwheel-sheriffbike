# gearwheel-sherifbike

## Wymagania

- Python 3.11
- Node.js 18+ (do budowania/serwowania frontendu przez Vite)

## Instalacja (backend)

```bash
# 1. Sklonuj repozytorium
git clone <url>
cd gearwheel-sherifbike

# 2. Utwórz i aktywuj wirtualne środowisko
python -m venv .venv

# Windows (Git Bash)
source .venv/Scripts/activate
# Windows (cmd)
.venv\Scripts\activate.bat
# macOS / Linux
source .venv/bin/activate

# 3. Zainstaluj zależności
pip install -r requirements.txt

# 4. Skonfiguruj zmienne środowiskowe
cp .env_example .env
# Uzupełnij SECRET_KEY w pliku .env (np. python -c "import secrets; print(secrets.token_urlsafe(50))")

# 5. Wykonaj migracje (domyślnie SQLite, bez potrzeby dodatkowej konfiguracji)
python manage.py migrate

# 6. Utwórz konto 
python manage.py createsuperuser
```

## Instalacja (frontend)

Frontend (`frontend/`) to osobna aplikacja Vite + React, zintegrowana z Django przez `django-vite`.
Przy `DEBUG=True` Django oczekuje działającego dev-serwera Vite pod `:5173` - bez niego strona główna (`/`) się nie wyrenderuje.

```bash
cd frontend
npm install
```

## Uruchomienie (dwa terminale)

```bash
# Terminal 1 - backend (z katalogu głównego repo, z aktywnym .venv)
python manage.py startserver   

# Terminal 2 - frontend
cd frontend
npm run dev
```

Aplikacja dostępna pod: http://127.0.0.1:8000

Panel admina: http://127.0.0.1:8000/admin/

Dokumentacja API (Swagger): http://127.0.0.1:8000/api/docs/

## Budowanie frontendu na produkcję

Django nie buduje frontendu automatycznie. Przed uruchomieniem z `DEBUG=False` wykonaj:

```bash
cd frontend
npm run build   # buduje do ../static/frontend, odczytywane przez django-vite
```

## Produkcja: backup, alerty i healthcheck

Jednorazowa konfiguracja na serwerze mikrus (po `ssh`, w `/home/sheriff_bike`).

### 1. Alerty mailowe (Gmail SMTP)

Błędy 500 i nieudane backupy przychodzą mailem z pełnym tracebackiem.

1. Na koncie Google, z którego mają iść maile, włącz weryfikację dwuetapową i utwórz
   **hasło aplikacji** (Konto Google -> Bezpieczeństwo -> Hasła do aplikacji).
2. Dopisz do `.env`:
   ```
   ADMIN_EMAILS=twoj@gmail.com
   EMAIL_HOST_USER=konto.wysylajace@gmail.com
   EMAIL_HOST_PASSWORD=haslo-aplikacji-16-znakow
   ```
3. `make restart`, a potem sprawdź wysyłkę:
   ```bash
   .venv/bin/python manage.py sendtestemail --admins --settings=config.settings.dev
   ```

### 2. Kopia na Google Drive (rclone)

```bash
sudo -v ; curl https://rclone.org/install.sh | sudo bash   # albo instalacja do ~/bin bez sudo
rclone config        # n -> nazwa: gdrive -> typ: drive -> scope: drive.file
                     # autoryzacja bez przeglądarki: "rclone authorize drive" na swoim PC
rclone mkdir gdrive:sheriff-bike-backups
```

Dopisz do `.env`: `BACKUP_RCLONE_REMOTE=gdrive:sheriff-bike-backups`

### 3. Alert, gdy backup się nie wykona (healthchecks.io)

Załóż darmowe konto na healthchecks.io i dodaj check z okresem 1 dzień i grace time 2 h.
Skopiuj jego URL do `.env`: `HEALTHCHECK_PING_URL=https://hc-ping.com/<uuid>`.
Jeśli ping nie przyjdzie przez dobę (np. timer przestał działać), dostaniesz maila.

### 4. Codzienny backup (systemd timer)

```bash
cp deploy/gearwheel-backup.service deploy/gearwheel-backup.timer ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now gearwheel-backup.timer
systemctl --user start gearwheel-backup.service    # pierwszy backup od razu
journalctl --user -u gearwheel-backup.service -n 30
```

Codziennie o 03:00 do `backups/` trafia kopia bazy, sprawdzona przez `PRAGMA integrity_check`.
Raz w tygodniu dochodzi archiwum `media/`. Rotacja zostawia 7 kopii dziennych, 4 tygodniowe,
6 miesięcznych i 4 archiwa media. Po każdym backupie pliki lecą na Google Drive (`rclone copy`,
kopie starsze niż 200 dni są tam usuwane). Każdy deploy robi dodatkowo kopię `predeploy-*`
przed `migrate` (ostatnie 5).

### 5. Monitoring dostępności (UptimeRobot)

Dodaj monitor HTTP(S) na `https://<domena>/api/health/` co 5 min. Endpoint zwraca
`{"status": "ok"}` albo 503, gdy baza nie odpowiada. Ten sam endpoint sprawdza
`deploy/healthcheck.sh` po każdym deployu - jeśli aplikacja nie wstanie, deploy w
GitHub Actions kończy się błędem.

### Odtwarzanie bazy z kopii

```bash
ls -1t backups/                                   # lokalne kopie
rclone copy gdrive:sheriff-bike-backups/db-20261114-030000.sqlite3.gz backups/   # albo z Drive
bash deploy/restore.sh backups/db-20261114-030000.sqlite3.gz
```

Skrypt sprawdza integralność kopii, pyta o potwierdzenie, zapisuje obecną bazę jako
`backups/before-restore-*.sqlite3`, podmienia ją, uruchamia `migrate` i healthcheck.
Ręczny backup w dowolnej chwili: `systemctl --user start gearwheel-backup.service`.
