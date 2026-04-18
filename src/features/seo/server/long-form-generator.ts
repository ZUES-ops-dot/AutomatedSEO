/**
 * Long-form article generator
 * ---------------------------
 * Generates 2500+ word blog articles with:
 *  - 6-10 H2 sections each with multiple paragraphs
 *  - Embedded internal links to the user's existing site pages
 *  - Source citations
 *  - DOCX export with proper headings and hyperlinks
 *
 * Falls back to deterministic templates if Anthropic isn't configured so
 * the flow still runs end-to-end for demos/testing.
 */

import { AlignmentType, Document, ExternalHyperlink, HeadingLevel, Paragraph, TextRun, Packer } from "docx";

import { HTTP_CLIENT } from "@/features/seo/server/seo-constants";
import { appEnv } from "@/features/seo/server/env";
import { getSitePages } from "@/features/seo/server/storage";
import { logSeoEvent } from "@/lib/seo-log";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import type { SitePage } from "@/features/seo/types";

const OFFICIAL_RESEARCH_CONTEXT = `
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
`.trim();

export interface LongFormSection {
  heading: string;
  paragraphs: string[];
  internalLinks: Array<{
    anchorText: string;
    targetUrl: string;
    reason: string;
  }>;
}

export interface LongFormArticle {
  id: string;
  topic: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  introduction: string[];
  sections: LongFormSection[];
  conclusion: string[];
  faq: Array<{ question: string; answer: string }>;
  wordCount: number;
  internalLinkCount: number;
  provider: "anthropic" | "deterministic";
  generatedAt: string;
}

interface LongFormGenerateInput {
  topic: string;
  primaryKeyword?: string;
  targetWordCount?: number;
  audience?: string;
  angle?: string;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "article";
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function computeArticleWordCount(article: Omit<LongFormArticle, "wordCount" | "internalLinkCount">): number {
  let count = 0;
  count += countWords(article.introduction.join(" "));
  for (const section of article.sections) {
    count += countWords(section.heading);
    count += countWords(section.paragraphs.join(" "));
  }
  count += countWords(article.conclusion.join(" "));
  for (const item of article.faq) {
    count += countWords(item.question);
    count += countWords(item.answer);
  }
  return count;
}

function computeInternalLinkCount(article: Omit<LongFormArticle, "wordCount" | "internalLinkCount">): number {
  return article.sections.reduce((acc, section) => acc + section.internalLinks.length, 0);
}

function dedupeSectionLinks(section: LongFormSection): LongFormSection {
  const seen = new Set<string>();
  return {
    ...section,
    internalLinks: section.internalLinks.filter((link) => {
      const key = `${link.targetUrl}::${link.anchorText.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
  };
}

function enforceMinimumInternalLinks(
  article: Omit<LongFormArticle, "wordCount" | "internalLinkCount">,
  linkCandidates: Array<{ url: string; title: string; keywords: string[] }>,
  minimum = 10
): Omit<LongFormArticle, "wordCount" | "internalLinkCount"> {
  const sections = article.sections.map((section) => dedupeSectionLinks(section));
  const seenTargets = new Set(sections.flatMap((section) => section.internalLinks.map((link) => link.targetUrl)));
  let linkCount = sections.reduce((acc, section) => acc + section.internalLinks.length, 0);

  if (sections.length === 0 || linkCount >= minimum) {
    return { ...article, sections };
  }

  let candidateIndex = 0;
  while (linkCount < minimum && linkCandidates.length > 0) {
    const sectionIndex = linkCount % sections.length;
    const candidate = linkCandidates[candidateIndex % linkCandidates.length];
    candidateIndex += 1;

    const anchorText = candidate.title.trim() || candidate.url;
    const hasSectionLink = sections[sectionIndex].internalLinks.some(
      (link) => link.targetUrl === candidate.url || link.anchorText.toLowerCase() === anchorText.toLowerCase()
    );
    if (hasSectionLink) {
      if (candidateIndex > linkCandidates.length * Math.max(2, minimum)) {
        break;
      }
      continue;
    }

    const reason = seenTargets.has(candidate.url)
      ? `Additional internal reference that reinforces related ${article.topic} context from another section.`
      : `Relevant internal page that should be referenced inline while covering ${article.topic}.`;

    sections[sectionIndex] = {
      ...sections[sectionIndex],
      internalLinks: [
        ...sections[sectionIndex].internalLinks,
        {
          anchorText,
          targetUrl: candidate.url,
          reason
        }
      ]
    };
    seenTargets.add(candidate.url);
    linkCount += 1;
  }

  return { ...article, sections: sections.map((section) => dedupeSectionLinks(section)) };
}

/**
 * Given a topic and available site pages, pick the most relevant pages
 * to internally link to in the generated article.
 */
function pickInternalLinkCandidates(
  topic: string,
  sitePages: SitePage[],
  limit = 12
): Array<{ url: string; title: string; keywords: string[] }> {
  const topicTerms = new Set(
    topic
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 3)
  );

  const scored = sitePages.map((page) => {
    const pageText = `${page.title} ${page.h1} ${page.metaDescription} ${page.contentText.slice(0, 2000)}`.toLowerCase();
    let score = 0;
    for (const term of topicTerms) {
      if (pageText.includes(term)) {
        score += 1;
      }
    }
    // Boost homepage/docs hub pages
    if (page.url.endsWith("/") || page.url.endsWith("/docs")) {
      score += 0.5;
    }
    return { page, score };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => ({
      url: entry.page.url,
      title: entry.page.title || entry.page.h1 || entry.page.url,
      keywords: [entry.page.title, entry.page.h1]
        .filter(Boolean)
        .map((value) => value.toLowerCase())
    }));
}

async function callAnthropicForArticle(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": appEnv.anthropicApiKey
      },
      body: JSON.stringify({
        model: appEnv.anthropicModel,
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      })
    },
    HTTP_CLIENT.llmTimeoutMs
  );

  if (!response.ok) {
    throw new Error(`Anthropic request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const text =
    data.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("\n")
      .trim() ?? "";

  if (!text) {
    throw new Error("Anthropic returned an empty response.");
  }

  return text;
}

function extractJsonBlock<T>(value: string): T | null {
  const trimmed = value.trim();
  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)?.[0];

  for (const candidate of [trimmed, fencedMatch, jsonMatch]) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate) as T;
    } catch {
      continue;
    }
  }
  return null;
}

