#!/usr/bin/env python3
"""Build the CV (ES + EN) from cv.json.

    python3 cv/build.py            # → cv/dist/cv-es.{html,pdf}, cv/dist/cv-en.{html,pdf}
    python3 cv/build.py --publish  # also copies the PDFs to front/public/cv/

Single source of truth: cv.json (every text is {"es": ..., "en": ...} or a plain
string shared by both). The PDF is printed with headless Chrome/Chromium, so
there are no Python dependencies.
"""

import html
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
PUBLIC = ROOT.parent / "front" / "public" / "cv"
PUBLIC_NAME = "laura-rodrigo-hernando-cv-{lang}.pdf"
BROWSERS = ["google-chrome", "chromium", "chromium-browser"]


def tr(value, lang: str) -> str:
    """Localized text, HTML-escaped."""
    if isinstance(value, dict):
        value = value.get(lang, "")
    return html.escape(value or "")


def link(url: str, label: str | None = None) -> str:
    shown = label or url.replace("https://", "").replace("www.", "")
    return f'<a href="{html.escape(url)}">{html.escape(shown)}</a>'


def render(cv: dict, lang: str) -> str:
    L = {k: tr(v, lang) for k, v in cv["labels"].items()}
    c = cv["contact"]

    skills = "".join(
        f"<li><strong>{tr(s['name'], lang)}:</strong> {tr(s['items'], lang)}</li>" for s in cv["skills"]
    )

    jobs = []
    for job in cv["experience"]:
        end = tr(job["end"], lang) if job["end"] else L["present"]
        bullets = "".join(f"<li>{html.escape(b)}</li>" for b in job["bullets"][lang])
        projects = ""
        if job["projects"]:
            items = []
            for p in job["projects"]:
                url = f' · {link(p["url"])}' if p.get("url") else ""
                items.append(
                    f'<div class="project"><div class="project-head"><strong>{tr(p["name"], lang)}</strong>'
                    f' <span class="muted">· {tr(p["role"], lang)}</span>{url}</div>'
                    f'<p>{tr(p["text"], lang)}</p></div>'
                )
            projects = f'<h3>{L["highlights"]}</h3>{"".join(items)}'
        jobs.append(
            f'<div class="job"><div class="job-head"><div><strong>{tr(job["role"], lang)}</strong>'
            f' <span class="muted">· {html.escape(job["company"])}, {tr(job["location"], lang)}</span></div>'
            f'<div class="dates">{tr(job["start"], lang)} – {end}</div></div>'
            f"<ul>{bullets}</ul>{projects}</div>"
        )

    personal = "".join(
        f'<div class="project"><div class="project-head"><strong>{tr(p["name"], lang)}</strong></div>'
        f'<p>{tr(p["text"], lang)}</p></div>'
        for p in cv["personal"]
    )

    education = []
    for e in cv["education"]:
        year = f'<div class="dates">{html.escape(e["year"])}</div>' if e["year"] else ""
        text = f'<p>{tr(e["text"], lang)}</p>' if tr(e["text"], lang) else ""
        education.append(
            f'<div class="edu"><div class="job-head"><div><strong>{tr(e["title"], lang)}</strong>'
            f' <span class="muted">· {html.escape(e["org"])}</span></div>{year}</div>{text}</div>'
        )

    return f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<title>{html.escape(cv["name"])} — CV</title>
