#!/usr/bin/env python3
"""Shared MDX component conversion for the print builders (PDF + EPUB).

Single source of truth for the MDX subset authors may use in
src/content/book/<lang>/*.mdx, previously duplicated between
scripts/bin/build-pdf.py and scripts/bin/build-epub.py. Import from here instead
of redefining: common regexes, entry parsers, glossary/quiz/question/
pullquote converters, and the strip-style handlers (CopyText, Toc,
Spoiler, ButtonLink, DownloadLink, TableWrap).

Deliberately NOT shared (kept in each builder):
- PDF: figure -> file-URI <img>, CC badge with embedded PNG, WeasyPrint
  CSS, cover-resolution warnings.
- EPUB: figure -> packaged-image href with html.escape, CC badge without
  images, OPF/nav/XHTML packaging, font embedding.

FOOTNOTE DIVERGENCE (deliberate, keep in sync):
- PDF (print on paper): collect the <Endnotes> texts via parse_endnotes(),
  delete the end-of-chapter section, and attach each note to its
  <FootnoteRef> as <span class="footnote"> (CSS `float: footnote`), so the
  note prints at the bottom of the page carrying the reference.
- EPUB (reflowable reader): keep both directions linked — <FootnoteRef>
  becomes <a href="#note-<id>"><sup id="ref-<id>">n</sup></a> and
  <Endnotes> becomes endnotes_html(), a <section class="endnotes"> list
  whose items link back with href="#ref-<id>".
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Callable

EscapeFn = Callable[[str], str]


def _identity(text: str) -> str:
    return text


FRONTMATTER_RE = re.compile(r"^---\n.*?\n---\n", re.DOTALL)
FIGURE_RE = re.compile(
    r'<Figure\s+src="([^"]+)"\s+alt="([^"]*)"(?:\s*/>|>(.*?)</Figure>)', re.DOTALL
)
VIDEO_RE = re.compile(r'<Video\s+id="([^"]+)"\s+caption="([^"]*)"(?:\s*/>|[^>]*>)')
BUTTON_RE = re.compile(r'<ButtonLink\s+href="([^"]+)">([^<]+)</ButtonLink>')
DOWNLOAD_RE = re.compile(r'<DownloadLink\s+href="([^"]+)">(.*?)</DownloadLink>', re.DOTALL)
COPY_RE = re.compile(r'<CopyText\s+[^>]*/>')
TOC_RE = re.compile(r'<Toc\s+[^>]*/>')
SPOILER_RE = re.compile(r'<Spoiler\b[^>]*>(.*?)</Spoiler>', re.DOTALL)
CCBADGE_RE = re.compile(r'<CcBadge\s*/>')
OPENER_RE = re.compile(r'^openerImage:\s*"([^"]+)"', re.MULTILINE)
FEATURE_OPEN_RE = re.compile(r'<FeatureBox(?:\s+title="([^"]*)")?\s*>')
FEATURE_CLOSE_RE = re.compile(r'</FeatureBox>')
PULLQUOTE_RE = re.compile(r'<PullQuote(?:\s+cite="([^"]*)")?\s*>(.*?)</PullQuote>', re.DOTALL)
TABLE_OPEN_RE = re.compile(r'<TableWrap\s*>')
TABLE_CLOSE_RE = re.compile(r'</TableWrap>')
FOOTNOTE_RE = re.compile(r'<FootnoteRef\s+id="([^"]+)"\s+number=\{(\d+)\}\s*/>')
ENDNOTES_RE = re.compile(r'<Endnotes\s+notes=\{\[(.*?)\]\}(?:\s+backLabel="[^"]*")?\s*/>', re.DOTALL)
GLOSSARY_RE = re.compile(r'<Glossary\s+entries=\{\[(.*?)\]\}\s*/>', re.DOTALL)
QUIZ_RE = re.compile(
    r'<Quiz\s+id="[^"]+"\s+lang="[^"]+"\s+question="([^"]+)"[^>]*?options=\{\[(.*?)\]\}\s*/>',
    re.DOTALL,
)
QUESTION_RE = re.compile(
    r'<Question\s+id="[^"]+"\s+lang="[^"]+"\s+question="([^"]+)"[^>]*?options=\{\[(.*?)\]\}[^>]*?answer=\{(\d+)\}[^>]*/?>',
    re.DOTALL,
)


def make_glossary_lang_re(langs: tuple[str, ...]) -> re.Pattern[str]:
    """<Glossary lang="xx"/> matcher for the configured site languages."""
    return re.compile(r'<Glossary\s+lang="(' + "|".join(langs) + r')"\s*/>')


# Chapter slugs styled as front matter (mirrors src/data/works.ts).
FRONTMATTER_FILES = {"0-0-cover", "0-1-titlepage", "about", "contents"}


def chapter_lists(work: dict) -> tuple[list[str], list[dict]]:
    """Derive print order + TOC from the single `chapters` list per language.

    Single source of truth (mirrors src/data/works.ts): `files` is every
    chapter in order, `toc` carries each label plus the frontmatter class.
    """
    files = [chapter["file"] for chapter in work["chapters"]]
    toc = [
        {
            "label": chapter["label"],
            "file": chapter["file"],
            **({"class": "frontmatter-entry"} if chapter["file"] in FRONTMATTER_FILES else {}),
        }
        for chapter in work["chapters"]
    ]
    return files, toc


def find_asset_by_basename(filename: str, assets_dir: Path, root: Path) -> Path | None:
    """Repo file backing a content image name (book, site, then public).

    The CMS image picker may store a repo-relative path; match by basename.
    """
    name = filename.rsplit("/", 1)[-1]
    for folder in ("book", "site"):
        candidate = assets_dir / folder / name
        if candidate.exists():
            return candidate
    candidate = root / "public" / "images" / name
    if candidate.exists():
        return candidate
    return None


def front_opener_for_pages(pages_dir: Path, lang: str) -> str:
    """Hero image of the language start page (source of the print cover)."""
    index = pages_dir / lang / "index.mdx"
    if not index.exists():
        return ""
    match = OPENER_RE.search(index.read_text(encoding="utf-8"))
    return match.group(1) if match else ""


def object_entries(source: str) -> list[tuple[str, str]]:
    return re.findall(r'\{\s*term:\s*"([^"]+)",\s*definition:\s*"([^"]+)"\s*\}', source)


def note_entries(source: str) -> list[tuple[str, str]]:
    return re.findall(r'\{\s*id:\s*"([^"]+)",\s*text:\s*"([^"]+)"\s*\}', source)


def option_entries(source: str) -> list[tuple[str, bool]]:
    return [(label, 'correct: true' in rest) for label, rest in re.findall(r'\{\s*label:\s*"([^"]+)"([^}]*)\}', source)]


def glossary_html(source: str, escape_fn: EscapeFn = _identity) -> str:
    items = ''.join(
        f'<dt>{escape_fn(term)}</dt><dd>{escape_fn(definition)}</dd>'
        for term, definition in object_entries(source)
    )
    return f'\n\n<dl class="glossary">{items}</dl>\n'


def glossary_lang_html(lang: str, data: dict, escape_fn: EscapeFn = _identity) -> str:
    """Full shared glossary for a language (data = parsed glossary.json)."""
    items = ''.join(
        f'<dt>{escape_fn(entry["term"])}</dt><dd>{escape_fn(entry["definition"])}</dd>'
        for entry in data.get(lang, [])
    )
    return f'\n\n<dl class="glossary">{items}</dl>\n'


def parse_endnotes(text: str) -> tuple[str, dict[str, str]]:
    """PDF side of the footnote divergence: strip <Endnotes>, return notes.

    Returns (text_without_endnotes_section, {note_id: note_text}).
    """
    notes: dict[str, str] = {}
    for match in ENDNOTES_RE.finditer(text):
        for note_id, note_text in note_entries(match.group(1)):
            notes[note_id] = note_text
    return ENDNOTES_RE.sub("", text), notes


def endnotes_html(source: str, escape_fn: EscapeFn = _identity) -> str:
    """EPUB side of the footnote divergence: linked endnotes section."""
    items = ''.join(
        f'<li id="note-{escape_fn(note_id)}">{escape_fn(text)} '
        f'<a href="#ref-{escape_fn(note_id)}">↩</a></li>'
        for note_id, text in note_entries(source)
    )
    return f'\n\n<section class="endnotes"><ol>{items}</ol></section>\n'


def pullquote_html(match: re.Match[str], escape_fn: EscapeFn = _identity) -> str:
    """Pull quote keeping an optional citation (dropped nothing on paper)."""
    cite, body = match.group(1), match.group(2).strip()
    footer = f"\n<footer>— {escape_fn(cite)}</footer>" if cite else ""
    return f"\n\n<blockquote class=\"pullquote\">\n{body}{footer}\n</blockquote>\n"


def feature_open_html(title: str | None, escape_fn: EscapeFn = _identity) -> str:
    """Opening <div> for <FeatureBox>, with optional bold title."""
    if title:
        return f'\n\n<div class="feature-box"><p><strong>{escape_fn(title)}</strong></p>\n'
    return '\n\n<div class="feature-box">\n'


QUIZ_ANSWERS_LABEL = {"de": "Richtige Antworten", "en": "Correct answers", "sl": "Pravilni odgovori"}


def _answers_label(lang: str, default_lang: str) -> str:
    """Print answer key label, falling back to the default language, then English."""
    return QUIZ_ANSWERS_LABEL.get(lang, QUIZ_ANSWERS_LABEL.get(default_lang, QUIZ_ANSWERS_LABEL["en"]))


def _quiz_wrap(question: str, items: str, answer_line: str) -> str:
    """Print wrapper shared by Quiz (flagged options) and Question (answer index)."""
    return (
        f'\n\n<div class="quiz"><p><strong>Quiz: {question}</strong></p>'
        f'<ol>{items}</ol>'
        f'<p style="transform: rotate(180deg);">{answer_line}</p></div>\n'
    )


def quiz_html(question: str, source: str, lang: str, default_lang: str) -> str:
    entries = option_entries(source)
    options = ''.join(f'<li>{label}</li>' for label, _ in entries)
    correct = ', '.join(str(i + 1) for i, (_, is_correct) in enumerate(entries) if is_correct)
    label = _answers_label(lang, default_lang)
    return _quiz_wrap(question, options, f"{label}: {correct}")


def question_html(question: str, source: str, answer: str, lang: str, default_lang: str) -> str:
    """Single-choice Question: plain string options plus a 0-based answer index."""
    options = re.findall(r'"([^"]+)"', source)
    items = ''.join(f'<li>{label}</li>' for label in options)
    label = _answers_label(lang, default_lang)
    return _quiz_wrap(question, items, f"{label}: {int(answer) + 1}")


def strip_static_handlers(text: str) -> str:
    """Handlers identical in PDF and EPUB: Button/Download links, CopyText, Toc, Spoiler, TableWrap."""
    text = BUTTON_RE.sub(lambda m: f"[{m.group(2)}]({m.group(1)})", text)
    text = DOWNLOAD_RE.sub(lambda m: f"[{m.group(2).strip()}]({m.group(1)})", text)
    text = COPY_RE.sub("", text)
    text = TOC_RE.sub("", text)
    text = SPOILER_RE.sub(lambda m: m.group(1), text)
    text = TABLE_OPEN_RE.sub('\n\n', text)
    text = TABLE_CLOSE_RE.sub('\n\n', text)
    return text
