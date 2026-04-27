"""
MLM Guides and Manuals Generator
1. Consolidate research into context
2. Send each guide topic to Anthropic Claude API
3. Generate DOCX files with clickable links
"""

import os
import re
import json
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile

import anthropic

ROOT = Path(r"c:\=projects\int\text")
OUTPUT_DIR = ROOT / "outputs" / "guides"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

RESEARCH_CONTEXT = (ROOT / "mlm_research_context.txt").read_text(encoding="utf-8") if (ROOT / "mlm_research_context.txt").exists() else ""

GUIDE_TOPICS = [
    {
        "title": "My Last Match -- Complete Beginner's Guide",
        "filename": "MLM_Beginners_Guide.docx",
        "prompt": (
            "Write a comprehensive beginner's guide (1500-2000 words) for someone completely new to My Last Match (MLM) on the Qubic blockchain. "
            "Cover: what MLM is, how Qubic works underneath it, how to set up a wallet, how to join the community via Discord, "
            "what to expect during beta, how asset ownership works on-chain, what $QUBIC is and how it is used in the game, "
            "and practical first steps a new player should take. "
            "Use clear section headings. Write in a helpful, authoritative tone. Include relevant links in markdown format."
        ),
    },
    {
        "title": "Safehouses, Vehicles, and Assets -- Owner's Manual",
        "filename": "MLM_Assets_Owners_Manual.docx",
        "prompt": (
            "Write a detailed owner's manual (1500-2000 words) about assets in My Last Match (MLM). "
            "Cover: what safehouses are and why they matter (respawn points, trading hubs, shelters, reincarnation fees), "
            "the original 676 safehouses and how many were converted to vehicles/pets/bonus points, "
            "types of safehouses (from public restrooms to subway platforms to floating aerostats), "
            "vehicles and pets as asset classes, how asset ownership is validated on-chain, "
            "how to acquire assets via IPOs/Dutch auctions and QX trading, "
            "notable trades (church for 7.5B QUBIC, mayor's car for 6.1B QUBIC), "
            "and strategic tips for asset management. "
            "Use clear section headings. Write in a helpful, authoritative tone. Include relevant links in markdown format."
        ),
    },
    {
        "title": "Trading and Economy -- Complete Guide to QX and MLM Markets",
        "filename": "MLM_Trading_Economy_Guide.docx",
        "prompt": (
            "Write a comprehensive trading and economy guide (1500-2000 words) for My Last Match (MLM) on Qubic. "
            "Cover: what QX is (Qubic's decentralized exchange), how to trade MLM assets on QX, "
            "the fee structure (execution, trading service, asset transfer, storage fees), "
            "how IPOs and Dutch auctions work in Qubic (bids sorted highest to lowest, uniform clearing price), "
            "the MLM IPO (473.876 billion QUBIC burned), how community-funded token initiatives work (like HOTEL1), "
            "QX frontends (qubictrade.com, quhub.app, qubicswap.com, app.qubicportal.org), "
            "how $QUBIC tokenomics affect the game economy (burn mechanics, feeless transfers), "
            "crafting economy with community-contributed recipes, and trading strategies. "
            "Use clear section headings. Write in a helpful, authoritative tone. Include relevant links in markdown format."
        ),
    },
    {
        "title": "Gameplay Mechanics and Survival Manual",
        "filename": "MLM_Gameplay_Survival_Manual.docx",
        "prompt": (
            "Write a detailed gameplay and survival manual (1500-2000 words) for My Last Match (MLM). "
            "Cover: the game world (1990s post-apocalyptic setting, one unified world for up to 50,000 players, 50ms latency), "
            "the map (city centres, villages, forests, strategic locations), "
            "survival mechanics (resource management, diesel-only vehicles due to gasoline degradation), "
            "psychological threats -- mares (haunt darkness, drain sanity) and dementals (humans driven insane, attracted by light, retain rudimentary intelligence, valuable loot), "
            "the light vs darkness balance, "
            "PVP and PVE combat systems, "
            "crafting system (player-driven, community-contributed recipes, survival tools, portable shelters), "
            "safehouses as strategic infrastructure, "
            "clans and social organization, "
            "and tips for staying alive. "
            "Use clear section headings. Write in a helpful, authoritative tone. Include relevant links in markdown format."
        ),
    },
    {
        "title": "MLM Community, Clans, and Developer Engagement Handbook",
        "filename": "MLM_Community_Handbook.docx",
        "prompt": (
            "Write a community and engagement handbook (1500-2000 words) for My Last Match (MLM) on Qubic. "
            "Cover: the role of Come-from-Beyond (CFB) as project lead and his direct engagement with players, "
            "the developer background (The Wicked Days, Post Scriptum CTG by Alien Tech Limited), "
            "how player suggestions get integrated into the game, "
            "the Qubic Discord as the central community hub, "
            "how clans work and how to start or join one, "
            "community-funded initiatives (like the HOTEL1 token auction), "
            "the beta testing program and how to participate, "
            "loot persistence (beta loot carries over to full game), "
            "the MLM Twitter/X presence (@My_Last_Match), "
            "how to contribute to the crafting recipe system, "
            "and the broader Qubic ecosystem context (incubation program, governance, ambassador program). "
            "Use clear section headings. Write in a helpful, authoritative tone. Include relevant links in markdown format."
        ),
    },
]


