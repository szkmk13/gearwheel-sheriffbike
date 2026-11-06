"""The shop's base catalogue, loaded by migration 0004_base_catalog.

Entries are matched by `sku`, so loading is idempotent and staff can rename an entry or
change its price in the admin without the next load duplicating it.
"""

# SKU of the winter storage service - `apps.storage` adds it to the order on intake.
STORAGE_SERVICE_SKU = 'USL-PRZECHOWANIE'

# (sku, kind, name, unit, sell_price)
BASE_CATALOG = [
    # Usługi - z landing page; "od X zł" wpisane jako X, na zleceniu cenę można zmienić.
    ('USL-SERWIS', 'service', 'Usługi serwisowe', 'godz.', '0.00'),
    ('USL-REGULACJE', 'service', 'Regulacje przerzutek i hamulców', 'usł.', '40.00'),
    ('USL-SKLADANIE', 'service', 'Składanie roweru', 'usł.', '200.00'),
    ('USL-PRZEGLAD-PODST', 'service', 'Przegląd podstawowy', 'usł.', '250.00'),
    ('USL-PRZEGLAD-PLUS', 'service', 'Przegląd podstawowy Plus', 'usł.', '350.00'),
    ('USL-KOSZTORYS', 'service', 'Kosztorys pokolizyjny', 'usł.', '220.00'),
    ('USL-PRZEGLAD-KOMPL', 'service', 'Przegląd kompleksowy', 'usł.', '700.00'),
    (STORAGE_SERVICE_SKU, 'service', 'Przechowanie zimowe', 'szt.', '550.00'),
    # Akcesoria
    ('AKC-SMAR', 'accessory', 'Smar do łańcucha', 'szt.', '30.00'),
    ('AKC-LAMPKA-PRZOD', 'accessory', 'Lampka przednia biała', 'szt.', '40.00'),
    ('AKC-LAMPKA-TYL', 'accessory', 'Lampka tylna czerwona', 'szt.', '30.00'),
]

BASE_CATALOG_SKUS = [sku for sku, *_ in BASE_CATALOG]

# Pozycje bazowe, którymi nie dopełniamy listy "Najczęściej używane": usługa za 0 zł mało
# komu się przydaje, a przechowanie dodaje się samo przy przyjęciu. Z rankingu użycia nie
# są wykluczone.
POPULAR_FILL_EXCLUDED_SKUS = {'USL-SERWIS', STORAGE_SERVICE_SKU}