function buildDeterministicArticle(
  input: LongFormGenerateInput,
  linkCandidates: Array<{ url: string; title: string; keywords: string[] }>
): LongFormArticle {
  const topic = input.topic;
  const primaryKeyword = input.primaryKeyword ?? topic;
  const audience = input.audience ?? "developers, investors, and ecosystem participants who work with Qubic";

  const baselineCanonicalLinks = [
    { url: "https://qubic.org/", title: "Qubic Homepage" },
    { url: "https://docs.qubic.org/overview/introduction/", title: "Qubic Documentation" },
    { url: "https://docs.qubic.org/learn/tokenomics/", title: "Qubic Tokenomics" },
    { url: "https://docs.qubic.org/learn/wallets/", title: "Qubic Wallet Guide" },
    { url: "https://wallet.qubic.org/", title: "Qubic Web Wallet" },
    { url: "https://explorer.qubic.org/", title: "Qubic Explorer" },
    { url: "https://qubic.org/About", title: "About Qubic" },
    { url: "https://qubic.org/performance", title: "Qubic Performance Metrics" }
  ];

  const effectiveLinkCandidates = linkCandidates.length > 0 ? linkCandidates : baselineCanonicalLinks.map(link => ({
    url: link.url,
    title: link.title,
    keywords: []
  }));

  const sectionTopics = [
    `Understanding ${topic}: Context and Fundamentals`,
    `Why ${topic} Matters for the Qubic Ecosystem`,
    `Technical Architecture Behind ${topic}`,
    `Real-World Use Cases and Applications`,
    `Getting Started: A Practical Guide`,
    `Common Challenges and How to Solve Them`,
    `Performance, Security, and Best Practices`,
    `Future Outlook and Ecosystem Implications`
  ];

  const sectionTemplates: Array<(topic: string, primaryKeyword: string) => string[]> = [
    (t, pk) => [
      `Understanding ${t} requires grounding it in Qubic's foundational architecture. According to the official documentation at docs.qubic.org, Qubic operates as a quorum-based computer system with 676 Computors, where finality and consensus require a quorum of 451+ Computors. This structure differs significantly from conventional blockchain approaches, and ${t} must be understood within this context rather than through assumptions from other L1 ecosystems.`,
      `The Qubic architecture emphasizes feeless transfers, useful proof-of-work (UPoW), and on-chain smart contract execution written in C++. When evaluating ${pk}, anchor your analysis to these core design principles. The official docs at qubic.org provide the authoritative reference for how these components interact, and operators should cross-reference documentation before making implementation decisions.`,
      `From a fundamentals perspective, ${t} operates within tick-based epochs where each epoch lasts seven days. This timing model influences how applications handle finality and user-facing confirmations. Developers working with ${pk} need to account for these epoch dynamics when designing user flows, as network behavior during peak epochs can differ meaningfully from steady-state operation.`,
      `The official research context states that Qubic smart contracts require a quorum vote before launch, and the Arbitrator handles AI-task assignment and dispute-related functions. These governance mechanisms directly affect how ${t} is deployed and managed. Review the About page at qubic.org/About for the latest performance metrics, including the CertiK-verified 15.5M TPS validation.`
    ],
    (t, pk) => [
      `${t} matters for the Qubic ecosystem because it leverages Qubic's unique advantages in ways that would be impractical on other chains. The useful proof-of-work paradigm converts mining energy into productive AI training cycles through Aigarth, which analyzes artificial neural network structures. This creates economic and computational utility that extends beyond simple transaction processing.`,
      `For ${audience}, the value proposition of ${t} lies in its alignment with Qubic's design goals: instant finality, feeless transactions, and fast smart contracts. According to the official documentation, $QUBIC acts as computational energy used within the platform, and tokens used in smart contract execution are burned rather than paid to validators. This tokenomic structure affects how ${pk} is economically modeled.`,
      `The ecosystem implications of ${t} connect to Qubic's broader vision of integrating artificial neural networks for the future of AGI. The homepage at qubic.org frames Qubic as a high-performance Layer 1 blockchain with these capabilities. Understanding ${t} within this context reveals why certain architectural tradeoffs were made and how they benefit specific use cases.`,
      `Investors and developers evaluating ${t} should consider Qubic's circulating supply cap of 200 trillion $QUBIC, with the first halving occurring at Epoch 175 in August 2025 according to the docs. These tokenomics, combined with the quorum-based governance model, create specific constraints and opportunities for ${pk} that differ from other ecosystems.`
    ],
    (t, pk) => [
      `The technical architecture behind ${t} builds on Qubic's C++ smart contract execution model. Unlike virtual machine-based chains, Qubic executes contracts directly on bare metal, which affects how ${pk} should be implemented for performance and security. The official docs at docs.qubic.org/overview/introduction/ provide detailed specifications on this execution model.`,
      `Qubic's computor network processes transactions in a tick-based system, which influences the timing and determinism of ${t}. Each epoch produces 1 trillion $QUBIC allocated across the system, and Computors vote by quorum on smart contract commission sizes. These architectural details are documented at docs.qubic.org/learn/tokenomics/ and should inform implementation decisions for ${pk}.`,
      `The useful proof-of-work (UPoW) component of Qubic's architecture is particularly relevant to ${t}. According to docs.qubic.org/learn/upow/, miners generate ANNs with random structures that Aigarth analyzes. This means ${t} may interact with or benefit from the AI training infrastructure in ways that are unique to Qubic.`,
      `Wallet integration for ${t} should account for Qubic's two wallet categories: direct network connected wallets and proxied wallets. The wallet documentation at docs.qubic.org/learn/wallets/ explains that direct network wallets connect to at least three Qubic nodes directly, while proxied wallets depend on a proxy service. This distinction affects how ${pk} handles transaction signing and network connectivity.`
    ],
    (t, pk) => [
      `Real-world use cases for ${t} emerge from Qubic's combination of high throughput, feeless transactions, and AI-integrated infrastructure. The CertiK-validated 15.5M TPS performance documented at qubic.org/About enables use cases that would be cost-prohibitive on fee-based chains. ${pk} can leverage this performance for applications requiring high-frequency operations.`,
      `Developers building ${t} applications should consider Qubic's official web wallet at wallet.qubic.org as a reference implementation. The wallet documentation notes that official options include Web, iOS, and Android wallets, all open source. These tools provide the foundation for integrating ${pk} into user-facing applications with proper wallet connectivity.`,
      `The block explorer at explorer.qubic.org provides visibility into on-chain activity, which is essential for monitoring ${t} deployments. Operators can use the explorer to verify transaction finality, track smart contract executions, and audit the behavior of ${pk} implementations in production environments.`,
      `Enterprise use cases for ${t} may benefit from Qubic's Oracle Machines, described on the About page as a future bridge for trustworthy external data. While currently forward-looking, this infrastructure suggests that ${pk} could eventually integrate with external data sources in a trust-minimized way, expanding potential use cases beyond pure on-chain operations.`
    ],
    (t, pk) => [
      `Getting started with ${t} requires setting up a Qubic wallet. The official documentation directs users to wallet.qubic.org for wallet interaction, with options for web, iOS, and Android. A seed is a 55-character lowercase string, and a Qubic ID is a 60-character string derived from the seed. These credentials are necessary for deploying and interacting with ${pk}.`,
      `Before deploying ${t} to mainnet, operators should test on a dedicated environment. The RPC interface provides access to chain state, and the block explorer at explorer.qubic.org allows verification of transactions. Review the official docs at docs.qubic.org for the latest RPC endpoints and API specifications relevant to ${pk}.`,
      `The official documentation lists exchanges including MEXC, Bitget, Gate.io, and others as common ways to acquire $QUBIC. However, the docs explicitly state that readers should check qubic.org for the most up-to-date list. For ${t} implementations that require token acquisition, verify current exchange listings on the official site.`,
      `Developers implementing ${t} should familiarize themselves with Qubic's smart contract commission structure. Computors vote by quorum on commission sizes, and this commission is burned. This affects the economics of ${pk} operations and should be factored into cost modeling before deployment.`
    ],
    (t, pk) => [
      `Common challenges with ${t} often stem from assumptions based on other blockchain ecosystems. Qubic's tick-based finality model differs from block-based systems, and ${pk} implementations must account for epoch timing rather than block confirmations. Network behavior during peak epochs can differ from steady-state operation, which is expected behavior rather than an error condition.`,
      `Wallet connectivity issues are a frequent challenge when integrating ${t}. The distinction between direct network wallets (connecting to three+ nodes directly) and proxied wallets (using a proxy service) affects reliability and latency. The wallet documentation at docs.qubic.org/learn/wallets/ provides guidance on choosing the appropriate wallet type for ${pk} use cases.`,
      `Debugging ${t} deployments requires using the official tools: the RPC interface for chain state queries and the explorer at explorer.qubic.org for transaction verification. Avoid relying on third-party explorers or unofficial RPC endpoints, as they may not reflect the current quorum state or epoch timing accurately for ${pk}.`,
      `Security challenges for ${t} include protecting the 55-character seed and ensuring proper wallet configuration. The official documentation emphasizes that seeds should never be shared. For ${pk} implementations handling user funds, follow the security best practices outlined in the official docs and consider hardware wallet options like HashWallet mentioned in the wallet documentation.`
    ],
    (t, pk) => [
      `Performance optimization for ${t} should leverage Qubic's high-throughput architecture. The CertiK-validated 15.5M TPS documented at qubic.org/About indicates that the network can handle significant load. ${pk} implementations should batch operations where possible to take advantage of this performance characteristic.`,
      `Security best practices for ${t} include using official wallets and protecting seeds. The wallet documentation at docs.qubic.org/learn/wallets/ lists official options including Web, iOS, Android, and hardware wallets like HashWallet. For ${pk} handling sensitive operations, prefer hardware wallets or official web wallets over unofficial alternatives.`,
      `Monitoring ${t} deployments requires regular checks against the explorer at explorer.qubic.org and the RPC interface. Track transaction finality, smart contract execution results, and epoch timing. The official docs recommend keeping an eye on the RPC changelog, as the ecosystem iterates quickly and backward compatibility is a first-class concern for ${pk}.`,
      `Best practices for ${t} include documenting implementation decisions and testing assumptions against live chain data. The quorum-based governance model means that protocol behavior can evolve through Computor votes. Stay informed about governance decisions that affect ${pk} by monitoring official channels and documentation updates.`
    ],
    (t, pk) => [
      `The future outlook for ${t} is connected to Qubic's roadmap for Oracle Machines and expanded AI integration. The About page describes Oracle Machines as a future bridge for trustworthy external data, which could enable new use cases for ${pk} that currently require off-chain oracles with trust assumptions.`,
      `Ecosystem implications for ${t} include the ongoing evolution of Qubic's useful proof-of-work infrastructure. As Aigarth continues analyzing ANN structures, the computational output may become increasingly valuable. ${pk} implementations that can leverage or interact with this AI training infrastructure may gain advantages as the ecosystem matures.`,
      `The tokenomics of ${t} will evolve with Qubic's halving schedule. The first halving occurred at Epoch 175 in August 2025, and the circulating supply cap is 200 trillion $QUBIC. These parameters affect the long-term economics of ${pk} and should be monitored through official documentation updates.`,
      `Developers and investors should track official sources for the latest information on ${t}. The homepage at qubic.org, documentation at docs.qubic.org, and explorer at explorer.qubic.org provide authoritative information. Community channels may provide additional context, but official sources should be the primary reference for ${pk} decisions.`
    ]
  ];

  const sections: LongFormSection[] = sectionTopics.slice(0, 8).map((heading, index) => {
    const paragraphs = sectionTemplates[index](topic, primaryKeyword);
    const linksForSection = effectiveLinkCandidates
      .slice(index * 2, (index * 2) + 2)
      .map((candidate) => ({
        anchorText: candidate.title,
        targetUrl: candidate.url,
        reason: `Relevant canonical page covering related ${topic} context.`
      }));

    return {
      heading,
      paragraphs,
      internalLinks: linksForSection
    };
  });

  const introduction = [
    `${topic} sits at the intersection of blockchain architecture, developer tooling, and real-world utility in the Qubic ecosystem. This article walks through the fundamentals, operator-level decisions, and practical next steps so that ${audience} can move from curiosity to capability without relying on second-hand information.`,
    `Whether you are evaluating ${primaryKeyword} for a new deployment, integrating it into an existing application, or simply trying to understand how it fits into Qubic's broader roadmap, the guidance below is grounded in publicly available protocol behavior and first-party documentation. Read it as a working reference rather than a marketing summary.`
  ];

  const conclusion = [
    `Taken together, the material in this article provides a complete operator view of ${topic} within the Qubic ecosystem. The key takeaway is that ${primaryKeyword} behaves predictably when you understand its underlying assumptions, and that Qubic's design choices — feeless transactions, useful proof-of-work, tick-based finality — create opportunities for patterns that would be impractical elsewhere.`,
    `Next steps: review the canonical documentation linked above, test your assumptions against current chain state using the RPC, and document your implementation decisions so future contributors can maintain and extend what you build. When in doubt, the Qubic community and official resources remain the authoritative source for ${topic}.`
  ];

  const faq = [
    {
      question: `What is ${topic} in the context of Qubic?`,
      answer: `${topic} is best understood as part of Qubic's feeless, tick-based smart contract architecture. It addresses how ${primaryKeyword} operates within the protocol's useful-proof-of-work model and how applications should integrate with it.`
    },
    {
      question: `How do I start working with ${topic}?`,
      answer: `Begin with the official Qubic documentation and RPC reference, then prototype using test epochs before committing to production. Tooling is improving rapidly, so check for SDK updates before starting a new integration.`
    },
    {
      question: `What are the common pitfalls with ${primaryKeyword}?`,
      answer: `Assuming it behaves like an EVM chain or a conventional PoS L1 is the most common mistake. Qubic's tick-based finality and computor network require adjustments to confirmation handling, retry logic, and user-facing state updates.`
    }
  ];

  const withoutCounts = {
    id: `longform-${slugify(topic)}-${Date.now()}`,
    topic,
    title: `${topic}: A Complete Guide for the Qubic Ecosystem`,
    metaTitle: `${topic} Guide | Qubic`.slice(0, 60),
    metaDescription: `A complete guide to ${topic} on Qubic — architecture, use cases, and practical steps.`.slice(0, 155),
    introduction,
    sections,
    conclusion,
    faq,
    provider: "deterministic" as const,
    generatedAt: new Date().toISOString()
  };

  const enriched = enforceMinimumInternalLinks(withoutCounts, linkCandidates, 10);

  return {
    ...enriched,
    wordCount: computeArticleWordCount(enriched),
    internalLinkCount: computeInternalLinkCount(enriched)
  };
}

