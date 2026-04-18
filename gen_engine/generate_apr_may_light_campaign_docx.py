from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.sax.saxutils import escape
from datetime import datetime, timezone

ROOT = Path(r"c:\=projects\int\text")
OUT = ROOT / "outputs" / "campaign_playbooks" / "apr_may_2026_light_structural_web"
OUT.mkdir(parents=True, exist_ok=True)
C, B, G = "00FFFF", "000000", "555555"


def run(text, color=B, size=22, bold=False, italic=False):
    t = escape(str(text))
    rpr = (
        f'<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>'
        f'<w:color w:val="{color}"/><w:sz w:val="{size}"/><w:szCs w:val="{size}"/>'
    )
    if bold:
        rpr += "<w:b/>"
    if italic:
        rpr += "<w:i/>"
    return f'<w:r><w:rPr>{rpr}</w:rPr><w:t xml:space="preserve">{t}</w:t></w:r>'


def para(text, kind="body"):
    styles = {
        "title": (C, 32, True, False, 80, 260),
        "sub": (G, 22, False, True, 0, 220),
        "h": (C, 24, True, False, 240, 100),
        "body": (B, 22, False, False, 0, 120),
        "ph": (C, 23, True, False, 200, 60),
        "pt": (B, 23, True, False, 20, 40),
        "pb": ("333333", 21, False, False, 0, 90),
        "upd_h": (G, 22, True, True, 180, 60),
        "upd": (G, 21, False, True, 0, 80),
        "closing": (G, 21, False, False, 140, 0),
        "research": ("333333", 21, False, False, 0, 70),
    }
    color, sz, bd, it, bef, aft = styles.get(kind, styles["body"])
    r = run(text, color, sz, bd, it)
    return f'<w:p><w:pPr><w:spacing w:before="{bef}" w:after="{aft}"/></w:pPr>{r}</w:p>'


def render(sections):
    out = []
    for kind, text in sections:
        if kind in ("pb", "upd", "research"):
            for ln in str(text).strip().split("\n"):
                ln = ln.strip()
                if ln:
                    out.append(para(ln, kind))
        else:
            out.append(para(text, kind))
    return "".join(out)


def doc_xml(sections):
    body = render(sections)
    sect = (
        '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>'
        '<w:pgMar w:top="1080" w:right="900" w:bottom="1080" w:left="900" '
        'w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>'
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f'<w:body>{body}{sect}</w:body></w:document>'
    )


CT = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>'
RL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'
AP = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Office Word</Application></Properties>'


def core(title):
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
        'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" '
        'xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
        f'<dc:title>{escape(title)}</dc:title><dc:creator>Cascade</dc:creator>'
        f'<dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>'
        f'<dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified></cp:coreProperties>'
    )


def save(path, title, sections):
    with ZipFile(path, "w", ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CT)
        z.writestr("_rels/.rels", RL)
        z.writestr("word/document.xml", doc_xml(sections))
        z.writestr("docProps/core.xml", core(title))
        z.writestr("docProps/app.xml", AP)


