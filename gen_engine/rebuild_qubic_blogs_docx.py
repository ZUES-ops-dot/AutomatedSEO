"""Rebuild Qubic blog DOCX files with all verified info integrated.
Keywords: qubic crypto, how to buy qubic, qubic wallet, qubic explorer"""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.sax.saxutils import escape
from datetime import datetime, timezone

ROOT = Path(r"c:\=projects\int\text")
INPUT_DIR = ROOT / "outputs" / "research" / "qubic_recovery_blogs"
OUTPUT_DIR = INPUT_DIR
C, B, G = "2E5090", "000000", "555555"  # Professional blue, black, gray

def clean_text(text: str) -> str:
    """Remove em-dashes, curly quotes, and other problematic characters."""
    text = text.replace("\u2014", " - ")  # em-dash
    text = text.replace("\u2013", " - ")  # en-dash
    text = text.replace("\u201c", '"')   # left curly quote
    text = text.replace("\u201d", '"')   # right curly quote
    text = text.replace("\u2018", "'")   # left curly apostrophe
    text = text.replace("\u2019", "'")   # right curly apostrophe
    text = text.replace("\u2026", "...") # ellipsis
    return text

def run(text, color=B, size=22, bold=False, italic=False):
    t = escape(clean_text(str(text)))
    rpr = f'<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="{color}"/><w:sz w:val="{size}"/><w:szCs w:val="{size}"/>'
    if bold: rpr += "<w:b/>"
    if italic: rpr += "<w:i/>"
    return f'<w:r><w:rPr>{rpr}</w:rPr><w:t xml:space="preserve">{t}</w:t></w:r>'

def para(text, kind="body"):
    S = {
        "title": (C, 36, True, False, 0, 400),
        "h1": (C, 32, True, False, 400, 200),
        "h2": (C, 28, True, False, 300, 150),
        "h3": (C, 26, True, False, 240, 120),
        "body": (B, 22, False, False, 0, 120),
        "bullet": (B, 22, False, False, 60, 80),
        "link": ("0563C1", 22, False, False, 0, 100),
        "meta": (G, 20, False, True, 0, 80),
    }
    color, sz, bd, it, bef, aft = S.get(kind, S["body"])
    r = run(text, color, sz, bd, it)
    if kind == "bullet":
        return f'<w:p><w:pPr><w:spacing w:before="{bef}" w:after="{aft}"/><w:ind w:left="720" w:hanging="360"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:color w:val="{color}"/><w:sz w:val="{sz}"/><w:szCs w:val="{sz}"/></w:rPr><w:t xml:space="preserve">• {escape(clean_text(str(text)))}</w:t></w:r></w:p>'
    return f'<w:p><w:pPr><w:spacing w:before="{bef}" w:after="{aft}"/></w:pPr>{r}</w:p>'

def render_article(title: str, sections: list) -> str:
    """Render article content to DOCX XML."""
    out = []
    out.append(para(title, "title"))
    
    for section in sections:
        kind = section.get("type", "body")
        text = section.get("text", "")
        if text.strip():
            out.append(para(text, kind))
    
    return "".join(out)

def doc_xml(body_xml: str) -> str:
    sect = '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>'
    return f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>{body_xml}{sect}</w:body></w:document>'

CT = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>'
RL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'
AP = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Office Word</Application></Properties>'

def core(title: str) -> str:
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>{escape(title)}</dc:title><dc:creator>SEO Team</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified></cp:coreProperties>'

def save_docx(path: Path, title: str, sections: list):
    """Save article as DOCX file."""
    body = render_article(title, sections)
    doc = doc_xml(body)
    with ZipFile(path, "w", ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CT)
        z.writestr("_rels/.rels", RL)
        z.writestr("word/document.xml", doc)
        z.writestr("docProps/core.xml", core(title))
        z.writestr("docProps/app.xml", AP)

