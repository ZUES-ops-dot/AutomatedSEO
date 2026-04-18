"""Final generator part 2: TM4, TM5, TM6, TM7 + main runner."""
from gen_final_1 import OUT, save


# ===================== TM4 - MINING SPECIALIST =====================
# 5 posts across r/cryptomining + r/dogemining. Posts 2 and 5 mention qubic.
# Posts 1, 3, 4 are general mining community posts.
def tm4():
    return [
        ("title","TM4 - The Mining Specialist"),
        ("sub","r/cryptomining | r/dogemining | April 1 - April 11"),
        ("h","Role"),
        ("body","You benchmark hardware. You care about numbers but you talk like a normal person, not a lab technician. You post about general mining topics and sometimes about qubic as one of the things you're testing."),
        ("h","Strategy"),
        ("body","Only 2 posts mention qubic. The other 3 are general mining community stuff. You're a miner who sometimes shares data, not a product tester running a structured evaluation. Replace example numbers with your real data before posting."),
        ("ph","POST 1  r/cryptomining | April 1 [GENERAL]"),
        ("pt","what's everyone mining right now"),
        ("pb","genuine question. crypto mining feels all over the place in 2026. eth is gone, btc mining is dominated by industrial operations, alts come and go\nwhat's this community actually running and what's profitable? or is everyone just mining at a loss and hoping? i'm running scrypt hardware and it's been rough"),
        ("upd_h","BETWEEN - April 1"),
        ("upd","Engage with whatever people share. Talk about profitability, hardware choices, etc. General mining community participation."),
        ("ph","POST 2  r/dogemining | April 1 [QUBIC]"),
        ("pt","testing a new config on my L3+, early numbers"),
        ("pb","threw one of my L3+ units on this qubic config a few days ago. running it parallel with another on straight doge to compare\nearly data: power draw is basically the same (~800W), temps identical, hashrate right where it should be at 504 MH/s. rejected shares around 0.3% on both\ntoo early for payout comparison but hardware-wise the L3+ doesn't seem to care which config it's running. will see what the payouts look like after a week or so"),
        ("upd_h","BETWEEN - April 2 to 3"),
        ("upd","Reply to hardware questions. Share data if asked. Don't hype anything, you're just sharing early observations."),
        ("ph","POST 3  r/cryptomining | April 4 [GENERAL]"),
        ("pt","best way to monitor mining hardware remotely"),
        ("pb","running a few machines and i'm tired of walking to my garage to check on them. what are people using for remote monitoring in 2026?\ncurrently just ssh-ing in which is annoying. looking for something with alerts for temperature spikes, dropped hashrate, or disconnects. ideally free or cheap\nwhat's your setup"),
        ("upd_h","BETWEEN - April 5 to 6"),
        ("upd","General mining infrastructure discussion. Engage with tool recommendations. No project mentions."),
        ("ph","POST 4  r/dogemining | April 7 [GENERAL]"),
        ("pt","L3+ still worth running or time to sell"),
        ("pb","real talk, at current doge difficulty and prices my L3+ units are barely breaking even at best. $0.08/kwh\nare other L3+ operators still running or have most people shut down? is there a point where you just accept the hardware is obsolete and sell for whatever you can get\nkinda hate to turn them off after all this time but losing money every month is getting old"),
        ("upd_h","BETWEEN - April 8 to 10"),
        ("upd","General L3+ profitability discussion. If someone asks what you're doing differently, you can mention you've been testing qubic on one unit in a reply. Don't bring it up unprompted in this thread."),
        ("ph","POST 5  r/cryptomining | April 11 [QUBIC]"),
        ("pt","couple weeks of data on qubic vs straight doge on L3+"),
        ("pb","been running one L3+ on qubic and one on straight doge for about 3 weeks. not a formal study just rough comparison\nqubic unit: averaging around $1.85/day combined. power cost is $1.54/day. net positive by about $0.30/day\nstraight doge unit: averaging around $1.45/day. still slightly underwater\nhardware wise: literally identical. no extra wear, no weird temps, no stability issues\nnot gonna oversell it. the difference is small but at least one machine isn't losing money anymore. take it for what it's worth"),
        ("h","If People Push Back"),
        ("body","If someone questions your methodology, agree the sample size is small. If someone suggests better testing methods, take the feedback. You care about accurate data, not defending a project."),
        ("closing","You're a miner who shares data about whatever you're running. Qubic is one config you tested, not your whole thing."),
    ]