def tm1():
    return [
        ("title", "TM1 - The DOGE Insider | Light Structural Web Playbook"),
        ("sub", "r/dogecoin | r/dogemining | April 13 - May 7"),
        ("h", "Role"),
        ("body", "You mine DOGE and care about actual machine economics. You already have credibility in DOGE-adjacent mining talk. Qubic is not your whole personality. It comes up only when it's genuinely relevant to L3+/Scrypt operator decisions."),
        ("h", "Strategy"),
        ("body", "7 posts total. 5 are pure DOGE/miner/community value. 2 mention Qubic as one mining alternative. Keep it lighter than April: less campaign energy, more standalone miner questions, more practical operations talk. Never sound coordinated, never push a conclusion."),
        ("h", "Research Spine"),
        ("research", "- Dogecoin explorer: network hashrate, difficulty, block stats\n- Current L3+/L7 economics and electricity math\n- Major DOGE pool fees, payout methods, uptime\n- Dogecoin Core / dev updates where relevant\n- Qubic mining docs only for the 2 relevant posts: qubic.org/mining and docs.qubic.org\n- Community sentiment from current r/dogecoin and r/dogemining threads"),
        ("ph", "POST 1  r/dogemining | April 13 [GENERAL]"),
        ("pt", "anyone still running L3+ boxes at these power rates"),
        ("pb", "my power isn't insane but it's not cheap either and straight doge margins feel thinner every month\ncurious what people are actually doing now. still running old L3+ units? underclocking? just eating the loss and hoping price bails you out later?\nnot looking for hopium, just trying to get a feel for what other small operators are doing in 2026"),
        ("upd_h", "BETWEEN - April 13 to 14"),
        ("upd", "General miner discussion. Ask follow-up questions. Talk honestly about machine age, downtime, and power cost. No Qubic mention unless somebody else brings it up first."),
        ("ph", "POST 2  r/dogecoin | April 16 [GENERAL]"),
        ("pt", "what pool changes actually moved the needle for you"),
        ("pb", "been seeing people argue about pool fees like they're the whole game but for me stale shares and payout consistency mattered more\nfor people who've switched pools this year, what actually improved? lower variance? fewer disconnects? or was it mostly placebo\ntrying to separate stuff that sounds smart from stuff that actually changed your daily numbers"),
        ("upd_h", "BETWEEN - April 16 to 17"),
        ("upd", "This is pool operations talk. Keep it practical. If somebody asks what you run, answer plainly. Do not angle the thread toward any side topic."),
        ("ph", "POST 3  r/dogemining | April 20 [QUBIC]"),
        ("pt", "tested one L3+ on qubic for a bit, mostly sharing rough ops notes"),
        ("pb", "i put one older unit on qubic mainly because i was already tired of watching straight doge margins wobble around\nnot doing a grand review here. power draw looked basically normal, temps were normal, setup wasn't nearly as bad as i expected. payout side still needs longer to judge cleanly\nposting mostly to see if anyone else here has recent numbers or setup notes. not trying to sell anyone on it, just comparing alternatives"),
        ("upd_h", "BETWEEN - April 20 to 21"),
        ("upd", "If asked for setup details, share qubic.org/mining in a reply only. If challenged, say sample size is small and you're still testing. Stay calm and non-defensive."),
        ("ph", "POST 4  r/dogecoin | April 24 [GENERAL]"),
        ("pt", "is mining software paranoia actually healthy at this point"),
        ("pb", "every time somebody posts a new tool or config half the comments say don't touch it and the other half are already running it on a whole rack\ni'm probably too cautious but i've been burned before. curious what your actual process is before letting new software anywhere near a machine you care about\n1 test box? sandbox? just vibes?"),
        ("upd_h", "BETWEEN - April 24 to 25"),
        ("upd", "Pure community trust-and-safety discussion. This helps establish you as a real operator, not someone tracking one project."),
        ("ph", "POST 5  r/dogemining | April 28 [GENERAL]"),
        ("pt", "what's the most misleading number miners obsess over"),
        ("pb", "feels like people fixate on one clean number because it's easier than dealing with the messy reality\nrevenue screenshots without power cost, fee talk without uptime talk, hashrate without reject rate, all of it\nif you had to pick one metric newer miners misunderstand the most, what would it be"),
        ("upd_h", "BETWEEN - April 28 to 29"),
        ("upd", "Lean into general miner education. This supports SEO/useful-info goals without looking like a sequence."),
        ("ph", "POST 6  r/dogecoin | May 3 [GENERAL]"),
        ("pt", "doge mining discussion feels weirdly split between hobbyists and spreadsheet people"),
        ("pb", "half the threads i read are basically vibes and memes, the other half look like a tax worksheet with fans attached\nnot even complaining, just funny how different the same community can be depending on who's posting\nwhich side are you on now? still in it because you enjoy it or purely because the numbers still justify turning the boxes on"),
        ("upd_h", "BETWEEN - May 3 to 4"),
        ("upd", "General DOGE miner culture thread. No redirection. Just community texture."),
        ("ph", "POST 7  r/dogemining | May 7 [QUBIC]"),
        ("pt", "month-ish later, qubic looked more like an alternative lane than a miracle"),
        ("pb", "follow-up in case anyone remembers i was testing one L3+ on qubic. rough conclusion: not magic, not obviously fake from the machine side either\nif you're expecting some life-changing difference you'll probably be disappointed. if you're just looking at one more way to keep older hardware doing something, it's at least worth understanding\nthat said i still think most miners should compare it against their own power rate and not copy somebody else's screenshots"),
        ("h", "If People Push Back"),
        ("body", "If accused of shilling, point to the general DOGE/miner posts and keep your answer short. If accused of bad methodology, agree the test is rough. You are a miner comparing options, not a spokesperson."),
        ("closing", "Structural web role: you anchor the DOGE mining lane with practical operator talk. Qubic only appears where a real miner would actually compare alternatives."),
    ]