def parse_markdown_to_sections(md_text: str) -> list:
    """Parse markdown into structured sections for DOCX rendering."""
    sections = []
    lines = md_text.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        # Skip title line (already handled separately)
        if stripped.startswith('# ') and i == 0:
            i += 1
            continue
        
        # H2 headers
        if stripped.startswith('## '):
            text = stripped[3:].strip()
            sections.append({"type": "h2", "text": text})
            i += 1
            continue
        
        # H3 headers
        if stripped.startswith('### '):
            text = stripped[4:].strip()
            sections.append({"type": "h3", "text": text})
            i += 1
            continue
        
        # Bold paragraphs that look like subheaders
        if stripped.startswith('**') and stripped.endswith('**') and len(stripped) < 100:
            text = stripped[2:-2].strip()
            sections.append({"type": "h3", "text": text})
            i += 1
            continue
        
        # Bullet points
        if stripped.startswith('- ') or stripped.startswith('* '):
            text = stripped[2:].strip()
            sections.append({"type": "bullet", "text": text})
            i += 1
            continue
        
        # Numbered lists
        if stripped and stripped[0].isdigit() and '. ' in stripped[:4]:
            text = stripped[stripped.find('. ') + 2:].strip()
            sections.append({"type": "bullet", "text": text})
            i += 1
            continue
        
        # Links - convert to text with URL
        if '[' in stripped and '](' in stripped:
            # Simple link extraction
            import re
            link_pattern = r'\[([^\]]+)\]\(([^\)]+)\)'
            text = re.sub(link_pattern, r'\1 (\2)', stripped)
            sections.append({"type": "body", "text": text})
            i += 1
            continue
        
        # Regular paragraphs
        if stripped:
            sections.append({"type": "body", "text": stripped})
        
        i += 1
    
    return sections

def rebuild_qubic_crypto_docx():
    """Rebuild the qubic crypto deep guide DOCX."""
    md_path = INPUT_DIR / "qubic_crypto_deep_guide.md"
    docx_path = OUTPUT_DIR / "qubic_crypto_deep_guide_rebuilt.docx"
    
    md_text = md_path.read_text(encoding='utf-8')
    title = "What Is Qubic Crypto? A Deep Guide to the Network, Tokenomics, and Why It Matters"
    sections = parse_markdown_to_sections(md_text)
    
    save_docx(docx_path, title, sections)
    print(f"Rebuilt: {docx_path.name}")
    return docx_path

def rebuild_qubic_wallet_docx():
    """Rebuild the qubic wallet guide DOCX."""
    md_path = INPUT_DIR / "qubic_wallet_guide.md"
    docx_path = OUTPUT_DIR / "qubic_wallet_guide_rebuilt.docx"
    
    md_text = md_path.read_text(encoding='utf-8')
    title = "Qubic Wallet Guide: Official Wallets, Security Setup, Qubic ID, and How to Choose"
    sections = parse_markdown_to_sections(md_text)
    
    save_docx(docx_path, title, sections)
    print(f"Rebuilt: {docx_path.name}")
    return docx_path

def rebuild_how_to_buy_docx():
    """Rebuild the how to buy qubic guide DOCX."""
    md_path = INPUT_DIR / "how_to_buy_qubic_complete_guide.md"
    docx_path = OUTPUT_DIR / "how_to_buy_qubic_complete_guide_rebuilt.docx"
    
    md_text = md_path.read_text(encoding='utf-8')
    title = "How to Buy Qubic: Verified Step-by-Step Guide to Exchanges, Wallet Setup, and Safe Storage"
    sections = parse_markdown_to_sections(md_text)
    
    save_docx(docx_path, title, sections)
    print(f"Rebuilt: {docx_path.name}")
    return docx_path

