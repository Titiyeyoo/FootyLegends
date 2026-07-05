# Footy Legends — testy

Testy ładują **prawdziwy kod produkcyjny** (nie kopie), więc nie mogą się rozjechać.
Uruchamiasz je zwykłym `node` — bez npm, bez instalacji, bez vitest.

## Jak uruchomić

```bash
node tests/engine.test.js     # silnik typów DNA (laduje xad.js)
node tests/match.test.js      # rozpoznawanie odpowiedzi Quick Quiz (laduje core.js)
node tests/db.validate.js     # walidator bazy (laduje db.js)
```

Zielone „✓ WSZYSTKO OK" / „✓ BAZA OK" = w porządku. Odpalaj przed większą zmianą (albo po niej).

## Co jest sprawdzane

| Plik | Ładuje | Co |
|------|--------|-----|
| `engine.test.js` | `xad.js` (przez `flRadarData`) | typy DNA: forming, ALL-ROUNDER, primary+secondary, LEGENDS X/804 |
| `match.test.js` | `core.js` | `norm/tryMatch/findAlmost/lev`: aliasy, nazwiska niejednoznaczne, akcenty, odwrócona kolejność, literówki |
| `db.validate.js` | `db.js` | komplet pól, poprawne enumy (era/grupa/pozycja), brak duplikatów, spójność pozycja↔grupa |

## Zasada

Testy **wczytują prawdziwe pliki gry** w piaskownicy node (z zaślepkami przeglądarki) i sprawdzają
kod produkcyjny bezpośrednio. Żadnych ręcznych kopii funkcji — to eliminuje ryzyko, że
„test przechodzi, a produkcja jest zepsuta".

Dev-only: zero wpływu na produkcję, zero danych gracza, zero PII.