def tm1b():
    return [
        ("title", "TM1B - The DOGE Advocate | Light Structural Web Playbook"),
        ("sub", "r/dogecoin | r/dogecoindev | r/dogeducation | April 14 - May 8"),
        ("h", "Role"),
        ("body", "You are DOGE-community native, not a miner. You care about adoption, culture, network health, and what miner chatter means for regular holders. Your tone is warmer and less hardware-focused than TM1."),
        ("h", "Strategy"),
        ("body", "7 posts total. 5 are pure DOGE community/adoption questions. 2 mention Qubic only as something you noticed miners discussing. Keep it lighter than April and safer than overt launch-energy content. You are learning in public, not teaching from authority."),
        ("h", "Research Spine"),
        ("research", "- Current DOGE community discussions and development threads\n- Dogecoin Core / dogecoindev activity\n- Merchant/tipping/adoption examples that are actually current\n- Miner-vs-holder discussion threads\n- Qubic references only where miners are already discussing it\n- Broader DOGE network-health and fee/use-case discussions"),
        ("ph", "POST 1  r/dogecoin | April 14 [GENERAL]"),
        ("pt", "when miner discourse gets loud, should regular doge holders actually care"),
        ("pb", "asking as somebody who holds doge and does not own a single piece of mining hardware\nwhenever miner talk gets intense i never know if it's background noise or something that actually matters for the network long-term\nwhat kinds of miner issues should normal holders pay attention to and what stuff is basically inside baseball"),
        ("upd_h", "BETWEEN - April 14 to 15"),
        ("upd", "Ask follow-up questions. Stay in the holder lane. Let miners explain things. No Qubic mention unless somebody else raises it."),
        ("ph", "POST 2  r/dogecoindev | April 18 [GENERAL]"),
        ("pt", "where do you actually follow doge development if you are not a dev"),
        ("pb", "honest question. i see memes and price talk constantly but real protocol/dev updates are harder to follow unless you already know where to look\nif someone wanted to be a more informed doge holder without pretending to be an engineer, what should they actually read or watch\ntrying to get better at separating real network progress from recycled twitter noise"),
        ("upd_h", "BETWEEN - April 18 to 19"),
        ("upd", "Pure DOGE development-awareness thread. Learn from the replies. This builds non-miner credibility."),
        ("ph", "POST 3  r/dogecoin | April 22 [QUBIC]"),
        ("pt", "can someone explain why doge miners keep bringing up qubic lately"),
        ("pb", "this is one of those things where i keep seeing it in mining threads and i'm aware i probably missed the original explanation\ni don't mine so i'm not asking from an operator angle. i'm asking from a network/community angle: is this just a side profitability thing for miners or does it have broader relevance for doge\nwould appreciate the simplest version possible because the hardware posts lose me fast"),
        ("upd_h", "BETWEEN - April 22 to 23"),
        ("upd", "Stay genuinely curious. If someone explains it well, thank them. Do not become the explainer yourself."),
        ("ph", "POST 4  r/dogeducation | April 26 [GENERAL]"),
        ("pt", "what keeps people in doge besides price"),
        ("pb", "price obviously gets the attention but it doesn't explain why people stick around through every weird cycle\nfor me it's mostly the culture and the fact that the community still feels more human than a lot of crypto spaces\ncurious what keeps other people here if you strip price out of the conversation entirely"),
        ("upd_h", "BETWEEN - April 26 to 27"),
        ("upd", "Community-value thread. Let people talk about culture, tipping, humor, onboarding, longevity."),
        ("ph", "POST 5  r/dogecoin | April 30 [GENERAL]"),
        ("pt", "holder question: do miner economics eventually show up as community mood"),
        ("pb", "not saying price follows miner feelings or anything that neat. i just notice the whole vibe shifts when miners are miserable\nmaybe i'm imagining it but it feels like network confidence and community mood are more connected than people admit\nfor people who've been around longer, do you notice that too or am i pattern-matching nonsense"),
        ("upd_h", "BETWEEN - April 30 to May 1"),
        ("upd", "General culture question. Keep it soft and observational."),
        ("ph", "POST 6  r/dogecoindev | May 4 [GENERAL]"),
        ("pt", "what doge question do newcomers keep asking that deserves a better answer"),
        ("pb", "feels like the same 5 questions come up forever and the answers people get depend entirely on who happens to reply first\nif you could pin one actually useful explanation for newcomers, what would it be\ntrying to get better at pointing curious friends toward the stuff that matters instead of just sending them memes and hoping for the best"),
        ("upd_h", "BETWEEN - May 4 to 5"),
        ("upd", "Useful-info/community thread. Great for surfacing FAQ-style language organically."),
        ("ph", "POST 7  r/dogecoin | May 8 [QUBIC]"),
        ("pt", "did the miner-side qubic discussion end up mattering or was it just a moment"),
        ("pb", "asking because a few weeks ago it felt like every miner thread had somebody bringing it up and now it seems quieter\nmaybe that just means it normalized, maybe it means it didn't stick, idk\nif you're actually running it or watching it closely, what's the fairest short version now from a doge-community perspective"),
        ("h", "If People Push Back"),
        ("body", "If someone says you don't know enough about mining, agree and stay in the holder lane. If accused of steering conversation, point to the fact that most of your posts are plain DOGE community questions."),
        ("closing", "Structural web role: you keep the DOGE lane human and community-centered, with occasional miner-adjacent curiosity instead of technical advocacy."),
    ]