# ── Anthropic API ─────────────────────────────────────────────────────

def generate_guide_text(topic: dict, context: str) -> str:
    client = anthropic.Anthropic()
    system = (
        "You are a professional technical writer creating guides and manuals for the My Last Match (MLM) project "
        "in the Qubic blockchain ecosystem. Write clean, well-structured, authoritative content. "
        "Use markdown formatting with ## and ### headings, bullet lists, and bold for key terms. "
        "Include markdown links like [text](url) to relevant sources where appropriate. "
        "Do not invent information -- only use what is provided in the research context. "
        "Do not add disclaimers about not being financial advice unless specifically about trading."
    )
    user = (
        f"Here is all the research context about MLM and Qubic:\n\n{context}\n\n"
        f"---\n\nNow write the following guide:\n\n{topic['prompt']}"
    )
    msg = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return msg.content[0].text


# ── DOCX Builder ──────────────────────────────────────────────────────

TITLE_COLOR = "1F1F1F"
BODY_COLOR = "222222"
MUTED_COLOR = "555555"
LINK_COLOR = "0563C1"
LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
BOLD_RE = re.compile(r"\*\*([^*]+)\*\*")


def add_hyperlink_rel(url, rels, mapping):
    if url in mapping:
        return mapping[url]
    rid = f"rId{len(mapping) + 1}"
    mapping[url] = rid
    rels.append(
        f'<Relationship Id="{rid}" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" '
        f'Target="{escape(url)}" TargetMode="External"/>'
    )
    return rid


def text_run(text, *, color=BODY_COLOR, size=22, bold=False, italic=False, underline=False):
    if not text:
        return ""
    rpr = (
        '<w:rPr>'
        f'<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>'
        f'<w:color w:val="{color}"/>'
        f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/>'
    )
    if bold:
        rpr += '<w:b/>'
    if italic:
        rpr += '<w:i/>'
    if underline:
        rpr += '<w:u w:val="single"/>'
    rpr += '</w:rPr>'
    return f'<w:r>{rpr}<w:t xml:space="preserve">{escape(text)}</w:t></w:r>'


def inline_runs(text, *, color, size, bold, italic, rels, mapping):
    parts = []
    last = 0
    combined = list(LINK_RE.finditer(text)) + list(BOLD_RE.finditer(text))
    combined.sort(key=lambda m: m.start())
    for match in combined:
        start, end = match.span()
        if start < last:
            continue
        if start > last:
            parts.append(text_run(text[last:start], color=color, size=size, bold=bold, italic=italic))
        if match.re == LINK_RE:
            label, url = match.groups()
            rid = add_hyperlink_rel(url, rels, mapping)
            link_run = text_run(label, color=LINK_COLOR, size=size, bold=bold, italic=italic, underline=True)
            parts.append(f'<w:hyperlink r:id="{rid}">{link_run}</w:hyperlink>')
        else:
            bold_text = match.group(1)
            parts.append(text_run(bold_text, color=color, size=size, bold=True, italic=italic))
        last = end
    if last < len(text):
        parts.append(text_run(text[last:], color=color, size=size, bold=bold, italic=italic))
    return "".join(parts)


