import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

import anthropic

ROOT = Path(r"c:\=projects\int\text")
XLSX_PATH = ROOT / "blogs research" / "qubic.org_keywords_qubic.org__2026-04-07.xlsx"
OUTPUT_DIR = ROOT / "outputs" / "research" / "qubic_recovery_blogs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

TOPIC_CATALOG = [
    {
        "id": "qubic_crypto",
        "topic_label": "Qubic Crypto",
        "primary_keywords": ["qubic crypto"],
        "title": "What Is Qubic Crypto? A Deep Guide to the Network, Tokenomics, and Why It Matters",
        "filename": "qubic_crypto_deep_guide.md",
        "brief": (
            "Write a flagship explainer for people searching 'qubic crypto'. Explain what Qubic is, how the network works, "
            "why Sergey Ivancheglo and the Qubic architecture matter, how quorum, Computors, UPoW, tokenomics, smart contracts, "
            "wallets, explorer tooling, and the broader ecosystem fit together, and what a newcomer should understand before going deeper."
        ),
    },
    {
        "id": "buy_qubic",
        "topic_label": "How to Buy Qubic",
        "primary_keywords": ["how to buy qubic", "where to buy qubic crypto"],
        "title": "How to Buy Qubic: Verified Step-by-Step Guide to Exchanges, Wallet Setup, and Safe Storage",
        "filename": "how_to_buy_qubic_complete_guide.md",
        "brief": (
            "Write a practical buying guide for the overlapping intent behind 'how to buy qubic' and 'where to buy qubic crypto'. "
            "Use the official Qubic docs as the backbone. Explain the buying flow, the wallet setup prerequisites, the seed and Qubic ID, "
            "how to transfer and verify holdings, where official docs say QUBIC is available, and how to avoid common setup mistakes."
        ),
    },
    {
        "id": "qubic_wallet",
        "topic_label": "Qubic Wallet",
        "primary_keywords": ["qubic wallet"],
        "title": "Qubic Wallet Guide: Official Wallets, Security Setup, Qubic ID, and How to Choose the Right Option",
        "filename": "qubic_wallet_guide.md",
        "brief": (
            "Write a complete wallet guide for people searching 'qubic wallet'. Cover official web and mobile wallets, open-source status, "
            "community and hardware options, the difference between direct-network and proxied wallets, how seeds and Qubic IDs work, "
            "and a realistic setup and security workflow for new users."
        ),
    },
    {
        "id": "qubic_explorer",
        "topic_label": "Qubic Explorer",
        "primary_keywords": ["qubic explorer"],
        "title": "Qubic Explorer Guide: How to Read Network Data, Verify Activity, and Understand On-Chain Metrics",
        "filename": "qubic_explorer_guide.md",
        "brief": (
            "Write a guide for people searching 'qubic explorer'. Explain what the explorer is for, what information users can verify there, "
            "how it supports wallet and transaction workflows, and how it fits into understanding the Qubic network."
        ),
    },
]