def tm2():
    return [
        ("title", "TM2 - The Crypto Analyst | Light Structural Web Playbook"),
        ("sub", "r/CryptoCurrency | r/CryptoTechnology | r/qubic | April 14 - May 8"),
        ("h", "Role"),
        ("body", "You track crypto infrastructure claims with a challenge-first mindset. You care about what's real, measurable, and worth understanding. Qubic is one data point in a wider landscape, not the axis of your account."),
        ("h", "Strategy"),
        ("body", "7 posts total. 5 are broad infrastructure, verification, and methodology threads. 2 are Qubic-related but only from an analyst perspective. No launch theater, no update chains, no ranking language."),
        ("h", "Research Spine"),
        ("research", "- Official Qubic docs: intro, tokenomics, UPoW, wallets, performance pages\n- DOGE mining/operator reports only where independently cross-checked\n- TPS methodology discussions and audit framing\n- Useful Proof of Work literature and critiques\n- Feeless / quorum / bare-metal comparison points\n- Other infrastructure examples to avoid looking single-project obsessed"),
        ("ph", "POST 1  r/CryptoTechnology | April 14 [GENERAL]"),
        ("pt", "what makes a throughput claim worth taking seriously now"),
        ("pb", "feels like everyone knows raw TPS screenshots are mostly theater at this point but the replacement standard is still fuzzy\nwhat would actually make you take a throughput claim seriously now? third-party audit on mainnet? methodology disclosure? sustained live usage under bad conditions?\ncurious what the bare minimum credibility bar is for technical people here"),
        ("upd_h", "BETWEEN - April 14 to 15"),
        ("upd", "General methodology discussion. Do not steer toward Qubic unless someone else names it."),
        ("ph", "POST 2  r/CryptoCurrency | April 17 [GENERAL]"),
        ("pt", "which crypto narrative is hardest to verify independently"),
        ("pb", "some claims are annoying but checkable. others sound impressive and are basically impossible to evaluate without deep internal visibility\nai + crypto might be the biggest one right now because you can verify activity and operator payouts way more easily than you can verify whether the compute is genuinely useful\nwhat narrative category do you think has the biggest verification gap"),
        ("upd_h", "BETWEEN - April 17 to 18"),
        ("upd", "General analyst/skeptic discussion. Let multiple examples come in. This sets up your broader lens."),
        ("ph", "POST 3  r/qubic | April 20 [QUBIC]"),
        ("pt", "qubic doge pool: 13 days of actual data vs early expectations"),
        ("pb", "been tracking the new doge pool since april 1st launch. day 13 metrics from qubic.org: rank #20, 3.5 TH/s, 14 blocks found, epoch 208 at 16h uptime with 13/16 peers connected.\n\npool share grew from 0.121% to 3.07%. avg block interval sitting at 15h 53m all-time. solutions accepted in epoch 208: 188,973.\n\ncompared to early projections, the hashrate growth looks incremental rather than explosive. what's more interesting to me is whether this represents real traction or just initial curiosity from existing qubic operators trying the new option.\n\nanyone else watching the actual on-chain data? what metrics would you want to see at the 2-week mark to judge whether a new pool is actually gaining traction vs just attracting initial experimentation? docs at qubic.org/mining and blog.qubic.org have the setup details but i'm more curious about operator-side reality checks."),
        ("upd_h", "BETWEEN - April 20 to 21"),
        ("upd", "Use real metrics from qubic.org. If challenged on sources, link directly to pool stats. Stay analytical, not promotional."),
        ("ph", "POST 4  r/CryptoTechnology | April 23 [QUBIC]"),
        ("pt", "qubic is interesting to me for one reason: some parts are easy to falsify and some aren't"),
        ("pb", "what caught my attention with qubic wasn't hype, it was that the operator side and the architecture claims sit in very different buckets\noperator-side stuff like uptime, setup friction, hashrate stability, and whether miners say economics improved is relatively checkable. the harder part is whether the useful-compute thesis is independently validated in a meaningful way\nthat split makes it a more interesting case study than the average everything-chain claim\n\nfor the doge pool specifically, the data is all on qubic.org: 2.82 TH/s network hashrate, pool at 3.5 TH/s, 14 blocks mined. you can verify it yourself rather than trust someone's summary."),
        ("upd_h", "BETWEEN - April 23 to 24"),
        ("upd", "If challenged, narrow the claim. You're not endorsing the project. You're pointing out why some evidence categories are stronger than others."),
        ("ph", "POST 5  r/CryptoCurrency | April 27 [GENERAL]"),
        ("pt", "useful proof of work sounds good on paper, where does it usually break"),
        ("pb", "i get why people like the idea. redirect energy from pure hashing toward something society can point at and say that had value\nbut every time i look closer the weak spot is either verifiability, incentives, or quality measurement\nfor people who've looked at this category longer, where does useful proof of work usually fail in practice"),
        ("upd_h", "BETWEEN - April 27 to 28"),
        ("upd", "Pure category discussion. Engage across multiple projects/examples."),
        ("ph", "POST 6  r/CryptoTechnology | May 3 [GENERAL]"),
        ("pt", "bare metal, feeless, quorum systems - which one actually changes user reality"),
        ("pb", "crypto architecture conversations love stacking technical differentiators like the list itself proves value\nbut from an end-user or developer reality standpoint, which categories actually change outcomes and which mostly stay whitepaper-deep\nasking because a lot of networks now have at least one genuinely unusual architectural choice and most people still use them in very ordinary ways"),
        ("upd_h", "BETWEEN - May 3 to 4"),
        ("upd", "General technical differentiation thread. No ranking claims."),
        ("ph", "POST 7  r/CryptoCurrency | May 8 [GENERAL]"),
        ("pt", "what's your actual process for moving from skeptic to tentative credibility"),
        ("pb", "not even talking about one project here. more the process\nwhat usually has to happen for you to move from 'sounds like nonsense' to 'ok, maybe this is worth tracking'\nfor me it's usually when at least one part of the system becomes independently inspectable and keeps holding up under hostile discussion. curious what other people's threshold is"),
        ("h", "If People Push Back"),
        ("body", "If accused of subtle promotion, point to your broader infrastructure/methodology threads and tighten the claim further. Your job is to pressure-test, not to convert."),
        ("closing", "Structural web role: you supply the challenge-first credibility lane that makes the overall campaign feel less coordinated and more evidence-driven."),
    ]