# ===================== TM5 - COMMUNITY COORDINATOR =====================
# 5 posts in r/Qubic. This is the project sub so qubic mentions are normal.
# But still mix in 2 general community-building posts that aren't just about mining.
def tm5():
    return [
        ("title","TM5 - The Community Coordinator"),
        ("sub","r/Qubic | April 1 - April 13"),
        ("h","Role"),
        ("body","You're active in r/Qubic. This is the project sub so talking about qubic directly is normal. But you're a community member, not a PR person. You help with setup, share your experience, and also post community-building stuff that isn't just product updates."),
        ("h","Strategy"),
        ("body","3 posts are about the doge mining launch (setup help, issues, data). 2 posts are general community building. Talk like a person who's into the project, not like staff. Have opinions. Be imperfect. If something doesn't work, say so."),
        ("ph","POST 1  r/Qubic | April 1 [QUBIC]"),
        ("pt","doge mining is live, here's what worked for me"),
        ("pb","finally got it running after messing with it most of the morning lol. kept getting errors until i figured out the firmware thing\nlinks that worked:\nsetup guide: qubic.org/mining\nwallet: wallet.qubic.org\ni went with the qubic.li pool, seems solid so far. saw people in discord talking about JETSKI and MinerLab too but haven't tried those\nif anyone's stuck drop your setup details below and i'll try to help. fair warning i'm still figuring some of this out myself"),
        ("upd_h","BETWEEN - April 1"),
        ("upd","Help with setup issues in your thread. If the same problem keeps coming up, add a note about the fix. Keep it practical and helpful."),
        ("ph","POST 2  r/Qubic | April 1 [GENERAL]"),
        ("pt","what got you into qubic"),
        ("pb","curious what everyone's story is. i found this project through mining forums like 6 months ago and the AI training angle is what hooked me\nwhat brought you here? the tech? the mining? the community? just curious because this sub has a really different vibe from most crypto communities i've been in"),
        ("upd_h","BETWEEN - April 2 to 4"),
        ("upd","Community-building thread. Engage with people's stories. This isn't about the doge launch at all."),
        ("ph","POST 3  r/Qubic | April 5 [QUBIC]"),
        ("pt","common issues from the first couple weeks"),
        ("pb","been helping people with setup and these are the things that keep coming up:\nfirmware: make sure you're updated before trying to connect. this tripped up like half the people who had problems\nport 3333: some routers block it. check your firewall settings\nantivirus: windows defender flags some of the mining software. you gotta whitelist it\npayouts are looking decent from what people are sharing. i'm seeing about $1.80/day on my L3+ which is better than what i was getting on straight doge\nanyone having issues not covered above?"),
        ("upd_h","BETWEEN - April 6 to 8"),
        ("upd","Keep helping with setup. If new issues come up, address them. Be honest about stuff that isn't working well too."),
        ("ph","POST 4  r/Qubic | April 9 [GENERAL]"),
        ("pt","what other projects is this community watching"),
        ("pb","we're all obviously here because of qubic but curious what else is on people's radar. what other crypto or AI projects do you find interesting?\nnot competing projects necessarily, just stuff you follow. i've been looking into some distributed compute stuff and a few depin projects but nothing's grabbed me like this one did\nwhat's on your watchlist"),
        ("upd_h","BETWEEN - April 10 to 12"),
        ("upd","General community discussion. Engage with whatever people share. Don't gatekeep or dismiss other projects."),
        ("ph","POST 5  r/Qubic | April 13 [QUBIC]"),
        ("pt","one month in, how's everyone doing"),
        ("pb","it's been a month since the doge mining launch. figure it's a good time to check in\npersonally my L3+ has been solid. averaging about $1.85/day on the qubic setup vs maybe $1.45 on straight doge. not life changing but the machine isn't losing money anymore which is nice\nwhat are other people's experiences been like? any issues pop up that we should know about? and for the people who were skeptical early on, did it pan out better or worse than you expected"),
        ("h","If People Push Back"),
        ("body","If someone says the sub is an echo chamber, agree it's a risk and say you try to keep things honest. If something's broken, acknowledge it publicly. Don't sweep problems under the rug."),
        ("closing","You're a community member who helps out and keeps things real. Not a PR person, not staff. Just someone who's into the project."),
    ]