<style>
  @page {{ size: A4; margin: 13mm 14mm 12mm; }}
  * {{ box-sizing: border-box; }}
  body {{ font-family: Lato, "Noto Sans", Arial, sans-serif; font-size: 9.6pt; line-height: 1.38; color: #1f2033; margin: 0; }}
  a {{ color: #5b3fd6; text-decoration: none; }}
  header {{ text-align: center; padding-bottom: 7pt; border-bottom: 1.4pt solid #5b3fd6; margin-bottom: 8pt; }}
  h1 {{ font-size: 21pt; letter-spacing: .5pt; margin: 0; color: #1d1b4b; }}
  .title {{ font-size: 11pt; color: #5b3fd6; margin: 2pt 0 4pt; font-weight: 600; }}
  .contact {{ font-size: 9pt; color: #44465e; }}
  h2 {{ font-size: 10.5pt; text-transform: uppercase; letter-spacing: 1.2pt; color: #1d1b4b; border-bottom: .6pt solid #c9c3f2; padding-bottom: 2pt; margin: 10pt 0 5pt; break-after: avoid; }}
  h3 {{ font-size: 9.6pt; color: #5b3fd6; margin: 6pt 0 3pt; text-transform: uppercase; letter-spacing: .8pt; break-after: avoid; }}
  p {{ margin: 0 0 3pt; }}
  ul {{ margin: 2pt 0 3pt; padding-left: 13pt; }}
  li {{ margin-bottom: 1.6pt; }}
  .skills {{ list-style: none; padding-left: 0; }}
  .muted {{ color: #5d5f78; font-weight: 400; }}
  .job, .edu {{ margin-bottom: 6pt; }}
  .job-head {{ display: flex; justify-content: space-between; gap: 10pt; align-items: baseline; }}
  .dates {{ white-space: nowrap; color: #5d5f78; font-style: italic; font-size: 9pt; }}
  .project {{ margin: 0 0 4pt 0; padding-left: 7pt; border-left: 1.6pt solid #e3defc; break-inside: avoid; }}
  .project p {{ margin: 1pt 0 0; }}
  .two-col {{ display: grid; grid-template-columns: 1fr 1fr; gap: 0 14pt; }}
</style>
</head>
<body>
<header>
  <h1>{html.escape(cv["name"]).upper()}</h1>
  <div class="title">{tr(cv["title"], lang)}</div>
  <div class="contact">{tr(c["location"], lang)} · {link("mailto:" + c["email"], c["email"])}</div>
  <!-- full URLs as visible text: they still work when printed, in viewers without link support and for ATS parsers -->
  <div class="contact">{link(c["linkedin"])} · {link(c["github"])}</div>
</header>

<h2>{L["profile"]}</h2>
<p>{tr(cv["profile"], lang)}</p>

<h2>{L["skills"]}</h2>
<ul class="skills">{skills}</ul>

<h2>{L["experience"]}</h2>
{"".join(jobs)}

<h2>{L["personal"]}</h2>
{personal}

<h2>{L["education"]}</h2>
{"".join(education)}

<div class="two-col">
  <div><h2>{L["languages"]}</h2><p>{tr(cv["languages"], lang)}</p></div>
  <div><h2>{L["availability"]}</h2><p>{tr(cv["availability"], lang)}</p></div>
</div>
</body>
</html>
"""


def find_browser() -> str:
    for name in BROWSERS:
        path = shutil.which(name)
        if path:
            return path
    sys.exit("No Chrome/Chromium found to print the PDF.")


def main() -> None:
    cv = json.loads((ROOT / "cv.json").read_text(encoding="utf-8"))
    DIST.mkdir(exist_ok=True)
    browser = find_browser()
    for lang in ("es", "en"):
        html_path = DIST / f"cv-{lang}.html"
        pdf_path = DIST / f"cv-{lang}.pdf"
        html_path.write_text(render(cv, lang), encoding="utf-8")
        subprocess.run(
            [browser, "--headless", "--disable-gpu", "--no-pdf-header-footer",
             f"--print-to-pdf={pdf_path}", html_path.as_uri()],
            check=True, capture_output=True,
        )
        print(f"✓ {pdf_path.relative_to(ROOT.parent)}")
        if "--publish" in sys.argv:
            PUBLIC.mkdir(parents=True, exist_ok=True)
            shutil.copy(pdf_path, PUBLIC / PUBLIC_NAME.format(lang=lang))
            print(f"  → front/public/cv/{PUBLIC_NAME.format(lang=lang)}")


if __name__ == "__main__":
    main()