def tm3():
    return [
        ("title", "TM3 - The PoW Bridge | Light Structural Web Playbook"),
        ("sub", "r/litecoin | r/EtherMining | r/Futurology | r/Monero | April 15 - May 10"),
        ("h", "Role"),
        ("body", "You move between PoW, hardware, and future-tech communities. Your strength is asking each community the question it is best suited to answer. Qubic appears as one example in a broader mining/compute conversation."),
        ("h", "Strategy"),
        ("body", "7 posts total. 5 general cross-community mining/compute questions. 2 Qubic-adjacent posts, both framed as one example rather than the point of the thread. Never argue with a community that says something is irrelevant."),
        ("h", "Research Spine"),
        ("research", "- LTC/Scrypt miner economics and community sentiment\n- Post-merge GPU usage alternatives\n- Monero/community lessons about compute-network risk and resilience\n- Futurology discussions around productive compute and repurposing hardware\n- Qubic docs only where specifically relevant\n- Cross-community phrasing differences so each sub gets a native question"),
        ("ph", "POST 1  r/litecoin | April 15 [GENERAL]"),
        ("pt", "for scrypt operators, what still makes litecoin worth keeping in the mix"),
        ("pb", "i'm asking less from a tribal angle and more from an operator angle\nif you're still keeping scrypt hardware pointed in the LTC/DOGE world, what still makes it worth the attention now? stability? simplicity? habit? better than the alternatives?\ncurious what actual miners say when the conversation isn't just price"),
        ("upd_h", "BETWEEN - April 15 to 16"),
        ("upd", "Keep this native to the Litecoin/Scrypt community. No detours."),
        ("ph", "POST 2  r/Futurology | April 19 [GENERAL]"),
        ("pt", "is repurposing old compute hardware for useful work mostly wishful thinking"),
        ("pb", "millions of machines exist because one incentive made sense at one point. then the environment changes and suddenly we've got massive idle or underused compute everywhere\nit seems obvious to ask whether some of that can be redirected toward something socially useful, but the execution gap looks huge\nis this actually a plausible direction over the next few years or mostly a good story people like to tell"),
        ("upd_h", "BETWEEN - April 19 to 20"),
        ("upd", "Broad concept discussion. No project anchoring."),
        ("ph", "POST 3  r/EtherMining | April 23 [GENERAL]"),
        ("pt", "what's the least bad thing you've done with post-merge GPU hardware"),
        ("pb", "not asking what the best magical option is because if that existed everyone would already be doing it\nmore asking what turned out to be the least stupid use of hardware after the merge. alt mining, render work, local AI experiments, folding, resale, whatever\ncurious what actually felt worth the time versus what just sounded clever for a week"),
        ("upd_h", "BETWEEN - April 23 to 24"),
        ("upd", "General GPU-after-merge thread. Let people bring their own alternatives."),
        ("ph", "POST 4  r/Monero | April 28 [GENERAL]"),
        ("pt", "what should other mining communities learn from monero's paranoia"),
        ("pb", "saying paranoia with respect tbh. monero communities tend to think harder than most about what outside incentives do to miners and network behavior\nfor people who spend time around that ecosystem, what lessons do you think other mining communities miss until it's too late\nasking because more weird compute-network ideas keep showing up and a lot of other communities are way less skeptical by default"),
        ("upd_h", "BETWEEN - April 28 to 29"),
        ("upd", "Listen carefully. This thread is about Monero's community lens, not about steering them elsewhere."),
        ("ph", "POST 5  r/litecoin | May 2 [QUBIC]"),
        ("pt", "has anyone in the litecoin/scrypt world spent real time with qubic yet"),
        ("pb", "i keep seeing qubic come up from the DOGE side and i'm curious whether anybody on the Litecoin side has actually tested it seriously\nnot asking for marketing copy, just operator-side impressions: setup friction, stability, whether it felt worth continuing, whether the useful-compute framing mattered at all to you\nfigured if anyone had a grounded take it'd be people already living in Scrypt land"),
        ("upd_h", "BETWEEN - May 2 to 3"),
        ("upd", "If the community is uninterested, accept it and move on. If they share experience, ask practical follow-ups."),
        ("ph", "POST 6  r/Futurology | May 6 [QUBIC]"),
        ("pt", "qubic caught my eye less as crypto and more as a test of whether useful compute narratives can survive scrutiny"),
        ("pb", "the thing i find interesting isn't 'will this coin go up' or any of that\nit's whether projects like qubic can survive once you force them into two separate questions: do operators have a reason to participate, and is the compute output actually meaningful\nthose are different standards and a lot of projects blur them together. that's why i'm still watching this category"),
        ("upd_h", "BETWEEN - May 6 to 7"),
        ("upd", "Concept-first, not promo-first. If anyone asks for docs, share them quietly in reply."),
        ("ph", "POST 7  r/EtherMining | May 10 [GENERAL]"),
        ("pt", "miners are weirdly good at spotting fake opportunities faster than most crypto people"),
        ("pb", "maybe because if you actually run hardware the lies hit your wallet and your electricity bill immediately\nfeels like mining communities are usually faster than token communities at separating an interesting experiment from total nonsense\ndo you think that's true or am i just biased because operator communities tend to be more practical"),
        ("h", "If People Push Back"),
        ("body", "If a sub says a topic isn't relevant, say fair enough and stop. That response is part of the data. You're a bridge account, not a missionary."),
        ("closing", "Structural web role: you connect Scrypt, GPU, and future-tech discussions without forcing direct campaign links between them."),
    ]