def create_qubic_explorer_docx():
    """Create the qubic explorer guide DOCX (not yet generated)."""
    title = "Qubic Explorer Guide: How to Read Network Data, Verify Activity, and Understand On-Chain Metrics"
    docx_path = OUTPUT_DIR / "qubic_explorer_guide.docx"
    
    # Create content based on verified sources
    sections = [
        {"type": "h2", "text": "What Is the Qubic Explorer"},
        {"type": "body", "text": "According to the official Qubic documentation, the Qubic explorer is available at explorer.qubic.org. The explorer serves as the primary interface for viewing on-chain data, verifying network activity, and understanding the 676-Computor quorum system that powers the Qubic network."},
        
        {"type": "h2", "text": "Key Network Metrics Available on the Explorer"},
        {"type": "h3", "text": "Computor Status and Quorum Information"},
        {"type": "body", "text": "The Qubic Docs state that the network operates with exactly 676 Computors. The explorer displays the current status of these validators, showing which Computors are active and participating in consensus. According to the documentation, finality requires agreement from at least 451 Computors, representing approximately 67% supermajority."},
        
        {"type": "h3", "text": "Epoch Progress and Timing"},
        {"type": "body", "text": "Each epoch on Qubic lasts exactly seven days according to the official documentation. The explorer shows current epoch progress, time remaining, and historical epoch data. This seven-day cycle creates predictable network behavior for participants."},
        
        {"type": "h3", "text": "Transaction Verification"},
        {"type": "body", "text": "The Qubic network emphasizes feeless transfers as a core platform feature. The explorer allows users to verify that transfers completed successfully without transaction fees. According to the docs, once 451+ Computors agree on a transaction, it achieves instant finality."},
        
        {"type": "h2", "text": "How to Use the Qubic Explorer for Verification"},
        {"type": "h3", "text": "Verifying Your Own Transactions"},
        {"type": "body", "text": "When you make a transfer using your Qubic wallet at wallet.qubic.org, you can verify it on the explorer. Simply search for your Qubic ID (the 60-character public address) to see your transaction history and current balance."},
        
        {"type": "h3", "text": "Checking Smart Contract Activity"},
        {"type": "body", "text": "According to the tokenomics documentation, QUBIC used in smart contract execution is burned rather than paid as fees. The explorer shows smart contract activity and burn metrics, allowing verification of this unique economic model."},
        
        {"type": "h3", "text": "Network Performance Data"},
        {"type": "body", "text": "The About page at qubic.org/About states that Qubic is validated as the fastest blockchain ever verified on mainnet at 15.5 million TPS, certified by CertiK. The explorer provides real-time and historical performance metrics that support this claim."},
        
        {"type": "h2", "text": "Explorer Features for Different Users"},
        {"type": "h3", "text": "For Wallet Users"},
        {"type": "bullet", "text": "Verify transfers completed successfully"},
        {"type": "bullet", "text": "Check current QUBIC balance"},
        {"type": "bullet", "text": "Review transaction history by Qubic ID"},
        {"type": "bullet", "text": "Confirm feeless transfer status"},
        
        {"type": "h3", "text": "For Miners and UPoW Participants"},
        {"type": "bullet", "text": "Monitor epoch progress and rewards"},
        {"type": "bullet", "text": "View Useful Proof of Work metrics"},
        {"type": "bullet", "text": "Track AI-task assignments and completions"},
        {"type": "bullet", "text": "Verify mining pool statistics"},
        
        {"type": "h3", "text": "For Developers"},
        {"type": "bullet", "text": "Review smart contract deployment status"},
        {"type": "bullet", "text": "Track C++ contract execution on bare metal"},
        {"type": "bullet", "text": "Analyze network throughput and finality times"},
        {"type": "bullet", "text": "Monitor Computor participation rates"},
        
        {"type": "h2", "text": "Understanding Explorer Data Quality"},
        {"type": "body", "text": "The Qubic Docs emphasize that the network uses Useful Proof of Work (UPoW), where mining power is directed toward AI-related tasks. The explorer shows this activity, distinguishing between traditional consensus work and useful compute output. This transparency allows independent verification of the UPoW claims made in the documentation."},
        
        {"type": "h2", "text": "Explorer Links and Resources"},
        {"type": "body", "text": "Main explorer: explorer.qubic.org"},
        {"type": "body", "text": "Official wallet for interacting with the network: wallet.qubic.org"},
        {"type": "body", "text": "Documentation: docs.qubic.org"},
        {"type": "body", "text": "Main website: qubic.org"},
        
        {"type": "h2", "text": "Tips for Effective Explorer Use"},
        {"type": "body", "text": "When verifying transactions, remember that Qubic achieves instant finality through quorum consensus. Once a transaction appears on the explorer with Computor confirmations, it is irreversible. This differs from traditional blockchain systems where you must wait for multiple block confirmations."},
        {"type": "body", "text": "For the most accurate view of network health, check that 451+ Computors are actively participating. This supermajority ensures the network is operating with proper consensus guarantees."},
    ]
    
    save_docx(docx_path, title, sections)
    print(f"Created: {docx_path.name}")
    return docx_path

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    print("Rebuilding Qubic blog DOCX files with all verified info...")
    print("=" * 60)
    
    # Rebuild existing blogs
    rebuild_qubic_crypto_docx()
    rebuild_qubic_wallet_docx()
    rebuild_how_to_buy_docx()
    
    # Create the explorer guide
    create_qubic_explorer_docx()
    
    print("=" * 60)
    print(f"All files saved to: {OUTPUT_DIR}")
    print("\nGenerated files:")
    for f in sorted(OUTPUT_DIR.glob("*_rebuilt.docx")) + [OUTPUT_DIR / "qubic_explorer_guide.docx"]:
        if f.exists():
            print(f"  - {f.name}")

if __name__ == "__main__":
    main()