# ===================== TM6 - AI COMPUTE AMPLIFIER =====================
# 5 posts across r/compsci, r/LocalLLaMA, r/artificial, r/singularity.
# Posts 2 and 5 mention qubic. Posts 1, 3, 4 are general.
def tm6():
    return [
        ("title","TM6 - The AI Compute Amplifier"),
        ("sub","r/compsci | r/artificial | r/LocalLLaMA | r/singularity | April 1 - April 12"),
        ("h","Role"),
        ("body","You care about distributed compute and AI infrastructure. You don't care about crypto prices. You post about general compute topics. Qubic is one thing you noticed, mentioned briefly in a couple posts. Think CS nerd, not crypto bro."),
        ("h","Strategy"),
        ("body","Only 2 posts mention the project. The other 3 are general AI/compute discussions that establish you as someone who thinks about these topics broadly. Don't use crypto jargon in these subs. If someone says take your crypto stuff elsewhere, back off politely."),
        ("ph","POST 1  r/compsci | April 1 [GENERAL]"),
        ("pt","practical limits of distributed training on consumer hardware"),
        ("pb","been thinking about this. there's always someone claiming you can aggregate idle consumer hardware for useful distributed training. mining rigs, gaming PCs, whatever\nbut the coordination overhead seems insane. variable uptime, heterogeneous hardware, network latency between random residential connections\nhas anyone here actually tried distributed training across non-datacenter hardware? curious what the practical limits are. feels like it should work in theory but everything i've read suggests it's a nightmare"),
        ("upd_h","BETWEEN - April 1"),
        ("upd","Engage with anyone who has distributed training experience. Pure CS discussion. No project mentions."),
        ("ph","POST 2  r/artificial | April 1 [QUBIC]"),
        ("pt","mining hardware doing AI training - is the output actually useful"),
        ("pb","there's a network that launched a couple weeks ago routing crypto mining hardware toward AI training workloads. miners seem happy with the economics but that's not what i care about\nmy question: is the AI output useful? running hardware is easy, producing valuable compute is hard. a certik audit confirmed high throughput but throughput alone doesn't tell you about quality\nnobody independent has verified the training output yet. that's the gap that matters. has anyone here looked at how you'd even verify something like that?"),
        ("upd_h","BETWEEN - April 2 to 3"),
        ("upd","Engage with technical responses. If nobody has answers about verification, note that honestly. Don't fill gaps with speculation."),
        ("ph","POST 3  r/LocalLLaMA | April 4 [GENERAL]"),
        ("pt","local inference vs distributed training - which actually matters more for open AI"),
        ("pb","this community obviously cares about running models locally. but i've been wondering if the bigger problem is training, not inference\nlocal inference is cool but the models still get trained in datacenters. is there a path where training also gets distributed or is that fundamentally too hard?\nnot talking about any specific project, just the concept. what would it take for distributed training to actually work at a meaningful scale"),
        ("upd_h","BETWEEN - April 5 to 7"),
        ("upd","Engage with the LLM community on training challenges. If someone mentions specific projects, discuss the technical merits."),
        ("ph","POST 4  r/singularity | April 8 [GENERAL]"),
        ("pt","most underrated bottleneck in AI scaling"),
        ("pb","everyone talks about data, algorithms, funding. but i think the actual bottleneck nobody talks about is compute access\nthe big labs have massive GPU clusters. startups and researchers are stuck with whatever cloud credits they can beg for. the gap between who has compute and who doesn't is widening\nis this actually a problem or am i overthinking it? feels like AI progress might slow down not because of ideas but because compute is concentrated in like 5 companies"),
        ("upd_h","BETWEEN - April 9 to 11"),
        ("upd","General AI scaling discussion. Engage with whatever perspectives come in. Don't force any direction."),
        ("ph","POST 5  r/compsci | April 12 [QUBIC]"),
        ("pt","month of data on repurposed mining hardware for AI - does it matter"),
        ("pb","been loosely following a network (qubic) that routes mining hardware toward AI training. month of data now\nwhat was shown: existing mining hardware can run non-hashing workloads at scale. stable, good uptime, economics work for operators\nwhat wasn't shown: whether the training output competes with datacenter compute quality-wise. still unverified\nhonestly if the AI part turns out to be real that's a genuinely interesting approach to the compute access problem. if it's not then it's just a slightly better mining pool. someone needs to actually test the output"),
        ("h","If People Push Back"),
        ("body","If someone says take your crypto stuff elsewhere, say fair enough and that you were interested in the compute architecture. If they're still not interested, drop it. These subs respect honesty and will destroy you for shilling."),
        ("closing","You're a compute infrastructure nerd. Qubic caught your eye but you post about distributed systems and AI in general, not just one project."),
    ]