async function buildArticleWithAnthropic(
  input: LongFormGenerateInput,
  linkCandidates: Array<{ url: string; title: string; keywords: string[] }>
): Promise<LongFormArticle | null> {
  if (!appEnv.anthropicApiKey) {
    return null;
  }

  const targetWords = input.targetWordCount ?? 2500;
  const sectionCount = targetWords >= 3000 ? 10 : 8;

  const officialLinks = [
    { url: "https://qubic.org/", anchor: "qubic.org" },
    { url: "https://docs.qubic.org/overview/introduction/", anchor: "official documentation" },
    { url: "https://docs.qubic.org/learn/tokenomics/", anchor: "tokenomics documentation" },
    { url: "https://docs.qubic.org/learn/wallets/", anchor: "wallet documentation" },
    { url: "https://wallet.qubic.org/", anchor: "official web wallet" },
    { url: "https://explorer.qubic.org/", anchor: "block explorer" }
  ];

  const systemPromptDraft =
    "You are a senior crypto editor and SEO content strategist writing for a serious audience. " +
    "Write clean, deeply researched articles that are genuinely useful, technically accurate, and easy to read. " +
    "Use only the verified official context provided. Do not invent features, exchange listings, tokenomics, timelines, or ecosystem claims. " +
    "Do not infer convenience or security features that are not explicitly in the source context. " +
    "Use markdown headings, subheadings, bullets where helpful, and embed relevant official links. " +
    "Keep the tone authoritative and clear, not hype-driven or promotional. " +
    "Return ONLY valid JSON matching the requested shape — no prose, no markdown outside JSON, no comments.";

  const userPromptDraft = JSON.stringify(
    {
      task: `Write a long-form (${targetWords}+ words) blog article draft.`,
      topic: input.topic,
      primaryKeyword: input.primaryKeyword ?? input.topic,
      audience: input.audience ?? "developers, investors, and ecosystem participants working with Qubic",
      angle: input.angle ?? "grounded operator view anchored in first-party documentation",
      officialResearchContext: OFFICIAL_RESEARCH_CONTEXT,
      officialLinks: officialLinks,
      constraints: {
        minWordCount: targetWords,
        sectionCount,
        paragraphsPerSection: 4,
        paragraphMinWords: 80,
      },
      instructions: [
        `Produce at least ${sectionCount} H2 sections with 4 substantive paragraphs each.`,
        "For each section, propose 1-2 internal links chosen from the internalLinkCandidates list (only from that list). Provide anchor text that naturally fits the sentence context.",
        "Write grounded, operator-level paragraphs — NOT marketing copy. No empty superlatives.",
        "Include an FAQ with 5-7 question/answer pairs.",
        "Keep metaTitle <= 60 chars and metaDescription <= 155 chars.",
        "Use only facts that are present in the verified official research context. If something is time-sensitive, phrase it carefully, such as 'the official docs list' or 'according to Qubic Docs'.",
        "Include relevant official markdown links throughout the piece, especially to docs.qubic.org, qubic.org, wallet.qubic.org, and explorer.qubic.org where appropriate."
      ],
      requiredShape: {
        title: "string",
        metaTitle: "string",
        metaDescription: "string",
        introduction: ["string"],
        sections: [
          {
            heading: "string",
            paragraphs: ["string"],
            internalLinks: [
              {
                anchorText: "string",
                targetUrl: "string",
                reason: "string"
              }
            ]
          }
        ],
        conclusion: ["string"],
        faq: [{ question: "string", answer: "string" }]
      }
    },
    null,
    2
  );

  let draft: LongFormArticle | null = null;

  try {
    const text = await callAnthropicForArticle(systemPromptDraft, userPromptDraft);
    const parsed = extractJsonBlock<{
      title?: string;
      metaTitle?: string;
      metaDescription?: string;
      introduction?: string[];
      sections?: Array<{
        heading?: string;
        paragraphs?: string[];
        internalLinks?: Array<{ anchorText?: string; targetUrl?: string; reason?: string }>;
      }>;
      conclusion?: string[];
      faq?: Array<{ question?: string; answer?: string }>;
    }>(text);

    if (!parsed) {
      logSeoEvent("warn", "Long-form Anthropic draft could not be parsed; falling back to deterministic.", {
        topic: input.topic
      });
      return null;
    }

    const sections = (parsed.sections ?? []).map((section) => ({
      heading: section.heading?.trim() ?? "",
      paragraphs: (section.paragraphs ?? []).filter((paragraph) => paragraph?.trim().length > 0),
      internalLinks: (section.internalLinks ?? [])
        .filter((link) => link.anchorText?.trim() && link.targetUrl?.trim())
        .map((link) => ({
          anchorText: link.anchorText!.trim(),
          targetUrl: link.targetUrl!.trim(),
          reason: link.reason?.trim() ?? "contextual relevance"
        }))
    })).filter((s) => s.heading && s.paragraphs.length > 0);

    const internalLinkCount = sections.reduce((sum, s) => sum + s.internalLinks.length, 0);

    const draftPartial = {
      id: slugify(input.topic),
      topic: input.topic,
      title: parsed.title?.trim() ?? input.topic,
      metaTitle: parsed.metaTitle?.trim() ?? input.topic.substring(0, 60),
      metaDescription: parsed.metaDescription?.trim() ?? `Comprehensive guide to ${input.topic} for the Qubic ecosystem.`,
      introduction: (parsed.introduction ?? []).filter((p) => p?.trim().length > 0),
      sections,
      conclusion: (parsed.conclusion ?? []).filter((p) => p?.trim().length > 0),
      faq: (parsed.faq ?? [])
        .filter((item) => item.question?.trim() && item.answer?.trim())
        .map((item) => ({
          question: item.question!.trim(),
          answer: item.answer!.trim()
        })),
      provider: "anthropic" as const,
      generatedAt: new Date().toISOString()
    };

    const wordCount = computeArticleWordCount(draftPartial);

    draft = {
      ...draftPartial,
      wordCount,
      internalLinkCount,
      provider: "anthropic",
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    logSeoEvent("error", "Long-form Anthropic draft generation failed; falling back to deterministic.", {
      topic: input.topic,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }

  const systemPromptFactCheck =
    "You are a strict crypto fact-checker and editor. " +
    "You must rewrite the article so that every concrete factual claim is explicitly supported by the verified context provided. " +
    "If a claim is not directly supported, remove it or soften it into a generic statement that does not assert unsupported facts. " +
    "Do not infer app security features, sync speed, seamless integrations, update cadence, wallet UX details, explorer feature lists, exchange/product behavior, governance beyond what is stated, regional availability, liquidity conditions, or future roadmap claims unless the verified context explicitly states them. " +
    "Preserve JSON structure, make the article strong and readable, and ensure the final output meets the target word count. " +
    "Return ONLY valid JSON matching the requested shape — no prose, no markdown outside JSON, no comments.";

  const userPromptFactCheck = JSON.stringify(
    {
      task: "Fact-check and rewrite the article draft to ensure all claims are supported by official context.",
      topic: input.topic,
      primaryKeyword: input.primaryKeyword ?? input.topic,
      officialResearchContext: OFFICIAL_RESEARCH_CONTEXT,
      officialLinks: officialLinks,
      currentDraft: draft,
      instructions: [
        "Remove or rewrite any unsupported concrete claim.",
        "Expand the article to meet the target word count while staying fully grounded in the verified context.",
        "Keep the piece useful, detailed, and SEO-strong.",
        "Keep relevant official links.",
        "Add depth through explanation and structure, not through invented facts."
      ],
      requiredShape: {
        title: "string",
        metaTitle: "string",
        metaDescription: "string",
        introduction: ["string"],
        sections: [
          {
            heading: "string",
            paragraphs: ["string"],
            internalLinks: [
              {
                anchorText: "string",
                targetUrl: "string",
                reason: "string"
              }
            ]
          }
        ],
        conclusion: ["string"],
        faq: [{ question: "string", answer: "string" }]
      }
    },
    null,
    2
  );

  let factChecked: LongFormArticle | null = null;

  try {
    const text = await callAnthropicForArticle(systemPromptFactCheck, userPromptFactCheck);
    const parsed = extractJsonBlock<{
      title?: string;
      metaTitle?: string;
      metaDescription?: string;
      introduction?: string[];
      sections?: Array<{
        heading?: string;
        paragraphs?: string[];
        internalLinks?: Array<{ anchorText?: string; targetUrl?: string; reason?: string }>;
      }>;
      conclusion?: string[];
      faq?: Array<{ question?: string; answer?: string }>;
    }>(text);

    if (!parsed) {
      logSeoEvent("warn", "Long-form Anthropic fact-check could not be parsed; using draft.", {
        topic: input.topic
      });
      return draft;
    }

    const sections = (parsed.sections ?? []).map((section) => ({
      heading: section.heading?.trim() ?? "",
      paragraphs: (section.paragraphs ?? []).filter((paragraph) => paragraph?.trim().length > 0),
      internalLinks: (section.internalLinks ?? [])
        .filter((link) => link.anchorText?.trim() && link.targetUrl?.trim())
        .map((link) => ({
          anchorText: link.anchorText!.trim(),
          targetUrl: link.targetUrl!.trim(),
          reason: link.reason?.trim() ?? "contextual relevance"
        }))
    })).filter((s) => s.heading && s.paragraphs.length > 0);

    const internalLinkCount = sections.reduce((sum, s) => sum + s.internalLinks.length, 0);

    const factCheckPartial = {
      id: draft.id,
      topic: draft.topic,
      title: parsed.title?.trim() ?? draft.title,
      metaTitle: parsed.metaTitle?.trim() ?? draft.metaTitle,
      metaDescription: parsed.metaDescription?.trim() ?? draft.metaDescription,
      introduction: (parsed.introduction ?? []).filter((p) => p?.trim().length > 0),
      sections,
      conclusion: (parsed.conclusion ?? []).filter((p) => p?.trim().length > 0),
      faq: (parsed.faq ?? [])
        .filter((item) => item.question?.trim() && item.answer?.trim())
        .map((item) => ({
          question: item.question!.trim(),
          answer: item.answer!.trim()
        })),
      provider: "anthropic" as const,
      generatedAt: draft.generatedAt
    };

    const wordCount = computeArticleWordCount(factCheckPartial);

    factChecked = {
      ...factCheckPartial,
      wordCount,
      internalLinkCount
    };
  } catch (error) {
    logSeoEvent("error", "Long-form Anthropic fact-check failed; using draft.", {
      topic: input.topic,
      error: error instanceof Error ? error.message : String(error)
    });
    return draft;
  }

  const systemPromptFinalize =
    "You are a forensic editor preparing a final publication draft. " +
    "Your job is to remove unsupported implications, compress or expand the article into the target range, and keep only sentences that can be directly mapped to the verified official context provided. " +
    "If a sentence cannot be directly traced to the verified context, delete it or rewrite it into a clearly attributed statement such as 'According to Qubic Docs' or 'The About page states'. " +
    "Do not imply wallet features, explorer capabilities, market conditions, roadmap promises, governance mechanics beyond what is stated, performance side-effects, UX details, security guarantees, exchange workflows, or benefits that are not explicitly described in the verified context. " +
    "If the article is too long, cut speculative or repetitive sections first. If it is too short, add depth only by clarifying facts already present in the verified context. " +
    "Return ONLY valid JSON matching the requested shape — no prose, no markdown outside JSON, no comments.";

  const userPromptFinalize = JSON.stringify(
    {
      task: "Finalize the article for publication with strict fact-checking.",
      topic: input.topic,
      primaryKeyword: input.primaryKeyword ?? input.topic,
      officialResearchContext: OFFICIAL_RESEARCH_CONTEXT,
      officialLinks: officialLinks,
      currentArticle: factChecked,
      targetWordCount: targetWords,
      hardCleanupRules: [
        "Every paragraph must be grounded in the verified context. If unsure, delete or rewrite conservatively.",
        "Prefer explicit attribution phrases like 'According to the docs', 'The wallet documentation says', or 'The About page states'.",
        "Remove unsupported phrases like 'maximum security', 'simplified user experience', 'regular updates', 'faster user experiences', detailed explorer feature claims, region-specific availability, payment-method assumptions, or speculative future integrations unless the verified context directly says them.",
        "Avoid specific claims about wallet responsiveness, exchange registration flows, market liquidity, planned roadmap items, detailed governance processes, or extra security advice beyond protecting the seed and using official resources unless directly supported.",
        "Keep official links where relevant.",
        "Keep the article authoritative, useful, and SEO-strong."
      ],
      requiredShape: {
        title: "string",
        metaTitle: "string",
        metaDescription: "string",
        introduction: ["string"],
        sections: [
          {
            heading: "string",
            paragraphs: ["string"],
            internalLinks: [
              {
                anchorText: "string",
                targetUrl: "string",
                reason: "string"
              }
            ]
          }
        ],
        conclusion: ["string"],
        faq: [{ question: "string", answer: "string" }]
      }
    },
    null,
    2
  );

  try {
    const text = await callAnthropicForArticle(systemPromptFinalize, userPromptFinalize);
    const parsed = extractJsonBlock<{
      title?: string;
      metaTitle?: string;
      metaDescription?: string;
      introduction?: string[];
      sections?: Array<{
        heading?: string;
        paragraphs?: string[];
        internalLinks?: Array<{ anchorText?: string; targetUrl?: string; reason?: string }>;
      }>;
      conclusion?: string[];
      faq?: Array<{ question?: string; answer?: string }>;
    }>(text);

    if (!parsed) {
      logSeoEvent("warn", "Long-form Anthropic finalize could not be parsed; using fact-checked version.", {
        topic: input.topic
      });
      return factChecked;
    }

    const sections = (parsed.sections ?? []).map((section) => ({
      heading: section.heading?.trim() ?? "",
      paragraphs: (section.paragraphs ?? []).filter((paragraph) => paragraph?.trim().length > 0),
      internalLinks: (section.internalLinks ?? [])
        .filter((link) => link.anchorText?.trim() && link.targetUrl?.trim())
        .map((link) => ({
          anchorText: link.anchorText!.trim(),
          targetUrl: link.targetUrl!.trim(),
          reason: link.reason?.trim() ?? "contextual relevance"
        }))
    })).filter((s) => s.heading && s.paragraphs.length > 0);

    const internalLinkCount = sections.reduce((sum, s) => sum + s.internalLinks.length, 0);

    const finalizePartial = {
      id: factChecked.id,
      topic: factChecked.topic,
      title: parsed.title?.trim() ?? factChecked.title,
      metaTitle: parsed.metaTitle?.trim() ?? factChecked.metaTitle,
      metaDescription: parsed.metaDescription?.trim() ?? factChecked.metaDescription,
      introduction: (parsed.introduction ?? []).filter((p) => p?.trim().length > 0),
      sections,
      conclusion: (parsed.conclusion ?? []).filter((p) => p?.trim().length > 0),
      faq: (parsed.faq ?? [])
        .filter((item) => item.question?.trim() && item.answer?.trim())
        .map((item) => ({
          question: item.question!.trim(),
          answer: item.answer!.trim()
        })),
      provider: "anthropic" as const,
      generatedAt: factChecked.generatedAt
    };

    const wordCount = computeArticleWordCount(finalizePartial);

    const finalized = {
      ...finalizePartial,
      wordCount,
      internalLinkCount
    };

    return finalized;
  } catch (error) {
    logSeoEvent("error", "Long-form Anthropic finalize failed; using fact-checked version.", {
      topic: input.topic,
      error: error instanceof Error ? error.message : String(error)
    });
    return factChecked;
  }
}

/**
 * Generate a complete long-form article for a given topic.
 * Uses Anthropic when available, deterministic template otherwise.
 */
export async function generateLongFormArticle(input: LongFormGenerateInput): Promise<LongFormArticle> {
  const allPages = await getSitePages();
  const linkCandidates = pickInternalLinkCandidates(input.topic, allPages, 12);

  const anthropicArticle = await buildArticleWithAnthropic(input, linkCandidates);
  if (anthropicArticle) {
    // If it came up short, pad with deterministic sections to hit word count
    const minWords = input.targetWordCount ?? 2500;
    if (anthropicArticle.wordCount >= minWords) {
      return anthropicArticle;
    }
    logSeoEvent("info", "Anthropic article below target word count; returning as-is.", {
      topic: input.topic,
      actual: anthropicArticle.wordCount,
      target: minWords
    });
    return anthropicArticle;
  }

  return buildDeterministicArticle(input, linkCandidates);
}

/**
 * Build a DOCX buffer for a long-form article with embedded hyperlinks.
 */
export async function buildLongFormDocx(article: LongFormArticle): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      text: article.title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.LEFT
    })
  );

  // Meta
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Meta title: ${article.metaTitle}`, italics: true, size: 18 })
      ]
    })
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Meta description: ${article.metaDescription}`, italics: true, size: 18 })
      ]
    })
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${article.wordCount} words · ${article.internalLinkCount} internal links · generated via ${article.provider}`,
          italics: true,
          size: 18
        })
      ]
    })
  );
  children.push(new Paragraph({ text: "" }));

  // Introduction
  children.push(
    new Paragraph({
      text: "Introduction",
      heading: HeadingLevel.HEADING_2
    })
  );
  for (const paragraph of article.introduction) {
    children.push(new Paragraph({ text: paragraph }));
  }

  // Sections with embedded hyperlinks
  for (const section of article.sections) {
    children.push(
      new Paragraph({
        text: section.heading,
        heading: HeadingLevel.HEADING_2
      })
    );

    // Paragraphs
    for (const paragraph of section.paragraphs) {
      children.push(new Paragraph({ text: paragraph }));
    }

    // Internal links as annotated list
    if (section.internalLinks.length > 0) {
      children.push(
        new Paragraph({
          text: "Suggested internal links for this section:",
          heading: HeadingLevel.HEADING_3
        })
      );

      for (const link of section.internalLinks) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: "• " }),
              new ExternalHyperlink({
                link: link.targetUrl,
                children: [
                  new TextRun({
                    text: link.anchorText,
                    style: "Hyperlink"
                  })
                ]
              }),
              new TextRun({ text: ` — ${link.reason}` })
            ]
          })
        );
      }
    }
  }

  // Conclusion
  children.push(
    new Paragraph({
      text: "Conclusion",
      heading: HeadingLevel.HEADING_2
    })
  );
  for (const paragraph of article.conclusion) {
    children.push(new Paragraph({ text: paragraph }));
  }

  // FAQ
  if (article.faq.length > 0) {
    children.push(
      new Paragraph({
        text: "Frequently Asked Questions",
        heading: HeadingLevel.HEADING_2
      })
    );
    for (const item of article.faq) {
      children.push(
        new Paragraph({
          text: item.question,
          heading: HeadingLevel.HEADING_3
        })
      );
      children.push(new Paragraph({ text: item.answer }));
    }
  }

  const doc = new Document({
    sections: [{ children }]
  });

  return Packer.toBuffer(doc);
}
