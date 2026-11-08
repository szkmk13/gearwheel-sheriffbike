# Diagramy systemu Sheriff Bike

Dokumentacja diagramowa do pracy inżynierskiej. Źródła w PlantUML (`*.puml`), gotowe obrazy w `png/` i `svg/`.
Wspólny styl jest w `_styl.iuml` (dołączany przez `!include`).

| Plik | Rodzaj | Co przedstawia |
|---|---|---|
| `01-przypadki-uzycia` | UML: przypadki użycia | Aktorzy (klient, pracownik, administrator, systemy zewnętrzne, w tym bramka SMS) i funkcje strony publicznej, panelu (zlecenia, pozycje z katalogu, kalendarz, przechowalnia) i panelu admin. |
| `02-diagram-klas` | UML: klasy | Model domeny: klienci i sprzęt, zlecenia i ich pozycje, przechowalnia (`StorageBooking`), katalog (`Part.kind`: usługa / część / akcesorium). Pola, krotności, właściwości wyliczane, ograniczenia. `Invoice` i `StockMovement` oznaczone jako nieużywane. |
| `03-erd` | ERD | Schemat bazy: tabele, klucze główne i obce, tabela pośrednia M:N `orders_repairorder_bikes`, reguły `on_delete`. |
| `04-architektura-komponentow` | UML: komponenty | Architektura klient-serwer: React SPA (router, AuthContext, React Query, `apiFetch`), Django (DRF, auth, aplikacje domenowe, ORM), baza SQLite, usługi zewnętrzne. |
| `05-wdrozenie` | UML: wdrożenie | Środowisko produkcyjne: GitHub Actions, VPS z nginx i gunicornem pod systemd, pliki statyczne i media, baza SQLite, połączenia z API zewnętrznymi. |
| `06-pakiety` | UML: pakiety | Struktura kodu źródłowego (`config`, `apps/*`, `frontend/src`) i zależności między pakietami. |
| `07a-sekwencja-logowanie` | UML: sekwencja | Uwierzytelnianie sesyjne: seedowanie cookie CSRF, `/api/auth/me/`, logowanie, obsługa wygaśnięcia sesji (401). |
| `07b-sekwencja-formularz-kontaktowy` | UML: sekwencja | Formularz rezerwacji ze strony publicznej: walidacja, Cloudflare Turnstile, zapis do Google Sheets. |
| `07c-sekwencja-skan-qr` | UML: sekwencja | Identyfikacja sprzętu kamerą: dekodowanie jsQR, `bikes/lookup`, przejście do szczegółów sprzętu albo do formularza nowego zlecenia. |
| `08a-stany-zlecenia` | UML: maszyna stanów | Cykl życia zlecenia naprawy, zapis `StatusHistory`, SMS o gotowości do odbioru, blokada pozycji po wydaniu / anulowaniu. |
| `08b-stany-przechowania` | UML: maszyna stanów | Cykl życia przechowania zimowego: przyjęcie (`intake`), edycja, przedłużenie, wydanie, anulowanie. Ścieżka rezerwacji pokazana jako nieużywana przez panel. |
| `09-aktywnosc-przyjecie-sprzetu` | UML: aktywność | Proces przyjęcia sprzętu z torami (klient, pracownik, system): wyszukanie klienta po telefonie, rejestracja sprzętu, zlecenie naprawy albo przechowanie zimowe. |
| `10-nawigacja-spa` | Mapa nawigacji | Trasy React Routera (w tym kalendarz i przechowalnia) i przejścia między widokami panelu. |

Moduł `appointments` (wizyty) pominięto celowo: ma model, ale nie jest podpięty do API ani frontendu.

## Renderowanie

**Online (bez instalacji):** wklej zawartość pliku na https://www.plantuml.com/plantuml i pobierz PNG/SVG.
Serwer nie widzi pliku `_styl.iuml`, więc zamień linię `!include _styl.iuml` na zawartość tego pliku
(albo po prostu ją usuń, wtedy zostanie domyślny styl PlantUML).

**PyCharm:** wtyczka "PlantUML Integration" pokazuje podgląd na żywo i eksportuje obrazy.

**Lokalnie (Java):**

```bash
# plantuml.jar: https://github.com/plantuml/plantuml/releases
java -jar plantuml.jar -charset UTF-8 -tpng -o png docs/diagrams/0*.puml docs/diagrams/1*.puml
java -jar plantuml.jar -charset UTF-8 -tsvg -o svg docs/diagrams/0*.puml docs/diagrams/1*.puml
```

Bez zainstalowanego Graphviz dodaj `-Playout=smetana` (wbudowany silnik układu, tak powstały obecne obrazy).
Z Graphviz układ diagramów klas i komponentów bywa bardziej zwarty.

Do pracy w Wordzie lepiej wstawiać PNG (ustawione na 150 dpi), a w LaTeX-u SVG albo PDF (`-tpdf`).
