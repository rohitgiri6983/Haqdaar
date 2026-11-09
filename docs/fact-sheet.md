# Fact Sheet for Solution Doc (Haqdaar — Problem 2)

*This document contains factual bullets, estimates, and data points to draw from when authoring the 2-page PDF submission.*

---

## 1. System Architecture: Responsibility Division

### What is Handled by the AI:
- **Conversational Parsing & Story Structuring:** Ingesting colloquial, emotional, multi-lingual, and unstructured user statements and organizing them into chronological events, involved parties, claimed amounts, and location.
- **Issue Classification:** Categorizing grievances into one of 12 domains (rent deposit, consumer defect, wage withholding, cheque bounce, cyber fraud, RTI, police refusal, etc.).
- **Missing Information Identification:** Generating 1–2 culturally attuned follow-up questions in the user's spoken language to fill critical evidentiary holes.
- **Document First Drafting:** Generating draft legal notices, consumer grievances, RTI queries, and replies following standard Indian legal drafting templates.
- **Practice / Sparring Opponent:** Simulating counter-parties (stubborn landlord, dismissive HR, evasive customer care) to help users practice negotiation.

### What is Handled Strictly by Plain Code / Deterministic Rules:
- **Statute Citation Gatekeeping (`core.js:validate`):** LLM outputs are scanned by regex AST parsers. Any section number not in the hand-verified 42-item library, any court case name ("*X v. Y*"), reporter citations (*AIR, SCC*), or repealed acts (IPC, CrPC) are intercepted and marked with UI warning flags.
- **Citation Expansion:** The AI is only permitted to generate citation tokens (`[[ID]]`). The application expands tokens into hand-verified statutory descriptions (e.g., `[[CPA-69]]` → Section 69 of the Consumer Protection Act, 2019).
- **Limitation & Deadline Computation (`core.js:computeDeadlines`):** The AI extracts only raw dates mentioned by the client. All limitation math (e.g., NI Act 30-day notice, Code on Wages 2-working-day dues, RBI 3-day zero liability, CPA 2-year limitation) is computed mathematically in JavaScript.
- **Crisis & Safety Interception (`core.js:CRISIS`):** Immediate regex matching for self-harm and distress phrases (Hindi, Hinglish, English) injects Tele-MANAS (`14416`) and Emergency `112` cards at the top of the interface.
- **Deterministic Lawyer Escalation (`core.js:clientEscalation`):** Pattern-matching triggers for arrest, police custody, court summons, matrimonial disputes, property title claims, or cross-border issues immediately demand human counsel and cite NALSA legal aid (`15100`).

### Where a Human Stays in the Loop:
- **User Review of Legal Notices:** The user can freely inspect, edit, and modify every word in the generated document before copying or saving it.
- **Advocate Escalation:** For complex, high-stakes (>₹20 lakh), criminal, or family cases, the system refuses to arbitrate and routes the user to DLSA (District Legal Services Authority) or panel lawyers.
- **Law Library Curation:** Statutory entries in `LIB` are audited and maintained by human legal generalists against official India Code gazettes.

---

## 2. Model Size & Token Economics

*(Estimates calculated using standard heuristic of ~4 characters per token for English/code and ~2–3 characters per token for Indic scripts)*

### System Prompt Size:
- **Ask Mode System Prompt:** ~14,786 characters (~3,697 tokens). Includes full 42-item verified law library, JSON schema specification, anti-hallucination rules, and escalation definitions.
- **Draft Mode System Prompt:** ~11,588 characters (~2,897 tokens). Includes standard document structures, formal legal notice phrasing, and statutory citation constraints.
- **Practice Mode System Prompt:** ~11,040 characters (~2,760 tokens). Includes roleplay instructions, coach scoring format, and case facts.

### Conversation Turn Growth (Typical 4-Turn Case):
- **Turn 1 (Initial Problem):** 
  - Input: ~3,700 tokens (system) + ~150 tokens (user) = ~3,850 input tokens.
  - Output: ~400 output tokens (structured explanation + JSON case file).
- **Turn 2 (Follow-up clarification):**
  - Input: ~3,700 (system) + ~700 (history) + ~80 (user reply) = ~4,480 input tokens.
  - Output: ~350 output tokens.
- **Turn 3 (Document Generation):**
  - Input: ~2,900 (draft system) + ~150 (instruction) = ~3,050 input tokens.
  - Output: ~600 output tokens.
- **Turn 4 (Adjustment / Next Steps):**
  - Input: ~3,700 (system) + ~1,200 (history) + ~60 (user) = ~4,960 input tokens.
  - Output: ~250 output tokens.
- **Cumulative 4-Turn Total per Resolved Case:**
  - **Total Input Tokens:** ~16,340 tokens
  - **Total Output Tokens:** ~1,600 tokens

---

## 3. Cost & Scale Projections

