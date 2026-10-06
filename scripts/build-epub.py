#!/usr/bin/env python3
"""Build one EPUB per language from the book content collections.

The source of truth matches scripts/build-pdf.py: metadata and reading order
come from src/data/works.json, prose comes from src/content/book/<lang>/*.mdx.
Project-specific MDX components are converted into static, reader-safe XHTML.

Usage:
    python3 scripts/build-epub.py --all
    python3 scripts/build-epub.py --lang de --out dist/downloads
"""

from __future__ import annotations

import argparse
import html
import json
import mimetypes
import posixpath
import re
import shutil
import tempfile
import uuid
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "src" / "content" / "book"
ASSETS = ROOT / "src" / "assets"
DATA = ROOT / "src" / "data" / "works.json"
PAGES = ROOT / "src" / "content" / "pages"

FRONTMATTER_RE = re.compile(r"^---\n.*?\n---\n", re.DOTALL)
FIGURE_RE = re.compile(
    r'<Figure\s+src="([^"]+)"\s+alt="([^"]*)"(?:\s*/>|>(.*?)</Figure>)', re.DOTALL
)
VIDEO_RE = re.compile(r'<Video\s+id="([^"]+)"\s+caption="([^"]*)"(?:\s*/>|[^>]*>)')
BUTTON_RE = re.compile(r'<ButtonLink\s+href="([^"]+)">([^<]+)</ButtonLink>')
COPY_RE = re.compile(r'<CopyText\s+[^>]*/>')
TOC_RE = re.compile(r'<Toc\s+[^>]*/>')
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
QUIZ_RE = re.compile(
    r'<Quiz\s+id="[^"]+"\s+lang="[^"]+"\s+question="([^"]+)"\s+options=\{\[(.*?)\]\}\s*/>',
    re.DOTALL,
)


def object_entries(source: str) -> list[tuple[str, str]]:
    return re.findall(r'\{\s*term:\s*"([^"]+)",\s*definition:\s*"([^"]+)"\s*\}', source)


def note_entries(source: str) -> list[tuple[str, str]]:
    return re.findall(r'\{\s*id:\s*"([^"]+)",\s*text:\s*"([^"]+)"\s*\}', source)


def option_entries(source: str) -> list[tuple[str, bool]]:
    return [(label, 'correct: true' in rest) for label, rest in re.findall(r'\{\s*label:\s*"([^"]+)"([^}]*)\}', source)]


def glossary_html(source: str) -> str:
    items = ''.join(f'<dt>{html.escape(term)}</dt><dd>{html.escape(definition)}</dd>' for term, definition in object_entries(source))
    return f'\n\n<dl class="glossary">{items}</dl>\n'


def endnotes_html(source: str) -> str:
    items = ''.join(f'<li id="note-{html.escape(note_id, quote=True)}">{html.escape(text)}</li>' for note_id, text in note_entries(source))
    return f'\n\n<section class="endnotes"><ol>{items}</ol></section>\n'


def quiz_html(question: str, source: str) -> str:
    options = ''.join(f'<li>{label}</li>' for label, _ in option_entries(source))
    correct = ', '.join(str(i + 1) for i, (_, is_correct) in enumerate(option_entries(source)) if is_correct)
    return (
        f'\n\n<div class="quiz"><p><strong>Quiz: {question}</strong></p>'
        f'<ol>{options}</ol>'
        f'<p style="transform: rotate(180deg);">Richtige Antworten: {correct}</p></div>\n'
    )

def front_opener(lang: str) -> str:
    index = PAGES / lang / "index.mdx"
    if not index.exists():
        return ""
    match = OPENER_RE.search(index.read_text(encoding="utf-8"))
    return match.group(1) if match else ""


def source_image(filename: str) -> Path | None:
    for folder in ("book", "site"):
        candidate = ASSETS / folder / filename
        if candidate.exists():
            return candidate
    candidate = ROOT / "public" / "images" / filename
    if candidate.exists():
        return candidate
    return None