def para_xml(text, *, color=BODY_COLOR, size=22, bold=False, italic=False, before=0, after=120, rels=None, mapping=None):
    if rels is not None and mapping is not None:
        runs = inline_runs(text, color=color, size=size, bold=bold, italic=italic, rels=rels, mapping=mapping)
    else:
        runs = text_run(text, color=color, size=size, bold=bold, italic=italic)
    return f'<w:p><w:pPr><w:spacing w:before="{before}" w:after="{after}"/></w:pPr>{runs}</w:p>'


def md_to_docx_body(md_text, rels, mapping):
    paragraphs = []
    for line in md_text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("# "):
            paragraphs.append(para_xml(stripped[2:], color=TITLE_COLOR, size=34, bold=True, before=120, after=280, rels=rels, mapping=mapping))
        elif stripped.startswith("## "):
            paragraphs.append(para_xml(stripped[3:], color=TITLE_COLOR, size=26, bold=True, before=240, after=120, rels=rels, mapping=mapping))
        elif stripped.startswith("### "):
            paragraphs.append(para_xml(stripped[4:], color=MUTED_COLOR, size=23, bold=True, before=180, after=80, rels=rels, mapping=mapping))
        elif stripped.startswith("- ") or stripped.startswith("* "):
            bullet_text = stripped[2:]
            runs = inline_runs(bullet_text, color=BODY_COLOR, size=22, bold=False, italic=False, rels=rels, mapping=mapping)
            bullet_run = text_run("  \u2022  ", color=MUTED_COLOR, size=22)
            paragraphs.append(f'<w:p><w:pPr><w:spacing w:before="0" w:after="60"/><w:ind w:left="360"/></w:pPr>{bullet_run}{runs}</w:p>')
        elif re.match(r"^\d+\.\s", stripped):
            num_text = stripped
            runs = inline_runs(num_text, color=BODY_COLOR, size=22, bold=False, italic=False, rels=rels, mapping=mapping)
            paragraphs.append(f'<w:p><w:pPr><w:spacing w:before="0" w:after="60"/><w:ind w:left="360"/></w:pPr>{runs}</w:p>')
        else:
            paragraphs.append(para_xml(stripped, rels=rels, mapping=mapping))
    return "".join(paragraphs)


def build_docx(title, md_text, out_path):
    rels = []
    mapping = {}
    body = md_to_docx_body(md_text, rels, mapping)
    sect = '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="900" w:bottom="1080" w:left="900" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>'
    doc = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'<w:body>{body}{sect}</w:body>'
        '</w:document>'
    )
    ct = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
        '</Types>'
    )
    rr = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rDoc" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        '<Relationship Id="rCore" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
        '<Relationship Id="rApp" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
        '</Relationships>'
    )
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    core = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
        'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" '
        'xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
        f'<dc:title>{escape(title)}</dc:title><dc:creator>Cascade</dc:creator>'
        f'<dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>'
        f'<dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>'
        '</cp:coreProperties>'
    )
    app = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">'
        '<Application>Microsoft Office Word</Application></Properties>'
    )
    dr = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + "".join(rels) +
        '</Relationships>'
    )
    with ZipFile(out_path, "w", ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", ct)
        zf.writestr("_rels/.rels", rr)
        zf.writestr("word/document.xml", doc)
        zf.writestr("word/_rels/document.xml.rels", dr)
        zf.writestr("docProps/core.xml", core)
        zf.writestr("docProps/app.xml", app)
    print(f"  DOCX -> {out_path}")


# ── Main ──────────────────────────────────────────────────────────────

def main():
    context = RESEARCH_CONTEXT
    if not context:
        print("ERROR: mlm_research_context.txt not found. Create it first.")
        return

    for i, topic in enumerate(GUIDE_TOPICS):
        print(f"\n[{i+1}/{len(GUIDE_TOPICS)}] Generating: {topic['title']}")
        md_text = generate_guide_text(topic, context)

        md_path = OUTPUT_DIR / topic["filename"].replace(".docx", ".md")
        md_path.write_text(md_text, encoding="utf-8")
        print(f"  MD  -> {md_path}")

        docx_path = OUTPUT_DIR / topic["filename"]
        build_docx(topic["title"], md_text, docx_path)

    print(f"\nDone! {len(GUIDE_TOPICS)} guides generated in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
