#!/usr/bin/env python3
"""Build one PDF per language from the book content collections.

Reads chapter order and metadata from src/data/works.json and chapter prose
from src/content/book/<lang>/*.mdx, converts the MDX component tags used by
authors (Figure, Video, ButtonLink, CopyText, Toc) into print-safe markup,
and renders A4 PDFs with WeasyPrint (no license keys, no proprietary tools).

Usage:
    python3 scripts/bin/build-pdf.py --all
    python3 scripts/bin/build-pdf.py --lang de --out dist/downloads
    python3 scripts/bin/build-pdf.py --lang sl --html-only
"""

from __future__ import annotations

import argparse
import math
import re
import sys
from pathlib import Path

# Entry point in scripts/bin/: add scripts/ to sys.path so the handbook
# package imports work regardless of where Python is invoked from.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from handbook.book import (
    ASSETS,
    CONTENT,
    DEFAULT_LANG,
    GLOSSARY_LANG_RE,
    ROOT,
    add_common_arguments,
    download_stem,
    find_asset,
    front_opener,
    glossary_data,
    load_works,
    markdown_to_html,
    read_chapter_mdx,
    resolve_jobs,
)
from handbook.mdx import (
    CCBADGE_RE,
    FEATURE_CLOSE_RE,
    FEATURE_OPEN_RE,
    FIGURE_RE,
    FOOTNOTE_RE,
    FRONTMATTER_RE,
    GLOSSARY_RE,
    PULLQUOTE_RE,
    QUESTION_RE,
    QUIZ_RE,
    VIDEO_RE,
    chapter_lists,
    feature_open_html,
    glossary_html,
    glossary_lang_html,
    parse_endnotes,
    pullquote_html,
    question_html,
    quiz_html,
    strip_static_handlers,
)

PRINT_CSS = ROOT / "src" / "styles" / "print.css"


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
    text = strip_static_handlers(text)
    text = CCBADGE_RE.sub(cc_badge_html(), text)
    text = FEATURE_OPEN_RE.sub(lambda m: feature_open_html(m.group(1)), text)
    text = FEATURE_CLOSE_RE.sub('\n</div>\n', text)
    text = PULLQUOTE_RE.sub(pullquote_html, text)
    # Footnotes: PDF side of the divergence documented in handbook.mdx —
    # collect Endnotes, drop the section, attach float:footnote spans.
    text, notes = parse_endnotes(text)

    def footnote(match: re.Match[str]) -> str:
        note_id, number = match.group(1), match.group(2)
        note_text = notes.get(note_id)
        if note_text is None:
            print(f"warning: footnote ref without note: {note_id}", file=sys.stderr)
            return f'<sup class="footnote-call" id="ref-{note_id}">{number}</sup>'
        return (
            f'<sup class="footnote-call" id="ref-{note_id}">{number}</sup>'
            f'<span class="footnote">'
            f'<span class="footnote-marker">{number}</span> {note_text}</span>'
        )

    text = FOOTNOTE_RE.sub(footnote, text)
    text = GLOSSARY_RE.sub(lambda m: glossary_html(m.group(1)), text)
    text = GLOSSARY_LANG_RE.sub(lambda m: glossary_lang_html(m.group(1), glossary_data()), text)
    text = QUIZ_RE.sub(lambda m: quiz_html(m.group(1), m.group(2), lang, DEFAULT_LANG), text)
    text = QUESTION_RE.sub(
        lambda m: question_html(m.group(1), m.group(2), m.group(3), lang, DEFAULT_LANG), text
    )
    return text.strip() + "\n"


def chapter_html(slug: str, md_text: str, lang: str = DEFAULT_LANG) -> str:
    body = markdown_to_html(convert_mdx(md_text, lang), lang)
    return f'<section class="chapter" id="file-{slug}">\n{body}\n</section>'


def toc_html(entries: list[dict]) -> str:
    items = "".join(
        f'<li><a href="#file-{e["file"]}">{e["label"]}</a></li>' for e in entries
    )
    return f'<ul class="toc">\n{items}\n</ul>'


def build_document(lang: str) -> str:
    works = load_works()[lang]
    files, toc = chapter_lists(works)
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
        md_text = read_chapter_mdx(lang, slug)
        if md_text is None:
            print(f"warning: missing chapter {CONTENT / lang / f'{slug}.mdx'}", file=sys.stderr)
            continue
        if slug == "about":
            body = markdown_to_html(convert_mdx(md_text, lang), lang)
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
    add_common_arguments(parser, "PDFs")
    parser.add_argument("--html-only", action="store_true", help="skip WeasyPrint, emit HTML")
    args = parser.parse_args()

    jobs = resolve_jobs(args)
    out_dir = ROOT / args.out
    out_dir.mkdir(parents=True, exist_ok=True)

    for lang in jobs:
        html = build_document(lang)
        stem = download_stem(lang)
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
