"""Build the static ISB page for GitHub Pages with Python 3."""
from html.parser import HTMLParser
from pathlib import Path
import argparse


class SiteDocument(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.local_assets = set()

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        element_id = attributes.get("id")
        if element_id in self.ids:
            raise ValueError(f"Duplicate ID: {element_id}")
        if element_id:
            self.ids.add(element_id)
        src = attributes.get("src")
        if src and "://" not in src:
            self.local_assets.add(src)


root = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--check", action="store_true", help="verify the committed HTML matches its source")
args = parser.parse_args()
template = (root / "page.template").read_text(encoding="utf-8")
if template.count("<!-- MOTION_MODULE -->") != 1:
    raise ValueError("Expected exactly one motion module slot")
page = template.replace("<!-- MOTION_MODULE -->", '<script type="module" src="motion.js"></script>')
document = SiteDocument()
document.feed(page)
for asset in sorted(document.local_assets):
    if not (root / asset).is_file():
        raise FileNotFoundError(asset)
output = root / "index.html"
if args.check:
    if output.read_text(encoding="utf-8") != page:
        raise SystemExit("index.html is stale. Run python build.py.")
else:
    output.write_text(page, encoding="utf-8", newline="\n")
