#!/usr/bin/env python3
"""Build one PDF per language from the book content collections.

Reads chapter order and metadata from src/data/works.json and chapter prose
from src/content/book/<lang>/*.mdx, converts the MDX component tags used by
authors (Figure, Video, ButtonLink, CopyText, Toc) into print-safe markup,
and renders A4 PDFs with WeasyPrint (no license keys, no proprietary tools).

Usage:
    python3 scripts/build-pdf.py --all
    python3 scripts/build-pdf.py --lang de --out dist/downloads
    python3 scripts/build-pdf.py --lang sl --html-only
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "src" / "content" / "book"
ASSETS = ROOT / "src" / "assets"
DATA = ROOT / "src" / "data" / "works.json"
GLOSSARY_DATA = ROOT / "src" / "data" / "glossary.json"
PRINT_CSS = ROOT / "src" / "styles" / "print.css"

# Site languages, default language and download stem come from
# handbook.config.ts (single source of truth).
from handbook_config import load_config
from typography import smart_quotes_html

_CONFIG = load_config()
LANGS: tuple[str, ...] = tuple(_CONFIG["languages"])
DEFAULT_LANG: str = _CONFIG["defaultLang"]
SLUG: str = _CONFIG["slug"]

FRONTMATTER_RE = re.compile(r"^---\n.*?\n---\n", re.DOTALL)
FIGURE_RE = re.compile(
    r'<Figure\s+src="([^"]+)"\s+alt="([^"]*)"(?:\s*/>|>(.*?)</Figure>)', re.DOTALL
)
VIDEO_RE = re.compile(r'<Video\s+id="([^"]+)"\s+caption="([^"]*)"(?:\s*/>|[^>]*>)')
BUTTON_RE = re.compile(r'<ButtonLink\s+href="([^"]+)">([^<]+)</ButtonLink>')
COPY_RE = re.compile(r'<CopyText\s+[^>]*/>')
TOC_RE = re.compile(r'<Toc\s+[^>]*/>')
SPOILER_RE = re.compile(r'<Spoiler\b[^>]*>(.*?)</Spoiler>', re.DOTALL)
CCBADGE_RE = re.compile(r'<CcBadge\s*/>')
OPENER_RE = re.compile(r'^openerImage:\s*"([^"]+)"', re.MULTILINE)
FEATURE_OPEN_RE = re.compile(r'<FeatureBox(?:\s+title="([^"]*)")?\s*>')
FEATURE_CLOSE_RE = re.compile(r'</FeatureBox>')
PULL_OPEN_RE = re.compile(r'<PullQuote(?:\s+cite="([^"]*)")?\s*>')
PULL_CLOSE_RE = re.compile(r'</PullQuote>')
TABLE_OPEN_RE = re.compile(r'<TableWrap\s*>')
TABLE_CLOSE_RE = re.compile(r'</TableWrap>')
FOOTNOTE_RE = re.compile(r'<FootnoteRef\s+id="([^"]+)"\s+number=\{(\d+)\}\s*/>')
ENDNOTES_RE = re.compile(r'<Endnotes\s+notes=\{\[(.*?)\]\}(?:\s+backLabel="[^"]*")?\s*/>', re.DOTALL)
GLOSSARY_RE = re.compile(r'<Glossary\s+entries=\{\[(.*?)\]\}\s*/>', re.DOTALL)
GLOSSARY_LANG_RE = re.compile(r'<Glossary\s+lang="(' + "|".join(LANGS) + r')"\s*/>')
QUIZ_RE = re.compile(
    r'<Quiz\s+id="[^"]+"\s+lang="[^"]+"\s+question="([^"]+)"[^>]*?options=\{\[(.*?)\]\}\s*/>',
    re.DOTALL,
)
QUESTION_RE = re.compile(
    r'<Question\s+id="[^"]+"\s+lang="[^"]+"\s+question="([^"]+)"[^>]*?options=\{\[(.*?)\]\}[^>]*?answer=\{(\d+)\}[^>]*/?>',
    re.DOTALL,
)

PAGES = ROOT / "src" / "content" / "pages"


def front_opener(lang: str) -> str:
    """Hero image of the language start page (source of the print cover)."""
    index = PAGES / lang / "index.mdx"
    if not index.exists():
        return ""
    match = OPENER_RE.search(index.read_text(encoding="utf-8"))
    return match.group(1) if match else ""


def find_asset(filename: str) -> Path | None:
    """Repo file backing a content image name (book, site, then public)."""
    # The CMS image picker may store a repo-relative path; match by basename.
    name = filename.rsplit("/", 1)[-1]
    for folder in ("book", "site"):
        candidate = ASSETS / folder / name
        if candidate.exists():
            return candidate
    # Site chrome lives in public/ (e.g. the official CC badge PNG, which
    # WeasyPrint can embed; SVG is not a supported image format for print).
    candidate = ROOT / "public" / "images" / name
    if candidate.exists():
        return candidate
    return None


def image_uri(filename: str) -> str:
    source = find_asset(filename)
    if source is not None:
        return source.as_uri()
    print(f"warning: image not found: {filename}", file=sys.stderr)
    return filename


# The print cover shows the hero photo full-bleed on an A4 page. Below this
# effective resolution it starts to look soft in print; still build, but say
# so (non-breaking) so a low-resolution hero photo gets noticed.
A4_WIDTH_IN = 210 / 25.4
A4_HEIGHT_IN = 297 / 25.4
MIN_COVER_DPI = 150


def cover_resolution_warning(filename: str) -> str | None:
    """Warn when the cover photo prints below MIN_COVER_DPI on full-bleed A4.

    With `background-size: cover` the effective DPI is limited by the
    tighter axis, i.e. min(width / page-width, height / page-height).
    Returns a warning string, or None when the resolution is fine (or the
    file cannot be measured, e.g. vectors or missing Pillow).
    """
    if not filename:
        return None
    source = find_asset(filename)
    if source is None:
        return None
    try:
        from PIL import Image
    except ImportError:
        return None
    try:
        with Image.open(source) as image:
            width, height = image.size
    except Exception:
        return None
    dpi = min(width / A4_WIDTH_IN, height / A4_HEIGHT_IN)
    if dpi >= MIN_COVER_DPI:
        return None
    need_width = math.ceil(MIN_COVER_DPI * A4_WIDTH_IN)
    need_height = math.ceil(MIN_COVER_DPI * A4_HEIGHT_IN)
    name = filename.rsplit("/", 1)[-1]
    return (
        f"warning: cover image {name} is {width}x{height} px "
        f"(~{dpi:.0f} DPI on full-bleed A4); "
        f"use at least {need_width}x{need_height} px "
        f"({MIN_COVER_DPI} DPI) for crisp print"
    )


def cc_badge_html() -> str:
    src = image_uri("cc-by-88x31.png")
    return (
        '<p class="cc-badge">'
        f'<img src="{src}" alt="CC BY 4.0" width="88" height="31"/> '
        '<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> Wir machen Wien, '
        'Changing Cities &amp; Prostorož</p>'
    )


FONT_RE = re.compile(r'url\("fonts/([^"]+)"\)')


def font_uri(filename: str) -> str:
    """File URI of a self-hosted font so WeasyPrint embeds it in the PDF."""
    candidate = ASSETS / "fonts" / filename
    if candidate.exists():
        return candidate.as_uri()
    print(f"warning: font not found: {filename}", file=sys.stderr)
    return filename


def print_css() -> str:
    """Print stylesheet with logical font paths rewritten to file URIs."""
    css = PRINT_CSS.read_text(encoding="utf-8")
    return FONT_RE.sub(lambda m: f'url("{font_uri(m.group(1))}")', css)


def convert_mdx(text: str, lang: str = DEFAULT_LANG) -> str:
    text = FRONTMATTER_RE.sub("", text, count=1)

    def figure(match: re.Match[str]) -> str:
        src, alt, caption = match.group(1), match.group(2), (match.group(3) or "").strip()
        caption_html = f"<figcaption>{caption}</figcaption>" if caption else ""
        return (
            f'<figure><img src="{image_uri(src)}" alt="{alt}"/>{caption_html}</figure>'
        )

    text = FIGURE_RE.sub(figure, text)
    text = VIDEO_RE.sub(
        lambda m: f"\n\n*Video: {m.group(2)} (https://www.youtube.com/watch?v={m.group(1)})*\n",
        text,
    )
    text = BUTTON_RE.sub(lambda m: f"[{m.group(2)}]({m.group(1)})", text)
    text = COPY_RE.sub("", text)
    text = TOC_RE.sub("", text)
    text = SPOILER_RE.sub(lambda m: m.group(1), text)
    text = CCBADGE_RE.sub(cc_badge_html(), text)
    text = FEATURE_OPEN_RE.sub(lambda m: f'\n\n<div class="feature-box"><p><strong>{m.group(1)}</strong></p>\n' if m.group(1) else '\n\n<div class="feature-box">\n', text)
    text = FEATURE_CLOSE_RE.sub('\n</div>\n', text)
    text = PULL_OPEN_RE.sub('\n\n<blockquote class="pullquote">\n', text)
    text = PULL_CLOSE_RE.sub('\n</blockquote>\n', text)
    text = TABLE_OPEN_RE.sub('\n\n', text)
    text = TABLE_CLOSE_RE.sub('\n\n', text)
    text = FOOTNOTE_RE.sub(lambda m: f'<sup id="ref-{m.group(1)}">{m.group(2)}</sup>', text)
    text = ENDNOTES_RE.sub(lambda m: endnotes_html(m.group(1)), text)
    text = GLOSSARY_RE.sub(lambda m: glossary_html(m.group(1)), text)
    text = GLOSSARY_LANG_RE.sub(lambda m: glossary_lang_html(m.group(1)), text)
    text = QUIZ_RE.sub(lambda m: quiz_html(m.group(1), m.group(2), lang), text)
    text = QUESTION_RE.sub(lambda m: question_html(m.group(1), m.group(2), m.group(3), lang), text)
    return text.strip() + "\n"


def object_entries(source: str) -> list[tuple[str, str]]:
    return re.findall(r'\{\s*term:\s*"([^"]+)",\s*definition:\s*"([^"]+)"\s*\}', source)


def note_entries(source: str) -> list[tuple[str, str]]:
    return re.findall(r'\{\s*id:\s*"([^"]+)",\s*text:\s*"([^"]+)"\s*\}', source)


def option_entries(source: str) -> list[tuple[str, bool]]:
    return [(label, 'correct: true' in rest) for label, rest in re.findall(r'\{\s*label:\s*"([^"]+)"([^}]*)\}', source)]


def glossary_html(source: str) -> str:
    items = ''.join(f'<dt>{term}</dt><dd>{definition}</dd>' for term, definition in object_entries(source))
    return f'\n\n<dl class="glossary">{items}</dl>\n'


def glossary_lang_html(lang: str) -> str:
    """Full shared glossary for a language (src/data/glossary.json)."""
    data = json.loads(GLOSSARY_DATA.read_text(encoding="utf-8"))
    items = ''.join(
        f'<dt>{entry["term"]}</dt><dd>{entry["definition"]}</dd>'
        for entry in data.get(lang, [])
    )
    return f'\n\n<dl class="glossary">{items}</dl>\n'


def endnotes_html(source: str) -> str:
    items = ''.join(f'<li id="note-{note_id}">{text}</li>' for note_id, text in note_entries(source))
    return f'\n\n<section class="endnotes"><ol>{items}</ol></section>\n'


QUIZ_ANSWERS_LABEL = {"de": "Richtige Antworten", "en": "Correct answers", "sl": "Pravilni odgovori"}


def quiz_html(question: str, source: str, lang: str = DEFAULT_LANG) -> str:
    options = ''.join(f'<li>{label}</li>' for label, _ in option_entries(source))
    correct = ', '.join(str(i + 1) for i, (_, is_correct) in enumerate(option_entries(source)) if is_correct)
    label = QUIZ_ANSWERS_LABEL.get(lang, QUIZ_ANSWERS_LABEL[DEFAULT_LANG])
    return (
        f'\n\n<div class="quiz"><p><strong>Quiz: {question}</strong></p>'
        f'<ol>{options}</ol>'
        f'<p style="transform: rotate(180deg);">{label}: {correct}</p></div>\n'
    )


def question_html(question: str, source: str, answer: str, lang: str = DEFAULT_LANG) -> str:
    """Single-choice Question: plain string options plus a 0-based answer index."""
    options = re.findall(r'"([^"]+)"', source)
    items = ''.join(f'<li>{label}</li>' for label in options)
    label = QUIZ_ANSWERS_LABEL.get(lang, QUIZ_ANSWERS_LABEL[DEFAULT_LANG])
    return (
        f'\n\n<div class="quiz"><p><strong>Quiz: {question}</strong></p>'
        f'<ol>{items}</ol>'
        f'<p style="transform: rotate(180deg);">{label}: {int(answer) + 1}</p></div>\n'
    )


def chapter_html(slug: str, md_text: str, lang: str = DEFAULT_LANG) -> str:
    import markdown  # pip: markdown

    body = markdown.markdown(convert_mdx(md_text, lang), extensions=["extra"])
    # Render-time typographic quotes (source keeps straight quotes).
    body = smart_quotes_html(body, lang)
    return f'<section class="chapter" id="file-{slug}">\n{body}\n</section>'


def toc_html(entries: list[dict]) -> str:
    items = "".join(
        f'<li><a href="#file-{e["file"]}">{e["label"]}</a></li>' for e in entries
    )
    return f'<ul class="toc">\n{items}\n</ul>'


def build_document(lang: str) -> str:
    import markdown  # pip: markdown

    works = json.loads(DATA.read_text(encoding="utf-8"))[lang]
    files: list[str] = works["products"]["pdf"]["files"]
    toc: list[dict] = works["products"]["pdf"]["toc"]
    title = works["title"]
    # The cover is generated from the start-page hero image + metadata.
    cover_file = front_opener(lang) or works.get("image") or ""
    cover_uri = image_uri(cover_file) if cover_file else ""
    cover_style = f"background-image: url('{cover_uri}')" if cover_uri else ""
    cover_warning = cover_resolution_warning(cover_file)
    if cover_warning:
        print(cover_warning, file=sys.stderr)

    parts = [
        "<!doctype html>",
        f'<html lang="{lang}"><head><meta charset="utf-8">',
        f"<title>{title}</title></head><body>",
    ]
    # The cover and title sheets are virtual: they have no MDX source file
    # (see src/content/book/<lang>/) and are generated here from the book
    # metadata in works.json plus the start-page hero image.
    for slug in files:
        if slug == "0-0-cover":
            style_attr = f' style="{cover_style}"' if cover_style else ""
            parts.append(
                f'<section class="cover-sheet" id="file-0-0-cover"{style_attr}>'
                '<div class="cover-scrim"></div>'
                '<div class="cover-text">'
                f"<h1>{title}</h1><p class=\"cover-sub\">{works.get('subtitle', '')}</p>"
                "</div></section>"
            )
            continue
        if slug == "0-1-titlepage":
            parts.append(
                '<section class="chapter frontmatter-sheet" id="file-0-1-titlepage">'
                f"<h1>{title}</h1><p>{works.get('subtitle', '')}</p>"
                f"<p>{works.get('creator', '')}</p>"
                f"<p>{works.get('contributor', '')}</p>"
                f"<p>{works.get('publisher', '')}</p></section>"
            )
            continue
        # The contents sheet is virtual too: generated from the catalogue.
        if slug == "contents":
            contents_title = next(
                (entry["label"] for entry in toc if entry["file"] == "contents"),
                "Contents",
            )
            parts.append(
                '<section class="chapter frontmatter-sheet" id="file-contents">'
                f"<h1>{contents_title}</h1>"
                f"{toc_html(toc)}</section>"
            )
            continue
        path = CONTENT / lang / f"{slug}.mdx"
        if not path.exists():
            print(f"warning: missing chapter {path}", file=sys.stderr)
            continue
        md_text = path.read_text(encoding="utf-8")
        if slug == "about":
            body = markdown.markdown(convert_mdx(md_text, lang), extensions=["extra"])
            # Render-time typographic quotes (source keeps straight quotes).
            body = smart_quotes_html(body, lang)
            about_label = next(
                (entry["label"] for entry in toc if entry["file"] == "about"),
                "About",
            )
            # The CC BY badge is print-only (absent from the web page): place
            # it under the first heading, which is always the licence section
            # (the body opens with plain intro paragraphs).
            body = body.replace("</h2>", f"</h2>{cc_badge_html()}", 1)
            parts.append(
                '<section class="chapter frontmatter-sheet" id="file-about">'
                f"<h1>{about_label}</h1>{body}</section>"
            )
        else:
            parts.append(chapter_html(slug, md_text, lang))
    parts.append("</body></html>")
    parts.insert(
        2,
        f"<!-- pdf, {lang} --><style>{print_css()}</style>",
    )
    return "\n".join(parts)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build handbook PDFs with WeasyPrint.")
    parser.add_argument("--lang", choices=list(LANGS), default=DEFAULT_LANG)
    parser.add_argument(
        "--out",
        default="dist/downloads",
        help="output directory (served from dist/ by the site)",
    )
    parser.add_argument("--all", action="store_true", help=f"build PDFs for {'/'.join(LANGS)}")
    parser.add_argument("--html-only", action="store_true", help="skip WeasyPrint, emit HTML")
    args = parser.parse_args()

    jobs = (DEFAULT_LANG, *[lang for lang in LANGS if lang != DEFAULT_LANG]) if args.all else (args.lang,)
    out_dir = ROOT / args.out
    out_dir.mkdir(parents=True, exist_ok=True)

    for lang in jobs:
        html = build_document(lang)
        stem = f"{SLUG}-{lang}"
        html_path = out_dir / f"{stem}.html"
        html_path.write_text(html, encoding="utf-8")
        print(f"wrote {html_path}")
        if args.html_only:
            continue
        try:
            from weasyprint import HTML  # pip: weasyprint>=60
        except ImportError:
            print("error: weasyprint is not installed (pip install -r requirements.txt)",
                  file=sys.stderr)
            return 1
        pdf_path = out_dir / f"{stem}.pdf"
        HTML(string=html).write_pdf(str(pdf_path))
        print(f"wrote {pdf_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