# ===================== TM7 - HARDWARE OWNER =====================
# 5 posts across r/nvidia, r/ASIC, r/buildapc, r/gpumining, r/hardware.
# Posts 2 and 4 mention qubic. Posts 1, 3, 5 are general hardware frustration.
def tm7():
    return [
        ("title","TM7 - The Hardware Owner"),
        ("sub","r/nvidia | r/ASIC | r/buildapc | r/gpumining | r/hardware | April 1 - April 13"),
        ("h","Role"),
        ("body","You own hardware that's mostly sitting idle. You have electricity bills. You're frustrated and post about it in hardware communities. Qubic is one of several things you've tried, not the center of your universe."),
        ("h","Strategy"),
        ("body","One post per sub. Only 2 mention qubic. The other 3 are general hardware frustration posts. Lead with the problem, not the solution. Don't mention qubic in titles. If someone asks what you're running, share the name and link in a reply."),
        ("ph","POST 1  r/nvidia | April 1 [GENERAL]"),
        ("pt","anyone else sitting on a gpu that does nothing 16 hours a day"),
        ("pb","got a 4080 that games maybe 2 hours a day and sits idle the rest. used to mine eth before the merge, now it's basically a space heater\nbeen looking for something to run on it when i'm not using it. folding@home feels kinda pointless, render farming seems complicated\nwhat's everyone actually doing with idle cards in 2026? or are we all just eating electricity for discord notifications"),
        ("upd_h","BETWEEN - April 1"),
        ("upd","Engage with whatever people suggest. Discuss alternatives genuinely. If someone mentions something interesting, ask about it. General idle hardware discussion."),
        ("ph","POST 2  r/ASIC | April 1 [QUBIC]"),
        ("pt","L3+ losing money every month, tried something new this week"),
        ("pb","my L3+ units cost about $1.54/day each in electricity and straight doge doesn't cover it. been losing money for months\ntried this thing called qubic that went live last week. pointed one unit at it, setup took maybe 20 minutes. power draw is exactly the same\ntoo early to know if it actually helps but figured i'd rather try something than keep losing money doing the same thing. anyone else tested this or am i the only one"),
        ("upd_h","BETWEEN - April 2 to 3"),
        ("upd","Reply to questions. If someone asks for setup details, share qubic.org/mining. If someone says just shut them down, honestly consider that answer."),
        ("ph","POST 3  r/buildapc | April 4 [GENERAL]"),
        ("pt","what do you run on your PC when you're sleeping"),
        ("pb","built a pretty solid rig last year and it just sits there most of the night doing nothing. feels wasteful\nused to do folding@home years ago. anyone doing something similar these days? doesn't have to make money, just hate seeing good hardware do nothing\nbonus points if it doesn't sound like a jet engine at 3am and my wife doesn't kill me"),
        ("upd_h","BETWEEN - April 5 to 7"),
        ("upd","General overnight computing discussion. Engage with whatever people suggest. Don't steer toward any specific project."),
        ("ph","POST 4  r/gpumining | April 8 [QUBIC]"),
        ("pt","post-merge gpu mining: found something that might not suck"),
        ("pb","like most of you my GPUs have been doing nothing useful since eth went PoS. tried a bunch of alt coins, mostly lost money\nbeen running my 4080 on this qubic thing for about two weeks. it routes compute toward AI training. the economics aren't amazing but i'm netting maybe $0.40-0.50/day after electricity which is infinitely better than $0/day\nnot the next ethereum or anything but at least the hardware is doing something. anyone else tried it? curious what others are getting"),
        ("upd_h","BETWEEN - April 9 to 12"),
        ("upd","Reply to hardware questions. If someone has better numbers or a different experience, engage with it. If someone suggests a better alternative, genuinely explore it."),
        ("ph","POST 5  r/hardware | April 13 [GENERAL]"),
        ("pt","the hardware graveyard thread - what's sitting idle in your house"),
        ("pb","i've got a small collection of hardware that's doing absolutely nothing. a couple ASICs from the mining days, a 4080 that games 2 hours/day, an old workstation\nthere's gotta be other people here with the same problem. what hardware are you sitting on and what (if anything) are you doing with it?\nstarting to think i should just sell everything on ebay and accept the loss but that feels like quitting"),
        ("h","If People Push Back"),
        ("body","If someone asks what you're running, tell them: qubic, qubic.org/mining. Only in replies, never volunteered. If someone says just sell your hardware, say they're probably right and you're stubborn. If someone suggests something better, genuinely try it."),
        ("closing","You're a hardware owner in multiple communities. Qubic is one thing you tried. Most of your posts are just hardware frustration."),
    ]