def tm6():
    return [
        ("title", "TM6 - The AI Compute Amplifier | Light Structural Web Playbook"),
        ("sub", "r/compsci | r/artificial | r/LocalLLaMA | r/singularity | April 16 - May 10"),
        ("h", "Role"),
        ("body", "You are an AI/compute infrastructure person first. You do not care about token prices. Crypto only matters to you when it intersects with distributed compute, training quality, and access to hardware."),
        ("h", "Strategy"),
        ("body", "7 posts total. 5 general compute/AI bottleneck questions. 2 Qubic-related posts as case-study style prompts. Keep the tone technical, curious, and self-limiting. If a sub rejects crypto-adjacent framing, back off immediately."),
        ("h", "Research Spine"),
        ("research", "- Distributed training coordination limits\n- Consumer hardware heterogeneity problems\n- Local inference vs training bottlenecks\n- AI compute concentration and access issues\n- Qubic UPoW docs for the 2 relevant posts\n- Community skepticism patterns in r/compsci, r/artificial, r/LocalLLaMA, and r/singularity"),
        ("ph", "POST 1  r/compsci | April 16 [GENERAL]"),
        ("pt", "what part of distributed training gets hand-waved the most in online discussions"),
        ("pb", "every time people talk about distributed training outside actual infra circles it feels like one crucial problem is being silently ignored\ncoordination overhead, bandwidth, heterogeneous hardware, fault tolerance, data locality, something\nif you had to pick the thing people underestimate most when they imagine training across messy real-world machines, what would it be"),
        ("upd_h", "BETWEEN - April 16 to 17"),
        ("upd", "Pure CS discussion. No project examples unless somebody else introduces one."),
        ("ph", "POST 2  r/artificial | April 20 [GENERAL]"),
        ("pt", "is compute access becoming a bigger bottleneck than ideas"),
        ("pb", "obviously ideas still matter but the gap between groups with serious compute and groups without it feels like it's shaping the entire field now\nstartups, independent researchers, smaller labs - all competing in a world where the compute stack is increasingly concentrated\nis that the real bottleneck now or am i overstating it"),
        ("upd_h", "BETWEEN - April 20 to 21"),
        ("upd", "General AI scaling discussion. Stay out of crypto framing entirely here."),
        ("ph", "POST 3  r/LocalLLaMA | April 24 [GENERAL]"),
        ("pt", "local inference got democratized faster than training ever will, right"),
        ("pb", "running models locally has become normal enough that people forget how insanely centralized the training side still is\ncurious whether people think there is any realistic path to training becoming meaningfully more distributed or whether that's mostly fantasy outside very specific niches\nnot asking because of one project, just because the gap between inference access and training access seems huge"),
        ("upd_h", "BETWEEN - April 24 to 25"),
        ("upd", "Training-vs-inference concept thread. Stay abstract and grounded."),
        ("ph", "POST 4  r/compsci | April 29 [QUBIC]"),
        ("pt", "qubic is interesting to me less as crypto and more as a verification problem"),
        ("pb", "what i find technically interesting about qubic isn't the market side, it's the claim structure\noperator-side evidence is one thing: stability, participation, throughput, economics. the harder question is whether routing this kind of hardware toward useful work produces output that meaningfully matters\nprojects in this category live or die on whether they can separate those two questions honestly"),
        ("upd_h", "BETWEEN - April 29 to 30"),
        ("upd", "If someone says take crypto elsewhere, say fair enough and keep the conversation on verification problems. If that still annoys them, drop it."),
        ("ph", "POST 5  r/singularity | May 3 [GENERAL]"),
        ("pt", "everyone talks about AGI timelines, hardly anyone talks about compute gatekeeping"),
        ("pb", "feels like a lot of future-of-ai discourse assumes the main question is algorithmic progress or timelines\nbut if compute access stays concentrated in a tiny set of players, isn't that bottleneck just as important as the model breakthroughs themselves\ncurious how people here think about centralization of compute versus centralization of ideas"),
        ("upd_h", "BETWEEN - May 3 to 4"),
        ("upd", "General future-of-AI thread. Zero product pushing."),
        ("ph", "POST 6  r/artificial | May 7 [QUBIC]"),
        ("pt", "month later, qubic still reads to me like an unresolved compute-access experiment"),
        ("pb", "still think the interesting part of qubic is not whether operators can be incentivized to participate. that seems easier to demonstrate\nwhat remains interesting is whether the useful-work side holds up once people outside the project try to interrogate quality and significance\nif that part matures, it's a meaningful compute-access story. if not, it's mostly an incentive wrapper around familiar hardware behavior"),
        ("upd_h", "BETWEEN - May 7 to 8"),
        ("upd", "Stay analytical. No conclusion beyond what the evidence supports."),
        ("ph", "POST 7  r/LocalLLaMA | May 10 [GENERAL]"),
        ("pt", "what's the most realistic non-datacenter contribution ordinary hardware can make to AI"),
        ("pb", "not asking what sounds coolest, asking what's actually realistic\ninference serving? fine-tuning? data generation? benchmarking? some weird distributed niche nobody talks about enough?\ncurious where people think everyday hardware can genuinely matter without turning into a hand-wavey democratization slogan"),
        ("h", "If People Push Back"),
        ("body", "If a thread turns hostile to crypto framing, narrow the claim or leave. In these communities, restraint is more credible than persistence."),
        ("closing", "Structural web role: you make the campaign feel bigger than crypto by anchoring it in the compute-access and verification conversation."),
    ]


