#!/usr/bin/env python3
"""Locale-aware straight-to-typographic quote conversion (print builders).

Mirrors src/lib/smart-quotes.ts so PDF/EPUB output matches the website:
source MDX keeps straight `"` / `'`; rendered output gets „ “ (de/sl)
or “ ” (en), apostrophe always ’.

Two entry points:
- smart_quotes_text(text, lang): plain-text strings (titles, labels).
- smart_quotes_html(html, lang): rendered chapter HTML — replaces text
  between tags only, skipping <pre>/<code> blocks and tag attributes.
"""

from __future__ import annotations

from html.parser import HTMLParser

QUOTES: dict[str, dict[str, str]] = {
    # German (de-DE) and Slovenian both use low-high quotes.
    "de": {"double_open": "„", "double_close": "“", "single_open": "‚", "single_close": "‘"},
    "sl": {"double_open": "„", "double_close": "“", "single_open": "‚", "single_close": "‘"},
    "en": {"double_open": "“", "double_close": "”", "single_open": "‘", "single_close": "’"},
}

APOSTROPHE = "’"
FALLBACK_LANG = "en"

SKIP_TAGS = frozenset({
    "pre", "code", "kbd", "samp", "var", "tt", "math",
    "script", "style", "textarea", "noscript",
})

_DOUBLE_OPEN = set("„“")
_DOUBLE_CLOSE = set("“”")
_SINGLE_OPEN = set("‚‘")
_SINGLE_CLOSE = set("‘’")

_OPEN_AFTER = set("([{—–-/„“\"")
_CLOSE_BEFORE = set(".,;:!?…)]}")


def normalize_lang(lang: str | None) -> str:
    return lang if lang in QUOTES else FALLBACK_LANG


class QuoteState:
    def __init__(self) -> None:
        self.expect_double_open = True
        self.expect_single_open = True


def _is_word_char(char: str) -> bool:
    return char.isalnum()


def smart_quotes_text(text: str, lang: str | None, state: QuoteState | None = None) -> str:
    """Replace straight quotes in a plain-text chunk (state persists per page)."""
    lang = normalize_lang(lang)
    state = state if state is not None else QuoteState()
    quotes = QUOTES[lang]
    out: list[str] = []

    for i, char in enumerate(text):
        prev = text[i - 1] if i > 0 else ""
        nxt = text[i + 1] if i < len(text) - 1 else ""

        if char == '"':
            looks_open = prev == "" or prev.isspace() or prev in "([{—–-–/"
            looks_close = nxt == "" or nxt.isspace() or nxt in ".,;:!?…)]}"
            if looks_open and not looks_close:
                is_open = True
            elif looks_close and not looks_open:
                is_open = False
            else:
                is_open = state.expect_double_open
            out.append(quotes["double_open"] if is_open else quotes["double_close"])
            state.expect_double_open = not is_open
        elif char == "'":
            if _is_word_char(prev) and _is_word_char(nxt):
                out.append(APOSTROPHE)
            else:
                looks_open = prev == "" or prev.isspace() or prev in _OPEN_AFTER
                looks_close = nxt == "" or nxt.isspace() or nxt in _CLOSE_BEFORE
                if looks_open and not looks_close:
                    is_open = True
                elif looks_close and not looks_open:
                    is_open = False
                else:
                    is_open = state.expect_single_open
                out.append(quotes["single_open"] if is_open else quotes["single_close"])
                state.expect_single_open = not is_open
        else:
            if char in _DOUBLE_OPEN:
                state.expect_double_open = False
            elif char in _DOUBLE_CLOSE:
                state.expect_double_open = True
            elif char in _SINGLE_OPEN:
                state.expect_single_open = False
            elif char in _SINGLE_CLOSE:
                state.expect_single_open = True
            out.append(char)

    return "".join(out)


class _QuoteHTMLParser(HTMLParser):
    """Re-quote text nodes only; tags, attributes and skip-blocks pass through."""

    def __init__(self, lang: str | None) -> None:
        super().__init__(convert_charrefs=False)
        self._lang = normalize_lang(lang)
        self._state = QuoteState()
        self._skip_depth = 0
        self._chunks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() in SKIP_TAGS:
            self._skip_depth += 1
        self._chunks.append(self.get_starttag_text() or "")

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._chunks.append(self.get_starttag_text() or "")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in SKIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1
        self._chunks.append(f"</{tag}>")

    def handle_data(self, data: str) -> None:
        if self._skip_depth > 0:
            self._chunks.append(data)
        else:
            self._chunks.append(smart_quotes_text(data, self._lang, self._state))

    def handle_entityref(self, name: str) -> None:
        self._chunks.append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        self._chunks.append(f"&#{name};")

    def handle_comment(self, data: str) -> None:
        self._chunks.append(f"<!--{data}-->")

    def handle_decl(self, decl: str) -> None:
        self._chunks.append(f"<!{decl}>")

    def handle_pi(self, data: str) -> None:
        self._chunks.append(f"<?{data}>")

    def result(self) -> str:
        return "".join(self._chunks)


def smart_quotes_html(html_text: str, lang: str | None) -> str:
    """Apply locale quotes to rendered HTML text nodes (attributes untouched)."""
    parser = _QuoteHTMLParser(lang)
    parser.feed(html_text)
    parser.close()
    return parser.result()