def media_type(path: Path) -> str:
    guessed, _ = mimetypes.guess_type(path.name)
    if guessed == "image/svg+xml":
        return guessed
    return guessed or "application/octet-stream"


def as_xhtml(body: str) -> str:
    # Python-Markdown emits HTML. Normalize the void elements used in this book
    # so common EPUB validators and readers accept them as XHTML.
    body = re.sub(r'<img\b([^>/]*?)>', r'<img\1 />', body)
    body = re.sub(r'<br>', '<br />', body)
    body = re.sub(r'<hr>', '<hr />', body)
    return body


class EpubBook:
    def __init__(self, lang: str, works: dict, out_path: Path):
        self.lang = lang
        self.works = works
        self.out_path = out_path
        self.uid = works.get("identifier") or f"urn:uuid:{uuid.uuid5(uuid.NAMESPACE_URL, f'toolbox-city-changer-{lang}')}"
        self.images: dict[str, str] = {}
        self.chapters: list[dict[str, str]] = []
        self.cover_image: str | None = None

    def add_image(self, filename: str) -> str:
        source = source_image(filename)
        if source is None:
            print(f"warning: image not found: {filename}")
            return filename
        key = source.resolve().as_posix()
        if key not in self.images:
            self.images[key] = f"images/{source.name}"
        return self.images[key]

    def convert_mdx(self, text: str) -> str:
        text = FRONTMATTER_RE.sub("", text, count=1)

        def figure(match: re.Match[str]) -> str:
            src, alt, caption = match.group(1), match.group(2), (match.group(3) or "").strip()
            href = html.escape(self.add_image(src), quote=True)
            alt_text = html.escape(alt, quote=True)
            caption_html = f"<figcaption>{html.escape(caption)}</figcaption>" if caption else ""
            return f'<figure><img src="{href}" alt="{alt_text}" />{caption_html}</figure>'

        text = FIGURE_RE.sub(figure, text)
        text = VIDEO_RE.sub(
            lambda m: f'\n\n*Video: [{m.group(2)}](https://www.youtube.com/watch?v={m.group(1)})*\n',
            text,
        )
        text = BUTTON_RE.sub(lambda m: f"[{m.group(2)}]({m.group(1)})", text)
        text = COPY_RE.sub("", text)
        text = TOC_RE.sub("", text)
        text = CCBADGE_RE.sub(
            '<p><a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0 Wir machen Wien, Changing Cities &amp; Prostorož</a></p>',
            text,
        )
        text = FEATURE_OPEN_RE.sub(lambda m: f'\n\n<div class="feature-box"><p><strong>{html.escape(m.group(1))}</strong></p>\n' if m.group(1) else '\n\n<div class="feature-box">\n', text)
        text = FEATURE_CLOSE_RE.sub('\n</div>\n', text)
        text = PULL_OPEN_RE.sub('\n\n<blockquote class="pullquote">\n', text)
        text = PULL_CLOSE_RE.sub('\n</blockquote>\n', text)
        text = TABLE_OPEN_RE.sub('\n\n', text)
        text = TABLE_CLOSE_RE.sub('\n\n', text)
        text = FOOTNOTE_RE.sub(lambda m: f'<sup id="ref-{html.escape(m.group(1), quote=True)}">{m.group(2)}</sup>', text)
        text = ENDNOTES_RE.sub(lambda m: endnotes_html(m.group(1)), text)
        text = GLOSSARY_RE.sub(lambda m: glossary_html(m.group(1)), text)
        text = QUIZ_RE.sub(lambda m: quiz_html(m.group(1), m.group(2)), text)
        return text.strip() + "\n"

    def render_markdown(self, md_text: str) -> str:
        import markdown  # pip: markdown

        return as_xhtml(markdown.markdown(self.convert_mdx(md_text), extensions=["extra"]))

    def add_chapter(self, slug: str, title: str, body: str) -> None:
        filename = f"{slug}.xhtml"
        self.chapters.append({"slug": slug, "title": title, "filename": filename, "body": body})

    def build_chapters(self) -> None:
        files: list[str] = self.works["products"]["pdf"]["files"]
        toc: list[dict] = self.works["products"]["pdf"]["toc"]
        labels = {entry["file"]: entry["label"] for entry in toc}

        cover_name = front_opener(self.lang) or self.works.get("image") or "cover.jpg"
        self.cover_image = self.add_image(cover_name)

        for slug in files:
            path = CONTENT / self.lang / f"{slug}.mdx"
            title = labels.get(slug, self.works["title"])
            if not path.exists():
                print(f"warning: missing chapter {path}")
                continue
            md_text = path.read_text(encoding="utf-8")
            if slug == "0-0-cover":
                body = (
                    f'<section class="cover"><img src="{html.escape(self.cover_image, quote=True)}" alt="" />'
                    f'<h1>{html.escape(self.works["title"])}</h1>'
                    f'<p>{html.escape(self.works.get("subtitle", ""))}</p>'
                    f'<p>{html.escape(self.works.get("creator", ""))}</p></section>'
                )
            elif slug == "0-1-titlepage":
                body = (
                    f'<section><h1>{html.escape(self.works["title"])}</h1>'
                    f'<p>{html.escape(self.works.get("subtitle", ""))}</p>'
                    f'<p>{html.escape(self.works.get("creator", ""))}</p>'
                    f'<p>{html.escape(self.works.get("contributor", ""))}</p>'
                    f'<p>{html.escape(self.works.get("publisher", ""))}</p></section>'
                )
            elif slug == "0-3-contents":
                items = "".join(
                    f'<li><a href="{entry["file"]}.xhtml">{html.escape(entry["label"])}</a></li>'
                    for entry in toc
                    if entry["file"] != "0-0-cover"
                )
                body = f'<section><h1>{html.escape(title)}</h1><ol>{items}</ol></section>'
            else:
                body = f'<section>{self.render_markdown(md_text)}</section>'
            self.add_chapter(slug, title, body)

    def xhtml_document(self, title: str, body: str) -> str:
        return "\n".join(
            [
                '<?xml version="1.0" encoding="utf-8"?>',
                '<!DOCTYPE html>',
                f'<html xmlns="http://www.w3.org/1999/xhtml" lang="{self.lang}" xml:lang="{self.lang}">',
                "<head>",
                f"<title>{xml_escape(title)}</title>",
                '<link rel="stylesheet" type="text/css" href="styles/epub.css" />',
                "</head>",
                f"<body>{body}</body>",
                "</html>",
            ]
        )

    def nav_document(self) -> str:
        items = "\n".join(
            f'<li><a href="{chapter["filename"]}">{xml_escape(chapter["title"])}</a></li>'
            for chapter in self.chapters
        )
        body = f'<nav epub:type="toc" id="toc"><h1>{xml_escape(self.works["title"])}</h1><ol>{items}</ol></nav>'
        return "\n".join(
            [
                '<?xml version="1.0" encoding="utf-8"?>',
                '<!DOCTYPE html>',
                f'<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="{self.lang}" xml:lang="{self.lang}">',
                "<head>",
                f"<title>{xml_escape(self.works['title'])}</title>",
                "</head>",
                f"<body>{body}</body>",
                "</html>",
            ]
        )

    def opf_document(self) -> str:
        image_items = []
        for index, href in enumerate(self.images.values(), start=1):
            source_name = posixpath.basename(href)
            source = source_image(source_name)
            properties = ' properties="cover-image"' if href == self.cover_image else ""
            image_items.append(
                f'<item id="image-{index}" href="{xml_escape(href)}" media-type="{media_type(source or Path(source_name))}"{properties}/>'
            )

        chapter_items = "\n".join(
            f'<item id="chapter-{index}" href="{xml_escape(chapter["filename"])}" media-type="application/xhtml+xml"/>'
            for index, chapter in enumerate(self.chapters, start=1)
        )
        spine_items = "\n".join(
            f'<itemref idref="chapter-{index}"/>' for index, _ in enumerate(self.chapters, start=1)
        )
        subject = self.works.get("subject", "")
        subjects = "\n".join(
            f"<dc:subject>{xml_escape(part.strip())}</dc:subject>"
            for part in subject.split(";")
            if part.strip()
        )
        return "\n".join(
            [
                '<?xml version="1.0" encoding="utf-8"?>',
                '<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id" version="3.0">',
                '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">',
                f'<dc:identifier id="book-id">{xml_escape(self.uid)}</dc:identifier>',
                f'<dc:title>{xml_escape(self.works["title"])}</dc:title>',
                f'<dc:language>{xml_escape(self.works.get("language", self.lang))}</dc:language>',
                f'<dc:creator>{xml_escape(self.works.get("creator", ""))}</dc:creator>',
                f'<dc:publisher>{xml_escape(self.works.get("publisher", ""))}</dc:publisher>',
                f'<dc:description>{xml_escape(self.works.get("description", ""))}</dc:description>',
                f'<dc:rights>{xml_escape(self.works.get("rights", ""))}</dc:rights>',
                subjects,
                f'<meta property="dcterms:modified">{xml_escape(self.works.get("modified", self.works.get("date", "2026-09-03")))}T00:00:00Z</meta>',
                "</metadata>",
                "<manifest>",
                '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
                '<item id="style" href="styles/epub.css" media-type="text/css"/>',
                chapter_items,
                "\n".join(image_items),
                "</manifest>",
                "<spine>",
                spine_items,
                "</spine>",
                "</package>",
            ]
        )

    def write(self) -> None:
        self.build_chapters()
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            oebps = base / "OEBPS"
            meta_inf = base / "META-INF"
            (oebps / "styles").mkdir(parents=True)
            (oebps / "images").mkdir(parents=True)
            meta_inf.mkdir()

            (base / "mimetype").write_text("application/epub+zip", encoding="ascii")
            (meta_inf / "container.xml").write_text(
                '<?xml version="1.0" encoding="utf-8"?>\n'
                '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
                '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>'
                '</rootfiles></container>\n',
                encoding="utf-8",
            )
            (oebps / "styles" / "epub.css").write_text(EPUB_CSS, encoding="utf-8")
            (oebps / "nav.xhtml").write_text(self.nav_document(), encoding="utf-8")
            (oebps / "content.opf").write_text(self.opf_document(), encoding="utf-8")

            for chapter in self.chapters:
                (oebps / chapter["filename"]).write_text(
                    self.xhtml_document(chapter["title"], chapter["body"]), encoding="utf-8"
                )
            for source_key, href in self.images.items():
                shutil.copyfile(source_key, oebps / href)

            self.out_path.parent.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(self.out_path, "w") as epub:
                epub.write(base / "mimetype", "mimetype", compress_type=zipfile.ZIP_STORED)
                for path in sorted(base.rglob("*")):
                    if path.is_file() and path.name != "mimetype":
                        epub.write(path, path.relative_to(base).as_posix(), compress_type=zipfile.ZIP_DEFLATED)


EPUB_CSS = """body {
  font-family: serif;
  line-height: 1.45;
}
h1, h2, h3 {
  line-height: 1.15;
}
img {
  display: block;
  height: auto;
  max-width: 100%;
}
figure {
  margin: 1.5em 0;
}
figcaption {
  font-size: 0.9em;
  margin-top: 0.5em;
}
.cover {
  text-align: center;
}
.cover img {
  margin: 0 auto 2em;
}
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="Build handbook EPUBs.")
    parser.add_argument("--lang", choices=["de", "en", "sl"], default="de")
    parser.add_argument(
        "--out",
        default="public/downloads",
        help="output directory (public/downloads is copied into dist/ by Astro)",
    )
    parser.add_argument("--all", action="store_true", help="build EPUBs for de/en/sl")
    args = parser.parse_args()

    works_data = json.loads(DATA.read_text(encoding="utf-8"))
    jobs = ("de", "en", "sl") if args.all else (args.lang,)
    out_dir = ROOT / args.out
    for lang in jobs:
        stem = f"toolbox-city-changer-{lang}"
        out_path = out_dir / f"{stem}.epub"
        EpubBook(lang, works_data[lang], out_path).write()
        print(f"wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
