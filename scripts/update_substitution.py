"""
Pobiera zastępstwa z Edupage dla jednej klasy (domyślnie 7a) na DZIŚ i na JUTRO
i wstawia je do index.html między znacznikami
<!-- SUBSTITUTIONS:START --> ... <!-- SUBSTITUTIONS:END -->.

Daty ("Dzisiaj (11.26.2026)", "Jutro (11.27.2026)") są liczone automatycznie
przy każdym uruchomieniu (strefa Europe/Vilnius) — nie trzeba ich nigdzie wpisywać.

Uruchamiane cyklicznie przez GitHub Actions (.github/workflows/update-substitutions.yml).
"""

import json
import re
import socket
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from urllib.parse import quote
from zoneinfo import ZoneInfo

import requests
import urllib3.util.connection as urllib3_cn
from bs4 import BeautifulSoup


# GitHub Actions runners czasem próbują łączyć się po IPv6 do hostów, które nie
# są stamtąd tą drogą osiągalne (błąd "Network is unreachable"). Wymuszamy IPv4.
def _allowed_gai_family():
    return socket.AF_INET


urllib3_cn.allowed_gai_family = _allowed_gai_family

SCHOOL_BASE = "https://parcevskio.edupage.org"
SUBSTITUTION_URL = f"{SCHOOL_BASE}/substitution/"
DAY_API_URL = f"{SCHOOL_BASE}/substitution/server/viewer.js?__func=getSubstViewerDayDataHtml"
MAX_ATTEMPTS = 4
RETRY_DELAY_SECONDS = 15
TARGET_CLASS = "7a"
TIMEZONE = ZoneInfo("Europe/Vilnius")
DATE_FORMAT = "%m.%d.%Y"  # jak w przykładzie: 11.26.2026. Dla 26.11.2026 zmień na "%d.%m.%Y"
INDEX_PATH = Path("index.html")
START_MARKER = "<!-- SUBSTITUTIONS:START -->"
END_MARKER = "<!-- SUBSTITUTIONS:END -->"

USER_AGENT = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0"}


# ---------------------------------------------------------------- pobieranie

def _get(url: str) -> requests.Response:
    return requests.get(url, timeout=30, headers=USER_AGENT)


def fetch_page(url: str) -> str:
    """Pobiera stronę bezpośrednio, ponawiając próbę kilka razy z rosnącym
    odstępem. Jeśli to konsekwentnie zawodzi (np. serwer blokuje adresy IP
    centrów danych typu GitHub Actions), próbuje pobrać tę samą stronę przez
    publiczne proxy AllOrigins jako plan awaryjny."""
    last_error = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            resp = _get(url)
            resp.raise_for_status()
            return resp.text
        except requests.exceptions.RequestException as err:
            last_error = err
            print(f"Bezpośrednia próba {attempt}/{MAX_ATTEMPTS} nieudana: {err}")
            if attempt < MAX_ATTEMPTS:
                time.sleep(RETRY_DELAY_SECONDS * attempt)

    print("Bezpośrednie połączenie zawiodło za każdym razem — próbuję przez proxy AllOrigins...")
    proxy_url = f"https://api.allorigins.win/raw?url={quote(url, safe='')}"
    try:
        resp = _get(proxy_url)
        resp.raise_for_status()
        return resp.text
    except requests.exceptions.RequestException as err:
        raise RuntimeError(
            f"Nie udało się pobrać strony ani bezpośrednio, ani przez proxy. "
            f"Ostatni błąd bezpośredni: {last_error}. Błąd proxy: {err}"
        )


def extract_report_html(page: str) -> str:
    """Wyciąga wartość pola "report_html" z osadzonego JS-a strony Edupage
    (zastępstwa pokazywane domyślnie przez Edupage).
    Nie parsujemy całego obiektu jako JSON (zawiera m.in. "kiosk":undefined,
    co nie jest poprawnym JSON-em) — wyciągamy ręcznie tylko ten jeden string,
    honorując znaki ucieczki, i dopiero jego zawartość dekodujemy."""
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

    return json.loads('"' + "".join(chars) + '"')


def find_gsh(page: str):
    """Edupage wymaga tokenu 'gsh' przy zapytaniach o konkretny dzień."""
    patterns = (
        r'"gsh"\s*:\s*"([0-9a-fA-F]+)"',
        r'\bgsh\s*=\s*"([0-9a-fA-F]+)"',
        r"\bgsh\s*=\s*'([0-9a-fA-F]+)'",
        r'__gsh["\']?\s*[:=]\s*["\']([0-9a-fA-F]+)',
    )
    for pat in patterns:
        m = re.search(pat, page)
        if m:
            return m.group(1)
    return None


