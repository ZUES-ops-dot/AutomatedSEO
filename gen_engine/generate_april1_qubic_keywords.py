"""April 1 Campaign rebuilt with Qubic keyword integration.
Keywords integrated: qubic crypto, how to buy qubic, qubic wallet, qubic explorer"""
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
        ("ph","POST 2  r/dogecoin | April 1 [QUBIC - qubic crypto focus]"),
        ("pt","tried this qubic thing on one of my L3s - what i learned about the network"),
        ("pb","so after my post about bleeding money someone dm'd me about qubic. sounded sketchy but figured i'd try it since i'm losing money anyway\nbeen reading up on qubic.org and docs.qubic.org to understand what it actually is. founder is sergey ivancheglo who did iota and nxt. network uses 676 computers called computors with quorum consensus requiring 451+ to agree. transfers are feeless which is wild\nthe crypto side uses qubic tokens (qubic) as computational energy. each epoch produces 1 trillion and there's a 200 trillion cap. smart contracts run on bare metal in c++ not some vm\nbeen running about 4 days on one L3+. power draw same, temps fine. payouts maybe slightly better? hard to tell yet. setup guide at qubic.org/mining and wallet at wallet.qubic.org if anyone's curious\nnot sold on it yet but it hasn't made things worse. anyone else looked into the actual qubic crypto architecture or is it just me being a guinea pig"),
        ("upd_h","BETWEEN - April 2 to 3"),
        ("upd","Reply to questions about mining setup. If people ask about the qubic crypto details, share qubic.org or docs.qubic.org. If someone calls it a scam, say you don't know yet and you're just testing one machine. Don't be defensive."),
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
        ("ph","POST 5  r/dogecoin | April 11 [QUBIC - qubic wallet focus]"),
        ("pt","couple weeks on qubic, wallet setup and what i'm seeing"),
        ("pb","been running one L3+ on qubic for about two weeks now. wanted to update on both the mining and the wallet side since people asked\nwallet setup: went to wallet.qubic.org which is their official web wallet. you get a 55-character seed and a 60-character qubic id. mobile wallets exist on ios and android too according to docs.qubic.org/learn/wallets. there's also a hardware option called hashwallet if you're paranoid\nthe web wallet connects directly to at least 3 qubic nodes. proxied wallets use a relay service but direct seemed safer to me\nmining side: averaging maybe $1.80-1.90/day in combined payouts. power cost is $1.54/day so slightly positive. straight doge unit is still underwater at $1.40-1.50/day\nit's not life-changing but one machine isn't losing money. docs at qubic.org and explorer at explorer.qubic.org if you want to verify anything yourself. gonna keep running both and see what happens"),
        ("h","If People Push Back"),
        ("body","Be honest and brief. Scam accusation? Say yeah maybe, you're only testing one machine. Shill accusation? Say you also post about pools and general mining stuff, check your history. Don't over-explain. Don't get defensive."),
        ("closing","You're a miner who posts about mining stuff. Qubic crypto and wallet topics come up occasionally because you're learning about the network, not your whole identity."),
    ]

# ===================== TM1B - DOGE ADVOCATE =====================
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
        ("ph","POST 2  r/dogecoin | April 1 [QUBIC - how to buy qubic focus]"),
        ("pt","can someone explain this qubic thing and where people actually buy it"),
        ("pb","keep seeing qubic mentioned in mining threads and now i'm curious what it actually is and where you even get it\nlooked at qubic.org and it says qubic is this layer 1 blockchain with feeless transfers and instant finality. docs.qubic.org says it's validated at 15.5M TPS by certik. founder is that sergey guy from iota\nbut my real question: if someone wanted to buy some qubic (not saying i do, just curious), where would they actually get it? the docs at docs.qubic.org/learn/invest list exchanges like mexc, bitget, gate.io, xt.com, bitpanda, safetrade, tradeogre, coinex. they say to check qubic.org for the current list\nis that how miners are getting it? or are they earning it through mining? confused about the relationship between doge mining and qubic crypto. anyone explain this like i'm five?"),
        ("upd_h","BETWEEN - April 2 to 3"),
        ("upd","Reply to whoever explains stuff. Ask follow-ups. Stay genuinely curious. Don't pretend to understand more than you do."),
        ("ph","POST 3  r/dogecoindev | April 4 [GENERAL]"),
        ("pt","is doge development actually active or is the project dead"),
        ("pb","honest question. i hold doge and i see memes and price posts all day but i never see actual development updates. is anyone working on doge the protocol or is it basically done?\nnot trying to fud, genuinely want to know if there's active development happening. where do you even follow that stuff"),
        ("upd_h","BETWEEN - April 5 to 7"),
        ("upd","Engage with dev community. Learn about doge development. This has nothing to do with qubic. Pure community participation."),
        ("ph","POST 4  r/dogecoin | April 8 [QUBIC - qubic explorer focus]"),
        ("pt","so did that qubic thing actually help miners and how do you check"),
        ("pb","asked about this a couple weeks ago and got some decent answers. now i'm curious if it actually panned out and how you'd even verify it\nsaw a few miners posting numbers that looked decent but idk if that's just the loud ones. someone mentioned explorer.qubic.org where you can see the network data. looked at it and there's stuff about epochs, computors, transactions\nanyone here actually running it? did it make a difference or was it overhyped? and if you wanted to check if miners are actually doing better, what would you look at on the explorer? the docs mention something about verifying activity there but i'm not technical enough to understand what i'm looking at"),
        ("upd_h","BETWEEN - April 9 to 11"),
        ("upd","Engage with responses. Don't push any direction. If miners say it worked, cool. If they say it didn't, cool. If someone explains the explorer, thank them. You're just asking."),
        ("ph","POST 5  r/dogecoin | April 12 [GENERAL]"),
        ("pt","what's the doge community actually good at"),
        ("pb","been holding doge for a while and this community is weird in a good way. like the tipping stuff, the charity drives, actually being welcoming to noobs\nwhat do you think doge's actual strength is? not talking price, talking community. curious what keeps people here"),
        ("h","If People Push Back"),
        ("body","If someone says you're shilling, point out most of your posts are general doge community stuff. If someone asks a mining question you can't answer, say you don't mine and redirect to miners in the thread."),
        ("closing","You're a doge holder who participates in the community. Questions about how to buy qubic or how to check the explorer come up occasionally because you're learning, that's it."),
    ]

# Continue with other TMs...