OFFICIAL_RESEARCH_CONTEXT = """
=== VERIFIED OFFICIAL SOURCE: https://docs.qubic.org/overview/introduction/ ===
- Qubic is presented as an innovative crypto platform founded by Sergey Ivancheglo.
- Qubic uses a quorum-based computer system with 676 Computors.
- Finality and consensus require a quorum of 451+ Computors.
- Qubic emphasizes feeless transfers.
- Qubic smart contracts are written in C++ and executed directly on bare metal rather than through a virtual machine.
- Qubic uses Useful Proof of Work (UPoW), where mining power is directed toward AI-related tasks rather than only securing blocks.
- Each epoch lasts seven days.

=== VERIFIED OFFICIAL SOURCE: https://docs.qubic.org/learn/tokenomics/ ===
- $QUBIC acts as computational energy used within the platform.
- $QUBIC used in smart contract execution is burned rather than paid to validators as ordinary fees.
- Transfers are feeless.
- Each epoch produces 1 trillion $QUBIC, allocated across the system.
- The circulating supply cap is 200 trillion $QUBIC after a community-approved reduction from the earlier cap.
- The first halving occurred at Epoch 175 in August 2025 according to the docs.
- Computors vote by quorum on smart contract commission sizes, and that commission is burned.
- The Arbitrator is described as handling AI-task assignment and dispute-related functions, not controlling smart contracts or ordinary token distribution.

=== VERIFIED OFFICIAL SOURCE: https://docs.qubic.org/learn/upow/ ===
- Qubic describes UPoW as turning mining energy into useful outcomes by directing it toward artificial neural network work.
- The docs say miners generate ANNs with random structures, and Aigarth analyzes ANN properties.
- Qubic frames this as a way to combine network security, decentralization, and real-world computational utility.

=== VERIFIED OFFICIAL SOURCE: https://docs.qubic.org/learn/wallets/ ===
- Official wallets are described as open source.
- Official options listed include the Web Wallet, iOS wallet, and Android wallet.
- The docs also mention community-developed wallets and a hardware wallet option: HashWallet.
- Qubic wallets are described in two broad categories: direct network connected wallets and proxied wallets.
- Direct network wallets connect to at least three Qubic nodes directly.
- Proxied wallets depend on a proxy service to relay interactions with the network.

=== VERIFIED OFFICIAL SOURCE: https://docs.qubic.org/learn/invest/ ===
- The docs describe exchanges as the easiest and most common way to invest in Qubic.
- The official docs page listed exchanges including MEXC, Bitget, Gate.io, XT.COM, Bitpanda, Bit2Me, SafeTrade, TradeOgre, CoinEx, HIBT, AscendEX, and BitKan.
- The docs explicitly say readers should check qubic.org for the most up-to-date list.
- The docs say a Qubic wallet is needed to store QUBIC.
- The docs describe a seed as a 55-character lowercase string.
- The docs describe a Qubic ID as a 60-character string derived from the seed.
- The docs direct users to wallet.qubic.org for wallet interaction and mention mobile wallet options on iOS and Android.
- The docs reference explorer.qubic.org for additional network information.

=== VERIFIED OFFICIAL SOURCE: https://qubic.org/ ===
- The homepage describes Qubic as a high-performance Layer 1 blockchain with instant finality, feeless transactions, and fast smart contracts.
- The homepage frames Qubic as integrating artificial neural networks for the future of AGI.
- The homepage links directly to the official web wallet and the broader Qubic ecosystem.

=== VERIFIED OFFICIAL SOURCE: https://qubic.org/About ===
- The About page states that Qubic is validated as the fastest blockchain ever verified on mainnet at 15.5M TPS, certified by CertiK.
- The About page reiterates that smart contracts require a quorum vote before launch.
- It also describes Oracle Machines as a future bridge for trustworthy external data.
- The page emphasizes feeless transactions and positions Qubic as open source and experimental technology.

=== OFFICIAL LINKS TO USE WHERE RELEVANT ===
- Main site: https://qubic.org/
- Docs intro: https://docs.qubic.org/overview/introduction/
- Tokenomics: https://docs.qubic.org/learn/tokenomics/
- UPoW: https://docs.qubic.org/learn/upow/
- Wallets: https://docs.qubic.org/learn/wallets/
- Invest: https://docs.qubic.org/learn/invest/
- Web wallet: https://wallet.qubic.org/
- Explorer: https://explorer.qubic.org/
- About: https://qubic.org/About
- Performance: https://qubic.org/performance
- GitHub docs/org references appear throughout the official docs and site.
""".strip()


def parse_number(value: str):
    text = (value or "").strip()
    if not text:
        return None
    if "," in text and "." in text:
        text = text.replace(".", "").replace(",", ".")
    else:
        text = text.replace(",", "")
    try:
        return float(text)
    except ValueError:
        return None


def normalize_keyword(keyword: str) -> str:
    return re.sub(r"\s+", " ", (keyword or "").strip().lower())


