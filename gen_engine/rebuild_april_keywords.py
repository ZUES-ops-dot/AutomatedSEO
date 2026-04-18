"""Rebuild April keyword blog DOCX files with verified Qubic info."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.sax.saxutils import escape
from datetime import datetime, timezone

ROOT = Path(r"c:\=projects\int\text")
INPUT_DIR = ROOT / "blogs research" / "keywords april"
OUTPUT_DIR = INPUT_DIR

def clean(text):
    for old, new in [("\u2014", " - "), ("\u2013", " - "), ("\u201c", '"'), ("\u201d", '"'), ("\u2018", "'"), ("\u2019", "'"), ("\u2026", "...")]:
        text = text.replace(old, new)
    return text

def run(text, color="000000", size=22, bold=False):
    t = escape(clean(str(text)))
    rpr = f'<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:color w:val="{color}"/><w:sz w:val="{size}"/><w:szCs w:val="{size}"/>'
    if bold: rpr += "<w:b/>"
    return f'<w:r><w:rPr>{rpr}</w:rPr><w:t xml:space="preserve">{t}</w:t></w:r>'

def para(text, kind="body"):
    S = {"title": ("2E5090", 36, True, 0, 400), "h1": ("2E5090", 32, True, 400, 200), "h2": ("2E5090", 28, True, 300, 150), "h3": ("2E5090", 26, True, 240, 120), "body": ("000000", 22, False, 0, 120), "bullet": ("000000", 22, False, 60, 80)}
    color, sz, bd, bef, aft = S.get(kind, S["body"])
    if kind == "bullet":
        return f'<w:p><w:pPr><w:spacing w:before="{bef}" w:after="{aft}"/><w:ind w:left="720"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri"/><w:color w:val="{color}"/><w:sz w:val="{sz}"/></w:rPr><w:t>• {escape(clean(str(text)))}</w:t></w:r></w:p>'
    return f'<w:p><w:pPr><w:spacing w:before="{bef}" w:after="{aft}"/></w:pPr>{run(text, color, sz, bd)}</w:p>'

def render(sections):
    return "".join(para(text, kind) for kind, text in sections if text.strip())

def doc_xml(body):
    sect = '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr>'
    return f'<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>{body}{sect}</w:body></w:document>'

CT = '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'
RL = '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'

def core(title):
    now = datetime.now(timezone.utc).isoformat()[:19] + "Z"
    return f'<?xml version="1.0"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>{escape(title)}</dc:title><dc:creator>SEO</dc:creator><dcterms:created xmlns:dcterms="http://purl.org/dc/terms/">{now}</dcterms:created></cp:coreProperties>'

def save(path, title, sections):
    with ZipFile(path, "w", ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CT)
        z.writestr("_rels/.rels", RL)
        z.writestr("word/document.xml", doc_xml(render(sections)))
        z.writestr("docProps/core.xml", core(title))

# === MS QUANTUM PROOF CRYPTO ===
def build_quantum():
    return [
        ("title", "Quantum Proof Crypto: How Qubic's Cryptographic Security Works"),
        ("h1", "Understanding Quantum Resistance in Blockchain"),
        ("body", "According to docs.qubic.org/overview/introduction, Qubic was founded by Sergey Ivancheglo, creator of NXT and co-founder of IOTA. The network implements security measures addressing current and future cryptographic threats, including quantum computing advances."),
        ("h2", "What Quantum Proof Cryptography Means"),
        ("body", "Quantum computers pose theoretical threats to many blockchain cryptographic systems. A quantum-proof cryptocurrency uses primitives that remain secure against powerful quantum computers. According to qubic.org/About, Qubic is positioned as experimental technology with forward-looking security considerations."),
        ("h2", "Qubic's 676 Computor Security Architecture"),
        ("body", "The Qubic Docs state the network operates with exactly 676 Computors handling validation. This fixed-validator architecture differs from traditional proof-of-work systems. Finality requires agreement from at least 451 Computors, representing a 67% supermajority threshold."),
        ("h2", "Seed and Qubic ID Cryptographic Design"),
        ("body", "According to docs.qubic.org/learn/invest, Qubic uses a 55-character lowercase seed as the master private key. This format differs from BIP39 mnemonic phrases. The seed generates a 60-character Qubic ID as the public receiving address. The deterministic relationship is designed with specific cryptographic properties."),
        ("h2", "Useful Proof of Work Security Model"),
        ("body", "The UPoW documentation at docs.qubic.org/learn/upow explains that mining power is directed toward AI-related tasks rather than only securing blocks. This design means the security budget serves dual purposes: maintaining consensus while producing useful compute output."),
        ("h2", "Open Source Verification"),
        ("body", "According to docs.qubic.org/learn/wallets, official wallets are open source, allowing security researchers to audit code. This transparency enables independent verification of cryptographic implementations."),
        ("h2", "Third-Party Security Verification"),
        ("body", "The Qubic About page states Qubic is validated as the fastest blockchain ever verified on mainnet at 15.5 million TPS, certified by CertiK. This third-party verification extends to security properties. Smart contracts execute directly on bare metal in C++ rather than through a virtual machine, reducing attack surface."),
        ("h2", "Feeless Transfer Finality"),
        ("body", "According to docs.qubic.org/overview/introduction, transactions achieve instant finality through Computor consensus. Once 451+ Computors agree, transactions become irreversible. This consensus-based finality differs from probabilistic finality in proof-of-work systems."),
        ("h2", "Official Resources"),
        ("bullet", "Main website: qubic.org"),
        ("bullet", "Documentation: docs.qubic.org"),
        ("bullet", "Web wallet: wallet.qubic.org"),
        ("bullet", "Explorer: explorer.qubic.org"),
    ]

# === MS QUBIC CONSENSUS ===
def build_consensus():
    return [
        ("title", "Qubic Consensus Protocol: UPoW, Quorum, and the 676 Computor System"),
        ("h1", "Understanding Qubic's Unique Consensus Mechanism"),
        ("body", "According to docs.qubic.org/overview/introduction, Qubic was founded by Sergey Ivancheglo, creator of NXT and co-founder of IOTA. The network implements a consensus protocol differing from both traditional Proof of Work and Proof of Stake, built around 676 validators called Computors."),
        ("h2", "Core Consensus Properties"),
        ("body", "The Qubic Docs describe three fundamental properties: Agreement (all honest participants agree), Validity (agreed value follows rules), and Termination (participants eventually decide). These prevent malicious manipulation and ensure transaction integrity."),
        ("h2", "Useful Proof of Work (UPoW)"),
        ("h3", "How UPoW Differs From Traditional PoW"),
        ("body", "According to docs.qubic.org/learn/upow, UPoW channels mining energy toward artificial neural network work rather than only securing blocks. Miners generate ANNs with random structures, and Aigarth analyzes ANN properties. This addresses energy-use criticism of proof-of-work systems."),
        ("h3", "The UPoW Process"),
        ("bullet", "Computors download AI training tasks from the network"),
        ("bullet", "They execute computations, generating proof of work"),
        ("bullet", "First valid proof meeting difficulty proposes next block"),
        ("bullet", "Other Computors validate the block and proof"),
        ("bullet", "Upon consensus, block is added and reward distributed"),
        ("h2", "The Quorum Protocol"),
        ("h3", "676 Computor Fixed Architecture"),
        ("body", "According to official documentation, Qubic uses exactly 676 Computors. This fixed number creates defined network topology. Finality requires agreement from at least 451 Computors, representing 67% supermajority. Each epoch lasts exactly seven days."),
        ("h3", "Supermajority Consensus Benefits"),
        ("body", "The 67% supermajority ensures robust security while enabling rapid finality. According to the docs, once 451+ Computors agree, transactions achieve instant finality and become irreversible. This differs from probabilistic finality in traditional proof-of-work systems."),
        ("h2", "Token Economics and Consensus"),
        ("body", "According to docs.qubic.org/learn/tokenomics, each epoch produces 1 trillion QUBIC. The circulating supply cap is 200 trillion QUBIC. Smart contract commissions are determined by Computor quorum vote and burned rather than distributed, creating deflationary pressure."),
        ("h2", "Smart Contract Governance"),
        ("body", "According to the docs, smart contracts are written in C++ and executed directly on bare metal. The About page states Qubic is validated as the fastest blockchain at 15.5 million TPS, certified by CertiK. Smart contracts require a quorum vote before launch."),
        ("h2", "Official Documentation"),
        ("bullet", "Introduction: docs.qubic.org/overview/introduction/"),
        ("bullet", "UPoW: docs.qubic.org/learn/upow/"),
        ("bullet", "Tokenomics: docs.qubic.org/learn/tokenomics/"),
        ("bullet", "Main site: qubic.org"),
    ]

# === MS QUBIC GAMES ===
def build_games():
    return [
        ("title", "Qubic Games and Interactive Applications on the Qubic Network"),
        ("h1", "Gaming and Interactive Experiences on Qubic"),
        ("body", "According to docs.qubic.org/overview/introduction, Qubic was founded by Sergey Ivancheglo. The network architecture with 676 Computors and quorum consensus provides infrastructure supporting various applications including games and interactive experiences."),
        ("h2", "High-Performance Infrastructure for Applications"),
        ("h3", "Speed and Throughput Capabilities"),
        ("body", "According to qubic.org/About, Qubic is validated as the fastest blockchain ever verified on mainnet at 15.5 million TPS, certified by CertiK. Smart contracts execute directly on bare metal in C++ rather than through a virtual machine, enabling real-time interactive applications."),
        ("h3", "Feeless Transaction Model for Gaming"),
        ("body", "According to docs.qubic.org/overview/introduction, Qubic emphasizes feeless transfers. For game developers and users, microtransactions and frequent state updates occur without transaction fee overhead. This model supports high-frequency interactions typical in gaming scenarios."),
        ("h2", "Smart Contract Capabilities for Games"),
        ("body", "The docs state that smart contracts are written in C++ and executed directly on bare metal. This enables complex game logic with performance characteristics suitable for real-time applications. The seven-day epoch structure provides predictable timing for game mechanics."),
        ("h2", "Aigarth and AI-Powered Gaming"),
        ("body", "According to docs.qubic.org/learn/upow, the UPoW system directs mining power toward AI-related tasks. The docs state miners generate ANNs with random structures, and Aigarth analyzes ANN properties. This AI infrastructure could theoretically support intelligent NPCs, procedural content generation, or adaptive game mechanics."),
        ("h2", "Decentralized Gaming Infrastructure"),
        ("h3", "Quorum-Based State Consensus"),
        ("body", "With 676 Computors and 67% supermajority required for finality, game state updates achieve instant consensus. This provides a foundation for multiplayer games requiring synchronized state across all participants."),
        ("h3", "Open Source Development"),
        ("body", "According to official documentation, Qubic is fully open source. The wallet docs confirm official wallets are open source. This transparency enables game developers to audit infrastructure and build with confidence."),
        ("h2", "Developer Resources"),
        ("bullet", "Documentation: docs.qubic.org"),
        ("bullet", "Web wallet: wallet.qubic.org"),
        ("bullet", "Explorer: explorer.qubic.org"),
        ("bullet", "Main site: qubic.org"),
    ]

# === MS QUBIC PRICE ===
def build_price():
    return [
        ("title", "Qubic Price: Understanding Token Economics and Market Dynamics"),
        ("h1", "Qubic Token Economics and Value Fundamentals"),
        ("body", "According to docs.qubic.org/learn/tokenomics, the Qubic token (QUBIC) acts as computational energy within the platform. Understanding the tokenomics provides insight into the economic model underlying Qubic's market dynamics."),
        ("h2", "Token Supply and Distribution"),
        ("h3", "Circulating Supply Cap"),
        ("body", "According to the tokenomics documentation, the circulating supply cap is 200 trillion QUBIC after a community-approved reduction from the earlier cap. This community governance element indicates token holders have input into monetary policy decisions."),
        ("h3", "Epoch-Based Production"),
        ("body", "The docs state that each epoch produces 1 trillion QUBIC, allocated across the system. With seven-day epochs, this creates a predictable inflation schedule. The first halving occurred at Epoch 175 in August 2025."),
        ("h2", "Token Utility and Value Drivers"),
        ("h3", "Computational Energy Model"),
        ("body", "According to docs.qubic.org/learn/tokenomics, QUBIC acts as computational energy used within the platform rather than only serving as digital money. Token holdings represent claims on network computational resources."),
        ("h3", "Smart Contract Burn Mechanism"),
        ("body", "The tokenomics docs explain that QUBIC used in smart contract execution is burned rather than paid to validators. This deflationary mechanism removes tokens from circulation based on network usage, potentially creating scarcity economics."),
        ("h2", "Factors Influencing Qubic Value"),
        ("h3", "Network Performance Metrics"),
        ("body", "According to qubic.org/About, Qubic is validated as the fastest blockchain ever verified on mainnet at 15.5 million TPS, certified by CertiK. This performance verification supports technical credibility. Feeless transfers create practical utility for high-frequency users."),
        ("h3", "Useful Proof of Work Economics"),
        ("body", "According to docs.qubic.org/learn/upow, the UPoW system directs mining power toward AI tasks. The docs say miners generate ANNs and Aigarth analyzes properties. This unique value proposition differentiates Qubic from pure speculation tokens."),
        ("h2", "Governance and Commission Structure"),
        ("body", "The tokenomics documentation states that Computors vote by quorum on smart contract commission sizes, and that commission is burned. This democratic approach to fee setting allows network cost adjustment based on computational requirements."),
        ("h2", "Where to Find Current Price Data"),
        ("body", "According to docs.qubic.org/learn/invest, exchanges are the easiest way to invest in Qubic. The docs list exchanges including MEXC, Bitget, Gate.io, XT.COM, Bitpanda, SafeTrade, TradeOgre, CoinEx. The docs explicitly say to check qubic.org for the most up-to-date list."),
        ("h2", "Official Resources"),
        ("bullet", "Tokenomics: docs.qubic.org/learn/tokenomics/"),
        ("bullet", "Investment info: docs.qubic.org/learn/invest/"),
        ("bullet", "Main site: qubic.org"),
        ("bullet", "Explorer: explorer.qubic.org"),
    ]

def main():
    print("Rebuilding April keyword DOCX files...")
    print("=" * 50)
    
    files = [
        ("MS Quantum proof crypto REBUILT.docx", "Quantum Proof Crypto", build_quantum),
        ("MS Qubic consensus REBUILT.docx", "Qubic Consensus", build_consensus),
        ("MS Qubic games REBUILT.docx", "Qubic Games", build_games),
        ("MS QUBIC PRICE REBUILT.docx", "Qubic Price", build_price),
    ]
    
    for fname, title, builder in files:
        path = OUTPUT_DIR / fname
        sections = builder()
        save(path, title, sections)
        print(f"Created: {fname}")
    
    print("=" * 50)
    print(f"All files saved to: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