def main():
    OUT.mkdir(exist_ok=True)
    from gen_final_1 import save, tm1, tm1b, tm2, tm2b, tm3
    jobs = [
        ("TM1_April1_DOGE_Insider_Rewrite.docx", "TM1 DOGE Insider", tm1),
        ("TM1B_April1_DOGE_Advocate_Rewrite.docx", "TM1B DOGE Advocate", tm1b),
        ("TM2_April1_Crypto_Analyst_Rewrite.docx", "TM2 Crypto Analyst", tm2),
        ("TM2B_April1_OnChain_Skeptic_Rewrite.docx", "TM2B OnChain Skeptic", tm2b),
        ("TM3_April1_PoW_Bridge_Rewrite.docx", "TM3 PoW Bridge", tm3),
        ("TM4_April1_Mining_Specialist_Rewrite.docx", "TM4 Mining Specialist", tm4),
        ("TM5_April1_Community_Coordinator_Rewrite.docx", "TM5 Community Coordinator", tm5),
        ("TM6_April1_AI_Compute_Amplifier_Rewrite.docx", "TM6 AI Compute Amplifier", tm6),
        ("TM7_April1_Hardware_Owner_Rewrite.docx", "TM7 Hardware Owner", tm7),
    ]
    for fname, title, fn in jobs:
        save(OUT / fname, title, fn())
        print(fname)

if __name__ == "__main__":
    main()
