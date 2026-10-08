"""Read the handbook site config (handbook.config.ts, the single source of truth).

The config is a TypeScript module, so it is dumped to JSON through Node
(which the repo requires anyway, see package.json engines) instead of
being parsed or duplicated here.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

_DUMP_JS = (
    "import('./handbook.config.ts').then((m) => console.log(JSON.stringify({"
    "site: m.site, base: m.base, slug: m.slug, "
    "defaultLang: m.defaultLang, languages: m.languages})))"
)


def load_config() -> dict:
    """Return {site, base, slug, defaultLang, languages} from handbook.config.ts."""
    proc = subprocess.run(
        ["node", "-e", _DUMP_JS],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise SystemExit(f"error: cannot read handbook.config.ts via node: {proc.stderr.strip()}")
    config = json.loads(proc.stdout)
    missing = [key for key in ("site", "base", "slug", "defaultLang", "languages") if key not in config]
    if missing:
        raise SystemExit(f"error: handbook.config.ts is missing keys: {', '.join(missing)}")
    if config["defaultLang"] not in config["languages"]:
        raise SystemExit(
            f"error: defaultLang {config['defaultLang']!r} is not in languages {config['languages']}"
        )
    return config
