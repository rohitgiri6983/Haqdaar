# Haqdaar (हक़दार) — AI Legal Help for India

> **Problem 2 Submission: Build an AI Lawyer** (Kuku FM AI Generalist Assignment)  
> **Live Prototype:** [https://haqdaar.vercel.app](https://haqdaar.vercel.app) *(or your deployed Vercel URL)*

Haqdaar is an honest, voice-enabled conversational legal assistant built for ordinary people in India facing everyday legal conflicts. Operating with zero login and zero user API keys, it takes messy stories by text or voice across 14 Indian languages, turns them into structured case files, calculates strict statutory deadlines in deterministic code, flags fabricated law, and drafts concrete action documents (legal notices, RTI applications, consumer complaints). When a problem exceeds everyday resolution or involves personal danger, it immediately steps aside and directs the user to free legal aid authorities.

---

## What It Covers (and What It Doesn't)

### In-Depth Coverage:
- **Rent Deposit Recovery:** Landlords withholding security deposits, illegal deductions for normal wear and tear, notice periods, and Lok Adalat recovery.
- **Consumer Disputes & Refunds:** Defective products, refused returns, deficiency in services, e-commerce grievances, and e-Daakhil filing guidance.
- **Unpaid Wages & Settlements:** Post-resignation dues under the Code on Wages, 2019 (2-day settlement rule), unpaid bonuses, and labour claims.
- **Cheque Dishonour:** Section 138 Negotiable Instruments Act timeline math (mandatory 30-day notice, 15-day cure window, 1-month court filing).
- **Online & UPI Fraud:** Unauthorized debit zero-liability reporting rules (RBI 3-working-day window), National Cyber Crime portal (1930).
- **Right to Information (RTI):** Drafting Section 6 requests, fee rules, PIO 30-day deadlines, and Section 19 appellate escalation.
- **Police & First Information Reports (FIR):** Section 173 BNSS Zero-FIR rights, written complaints to the SP, and magistrate applications under BNSS 175.
- **Legal Notices Received:** Analyzing threatening letters (defamation, contract breach, loan recovery) and identifying immediate legal risks.

### What It Deliberately Does NOT Cover:
- **No Criminal Defence or Bail:** Accusations, custody, arrest, warrants, or criminal trials.
- **No Family Law:** Divorce, child custody, alimony, maintenance, or domestic violence.
- **No Property Title or Partition:** Ancestral land disputes, title deed disputes, or inheritance conflicts.
- **No International / Overseas Disputes:** Employment or contracts executed outside India (e.g., UAE, Gulf, US).
- *All excluded scenarios trigger immediate deterministic lawyer escalation with NALSA (15100), Tele-Law, or Emergency 112 helplines.*

---

## How It Avoids Inventing Laws (Anti-Hallucination Design)

Large language models confidently fabricate section numbers, non-existent court judgments, and outdated penal statutes. Haqdaar enforces a strict 5-layer anti-hallucination boundary:

1. **Closed Verified Library (`LIB`):** The model is given a curated set of 42 hand-verified statutory sections and official helplines (from India Code, RBI, and NALSA). It has no access to browse or invent unverified statutes.
2. **Citation Tokens (`[[ID]]`), Not Generated Text:** The LLM is forbidden from writing statutory sections in its prose. It may cite law *only* through discrete tokens like `[[CPA-69]]` or `[[COW-17]]`. The client software expands these tokens into exact statutory text.
3. **Strict Post-Generation AST Validator:** Software inspects every generated word after the LLM responds. It flags written-out sections outside the library, case-law citations ("*X v. Y*"), law reporters (*AIR, SCC, SCR*), unknown tokens, and repealed statutes (IPC, CrPC). Flags appear in bright red in the UI.
4. **Dates & Deadlines Computed in Pure Code:** The LLM only extracts dates given by the user (e.g. cheque bounce date). All limitation computations (e.g., 30 calendar days, 2 working days skipping weekends, 3-year limitation) are calculated deterministically in JavaScript, never by LLM arithmetic.
5. **Deterministic Safety & Crisis Fallbacks:** Regexes scan raw user input before and after LLM generation for suicidal ideation (`CRISIS`), arrest, or domestic violence, immediately surfacing crisis numbers (Tele-MANAS `14416`, Emergency `112`, Women Helpline `181`) ahead of any conversation.

---

## Quick Start (Run Locally)

Requirements: **Node.js 18+** with zero npm dependencies installed.

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/haqdaar.git
cd haqdaar

# 2. Configure environment
cp .env.example .env

# 3. Start local development server (serves static files and /api/chat)
npm run dev
```

Open `http://localhost:3000` in your browser. If `.env` is unconfigured, the app runs gracefully in offline basic guide mode.

---

## Swapping the Model

All model orchestration is OpenAI-compatible and configured strictly via environment variables in `.env`. No provider names are hardcoded.

### Google Gemini (Free via AI Studio)
*(Check Google AI Studio for current free Flash model IDs)*
```env
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_API_KEY=your_gemini_api_key_here
LLM_MODEL=gemini-2.5-flash
LLM_MODEL_FAST=gemini-2.5-flash
```

### Groq (Free Fast Tier)
*(Check Groq Console for current active model IDs)*
```env
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_API_KEY=your_groq_api_key_here
LLM_MODEL=llama-3.3-70b-versatile
LLM_MODEL_FAST=llama-3.1-8b-instant
```

### OpenRouter
```env
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=your_openrouter_api_key_here
LLM_MODEL=google/gemini-2.5-flash
LLM_MODEL_FAST=google/gemini-2.5-flash
```

### OpenAI
```env
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=your_openai_api_key_here
LLM_MODEL=gpt-4o-mini
LLM_MODEL_FAST=gpt-4o-mini
```

---

## Running Tests

### 1. Fast Unit Tests (Zero API Key / Zero Cost)
Runs deterministic checks on `validate()`, `computeDeadlines()`, and `clientEscalation()`:
```bash
npm test
```

### 2. Full Evaluation Suite (All 14 Test Cases)
Runs all test cases sequentially with rate-limit backoff against the configured LLM and saves raw outputs:
```bash
npm run eval
```

### 3. Interview Re-Run Command (Single New Case)
Test any arbitrary legal problem with one command during interview evaluation:
```bash
# Ask mode (Case extraction + legal standing + deadline calculation)
node run_tests.mjs --input "My landlord took ₹50,000 security deposit in Bangalore and blocked my number when I asked for refund" --lang en

# Test Hindi / Hinglish input
node run_tests.mjs --input "Police ne kal raat mere bhai ko arrest kar liya bina bataye" --lang auto

# Draft mode (Generate a formal legal notice or complaint)
node run_tests.mjs --mode draft --input "Landlord withholding deposit for painting without bill" --doc legal_notice
```

Unedited outputs are saved to `raw_outputs/<timestamp>_<model>/` containing:
- `Txx.json`: Complete payload with raw response, latency, parsed case file, validation report, and check results.
- `Txx.txt`: Pure, unedited LLM output.
- `summary.md` and `summary.csv`: Aggregated accuracy and latency scorecard.

---

## Deploying to Vercel (Public Prototype)

Haqdaar is designed for 1-click serverless deployment on Vercel's free tier with zero build steps:

1. Push this folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Haqdaar release"
   git branch -M main
   git remote add origin https://github.com/<your-username>/haqdaar.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import your repository.
3. In **Environment Variables**, add:
   - `LLM_BASE_URL`: `https://generativelanguage.googleapis.com/v1beta/openai`
   - `LLM_API_KEY`: *(your AI Studio or provider key)*
   - `LLM_MODEL`: *(your chosen model ID)*
   - `LLM_MODEL_FAST`: *(optional, defaults to LLM_MODEL)*
4. Click **Deploy**. Vercel will host `index.html` statically and wire `api/chat.js` as an edge serverless function under `/api/chat`.

---

## Known Limitations

1. **State-Level Rent Rules:** Rent control acts vary across Maharashtra, Karnataka, Delhi, etc. Haqdaar advises on central principles (Contract Act, Model Tenancy Act) and explicitly prompts the user for their state.
2. **Local Court Procedures & Stamp Duties:** Exact court fees, physical stamp paper denominations, and local registry procedures require on-the-ground counsel.
3. **Browser Web Speech API:** Speech recognition depends on the user's browser engine (Chrome on Android/Desktop provides native multi-lingual speech recognition; iOS Safari uses Apple Siri transcription).
4. **Single-Instance Memory Rate Limiting:** The built-in rate limiter in `api/chat.js` uses an in-memory sliding window (20 requests/min per IP), sufficient for serverless instances but scalable with Redis (Upstash) under high traffic.

#   H a q d a a r  
 