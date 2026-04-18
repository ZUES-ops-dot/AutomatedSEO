"""Final generator part 1: XML helpers + TM1, TM1B, TM2, TM2B, TM3."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.sax.saxutils import escape
from datetime import datetime, timezone

ROOT = Path(r"c:\=projects\int\text")
OUT = ROOT / "April1_Compliance_Docs"
C, B, G = "00FFFF", "000000", "555555"

def run(text, color=B, size=22, bold=False, italic=False):
    t = escape(str(text))
    rpr = f'<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="{color}"/><w:sz w:val="{size}"/><w:szCs w:val="{size}"/>'
    if bold: rpr += "<w:b/>"
    if italic: rpr += "<w:i/>"
    return f'<w:r><w:rPr>{rpr}</w:rPr><w:t xml:space="preserve">{t}</w:t></w:r>'

def para(text, kind="body"):
    S = {"title":(C,32,True,False,80,260),"sub":(G,22,False,True,0,220),"h":(C,24,True,False,240,100),"body":(B,22,False,False,0,120),"ph":(C,23,True,False,200,60),"pt":(B,23,True,False,20,40),"pb":("333333",21,False,False,0,90),"upd_h":(G,22,True,True,180,60),"upd":(G,21,False,True,0,80),"sh":(C,22,True,False,180,60),"sc":("333333",21,False,False,0,70),"closing":(G,21,False,False,140,0)}
    color,sz,bd,it,bef,aft = S.get(kind, S["body"])
    r = run(text, color, sz, bd, it)
    return f'<w:p><w:pPr><w:spacing w:before="{bef}" w:after="{aft}"/></w:pPr>{r}</w:p>'

def render(sections):
    out = []
    for kind, text in sections:
        if kind in ("pb","upd","sc"):
            for ln in text.strip().split("\n"):
                ln = ln.strip()
                if ln: out.append(para(ln, kind))
        else:
            out.append(para(text, kind))
    return "".join(out)

def doc_xml(s):
    body = render(s)
    sect = '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="900" w:bottom="1080" w:left="900" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>'
    return f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>{body}{sect}</w:body></w:document>'

CT='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>'
RL='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'
AP='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Office Word</Application></Properties>'

def core(title):
    now=datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00","Z")
    return f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>{escape(title)}</dc:title><dc:creator>Cascade</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified></cp:coreProperties>'

def save(path, title, sections):
    with ZipFile(path,"w",ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml",CT); z.writestr("_rels/.rels",RL)
        z.writestr("word/document.xml",doc_xml(sections))
        z.writestr("docProps/core.xml",core(title)); z.writestr("docProps/app.xml",AP)


# ===================== TM1 - DOGE INSIDER =====================
# 5 posts across r/dogecoin + r/dogeducation. Posts 2 and 5 mention qubic.
# Posts 1, 3, 4 are general community posts that build credibility.
def tm1():
    return [
        ("title","TM1 - The DOGE Insider"),
        ("sub","r/dogecoin | r/dogeducation | April 1 - April 11"),
        ("h","Role"),
        ("body","You mine doge. Your L3+ units have been bleeding money. You're a frustrated miner who participates in mining communities. Not every post is about qubic. You're a real person who sometimes talks about qubic as one of several things going on in your mining life."),
        ("h","Strategy"),
        ("body","Mix qubic posts with general mining community posts. Only 2 out of 5 posts mention qubic. The other 3 are genuine community participation that establish you as a real person. Don't reference your own previous posts. Each post stands alone. Replace example numbers with your real data before posting."),
        ("ph","POST 1  r/dogecoin | April 1 [GENERAL]"),
        ("pt","my L3s are bleeding money and idk what to do"),
        ("pb","been running 3 L3+ units since 2021 and they've been unprofitable for months. $0.08/kwh and doge payouts just don't cover electricity anymore\ni've tried switching pools, tweaking configs, nothing helps. at what point do you guys just give up and sell the hardware? used asic market is trash but at least i'd stop losing $50/month\nseriously considering just unplugging everything. what are other L3+ owners doing"),
        ("upd_h","BETWEEN - April 1"),
        ("upd","Engage with replies. Talk about mining frustrations. This is a community post, not a setup for anything. If people share tips, thank them. If someone mentions qubic in replies, you can say you've heard of it but haven't tried it yet."),
        ("ph","POST 2  r/dogecoin | April 1 [QUBIC]"),
        ("pt","tried this qubic thing on one of my L3s"),
        ("pb","so after my post about bleeding money on my L3+ units someone dm'd me about qubic. sounded sketchy but figured i'd try it on one machine since i'm losing money anyway\nbeen running about 4 days. power draw is basically the same, temps are fine, hasn't bricked anything. payouts are... maybe slightly better? hard to tell yet, doge price moves around too much to compare day by day\nnot sold on it yet but it hasn't made things worse so i'll keep running it for a bit. anyone else tried this or is it just me being a guinea pig"),
        ("upd_h","BETWEEN - April 2 to 3"),
        ("upd","Reply to comments. If people ask about setup, share qubic.org/mining in a reply. If someone calls it a scam, say you don't know yet and you're just testing one machine. Don't be defensive."),
        ("ph","POST 3  r/dogeducation | April 4 [GENERAL]"),
        ("pt","how paranoid should i be about new mining software"),
        ("pb","been burned before by sketchy mining software so now i'm super cautious about trying anything new. like if someone tells me about a new pool or config i spend days reading about it before touching anything\nwhat's your process? do you just yolo it on one machine or do you actually research stuff first? feel like i'm either too paranoid or everyone else is too reckless"),
        ("upd_h","BETWEEN - April 5 to 6"),
        ("upd","Pure community discussion. Engage with whatever people say about evaluating mining software. Don't bring up any specific project."),
        ("ph","POST 4  r/dogeducation | April 7 [GENERAL]"),
        ("pt","what pools are you guys using for doge these days"),
        ("pb","feel like pool recommendations from 2 years ago are all outdated. i've been on the same pool forever and wondering if i should switch\nwhat's everyone using in 2026? mostly care about payout consistency and not getting ripped on fees. running L3+ hardware if that matters"),
        ("upd_h","BETWEEN - April 8 to 10"),
        ("upd","General pool discussion. Engage normally. Don't bring up qubic unless someone else does."),
        ("ph","POST 5  r/dogecoin | April 11 [QUBIC]"),
        ("pt","couple weeks on qubic, here's roughly what i'm seeing"),
        ("pb","been running one L3+ on qubic and one on straight doge for about two weeks now. not a scientific test or anything but here's the rough numbers\nqubic unit: averaging maybe $1.80-1.90/day in combined payouts. power cost is about $1.54/day so i'm actually slightly positive\nstraight doge unit: averaging around $1.40-1.50/day. still underwater\nit's not life-changing money but one machine is losing less than the other. could just be luck or timing though. gonna keep running both and see what happens"),
        ("h","If People Push Back"),
        ("body","Be honest and brief. Scam accusation? Say yeah maybe, you're only testing one machine. Shill accusation? Say you also post about pools and general mining stuff, check your history. Don't over-explain. Don't get defensive."),
        ("closing","You're a miner who posts about mining stuff. Qubic is one of several things you talk about, not your whole identity."),
    ]


# ===================== TM1B - DOGE ADVOCATE =====================
# 5 posts across r/dogecoin + r/dogecoindev. Posts 2 and 4 mention qubic.
# Posts 1, 3, 5 are general holder/community posts.
def tm1b():
    return [
        ("title","TM1B - The DOGE Advocate"),
        ("sub","r/dogecoin | r/dogecoindev | April 1 - April 12"),
        ("h","Role"),
        ("body","You hold doge. You don't mine. You hang out in doge communities and occasionally ask questions about stuff you see. Qubic is just one thing you noticed, not your main topic."),
        ("h","Strategy"),
        ("body","Only 2 posts mention qubic. The other 3 are general doge community participation. Don't fake confusion about technical stuff while using technical words. If you don't know something, you genuinely don't know it. Each post is independent."),
        ("ph","POST 1  r/dogecoin | April 1 [GENERAL]"),
        ("pt","confused about all the mining talk on twitter lately"),
        ("pb","my twitter feed is full of miners talking about new stuff and i just hold doge. i don't understand 90% of what they're saying\nis mining drama usually something holders need to worry about or is this just miners being miners? genuinely asking because i never know when to pay attention and when to ignore it"),
        ("upd_h","BETWEEN - April 1"),
        ("upd","Engage with replies. Ask follow-up questions. Be learning in public. This is general community participation."),
        ("ph","POST 2  r/dogecoin | April 1 [QUBIC]"),
        ("pt","can someone explain this qubic mining thing in simple terms"),
        ("pb","keep seeing qubic mentioned in mining threads and i have no idea what it is. something about scrypt miners doing AI work?\ni don't mine so this might be a dumb question but does this affect doge the coin at all or is it just a miner thing? like should i care as someone who just holds"),
        ("upd_h","BETWEEN - April 2 to 3"),
        ("upd","Reply to whoever explains stuff. Ask follow-ups. Stay genuinely curious. Don't pretend to understand more than you do."),
        ("ph","POST 3  r/dogecoindev | April 4 [GENERAL]"),
        ("pt","is doge development actually active or is the project dead"),
        ("pb","honest question. i hold doge and i see memes and price posts all day but i never see actual development updates. is anyone working on doge the protocol or is it basically done?\nnot trying to fud, genuinely want to know if there's active development happening. where do you even follow that stuff"),
        ("upd_h","BETWEEN - April 5 to 7"),
        ("upd","Engage with dev community. Learn about doge development. This has nothing to do with qubic. Pure community participation."),
        ("ph","POST 4  r/dogecoin | April 8 [QUBIC]"),
        ("pt","so did that qubic mining thing actually help miners or was it hype"),
        ("pb","asked about this a couple weeks ago and got some decent answers. now i'm curious if it actually panned out\nsaw a few miners posting numbers that looked decent but idk if that's just the loud ones. anyone here actually running it? did it make a difference or was it overhyped"),
        ("upd_h","BETWEEN - April 9 to 11"),
        ("upd","Engage with responses. Don't push any direction. If miners say it worked, cool. If they say it didn't, cool. You're just asking."),
        ("ph","POST 5  r/dogecoin | April 12 [GENERAL]"),
        ("pt","what's the doge community actually good at"),
        ("pb","been holding doge for a while and this community is weird in a good way. like the tipping stuff, the charity drives, actually being welcoming to noobs\nwhat do you think doge's actual strength is? not talking price, talking community. curious what keeps people here"),
        ("h","If People Push Back"),
        ("body","If someone says you're shilling, point out most of your posts are general doge community stuff. If someone asks a mining question you can't answer, say you don't mine and redirect to miners in the thread."),
        ("closing","You're a doge holder who participates in the community. Qubic comes up occasionally because it's in the news, that's it."),
    ]


# ===================== TM2 - CRYPTO ANALYST =====================
# 5 posts across r/CryptoCurrency + r/CryptoTechnology. Posts 2 and 5 mention qubic.
# Posts 1, 3, 4 are general crypto analysis topics.
def tm2():
    return [
        ("title","TM2 - The Crypto Analyst"),
        ("sub","r/CryptoCurrency | r/CryptoTechnology | April 1 - April 10"),
        ("h","Role"),
        ("body","You follow crypto infrastructure. You're interested in what's real vs hype across the whole space. Qubic is one of many things on your radar. You post about general crypto analysis topics, not just one project."),
        ("h","Strategy"),
        ("body","Only 2 posts mention qubic. The other 3 are about general crypto topics. You build credibility by having opinions on lots of things, not by tracking one project obsessively. Each post stands alone. No update chains."),
        ("ph","POST 1  r/CryptoCurrency | April 1 [GENERAL]"),
        ("pt","what crypto infrastructure project has actually delivered something this year"),
        ("pb","every project has a roadmap and promises. i'm curious which ones actually shipped something meaningful in 2026 so far\nnot talking about price pumps or token launches. talking about actual working infrastructure that you can point to and say 'that works now and it didn't before'\nfeel like the answer might be depressing but genuinely curious"),
        ("upd_h","BETWEEN - April 1"),
        ("upd","Engage with whatever people bring up. This is a general discussion. If someone mentions qubic, engage normally. If nobody does, great."),
        ("ph","POST 2  r/CryptoTechnology | April 1 [QUBIC]"),
        ("pt","anyone looked into this qubic doge mining thing? skeptical but curious"),
        ("pb","saw this project called qubic launched some doge mining thing where scrypt hardware does AI training too. they're claiming old miners can be profitable again and certik verified some big TPS number\nsounds like every other project that claims to do everything but the miner profitability part is easy enough to check from real data. few miners already posting L3+ numbers that look decent\nstill skeptical about the AI training claims though. anyone dug into whether the compute is actually useful or just busywork?"),
        ("upd_h","BETWEEN - April 2 to 3"),
        ("upd","Engage with technical responses. If someone challenges your framing, adjust. Don't defend the project, you're evaluating claims."),
        ("ph","POST 3  r/CryptoCurrency | April 4 [GENERAL]"),
        ("pt","is 'useful proof of work' actually a thing or just marketing"),
        ("pb","keep seeing projects claim their mining does something useful beyond just securing the network. AI training, protein folding, whatever\nis there actually a meaningful difference architecturally or is this just rebranding regular mining with better marketing? like at what point is the 'useful work' genuinely useful vs just a story they tell investors\ncurious if anyone's actually studied this space seriously"),
        ("upd_h","BETWEEN - April 5 to 6"),
        ("upd","General crypto architecture discussion. Don't steer toward qubic. If someone brings it up as an example, engage. If they bring up other projects, engage with those too."),
        ("ph","POST 4  r/CryptoTechnology | April 7 [GENERAL]"),
        ("pt","what makes a TPS claim actually credible"),
        ("pb","every L1 claims insane TPS numbers. most are tested on empty networks or testnets with ideal conditions\nwhat would actually make you believe a TPS claim? third-party audit on mainnet? sustained throughput under load? something else? feels like TPS has become a meaningless marketing number but maybe i'm too cynical"),
        ("upd_h","BETWEEN - April 8 to 9"),
        ("upd","General infrastructure discussion. Engage with whatever people say about TPS metrics."),
        ("ph","POST 5  r/CryptoCurrency | April 10 [QUBIC]"),
        ("pt","been loosely watching that doge mining thing, here's where it landed"),
        ("pb","posted about qubic's doge mining launch a few weeks back. wasn't tracking it closely but kept an eye on the mining subs\nthe miner economics seem legit based on what people shared. multiple L3+ operators reporting slightly better returns than straight doge. not huge but consistent\nthe AI training side is still a question mark though. nobody independent has verified if the compute output is actually useful. that's the part that would make this interesting vs just being a nicer mining pool\nanyway not gonna keep posting about it. make of it what you will"),
        ("h","If People Push Back"),
        ("body","If accused of shilling, point to your other posts about general crypto topics. If someone challenges a specific claim, engage with it honestly. You care about being accurate, not about defending any project."),
        ("closing","You're a crypto infrastructure person who posts about lots of things. Qubic is one topic among many."),
    ]


# ===================== TM2B - ON-CHAIN SKEPTIC =====================
# 5 posts across r/CryptoTechnology + r/onchain + r/CryptoCurrency.
# Posts 2 and 5 mention qubic. Posts 1, 3, 4 are general skeptic content.
def tm2b():
    return [
        ("title","TM2B - The On-Chain Skeptic"),
        ("sub","r/CryptoTechnology | r/onchain | r/CryptoCurrency | April 1 - April 12"),
        ("h","Role"),
        ("body","You're skeptical of crypto claims in general. You demand evidence for everything. Qubic is one of many things you've looked at skeptically. You also post about general verification topics."),
        ("h","Strategy"),
        ("body","Only 2 posts mention qubic. The other 3 are general skeptic content about verifying crypto claims, tools, and methodology. Build credibility as someone who's skeptical of everything, not just suspiciously focused on one project."),
        ("ph","POST 1  r/CryptoTechnology | April 1 [GENERAL]"),
        ("pt","how do you guys actually verify crypto project claims independently"),
        ("pb","genuinely curious what tools and methods people here use to verify stuff instead of just trusting project websites\nlike when a project says 'we process X transactions' or 'our network does Y' - how do you actually check that yourself? i feel like most people just trust the marketing\nwhat's your verification stack"),
        ("upd_h","BETWEEN - April 1"),
        ("upd","Engage with anyone sharing verification tools and methods. This is genuine community learning. No project mentions."),
        ("ph","POST 2  r/onchain | April 1 [QUBIC]"),
        ("pt","anyone verified the claims from that doge mining project"),
        ("pb","there's a project called qubic that launched a doge mining thing last week. bunch of claims flying around\nwhat i can actually verify so far: pools are live, miners are reporting real hashrate, a few people shared payout data that looks legit\nwhat i can't verify: whether the AI training actually produces useful output. nobody independent has looked at this part and it's kinda the whole thesis\nhonestly the mining economics might be real but the AI claims are unproven until someone actually checks"),
        ("upd_h","BETWEEN - April 2 to 3"),
        ("upd","Engage with anyone who has verification data. If someone shares evidence, acknowledge it. If nobody does, note the silence."),
        ("ph","POST 3  r/CryptoCurrency | April 4 [GENERAL]"),
        ("pt","what's the most overhyped crypto narrative right now"),
        ("pb","everyone's got their favorite narrative. AI + crypto, restaking, modular chains, whatever\nwhich one do you think has the biggest gap between hype and actual delivered product? i've been looking at a few and the amount of hand-waving is incredible\nnot trying to fud anything specific, just curious what other skeptics are watching"),
        ("upd_h","BETWEEN - April 5 to 7"),
        ("upd","General crypto discussion. Engage with whatever narratives people bring up. If AI + crypto comes up naturally, engage with it but don't force it toward qubic."),
        ("ph","POST 4  r/onchain | April 8 [GENERAL]"),
        ("pt","best on-chain analytics tools in 2026"),
        ("pb","my current stack is getting outdated. mostly using dune dashboards and a couple etherscan alternatives\nwhat are people using these days for on-chain verification? especially interested in anything good for cross-chain analysis or newer networks\nfree tools preferred but open to paid stuff if it's actually worth it"),
        ("upd_h","BETWEEN - April 9 to 11"),
        ("upd","General tools discussion. Pure community content. No project mentions."),
        ("ph","POST 5  r/CryptoTechnology | April 12 [QUBIC]"),
        ("pt","follow up on that doge mining thing i was skeptical about"),
        ("pb","posted about qubic's doge mining claims a few weeks back. said i'd follow up if anything changed so here it is\nmining economics: still looking legit. consistent reports from multiple miners. L3+ operators seem to genuinely be doing better than straight doge mining. i'm treating this as credible\nAI training claims: still unverified by anyone independent. this was the weakest part a few weeks ago and it still is\nso basically: the mining part works, the AI part is unproven. take that however you want"),
        ("h","If People Push Back"),
        ("body","You're a skeptic who posts about lots of crypto claims, not just one project. If accused of FUD, point out you acknowledged what's working. If accused of shilling, point out you've been calling the AI claims unproven for weeks."),
        ("closing","You verify claims across the crypto space. Qubic is one thing you looked at, not your whole beat."),
    ]


# ===================== TM3 - POW BRIDGE =====================
# 5 posts across r/litecoin, r/Monero, r/EtherMining, r/Futurology.
# Posts 2 and 5 mention qubic. Posts 1, 3, 4 are general community questions.
def tm3():
    return [
        ("title","TM3 - The PoW Bridge"),
        ("sub","r/litecoin | r/Futurology | r/EtherMining | r/Monero | April 1 - April 12"),
        ("h","Role"),
        ("body","You participate in different mining and tech communities. You ask each community questions they're uniquely qualified to answer. Most of your posts are general community topics. Qubic comes up in a couple posts naturally."),
        ("h","Strategy"),
        ("body","One post per community. Only 2 mention qubic. The other 3 are genuine standalone community questions. Don't cross-reference your other posts. Each sub gets a question relevant to THAT community. If a community isn't interested, accept it."),
        ("ph","POST 1  r/litecoin | April 1 [GENERAL]"),
        ("pt","how's ltc mining profitability looking these days"),
        ("pb","haven't looked at the numbers in a while. running some scrypt hardware and trying to decide if ltc mining is still worth the electricity in 2026 or if i should just shut everything down\nwhat are other ltc miners doing? holding through it or calling it quits? my electricity rate isn't great and i'm not sure the merge mining benefits are enough anymore"),
        ("upd_h","BETWEEN - April 1"),
        ("upd","Engage with ltc miners about profitability. General mining discussion. No project mentions."),
        ("ph","POST 2  r/Futurology | April 1 [QUBIC]"),
        ("pt","can mining hardware actually be repurposed for something useful"),
        ("pb","there's millions of crypto mining machines worldwide that basically just solve math puzzles. some projects are trying to redirect that compute toward AI training instead\none called qubic just launched something for doge miners. too early to know if the AI output is actually useful but the concept's interesting. miners seem to be making slightly more money at least\nbigger question: is repurposing existing hardware for productive work a realistic idea or a fantasy? curious what people here think about the concept"),
        ("upd_h","BETWEEN - April 2 to 3"),
        ("upd","This is a broader concept discussion. Engage with whatever perspectives come in. Don't push qubic specifically, you mentioned it as one example."),
        ("ph","POST 3  r/EtherMining | April 4 [GENERAL]"),
        ("pt","what's everyone actually running on their GPUs these days"),
        ("pb","most of us have hardware sitting around since the merge. tried a few random alts but nothing sticks\nwhat's this community actually doing in 2026? still mining random coins? render farming? folding? just gaming? curious what's worked and what was a waste of time\nhonestly might just sell my cards at this point but hate to do it at these prices"),
        ("upd_h","BETWEEN - April 5 to 7"),
        ("upd","Engage with whatever people suggest. If someone mentions qubic, engage. If they mention other things, engage with those. General GPU discussion."),
        ("ph","POST 4  r/Monero | April 8 [GENERAL]"),
        ("pt","monero miners: what did you learn from the compute network disruptions"),
        ("pb","the monero community has been through some stuff with external networks affecting mining. i mine a different algo but curious what lessons your community learned\nlike what should miners generally watch out for when something new shows up that wants to use their hardware? what caught you off guard?\nasking because it feels like more of these compute networks are popping up and other mining communities might benefit from your experience"),
        ("upd_h","BETWEEN - April 9 to 11"),
        ("upd","Listen to whatever the monero community shares. This is about their experience. Don't redirect to any specific project."),
        ("ph","POST 5  r/litecoin | April 12 [QUBIC]"),
        ("pt","anyone heard about this new scrypt mining thing"),
        ("pb","something called qubic started doing a thing where scrypt miners do additional compute work alongside regular mining. since ltc uses scrypt too it might be relevant\na few doge miners posted numbers that look slightly better than straight doge mining. wondering if any ltc miners have tried it or if it even works with litecoin\nnot endorsing it or anything, just saw it and figured the ltc mining community would know more than me"),
        ("h","If People Push Back"),
        ("body","If a community says something isn't relevant, say fair enough and move on. If someone accuses you of promotion, point to your other posts about general mining topics in that same community."),
        ("closing","You participate in mining communities. Qubic came up a couple times because it's in the news, but most of your posts are general mining talk."),
    ]