def word_count(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text or ""))


def read_xlsx_rows(path: Path) -> list[dict]:
    with zipfile.ZipFile(path) as zf:
        shared_strings = []
        if "xl/sharedStrings.xml" in zf.namelist():
            shared_root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            shared_strings = [
                "".join(t.text or "" for t in si.findall(".//a:t", NS))
                for si in shared_root.findall("a:si", NS)
            ]

        workbook_root = ET.fromstring(zf.read("xl/workbook.xml"))
        rels_root = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
        rel_map = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels_root}
        first_sheet = next(iter(workbook_root.find("a:sheets", NS)))
        rel_id = first_sheet.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
        target = rel_map[rel_id]
        sheet_root = ET.fromstring(zf.read(f"xl/{target}"))
        rows = sheet_root.findall(".//a:sheetData/a:row", NS)

    def cell_text(cell) -> str:
        cell_type = cell.attrib.get("t")
        value_node = cell.find("a:v", NS)
        inline_node = cell.find("a:is", NS)
        text = ""
        if value_node is not None:
            text = value_node.text or ""
            if cell_type == "s" and text.isdigit():
                index = int(text)
                if 0 <= index < len(shared_strings):
                    text = shared_strings[index]
        if inline_node is not None:
            text = "".join(t.text or "" for t in inline_node.findall(".//a:t", NS))
        return text

    table = [[cell_text(cell) for cell in row.findall("a:c", NS)] for row in rows]
    if not table:
        return []
    headers = table[0]
    output = []
    for row in table[1:]:
        record = dict(zip(headers, row))
        if any(value for value in record.values()):
            output.append(record)
    return output


def compute_losses(rows: list[dict]) -> list[dict]:
    losses = []
    for record in rows:
        rank = parse_number(record.get("Rank", ""))
        prev_rank = parse_number(record.get("Prev. rank", ""))
        if rank is None or prev_rank is None or rank <= prev_rank:
            continue
        losses.append(
            {
                "keyword": record.get("Keyword", "").strip(),
                "rank": rank,
                "prev_rank": prev_rank,
                "rank_drop": rank - prev_rank,
                "searches": parse_number(record.get("Searches", "")) or 0,
                "traffic": parse_number(record.get("Traffic", "")) or 0,
                "seo_score": parse_number(record.get("SEO Score", "")) or 0,
                "landing_page": record.get("Landing Page", "").strip(),
            }
        )
    return losses


def select_topics(losses: list[dict]) -> list[dict]:
    selected = []
    for topic in TOPIC_CATALOG:
        wanted = {normalize_keyword(keyword) for keyword in topic["primary_keywords"]}
        matches = [loss for loss in losses if normalize_keyword(loss["keyword"]) in wanted]
        if not matches:
            continue
        selected.append(
            {
                **topic,
                "matched_keywords": matches,
                "cluster_searches": sum(item["searches"] for item in matches),
                "cluster_traffic": sum(item["traffic"] for item in matches),
                "cluster_seo_score": sum(item["seo_score"] for item in matches),
                "cluster_rank_drop": sum(item["rank_drop"] for item in matches),
            }
        )
    selected.sort(
        key=lambda item: (
            -item["cluster_seo_score"],
            -item["cluster_searches"],
            -item["cluster_rank_drop"],
        )
    )
    return selected[:3]


def topic_packet(topic: dict) -> str:
    loss_lines = []
    for item in topic["matched_keywords"]:
        loss_lines.append(
            f"- Keyword: {item['keyword']} | Current rank: {item['rank']} | Previous rank: {item['prev_rank']} | "
            f"Drop: {item['rank_drop']} | Searches: {item['searches']} | Traffic signal: {item['traffic']} | "
            f"SEO score: {item['seo_score']} | Current landing page: {item['landing_page']}"
        )
    return (
        f"Topic: {topic['topic_label']}\n"
        f"Primary keywords: {', '.join(topic['primary_keywords'])}\n"
        f"Cluster SEO score: {topic['cluster_seo_score']}\n"
        f"Cluster searches: {topic['cluster_searches']}\n"
        f"Cluster traffic signal: {topic['cluster_traffic']}\n"
        f"Cluster rank-drop sum: {topic['cluster_rank_drop']}\n"
        f"Ranking-loss evidence:\n" + "\n".join(loss_lines)
    )