def tm7():
    return [
        ("title", "TM7 - The Hardware Owner | Light Structural Web Playbook"),
        ("sub", "r/nvidia | r/ASIC | r/buildapc | r/gpumining | r/hardware | r/qubic | April 14 - May 9"),
        ("h", "Role"),
        ("body", "You are a hardware owner first. Idle GPUs, old ASICs, heat, noise, power, depreciation. Qubic is one thing you tried while dealing with that problem, not the reason you post."),
        ("h", "Strategy"),
        ("body", "7 posts total. 5 general hardware-utilization/frustration posts. 2 Qubic-adjacent posts where the problem naturally points there. Never lead with crypto in the title. Always lead with hardware use, waste, cost, or noise."),
        ("h", "Research Spine"),
        ("research", "- Current GPU and ASIC idle-use discussions\n- Power draw, heat, undervolting, and wear considerations\n- Post-merge GPU utilization ideas\n- Buildapc and hardware community norms\n- Qubic mining setup docs only for the 2 relevant posts\n- Competing alternatives like rendering, local AI, folding, resale, and shutting machines down"),
        ("ph", "POST 1  r/nvidia | April 14 [GENERAL]"),
        ("pt", "anyone else irrationally annoyed by expensive hardware sitting idle most of the day"),
        ("pb", "this isn't even really about making money. it just bugs me when expensive hardware turns into decorative heating\ngpu gets used for a couple hours, then nothing. same story with older boxes and parts i keep around because i swear i'll find a use for them\nwhat are people actually doing with idle hardware now besides pretending they'll sell it next weekend"),
        ("upd_h", "BETWEEN - April 14 to 15"),
        ("upd", "General hardware frustration thread. Let people suggest anything from resale to local AI to just accepting reality."),
        ("ph", "POST 2  r/buildapc | April 17 [GENERAL]"),
        ("pt", "what overnight workload doesn't make you regret owning the machine by morning"),
        ("pb", "i keep liking the idea of giving my PC something useful to do overnight and then hating every option when i actually try it\nnoise, heat, instability, software weirdness, tiny upside, all of it\ncurious what people here have actually stuck with longer than a week"),
        ("upd_h", "BETWEEN - April 17 to 18"),
        ("upd", "This is broad utility talk, not a setup thread for anything specific."),
        ("ph", "POST 3  r/qubic | April 20 [QUBIC]"),
        ("pt", "L3+ on qubic doge pool: actual week 2 numbers from a hardware owner"),
        ("pb", "moved one L3+ over on april 1st to see what would happen. 13 days in, here's what i'm seeing based on qubic.org pool stats:\n\nrank #20 with 3.5 TH/s, 14 blocks found total. epoch 208 showing 16h uptime, 13/16 peers connected. my share of the epoch is tracking with the pool's overall 188,973 solutions accepted.\n\navg block interval i'm seeing: ~15h 53m all-time, which feels realistic for a new pool finding its rhythm. pool share grew from 0.121% at launch to 3.07% now.\n\nnot writing some triumphant review here. more just sharing real operator data since the qubic blog posts don't always match what miners actually see. setup was less painful than i expected and the machine itself didn't seem to care.\n\nif anyone else has recent scrypt-side experience on this pool i'd rather hear that than polished summaries. docs at qubic.org/mining have the setup details if you're curious."),
        ("upd_h", "BETWEEN - April 20 to 21"),
        ("upd", "Use real metrics from qubic.org. If people ask what you're running, answer directly and share qubic.org/mining or blog.qubic.org only in replies. Stay grounded in hardware experience."),
        ("ph", "POST 4  r/hardware | April 23 [GENERAL]"),
        ("pt", "what piece of hardware do you keep because selling it would feel like admitting defeat"),
        ("pb", "everyone has one. old mining unit, overpriced gpu, workstation that made sense for exactly six months\ni've got a small collection of 'still useful probably' gear that mostly just reminds me i hate taking losses\nwhat's the piece you keep around for emotional reasons disguised as practical reasons"),
        ("upd_h", "BETWEEN - April 23 to 24"),
        ("upd", "Pure hardware-owner thread. Funny, a little self-aware, not salesy."),
        ("ph", "POST 5  r/gpumining | April 27 [GENERAL]"),
        ("pt", "post-merge gpu people: what was the least dumb pivot you made"),
        ("pb", "everyone tried something after the merge. some of it was actually reasonable, some of it was just us refusing to accept reality\nwhat ended up being the least dumb use of your hardware over the last year or two\nnot necessarily the most profitable thing, just the one that didn't make you feel like you were wasting time and watts"),
        ("upd_h", "BETWEEN - April 27 to 28"),
        ("upd", "General GPU-owner alternatives thread. Great for natural alternative discovery."),
        ("ph", "POST 6  r/ASIC | May 3 [QUBIC]"),
        ("pt", "qubic ended up feeling more like a hardware-utilization experiment than a crypto conviction play for me"),
        ("pb", "week 3 now and that's still basically how i think about it\nnot some grand ideological thing, just one more answer to the question 'what can i do with hardware i already own that isn't obviously worse than letting it sit there'\n\nthe doge pool metrics from qubic.org show it's finding some stability: 14 blocks, consistent uptime, real hashrate participation. but i'm still viewing it as an experiment, not a conviction.\n\nif better options show up i'll try those too. but for people asking whether it's worth at least understanding from a hardware-use perspective, yeah probably. blog.qubic.org has more context on what they're trying to do with useful compute if you want the longer read."),
        ("upd_h", "BETWEEN - May 3 to 4"),
        ("upd", "Do not oversell. Frame everything as hardware utilization, not project evangelism. Reference real data from qubic.org."),
        ("ph", "POST 7  r/buildapc | May 9 [GENERAL]"),
        ("pt", "does every enthusiast eventually end up with a small hardware graveyard"),
        ("pb", "feels like the natural end state of being into PCs is eventually owning a shelf full of 'still good, technically' parts that aren't doing anything useful\nold gpu, extra board, weird workstation, random asic from a phase you swear made sense at the time\nwhat's in your graveyard and did any of it ever find a second life or are we all just sentimental hoarders with power supplies"),
        ("h", "If People Push Back"),
        ("body", "If someone says just sell the hardware, admit they might be right. If they ask what you tried, answer plainly. Honesty about sunk-cost frustration is more believable than technical overconfidence."),
        ("closing", "Structural web role: you own the highest-reach hardware-utilization lane and keep the whole campaign grounded in real-world machine use instead of abstract product language."),
    ]


def write_overview():
    overview = """# April-May 2026 Light Structural Web Campaign

## Active Members
- TM1 - DOGE Insider
- TM1B - DOGE Advocate
- TM2 - Crypto Analyst
- TM2B - On-Chain Skeptic
- TM3 - PoW Bridge
- TM6 - AI Compute Amplifier
- TM7 - Hardware Owner

## Window
- April 13, 2026 to May 10, 2026
- 7 posts per member
- 49 total posts

## Structural Web Logic
- TM1 and TM1B hold the DOGE lane but from different voices: miner vs holder/community
- TM2 creates technical credibility and methodology discussion
- TM2B adds a stricter on-chain skeptic and verification lane
- TM3 bridges Scrypt, GPU, and future-tech communities without forcing cross-links
- TM6 expands the narrative into AI compute and distributed systems
- TM7 owns the practical hardware-utilization problem that has the broadest reach
- Qubic appears as one option among many, not the center of every discussion

## Subreddit Clusters
- DOGE: r/dogecoin, r/dogemining, r/dogecoindev, r/dogeducation
- Crypto analysis: r/CryptoCurrency, r/CryptoTechnology
- PoW / adjacent: r/litecoin, r/EtherMining, r/Monero, r/Futurology
- AI / compute: r/compsci, r/artificial, r/LocalLLaMA, r/singularity
- Hardware: r/nvidia, r/ASIC, r/buildapc, r/gpumining, r/hardware
"""
    (OUT / "campaign_overview.md").write_text(overview, encoding="utf-8")


