# LiveTry Lead Research Workflow

## Purpose

Use the isolated Agent Reach CLI to find and qualify public, evidence-backed prospects for LiveTry. This workflow is research-only: it never posts, comments, likes, sends messages, logs in for a user, or guesses contact details.

## Required output for every lead

Return one record per company or account with:

- **Lead / company name**
- **Platform and public profile/account URL**
- **Official website** (if found)
- **Public business email** (only when explicitly published by the business or its representative)
- **Public business phone** (only when explicitly published by the business; label country/region)
- **Public contact page**
- **Relevant person and public role** (only if clearly supported by a source)
- **Business category, market, and location**
- **Evidence of the problem**: quote or faithful summary, source URL, date, and platform
- **Trigger / buying signal**: hiring, launch, redesign, expansion, funding, customer complaints, or similar
- **LiveTry relevance**: why the evidence suggests visual uncertainty, styling uncertainty, or apparel ecommerce conversion could matter
- **Recommended outreach angle**
- **Lead score (0-100)**
- **Confidence**: high, medium, or low
- **Research timestamp**

Never fill a missing phone number or email with a guess. Use `not found` and list the pages searched.

## LiveTry positioning boundary

Describe LiveTry as a visual styling and drape experience: it helps shoppers understand **how a garment looks on them**. Do not claim that it measures body size, predicts S/M/L/XL fit, or performs biometric fitting. Use the product disclaimer: "Shows how it looks, not how it fits."

## Suggested research sequence

1. Discover companies from public web search and platform-specific discussions.
2. Search for pain evidence around product-page uncertainty, styling, apparel returns, product visualization, or ecommerce conversion.
3. Verify the company on its official website.
4. Look for a public contact page, public business email, phone, or named business role.
5. Look for a buying signal such as an ecommerce, digital, product, merchandising, or customer-experience job posting.
6. Deduplicate by official domain and company name.
7. Score the lead only when a source URL supports the claim.
8. Export or present the results for human review before any outreach.

## Recommended Agent Reach queries

### General web

```bash
agent-reach web search "apparel ecommerce brand virtual try on"
agent-reach web search "fashion ecommerce returns product visualization"
agent-reach web search "Shopify clothing brand ecommerce director hiring"
agent-reach web search "site:example.com contact ecommerce fashion"
```

### Reddit

```bash
agent-reach reddit search "fashion ecommerce sizing returns product page" --limit 10
agent-reach reddit search "Shopify apparel conversion product images" --limit 10
agent-reach reddit subreddit ecommerce --limit 10
agent-reach reddit read <public-post-url>
```

Reddit posts and comments are pain-signal evidence, not proof that the author is a qualified buyer. Verify the company independently.

### LinkedIn

```bash
agent-reach linkedin jobs "ecommerce apparel" --location "United States" --limit 10
agent-reach linkedin jobs "fashion ecommerce product" --location "United Kingdom" --limit 10
agent-reach linkedin read <public-job-url>
```

The LinkedIn adapter provides public job search and job-description reading. It does not guarantee contact profiles, private email addresses, or LinkedIn messaging.

### X / Instagram / Facebook / Xiaohongshu

Use these only when the channel is enabled and the content is publicly accessible. Treat posts, profiles, and comments as signals to verify, not as complete company records. Experimental adapters may be unavailable or rate-limited.

## Scoring rubric

- 25: apparel or footwear ecommerce company
- 25: direct evidence of visual, styling, product-page, or apparel-return friction
- 20: active ecommerce, product, digital, merchandising, or CX hiring signal
- 10: visible ecommerce store or product catalog
- 10: recent launch, redesign, expansion, or growth signal
- 10: public business contact or clearly identified decision-maker

Prioritize scores of 70 or more. A high score never replaces human verification.

## Safety and compliance

- Use public, business-relevant information only.
- Do not collect passwords, cookies, private messages, hidden profile data, or sensitive personal data.
- Do not infer emails from naming patterns or guess phone numbers.
- Respect each platform's terms, rate limits, robots restrictions, and applicable privacy/anti-spam laws.
- Keep the source URL next to every material claim.
- Do not automatically contact a lead. Human review and a separate approved outreach process are required.
