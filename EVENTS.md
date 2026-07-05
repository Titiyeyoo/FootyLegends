# Footy Legends — Analytics Events

*Schemat pomiaru, oparty na kodzie źródłowym (nie na domysłach z GA4). Aktualizuj przy każdej zmianie eventów. Wszystkie zdarzenia idą przez `flTrack()` — za zgodą GDPR (`fl_consent`), z automatycznym parametrem `v` (wersja buildu), zero PII.*

## Zasada czytania lejka

`game_complete` jest **wspólny** dla Quick Quiz i XI After Dark. Żeby policzyć czysty lejek XI After Dark, **filtruj po `mode = xad`**. Wtedy:

```
lineup_started → first_pick → story_discovered → game_complete → play_again
   (mode=xad)     (mode=xad)     (mode=xad)      (mode=xad)      (mode=xad)
```

Bez tego filtra `game_complete` będzie zawyżone (dolicza Quick Quiz), a `lineup_started` zaniżone (tylko XAD) — i lejek wygląda na zepsuty, choć nie jest.

## Mapa eventów

| Event | Kiedy wysyłany | Tryb (`mode`) | Parametry | Cel |
|-------|----------------|---------------|-----------|-----|
| `lineup_started` | wejście do draftu (ROLL) | `xad` | mode, v | początek lejka |
| `first_pick` | pierwszy wybór zawodnika po rollu | `xad` | mode, slot, era, v | aktywacja |
| `story_discovered` | odkrycie nowej historii | `xad` | mode, story, tier, v | engagement |
| `game_complete` | koniec gry (Lock In / koniec quizu) | `quiz` / `xad` | mode, score, (xad: story, tier, xi_type), v | completion |
| `play_again` | klik „Play Again" / nowy draft po reveal | `quiz` / `xad` | mode, v | retencja |
| `share` | udostępnienie karty / linku | `quiz` / `classic` / `xad` / `dna` / `legend` | mode, v | virality |
| `clean_view` | wejście w tryb czystego widoku (screenshot) | `legend` (potem `xad`) | mode, v | virality / save-vs-share |
| `fan_profile` | policzenie profilu DNA (otwarcie My Footy Legend) | — (profil) | type, games, v | engagement |
| `legend_open` | wejście na ekran My Footy Legend | — (profil) | games, revealed, type, v | usage profilu |
| `recovery_offered` | pokazanie promptu „Continue draft?" | — | filled, v | crash recovery |
| `recovery_continued` | klik CONTINUE DRAFT | — | filled, v | crash recovery |
| `recovery_discarded` | klik START OVER | — | filled, v | crash recovery |
| `js_error` | nieuchwycony błąd JS / promise | globalny | kind, msg, src, line, v | stabilność |

## Uwagi

- **`fan_profile` i `legend_open` nie mają `mode`** — celowo. To zdarzenia **profilu** (My Footy Legend dostępny z menu, niezależnie od trybu gry), nie części lejka roll→complete. Nie filtruj ich po `mode=xad` — wypadną.
- **`share_card` NIE istnieje jako osobny event** i nie ma potrzeby go dodawać — `share` z parametrem `mode` pokrywa wszystkie karty. Jeden event z parametrem > wiele osobnych eventów (skalowalność).
- **`link_out` nie ma sensu** — kliknięcie *do* gry z X/Facebooka to ruch przychodzący, widoczny w GA jako źródło/medium (`t.co / referral`), nie da się go zmierzyć eventem po stronie gry.
- **`first_pick` i `story_discovered` dostały `mode:"xad"`** (poprawka pomiarowa) — wcześniej go nie miały, więc wypadały z filtra lejka. Pojawią się w raportach dopiero za okres po wdrożeniu.

## GA4 — pamiętaj

**Zarejestrowane wymiary niestandardowe (Custom dimensions, Zakres = Zdarzenie), od 5 lip 2026:** `mode`, `story`, `tier`, `v`. Zbierają dane od momentu rejestracji (nie wstecz). Dzięki `mode` można filtrować czysty lejek `mode = xad` w Eksploracji ścieżki.

Nowe eventy/parametry mogą nie pokazywać się w standardowych raportach, dopóki nie zarejestrujesz ich w **Administracja → Definicje niestandardowe**. Jeśli nowy parametr nie widać w raporcie — najpierw sprawdź tam, zanim uznasz, że event nie działa.

## Backlog (nie teraz)

- **`session_run`** — numer gry w historii gracza (1, 2, 8…) dołączany do eventów lejka. Odpowiedziałby na pytania typu „czy Play Again zaczyna działać dopiero od drugiej partii?", „czy historie odkrywa się dopiero od trzeciej gry?". Mamy `pr.games`, więc to kilka linijek — ale dopiero po ustabilizowaniu obecnego pomiaru.
