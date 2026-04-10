# gearwheel-sherifbike

## Wymagania

- Python 3.11

## Instalacja

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
# Uzupełnij SECRET_KEY w pliku .env

# 5. Wykonaj migracje
python manage.py migrate

# 6. Uruchom serwer
python manage.py runserver
```

Aplikacja dostępna pod: http://127.0.0.1:8000
