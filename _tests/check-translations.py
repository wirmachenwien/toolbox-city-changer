"""Check generated language versions after `bundle exec jekyll build`."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse
import sys

site = Path('_site')
baseurl = sys.argv[1] if len(sys.argv) > 1 else '/toolbox-city-changer'


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.elements = []
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))


count = 0
for language in ('de', 'en', 'sl'):
    root = '' if language == 'de' else language + '/'
    book = 'book/' + root
    paths = [root + name + '.html' for name in ('index', 'about', 'contact', 'search')]
    paths += [book + path.stem + '.html' for path in sorted(Path('book').glob('*.md'))]
    for name in paths:
        path = site / name
        assert path.exists(), name
        page = Page(path)
        html = next(attrs for tag, attrs in page.elements if tag == 'html')
        assert html['lang'] == language, (name, html)
        search = next(attrs for tag, attrs in page.elements if tag == 'form' and attrs.get('class') == 'search')
        resolved = urljoin(baseurl + '/' + name, search['action'])
        assert resolved == baseurl + '/' + root + 'search.html', (name, resolved)
        # Every page can switch to the equivalent page in both other languages.
        other_pages = []
        for other in ('de', 'en', 'sl'):
            if other == language:
                continue
            other_root = '' if other == 'de' else other + '/'
            other_pages.append(('book/' if name.startswith('book/') else '') + other_root + path.name)
        links = [urljoin(baseurl + '/' + name, attrs['href']) for tag, attrs in page.elements if tag == 'a' and 'href' in attrs]
        for other in other_pages:
            assert baseurl + '/' + other in links, (name, other)
        for tag, attrs in page.elements:
            url = attrs.get('src') if tag == 'img' else attrs.get('action') if tag == 'form' else attrs.get('href') if tag in ('a', 'link') else None
            if not url or url.startswith('#'):
                continue
            parsed = urlparse(url)
            if parsed.scheme or parsed.netloc:
                # Alternate URLs must contain the configured base path only once.
                if attrs.get('rel') == 'alternate' and baseurl:
                    assert parsed.path.count(baseurl) == 1, (name, url)
                continue
            target = unquote(urlparse(urljoin(baseurl + '/' + name, url)).path)
            assert target.startswith(baseurl + '/'), (name, target)
            local = site / target[len(baseurl) + 1:]
            assert local.exists(), (name, url, local)
        if name.endswith('0-3-contents.html'):
            for chapter in range(1, 7):
                assert baseurl + '/' + book + f'{chapter:02}.html' in links, (name, chapter)
        count += 1
print(f'Checked {count} pages: language, switching, navigation, search routing, images and local links.')