def generate_first_draft(client: anthropic.Anthropic, topic: dict) -> str:
    system = (
        "You are a senior crypto editor and SEO content strategist writing for a serious audience. "
        "Write clean, deeply researched markdown articles that are genuinely useful, technically accurate, and easy to read. "
        "Use only the verified official context provided. Do not invent features, exchange listings, tokenomics, timelines, or ecosystem claims. "
        "Do not infer convenience or security features that are not explicitly in the source context. "
        "Use markdown headings, subheadings, bullets where helpful, and embed relevant official links in markdown format. "
        "Keep the tone authoritative and clear, not hype-driven or promotional."
    )
    user = (
        "We are creating a recovery blog to support lost-ranking search intent on qubic.org.\n\n"
        f"{topic_packet(topic)}\n\n"
        "Verified official Qubic research context:\n\n"
        f"{OFFICIAL_RESEARCH_CONTEXT}\n\n"
        "Article requirements:\n"
        "- Write a long-form article that lands between 3400 and 3800 words.\n"
        f"- Primary target keyword(s): {', '.join(topic['primary_keywords'])}.\n"
        "- Make the article stand on its own as the strongest resource on this intent.\n"
        "- Use a strong SEO title as the H1 and a compelling introduction that naturally includes the primary keyword.\n"
        "- Use H2 and H3 sections that match the reader's real questions.\n"
        "- Include practical explanations, setup steps where relevant, ecosystem context, and a short FAQ near the end.\n"
        "- Use only facts that are present in the verified context. If something is time-sensitive, phrase it carefully, such as 'the official docs list' or 'according to Qubic Docs'.\n"
        "- Include relevant official markdown links throughout the piece, especially to docs.qubic.org, qubic.org, wallet.qubic.org, and explorer.qubic.org where appropriate.\n"
        "- Do not add generic filler, fake statistics, or unsupported comparisons to competitors.\n"
        "- Do not add a financial-advice disclaimer unless it is genuinely necessary to explain the limits of the official buy/exchange information.\n\n"
        f"Specific angle for this article:\n{topic['brief']}\n\n"
        "Return markdown only."
    )
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8000,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return response.content[0].text


def fact_check_and_expand(client: anthropic.Anthropic, topic: dict, draft: str) -> str:
    system = (
        "You are a strict crypto fact-checker and editor. "
        "You must rewrite the article so that every concrete factual claim is explicitly supported by the verified context provided. "
        "If a claim is not directly supported, remove it or soften it into a generic statement that does not assert unsupported facts. "
        "Do not infer app security features, sync speed, seamless integrations, update cadence, wallet UX details, explorer feature lists, exchange/product behavior, governance beyond what is stated, regional availability, liquidity conditions, or future roadmap claims unless the verified context explicitly states them. "
        "Preserve markdown structure, make the article strong and readable, and ensure the final output lands between 3400 and 3800 words."
    )
    user = (
        f"{topic_packet(topic)}\n\n"
        "Verified official Qubic research context:\n\n"
        f"{OFFICIAL_RESEARCH_CONTEXT}\n\n"
        f"Current draft word count: {word_count(draft)}\n\n"
        "Tasks:\n"
        "- Remove or rewrite any unsupported concrete claim.\n"
        "- Expand the article to 3400-3800 words while staying fully grounded in the verified context.\n"
        "- Keep the piece useful, detailed, and SEO-strong.\n"
        "- Keep relevant official markdown links.\n"
        "- Add depth through explanation and structure, not through invented facts.\n\n"
        "Draft to verify and rewrite:\n\n"
        f"{draft}\n\n"
        "Return final markdown only."
    )
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8000,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return response.content[0].text


