"""
Pobiera stronę zastępstw z Edupage, wyciąga sekcję dotyczącą jednej klasy
(domyślnie 7a) i wstawia ją do index.html między znacznikami
<!-- SUBSTITUTIONS:START --> ... <!-- SUBSTITUTIONS:END -->.

Uruchamiane cyklicznie przez GitHub Actions (.github/workflows/update-substitutions.yml).
"""

import json
import socket
import time
from pathlib import Path

import requests
import urllib3.util.connection as urllib3_cn
from bs4 import BeautifulSoup

# GitHub Actions runners czasem próbują łączyć się po IPv6 do hostów, które nie
# są stamtąd tą drogą osiągalne (błąd "Network is unreachable"). Wymuszamy IPv4.
def _allowed_gai_family():
    return socket.AF_INET


urllib3_cn.allowed_gai_family = _allowed_gai_family

SUBSTITUTION_URL = "https://parcevskio.edupage.org/substitution/"
MAX_ATTEMPTS = 4
RETRY_DELAY_SECONDS = 15
TARGET_CLASS = "7a"
INDEX_PATH = Path("index.html")
START_MARKER = "<!-- SUBSTITUTIONS:START -->"
END_MARKER = "<!-- SUBSTITUTIONS:END -->"


def fetch_page(url: str) -> str:
    """Pobiera stronę, ponawiając próbę kilka razy z rosnącym odstępem —
    runnery GitHub Actions czasem miewają chwilowe problemy sieciowe albo
    serwer bywa wolny/przeciążony."""
    last_error = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            resp = requests.get(
                url,
                timeout=30,
                headers={"User-Agent": "Mozilla/5.0 (compatible; WebklasaSubstitutionBot/1.0)"},
            )
            resp.raise_for_status()
            return resp.text
        except requests.exceptions.RequestException as err:
            last_error = err
            print(f"Próba {attempt}/{MAX_ATTEMPTS} nieudana: {err}")
            if attempt < MAX_ATTEMPTS:
                time.sleep(RETRY_DELAY_SECONDS * attempt)
    raise RuntimeError(f"Nie udało się pobrać strony po {MAX_ATTEMPTS} próbach: {last_error}")


def fetch_report_html(url: str) -> str:
    """Pobiera stronę i wyciąga wartość pola "report_html" z osadzonego JS-a.
    Nie parsujemy całego obiektu jako JSON (zawiera m.in. "kiosk":undefined,
    co nie jest poprawnym JSON-em) — wyciągamy ręcznie tylko ten jeden string,
    honorując znaki ucieczki (\\", \\\\ itd.), i dopiero jego zawartość
    dekodujemy jako JSON-string.
    """
    page = fetch_page(url)

    key = '"report_html":"'
    start = page.find(key)
    if start == -1:
        raise RuntimeError(
            "Nie znaleziono report_html na stronie Edupage — "
            "struktura strony mogła się zmienić."
        )

    i = start + len(key)
    chars = []
    while i < len(page):
        ch = page[i]
        if ch == "\\":
            chars.append(page[i : i + 2])
            i += 2
            continue
        if ch == '"':
            break
        chars.append(ch)
        i += 1

    raw = "".join(chars)
    return json.loads('"' + raw + '"')


def extract_class_section(report_html: str, class_name: str) -> str:
    """Zwraca gotowy fragment HTML z zastępstwami dla danej klasy (albo
    komunikat, że dziś ich nie ma — sekcja klasy bez zastępstw po prostu
    nie występuje w danych Edupage tego dnia)."""
    soup = BeautifulSoup(report_html, "html.parser")
    target = class_name.strip().lower()

    for section in soup.select("div.section"):
        header = section.select_one(".header .print-font-resizable")
        if not header or header.get_text(strip=True).lower() != target:
            continue

        rows = section.select("div.rows > div.row")
        if not rows:
            break

        items = []
        for row in rows:
            period = row.select_one(".period .print-font-resizable")
            info = row.select_one(".info .print-font-resizable")
            period_text = period.get_text(strip=True) if period else ""
            info_html = info.decode_contents() if info else ""
            items.append(
                f'<li class="subst-item">'
                f'<span class="subst-period">{period_text}</span>'
                f'<span class="subst-info">{info_html}</span>'
                f"</li>"
            )
        return f'<ul class="subst-list">{"".join(items)}</ul>'

    return f'<p class="subst-empty">Brak zastępstw dla klasy {class_name} na dziś.</p>'


def update_index_html(snippet: str) -> bool:
    content = INDEX_PATH.read_text(encoding="utf-8")
    start_i = content.find(START_MARKER)
    end_i = content.find(END_MARKER)
    if start_i == -1 or end_i == -1:
        raise RuntimeError(
            f"Nie znaleziono znaczników {START_MARKER} / {END_MARKER} w index.html. "
            "Dodaj je ręcznie raz (patrz instrukcja)."
        )

    new_content = (
        content[: start_i + len(START_MARKER)] + "\n" + snippet + "\n" + content[end_i:]
    )
    if new_content == content:
        return False

    INDEX_PATH.write_text(new_content, encoding="utf-8")
    return True


def main():
    report_html = fetch_report_html(SUBSTITUTION_URL)
    snippet = extract_class_section(report_html, TARGET_CLASS)
    changed = update_index_html(snippet)
    print("Zaktualizowano index.html." if changed else "Brak zmian — index.html już aktualny.")


if __name__ == "__main__":
    main()