### Unit Pricing Placeholder:
*(Fill from chosen provider pricing page, e.g. Gemini 2.5 Flash / Groq / GPT-4o-mini)*
- **Model:** `[e.g., Google Gemini 2.5 Flash / GPT-4o-mini]`
- **Input Token Price:** `$[0.15] / 1 million tokens` *(Placeholder)*
- **Output Token Price:** `$[0.60] / 1 million tokens` *(Placeholder)*

### Cost per Case:
- Input cost per case: `16,340 tokens * ($[0.15] / 1M) = $[0.00245]` (~₹0.20)
- Output cost per case: `1,600 tokens * ($[0.60] / 1M) = $[0.00096]` (~₹0.08)
- **Total Cost per Fully Resolved Case:** **~$[0.0034] (approx. ₹0.28 to ₹0.30 INR)**

### Cost at Scale (1 Lakh / 100,000 Conversations per Month):
- Monthly Input Volume: `100,000 * 16,340 = 1.634 Billion input tokens`
- Monthly Output Volume: `100,000 * 1,600 = 160 Million output tokens`
- Estimated Monthly LLM Bill: `~$[341] USD (approx. ₹28,000 to ₹30,000 INR)`
- **Free-Tier Limits as Immediate Operational Risks:**
  - Google AI Studio free tier enforces rate limits (e.g. 15 requests/min, 1,500 requests/day).
  - Production deployments require a paid pay-as-you-go key with auto-scaling concurrency limits or dedicated throughput.

---

## 4. Scaling to 1,000× Volume (Production Hardening)

1. **Server-Side Queue & Rate Limiting:**
   - Replace in-memory rate limiting with Redis-backed token bucket (e.g., Upstash Redis) to synchronize across distributed serverless functions.
   - Enqueue drafting and long-context requests into background worker queues (Celery / BullMQ) to avoid HTTP timeouts.
2. **Dedicated Indic Speech Pipeline:**
   - Migrate from browser-dependent Web Speech API to specialized Indian language foundation APIs:
     - **Bhashini (Govt of India):** Free AI national translation and speech pipeline for Indian vernacular dialects.
     - **Sarvam AI / Reverie:** High-accuracy ASR and TTS for mixed Hinglish and regional accents.
3. **Continuous Legal Library & Rule Audits:**
   - Establish an automated pipeline monitoring Gazette notifications on India Code.
   - Introduce human-in-the-loop legal review workflows when new High Court interpretations alter standard practice.
4. **State-Level Knowledge Sharding:**
   - Shard state rent control acts (e.g., Maharashtra Rent Control Act vs Karnataka Rent Control Act) into dynamic sub-modules injected into the prompt based on verified location.

---

## 5. Assumptions Made (Where Brief Was Silent)

1. **No Direct Representation:** Assumed the system operates strictly under the Advocates Act, 1961 as an informational assistive technology for self-represented litigants, never claiming advocate status.
2. **Single Serverless Environment:** Assumed modern standard Node 18+ deployment (Vercel) without external database dependencies to prioritize friction-free reproducibility.
3. **Statutory Primacy Over Precedent:** Assumed common litigants need actionable statutory rights and deadlines first; citing Supreme Court case precedent was excluded to prevent LLM hallucinations.
4. **OpenAI Endpoint Compatibility:** Assumed that all major frontier AI providers (Gemini, Groq, Mistral, OpenAI) support `/v1/chat/completions`, eliminating vendor lock-in.

---

## 6. Coverage Scope Summary

| Problem Domain | Handled Directly | Statutory Anchor / Portal | Escalation Trigger |
|---|---|---|---|
| Tenant Deposit | Full demand notice & Lok Adalat guidance | ICA Sec 73, Model Tenancy Act, Limitation Art 55 | Commercial property, disputed title |
| Consumer Refund | Grievance letters, e-Daakhil filing | CPA 2019 Sec 2(11), Sec 35, Sec 69, NCH 1915 | Value > ₹50 lakh (State/National Commission) |
| Unpaid Salary | Formal demand letter, wage authority claim | Code on Wages 2019 Sec 17 & 45 | Factory industrial disputes, criminal fraud |
| Cheque Dishonour | Section 138 demand notice & date tracking | NI Act 1881 Sec 138 & Sec 142 | Missing 30-day notice window |
| Banking / UPI Fraud | Freeze request draft, Ombudsman steps | RBI Customer Protection Circular 2017, Cyber 1930 | Fraud > 1 year ago, police detention |
| Government RTI | Section 6 RTI application & appeal | RTI Act 2005 Sec 6, 7 & 19 | National security (Sec 8 exemptions) |
| Police Refusal | Written complaint to SP, BNSS guidance | BNSS 2023 Sec 173 (Zero FIR) & Sec 175 | Accused in non-bailable offences |
| Family / Custody | **None** (Immediate referral) | NALSA Helpline 15100 | Always escalated to human advocate |
| Criminal Custody | **None** (Immediate safety/legal aid) | Tele-Law, DLSA, Legal Aid 15100 | Always escalated to human advocate |