def finalize_blog(client: anthropic.Anthropic, topic: dict, article: str) -> str:
    system = (
        "You are a forensic editor preparing a final publication draft. "
        "Your job is to remove unsupported implications, compress or expand the article into the target range, and keep only sentences that can be directly mapped to the verified official context provided. "
        "If a sentence cannot be directly traced to the verified context, delete it or rewrite it into a clearly attributed statement such as 'According to Qubic Docs' or 'The About page states'. "
        "Do not imply wallet features, explorer capabilities, market conditions, roadmap promises, governance mechanics beyond what is stated, performance side-effects, UX details, security guarantees, exchange workflows, or benefits that are not explicitly described in the verified context. "
        "If the article is too long, cut speculative or repetitive sections first. If it is too short, add depth only by clarifying facts already present in the verified context, even if that means using cautious repeated attribution. "
        "Return polished markdown between 3300 and 3700 words."
    )
    user = (
        f"{topic_packet(topic)}\n\n"
        "Verified official Qubic research context:\n\n"
        f"{OFFICIAL_RESEARCH_CONTEXT}\n\n"
        f"Current article word count: {word_count(article)}\n\n"
        "Hard cleanup rules:\n"
        "- Every paragraph must be grounded in the verified context. If unsure, delete or rewrite conservatively.\n"
        "- Prefer explicit attribution phrases like 'According to the docs', 'The wallet documentation says', or 'The About page states'.\n"
        "- Remove unsupported phrases like 'maximum security', 'simplified user experience', 'regular updates', 'faster user experiences', detailed explorer feature claims, region-specific availability, payment-method assumptions, or speculative future integrations unless the verified context directly says them.\n"
        "- Avoid specific claims about wallet responsiveness, exchange registration flows, market liquidity, planned roadmap items, detailed governance processes, or extra security advice beyond protecting the seed and using official resources unless directly supported.\n"
        "- Keep official links where relevant.\n"
        "- Keep the article authoritative, useful, and SEO-strong.\n"
        "- Final target: 3300-3700 words.\n\n"
        "Article to normalize:\n\n"
        f"{article}\n\n"
        "Return final markdown only."
    )
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8000,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return response.content[0].text


def generate_blog(topic: dict) -> str:
    client = anthropic.Anthropic()
    existing_path = OUTPUT_DIR / topic["filename"]
    if existing_path.exists():
        reviewed = existing_path.read_text(encoding="utf-8")
    else:
        draft = generate_first_draft(client, topic)
        reviewed = fact_check_and_expand(client, topic, draft)
        if word_count(reviewed) < 3200:
            reviewed = fact_check_and_expand(client, topic, reviewed)
    final = finalize_blog(client, topic, reviewed)
    if word_count(final) < 3200 or word_count(final) > 3900:
        final = finalize_blog(client, topic, final)
    return final


def main():
    if not XLSX_PATH.exists():
        raise FileNotFoundError(f"Missing ranking export: {XLSX_PATH}")

    rows = read_xlsx_rows(XLSX_PATH)
    losses = compute_losses(rows)
    topics = select_topics(losses)
    if len(topics) < 3:
        raise RuntimeError(f"Expected at least 3 eligible topic clusters, found {len(topics)}")

    manifest = {
        "source_file": str(XLSX_PATH),
        "selected_topics": topics,
        "all_losses": losses,
    }
    (OUTPUT_DIR / "selected_keyword_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (OUTPUT_DIR / "official_research_context.txt").write_text(OFFICIAL_RESEARCH_CONTEXT, encoding="utf-8")

    for index, topic in enumerate(topics, start=1):
        print(f"[{index}/{len(topics)}] Generating {topic['title']}")
        article = generate_blog(topic)
        out_path = OUTPUT_DIR / topic["filename"]
        out_path.write_text(article, encoding="utf-8")
        print(f"  Saved -> {out_path} ({word_count(article)} words)")

    print(f"Done. Blogs generated in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
