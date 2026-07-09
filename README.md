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

# 6. Utwórz konto administratora (potrzebne do /admin/ oraz do endpointów API,
#    które domyślnie wymagają uprawnień staff, w tym /api/docs/)
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
python manage.py runserver

# Terminal 2 - frontend
cd frontend
npm run dev
```

Aplikacja dostępna pod: http://127.0.0.1:8000
Panel admina: http://127.0.0.1:8000/admin/
Dokumentacja API (Swagger): http://127.0.0.1:8000/api/docs/ - wymaga zalogowania jako
superuser (np. przez `/admin/` w tej samej przeglądarce, żeby uzyskać sesję/ciasteczko).

## Budowanie frontendu na produkcję

Django nie buduje frontendu automatycznie. Przed uruchomieniem z `DEBUG=False` wykonaj:

```bash
cd frontend
npm run build   # buduje do ../static/frontend, odczytywane przez django-vite
```