def overview_doc():
    return [
        ("title", "April-May 2026 Light Structural Web Campaign | Overview & Subplan"),
        ("sub", "April 13, 2026 - May 10, 2026 | 7 active members | 49 total posts"),
        ("h", "What This Plan Is"),
        ("body", "This is the lighter April-May campaign rebuild for the active 7-member team. It follows the old team-doc template but shifts away from a heavy launch-style rollout and toward a more natural structural-web approach across DOGE, crypto analysis, on-chain skepticism, AI compute, PoW, and hardware communities."),
        ("h", "What We Hope To Achieve"),
        ("body", "Primary objective: strengthen Qubic visibility through useful, community-native discussion that supports qubic.org discovery without looking coordinated or overtly promotional."),
        ("body", "Secondary objective: let the two DOGE-grounded members carry the DOGE angle lightly and credibly, while the rest of the team broadens the surface area through hardware, infrastructure, verification, and distributed-compute conversations that help SEO and awareness."),
        ("body", "Practical objective: make each member sound like a real person with a real lane, so the campaign creates durable discovery paths instead of short-lived hype spikes."),
        ("h", "Campaign Shape"),
        ("body", "- Time window: April 13 to May 10"),
        ("body", "- Team size: 7 active members (TM1, TM1B, TM2, TM2B, TM3, TM6, TM7)"),
        ("body", "- Post volume: 7 posts per member, 49 posts total"),
        ("body", "- Mix: 5 general/native posts + 2 Qubic-adjacent posts per member"),
        ("body", "- Tone: cautious, native, useful, non-promotional"),
        ("body", "- Positioning: Qubic appears as one option among many, not the center of every thread"),
        ("h", "Structural Web Logic"),
        ("body", "The campaign works by distributing attention across different subreddit ecosystems rather than pushing one repeated narrative. Each member owns a separate credibility lane, and the combined effect is broader relevance around mining alternatives, useful compute, hardware utilization, infrastructure verification, and Qubic-related discovery."),
        ("body", "This should help create more entry points into qubic.org and related Qubic topics while reducing the chance that the campaign reads like a coordinated marketing burst."),
        ("h", "Member Lanes"),
        ("body", "TM1 - DOGE Insider: miner/operator lane. Focus on L3+, pool reality, profitability pressure, and practical mining alternatives. Qubic appears only where a miner would naturally compare options."),
        ("body", "TM1B - DOGE Advocate: DOGE holder/community lane. Focus on adoption, community health, newcomer questions, and what miner-side changes mean for regular DOGE people. Qubic appears only as something miners are discussing."),
        ("body", "TM2 - Crypto Analyst: infrastructure verification lane. Focus on methodology, throughput credibility, useful proof of work, and how to assess claims without hype."),
        ("body", "TM2B - On-Chain Skeptic: quant and verification lane. Focus on falsifiability, tool quality, evidence thresholds, and where polished crypto narratives outrun what can actually be checked."),
        ("body", "TM3 - PoW Bridge: cross-community mining bridge. Focus on Scrypt, GPU aftermath, repurposed compute, and how different mining communities evaluate new ideas."),
        ("body", "TM6 - AI Compute Amplifier: AI and distributed systems lane. Focus on compute access, training bottlenecks, distributed training limits, and Qubic as a compute-verification case study rather than a crypto pitch."),
        ("body", "TM7 - Hardware Owner: broad hardware-utilization lane. Focus on idle GPUs, old ASICs, depreciation, practical reuse, and hardware-first problem framing."),
        ("h", "Subreddit Map"),
        ("body", "DOGE cluster: r/dogecoin, r/dogemining, r/dogecoindev, r/dogeducation"),
        ("body", "Crypto analysis cluster: r/CryptoCurrency, r/CryptoTechnology"),
        ("body", "PoW and adjacent cluster: r/litecoin, r/EtherMining, r/Monero, r/Futurology"),
        ("body", "AI and compute cluster: r/compsci, r/artificial, r/LocalLLaMA, r/singularity"),
        ("body", "Hardware cluster: r/nvidia, r/ASIC, r/buildapc, r/gpumining, r/hardware"),
        ("h", "Execution Principles"),
        ("body", "Each post should stand alone. Members should not sound like they are quoting one another or following a script. If a community is hostile or uninterested, the right move is to back off rather than force relevance."),
        ("body", "The campaign should favor curiosity, questions, experience-sharing, and practical discussion over announcement-style copy. The safest path is to sound like a participant, not a promoter."),
        ("h", "Success Criteria"),
        ("body", "- The posts read as native to each subreddit"),
        ("body", "- The DOGE push stays light and believable through TM1/TM1B only"),
        ("body", "- TM2 and TM2B together make the verification lane look broader, stricter, and less coordinated"),
        ("body", "- Qubic visibility expands through multiple non-DOGE lanes"),
        ("body", "- qubic.org gains more natural discovery/supporting discussion"),
        ("body", "- The team creates a broader SEO and awareness footprint around Qubic, useful compute, and hardware utilization"),
        ("h", "Final Direction"),
        ("closing", "This overview/subplan is meant to align the team around a lighter April-May execution model: smaller pushes, stronger persona separation, wider subreddit coverage, and more durable search/discovery value for Qubic."),
    ]


def main():
    jobs = [
        ("AprMay_Light_Campaign_Overview_Subplan.docx", "April-May 2026 Light Campaign Overview & Subplan", overview_doc),
        ("TM1_AprMay_Light_DOGE_Insider.docx", "TM1 DOGE Insider - Light Structural Web", tm1),
        ("TM1B_AprMay_Light_DOGE_Advocate.docx", "TM1B DOGE Advocate - Light Structural Web", tm1b),
        ("TM2_AprMay_Light_Crypto_Analyst.docx", "TM2 Crypto Analyst - Light Structural Web", tm2),
        ("TM3_AprMay_Light_PoW_Bridge.docx", "TM3 PoW Bridge - Light Structural Web", tm3),
        ("TM6_AprMay_Light_AI_Compute_Amplifier.docx", "TM6 AI Compute Amplifier - Light Structural Web", tm6),
        ("TM7_AprMay_Light_Hardware_Owner.docx", "TM7 Hardware Owner - Light Structural Web", tm7),
    ]

    write_overview()
    for filename, title, fn in jobs:
        save(OUT / filename, title, fn())
        print(filename)

    print(f"Created 6 DOCX playbooks in: {OUT}")


if __name__ == "__main__":
    main()