def fetch_day_html(day: date, gsh):
    """Pobiera zastępstwa na konkretny dzień przez API Edupage.
    Zwraca HTML albo None, jeśli się nie udało."""
    if not gsh:
        print(f"[{day}] brak tokenu gsh — nie mogę zapytać o ten dzień.")
        return None
    body = {"__args": [None, {"date": day.isoformat(), "mode": "classes"}], "__gsh": gsh}
    try:
        resp = requests.post(DAY_API_URL, json=body, timeout=30, headers=USER_AGENT)
        resp.raise_for_status()
    except requests.exceptions.RequestException as err:
        print(f"[{day}] zapytanie do API nieudane: {err}")
        return None

    text = resp.text
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            r = data.get("r", data)
            if isinstance(r, str):
                return r
            if isinstance(r, dict):
                for v in r.values():
                    if isinstance(v, str) and "<" in v:
                        return v
        elif isinstance(data, str):
            return data
    except ValueError:
        pass
    return text if "<" in text else None


# ------------------------------------------------------------------- parsing

def extract_class_items(report_html: str, class_name: str):
    """Zwraca listę (godzina, info_html) dla klasy; pusta lista = brak zastępstw."""
    soup = BeautifulSoup(report_html, "html.parser")
    target = class_name.strip().lower()

    for section in soup.select("div.section"):
        header = section.select_one(".header .print-font-resizable")
        if not header or header.get_text(strip=True).lower() != target:
            continue

        items = []
        for row in section.select("div.rows > div.row"):
            period = row.select_one(".period .print-font-resizable")
            info = row.select_one(".info .print-font-resizable")
            items.append((
                period.get_text(strip=True) if period else "",
                info.decode_contents() if info else "",
            ))
        return items
    return []


def render_body(items, class_name: str, when: str) -> str:
    if not items:
        return f'<p class="subst-empty">Brak zastępstw dla klasy {class_name} na {when}.</p>'
    lis = "".join(
        f'<li class="subst-item"><span class="subst-period">{p}</span>'
        f'<span class="subst-info">{i}</span></li>'
        for p, i in items
    )
    return f'<ul class="subst-list">{lis}</ul>'


def render_card(label: str, day: date, body: str) -> str:
    return (
        f'<article class="news-card subst-day" data-date="{day.isoformat()}">\n'
        f'<h3><span class="subst-label">{label}</span> '
        f'<span class="subst-date">({day.strftime(DATE_FORMAT)})</span></h3>\n'
        f"{body}\n"
        f"</article>"
    )


# --------------------------------------------------------------- index.html

def update_index_html(snippet: str) -> bool:
    content = INDEX_PATH.read_text(encoding="utf-8")
    start_i = content.find(START_MARKER)
    end_i = content.find(END_MARKER)
    if start_i == -1 or end_i == -1:
        raise RuntimeError(
            f"Nie znaleziono znaczników {START_MARKER} / {END_MARKER} w index.html."
        )

    new_content = (
        content[: start_i + len(START_MARKER)] + "\n" + snippet + "\n" + content[end_i:]
    )
    if new_content == content:
        return False

    INDEX_PATH.write_text(new_content, encoding="utf-8")
    return True


def main():
    today = datetime.now(TIMEZONE).date()
    tomorrow = today + timedelta(days=1)

    page = fetch_page(SUBSTITUTION_URL)
    gsh = find_gsh(page)
    print(f"Dziś: {today}, jutro: {tomorrow}, gsh: {'jest' if gsh else 'BRAK'}")

    # --- dzisiaj
    today_html = fetch_day_html(today, gsh)
    if today_html is None:
        print("Dzisiaj: używam domyślnych danych osadzonych na stronie Edupage.")
        today_html = extract_report_html(page)
    today_body = render_body(extract_class_items(today_html, TARGET_CLASS), TARGET_CLASS, "dziś")

    # --- jutro
    tomorrow_html = fetch_day_html(tomorrow, gsh)
    if tomorrow_html is not None:
        tomorrow_body = render_body(
            extract_class_items(tomorrow_html, TARGET_CLASS), TARGET_CLASS, "jutro"
        )
    elif tomorrow.weekday() >= 5:  # sobota/niedziela — nie ma lekcji
        tomorrow_body = render_body([], TARGET_CLASS, "jutro")
    else:
        # Nie udało się pobrać — NIE piszemy "brak zastępstw", bo to byłaby nieprawda.
        tomorrow_body = '<p class="subst-empty">Zastępstwa na jutro są jeszcze niedostępne.</p>'

    snippet = "\n".join([
        '<div class="subst-grid">',
        render_card("Dzisiaj", today, today_body),
        render_card("Jutro", tomorrow, tomorrow_body),
        "</div>",
    ])
    changed = update_index_html(snippet)
    print("Zaktualizowano index.html." if changed else "Brak zmian — index.html już aktualny.")


if __name__ == "__main__":
    main()
