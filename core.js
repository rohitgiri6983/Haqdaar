/* =========================================================
   Haqdaar core: pure logic shared by the web page and the test runner.
   NO DOM access here. It must import cleanly in both a browser
   (<script type="module">) and Node. Moved from haqdaar.html unchanged,
   except offlineAnswer/offlineDraft now take the case as a parameter
   instead of reading the page's global state.
   ========================================================= */
'use strict';

/* ---------- dates & money ---------- */
export const pad = n => String(n).padStart(2, '0');
export const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = s => { if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null; const [y, m, d] = s.split('-').map(Number); const x = new Date(y, m - 1, d); return isNaN(x) || x.getMonth() !== m - 1 ? null : x; };
export const sod = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const addMonths = (d, n) => { const x = new Date(d); const day = x.getDate(); x.setDate(1); x.setMonth(x.getMonth() + n); const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate(); x.setDate(Math.min(day, last)); return x; };
export const addWorkDays = (d, n) => { const x = new Date(d); let c = 0; while (c < n) { x.setDate(x.getDate() + 1); const w = x.getDay(); if (w !== 0 && w !== 6) c++; } return x; };
export const dayDiff = (a, b) => Math.round((sod(b) - sod(a)) / 864e5);
export const fmtD = d => { const x = d instanceof Date ? d : parseISO(d); return x ? x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; };
export const inr = n => '₹' + Number(n).toLocaleString('en-IN');
export const TODAY = () => isoOf(new Date());

/* =========================================================
   VERIFIED LAW LIBRARY — the only law the AI may cite.
   Each entry is cited by token [[ID]]; the app expands the token.
   ========================================================= */
const IC = 'https://www.indiacode.nic.in/';
export const LIB = [
  // Consumer
  {id:'CPA-2-7', g:'Consumer', short:'CPA 2019 s.2(7)', cite:'Section 2(7) of the Consumer Protection Act, 2019', secs:['2'], t:'Who counts as a consumer', p:'Anyone who buys goods or pays for a service, online or offline, for their own use. Buying for resale or a commercial purpose is excluded, but using it to earn a living by self-employment is allowed.', src:IC},
  {id:'CPA-2-11', g:'Consumer', short:'CPA 2019 s.2(11)', cite:'Section 2(11) of the Consumer Protection Act, 2019', secs:['2'], t:'Deficiency in service', p:'Any fault, shortcoming or inadequacy in the quality, nature or manner of a service that was promised or is required by law. Delays, poor repair work and refusing a promised refund are common examples.', src:IC},
  {id:'CPA-2-47', g:'Consumer', short:'CPA 2019 s.2(47)', cite:'Section 2(47) of the Consumer Protection Act, 2019', secs:['2'], t:'Unfair trade practice', p:'Unfair or deceptive selling, such as false claims about a product, not issuing a bill, or refusing to take back defective goods or refund within the period stated (or within 30 days if no period is stated).', src:IC},
  {id:'CPA-34', g:'Consumer', short:'CPA 2019 s.34', cite:'Section 34 of the Consumer Protection Act, 2019', secs:['34'], t:'District Commission: where to file', p:'The District Consumer Commission hears complaints within its money limit. You may file where you live or work for gain, or where the seller or service provider is, or where the problem arose.', src:IC},
  {id:'CPA-35', g:'Consumer', short:'CPA 2019 s.35', cite:'Section 35 of the Consumer Protection Act, 2019', secs:['35'], t:'Who can file, and filing online', p:'The consumer can file the complaint personally, without a lawyer, and the complaint can be filed electronically (through the e-Daakhil portal).', src:IC},
  {id:'CPA-69', g:'Consumer', short:'CPA 2019 s.69', cite:'Section 69 of the Consumer Protection Act, 2019', secs:['69'], t:'Two-year time limit', p:'A consumer complaint must be filed within two years from the date the cause of action arose. A later complaint is admitted only if the Commission accepts a sufficient reason for the delay.', src:IC},
  {id:'CPA-JUR', g:'Consumer', short:'Jurisdiction Rules 2021', cite:'the Consumer Protection (Jurisdiction of the District Commission, the State Commission and the National Commission) Rules, 2021', secs:[], t:'Which commission, by amount paid', p:'Based on the price paid for the goods or service: District Commission up to ₹50 lakh; State Commission above ₹50 lakh up to ₹2 crore; National Commission above ₹2 crore.', src:IC},
  {id:'CPA-FEE', g:'Consumer', short:'CDRC Rules 2020 r.7', cite:'Rule 7 of the Consumer Protection (Consumer Disputes Redressal Commissions) Rules, 2020', secs:[], t:'Filing fee', p:'No fee is payable for complaints where the amount paid is up to ₹5 lakh. Higher amounts carry a fee on a slab scale; check the current amount on e-Daakhil before filing.', src:IC},
  {id:'CPA-ECOM', g:'Consumer', short:'E-Commerce Rules 2020', cite:'the Consumer Protection (E-Commerce) Rules, 2020', secs:[], t:'Online sellers must handle complaints', p:'Every e-commerce platform must have a grievance officer whose details are displayed, must acknowledge a consumer complaint within 48 hours and resolve it within one month.', src:IC},
  // Money & contracts
  {id:'ICA-73', g:'Money owed', short:'Contract Act s.73', cite:'Section 73 of the Indian Contract Act, 1872', secs:['73'], t:'Compensation for breaking a contract', p:'When someone breaks an agreement (written or oral), the other side can claim compensation for the loss that naturally arose from the breach. Withholding a deposit without valid reason is a typical example.', src:IC},
  {id:'LIM-ART55', g:'Money owed', short:'Limitation Act Art.55', cite:'Article 55 of the Schedule to the Limitation Act, 1963', secs:[], arts:['55'], t:'Three years to sue for breach of contract', p:'A suit for compensation for breach of contract must generally be filed within three years from when the contract was broken. Courts cannot ordinarily admit a late suit, so do not wait.', src:IC},
  {id:'CPC-O37', g:'Money owed', short:'CPC Order XXXVII', cite:'Order XXXVII of the Code of Civil Procedure, 1908', secs:[], t:'Summary suit for a fixed sum', p:'A faster court procedure for recovering a fixed sum of money based on a written contract or document. The other side must take the court’s permission to defend. Available in the courts the state has notified.', src:IC},
  {id:'MTA-2021', g:'Tenancy', short:'Model Tenancy Act 2021', cite:'the Model Tenancy Act, 2021', secs:[], t:'Model tenancy law (only where adopted)', p:'A model law from the central government that caps a residential security deposit at two months’ rent and requires it to be refunded when the tenant hands back the premises, after lawful deductions. It applies only in states that have adopted it; many states still follow their own rent laws.', src:'https://mohua.gov.in/'},
  // Legal aid
  {id:'LSA-12', g:'Free legal aid', short:'Legal Services Act s.12', cite:'Section 12 of the Legal Services Authorities Act, 1987', secs:['12'], t:'Who gets a free lawyer', p:'Free legal services are available to women and children, members of Scheduled Castes and Scheduled Tribes, industrial workmen, persons in custody, persons with disabilities, victims of disasters or trafficking, and people whose income is below the limit set by their state.', src:'https://nalsa.gov.in/'},
  {id:'LSA-LOK', g:'Free legal aid', short:'Lok Adalat (LSA s.19–22)', cite:'Sections 19 to 22 of the Legal Services Authorities Act, 1987', secs:['19','20','21','22'], t:'Lok Adalat settlement', p:'Lok Adalats settle disputes by agreement, free of cost. A settlement award is final and binding like a court decree and cannot be appealed. If a pending court case is settled there, the court fee paid is refunded.', src:'https://nalsa.gov.in/'},
  {id:'CONST-39A', g:'Free legal aid', short:'Constitution Art.39A', cite:'Article 39A of the Constitution of India', secs:[], arts:['39A'], t:'Equal justice and free legal aid', p:'The State must ensure that no citizen is denied justice because of economic or other disabilities, including through free legal aid.', src:IC},
  // Wages
  {id:'COW-NOW', g:'Wages', short:'Labour Codes in force', cite:'the Code on Wages, 2019 (in force from 21 November 2025)', secs:[], t:'Which wage law applies now', p:'The four Labour Codes came into force on 21 November 2025. The Code on Wages, 2019 replaced the Payment of Wages Act, the Minimum Wages Act and related laws. State rules under the Codes may still be catching up, so procedure can vary by state.', src:'https://labour.gov.in/'},
  {id:'COW-17', g:'Wages', short:'Code on Wages s.17', cite:'Section 17 of the Code on Wages, 2019', secs:['17'], t:'When wages must be paid', p:'Monthly wages must be paid by the 7th of the following month. When an employee resigns, is removed, dismissed or retrenched, wages due must be paid within two working days.', src:IC},
  {id:'COW-45', g:'Wages', short:'Code on Wages s.45', cite:'Section 45 of the Code on Wages, 2019', secs:['45'], t:'Filing a wage claim', p:'An employee can file a claim for unpaid or delayed wages before the authority appointed by the government. The claim must be filed within three years from the date it arose.', src:IC},
  // Cheque
  {id:'NI-138', g:'Cheque bounce', short:'NI Act s.138', cite:'Section 138 of the Negotiable Instruments Act, 1881', secs:['138'], t:'Cheque bounce is an offence', p:'If a cheque given to pay a debt bounces for insufficient funds, it is an offence when: the cheque was presented within its validity, the payee sends a written demand notice within 30 days of learning of the dishonour, and the drawer fails to pay within 15 days of receiving the notice. Punishment can be jail up to two years, a fine up to twice the cheque amount, or both.', src:IC},
  {id:'NI-142', g:'Cheque bounce', short:'NI Act s.142', cite:'Section 142 of the Negotiable Instruments Act, 1881', secs:['142'], t:'Deadline for the cheque case', p:'The complaint must be filed in court within one month from the day the 15-day payment period after the notice ends. The court may accept a late complaint if there is sufficient cause.', src:IC},
  // Police & criminal
  {id:'BNSS-173', g:'Police', short:'BNSS s.173', cite:'Section 173 of the Bharatiya Nagarik Suraksha Sanhita, 2023', secs:['173'], t:'Your right to an FIR', p:'Information about a cognizable offence can be given at any police station, whatever the area (Zero FIR), orally or electronically. An electronic complaint must be signed within three days. You get a free copy of the FIR. If police refuse, you can send it in writing to the Superintendent of Police.', src:IC},
  {id:'BNSS-175', g:'Police', short:'BNSS s.175', cite:'Section 175 of the Bharatiya Nagarik Suraksha Sanhita, 2023', secs:['175'], t:'Going to a Magistrate', p:'If the police do not act, a Magistrate can be approached and can order an investigation, after you have first approached the Superintendent of Police.', src:IC},
  {id:'BNS-318', g:'Police', short:'BNS s.318', cite:'Section 318 of the Bharatiya Nyaya Sanhita, 2023', secs:['318'], t:'Cheating', p:'Deceiving someone into handing over money or property is the offence of cheating. This replaced the old IPC provision from 1 July 2024.', src:IC},
  // RTI
  {id:'RTI-6', g:'RTI', short:'RTI Act s.6', cite:'Section 6 of the Right to Information Act, 2005', secs:['6'], t:'Asking for information', p:'Any citizen can request information from a public authority in writing or online, without giving a reason. For central government bodies the fee is ₹10; people below the poverty line are exempt.', src:'https://rtionline.gov.in/'},
  {id:'RTI-7', g:'RTI', short:'RTI Act s.7', cite:'Section 7 of the Right to Information Act, 2005', secs:['7'], t:'Reply deadline', p:'The Public Information Officer must reply within 30 days, or within 48 hours when the information concerns someone’s life or liberty.', src:'https://rtionline.gov.in/'},
  {id:'RTI-19', g:'RTI', short:'RTI Act s.19', cite:'Section 19 of the Right to Information Act, 2005', secs:['19'], t:'Appeals', p:'If there is no reply or an unsatisfactory one, file a first appeal within 30 days to the senior officer named as First Appellate Authority, then a second appeal to the Information Commission within 90 days.', src:'https://rtionline.gov.in/'},
  // Banking
  {id:'RBI-LIAB', g:'Banking & fraud', short:'RBI circular 2017', cite:'the RBI circular on Customer Protection – Limiting Liability of Customers in Unauthorised Electronic Banking Transactions (6 July 2017)', secs:[], t:'Report fraud within 3 working days', p:'If you report an unauthorised electronic transaction to your bank within three working days and the fraud was not caused by your negligence, your liability is zero. Reporting within four to seven working days limits it. Sharing an OTP may be treated as negligence, so report immediately anyway.', src:'https://www.rbi.org.in/'},
  {id:'RBI-IOS', g:'Banking & fraud', short:'RBI Ombudsman 2021', cite:'the Reserve Bank – Integrated Ombudsman Scheme, 2021', secs:[], t:'Banking Ombudsman', p:'Complain to your bank first. If it rejects the complaint or does not reply within 30 days, you can complain to the RBI Ombudsman online, free, within one year of the bank’s reply.', src:'https://cms.rbi.org.in/'},
  // Workplace & family safety
  {id:'POSH-9', g:'Workplace', short:'POSH Act s.9', cite:'Section 9 of the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013', secs:['9'], t:'Complaint to Internal Committee', p:'A complaint of sexual harassment at the workplace must be made in writing to the Internal Committee (or Local Committee) within three months of the incident; this can be extended by three more months for good reason.', src:IC},
  {id:'PWDVA-12', g:'Workplace', short:'DV Act s.12', cite:'Section 12 of the Protection of Women from Domestic Violence Act, 2005', secs:['12'], t:'Protection from domestic violence', p:'A woman facing domestic violence, or a Protection Officer on her behalf, can apply to a Magistrate for protection, residence, monetary relief and other orders.', src:IC},
  // Resources
  {id:'RES-NCH', g:'Helplines', short:'Consumer Helpline 1915', cite:'the National Consumer Helpline (1915)', secs:[], t:'National Consumer Helpline', p:'Free government helpline that takes up complaints with companies before you go to court. Call 1915, WhatsApp 8800001915, or file at consumerhelpline.gov.in.', src:'https://consumerhelpline.gov.in/'},
  {id:'RES-EDAAKHIL', g:'Helplines', short:'e-Daakhil portal', cite:'the e-Daakhil portal', secs:[], t:'File a consumer case online', p:'Official portal to file consumer complaints online with any consumer commission and pay any fee: edaakhil.nic.in.', src:'https://edaakhil.nic.in/'},
  {id:'RES-NALSA', g:'Helplines', short:'Legal aid 15100', cite:'the NALSA legal aid helpline (15100)', secs:[], t:'Free legal aid helpline', p:'Call 15100 to reach legal services authorities for free legal advice or a free lawyer, or visit your District Legal Services Authority at the district court.', src:'https://nalsa.gov.in/'},
  {id:'RES-TELELAW', g:'Helplines', short:'Tele-Law', cite:'the Tele-Law service', secs:[], t:'Talk to a lawyer by phone or video', p:'Government service connecting people to panel lawyers through Common Service Centres and the Tele-Law app, free of cost.', src:'https://www.tele-law.in/'},
  {id:'RES-CYBER', g:'Helplines', short:'Cyber fraud 1930', cite:'the National Cyber Crime Helpline (1930)', secs:[], t:'Cyber fraud helpline', p:'Call 1930 immediately after online financial fraud so the money can be frozen, and register at cybercrime.gov.in.', src:'https://cybercrime.gov.in/'},
  {id:'RES-RBICMS', g:'Helplines', short:'RBI complaint portal', cite:'the RBI Complaint Management System', secs:[], t:'RBI complaint portal', p:'File banking, wallet and NBFC complaints with the RBI Ombudsman at cms.rbi.org.in.', src:'https://cms.rbi.org.in/'},
  {id:'RES-RTIONLINE', g:'Helplines', short:'RTI Online', cite:'the RTI Online portal', secs:[], t:'File RTI online', p:'rtionline.gov.in takes RTI requests for central government ministries and departments. Many states have their own RTI portals.', src:'https://rtionline.gov.in/'},
  {id:'RES-112', g:'Helplines', short:'Emergency 112', cite:'the emergency number 112', secs:[], t:'Emergency', p:'Call 112 for police, fire or ambulance in any emergency.', src:'https://112.gov.in/'},
  {id:'RES-181', g:'Helplines', short:'Women helpline 181', cite:'the Women Helpline (181)', secs:[], t:'Women helpline', p:'181 connects women facing violence to police, legal aid, shelter and counselling.', src:'https://wcd.gov.in/'},
  {id:'RES-TELEMANAS', g:'Helplines', short:'Tele-MANAS 14416', cite:'Tele-MANAS (14416)', secs:[], t:'Mental health support, 24×7', p:'Free, confidential mental health support in many Indian languages, any time: call 14416 or 1-800-891-4416.', src:'https://telemanas.mohfw.gov.in/'},
  {id:'RES-INDIACODE', g:'Helplines', short:'India Code', cite:'India Code', secs:[], t:'Official text of every Act', p:'The government’s official database of central and state laws. Use it to check any section someone quotes to you.', src:IC}
];
export const LIBMAP = Object.fromEntries(LIB.map(l => [l.id, l]));
export const SEC_OK = new Set(LIB.flatMap(l => l.secs));
export const ART_OK = new Set(LIB.flatMap(l => l.arts || []));
export const LIB_PROMPT = LIB.map(l => `${l.id} | ${l.cite} | ${l.p}`).join('\n');

/* ---------- categories ---------- */
export const CATS = {
  deposit:{label:'Rent deposit', opp:'Landlord'},
  consumer:{label:'Consumer refund', opp:'Company customer-care agent'},
  salary:{label:'Unpaid salary', opp:'HR manager'},
  cheque:{label:'Cheque bounce', opp:'Person who gave the cheque'},
  fraud:{label:'Online fraud', opp:'Bank branch manager'},
  rti:{label:'RTI / govt office', opp:'Public Information Officer'},
  police:{label:'Police / FIR', opp:'Station House Officer'},
  notice:{label:'Notice received', opp:'Lawyer of the other side'},
  workplace:{label:'Workplace', opp:'Internal Committee member'},
  family:{label:'Family', opp:'Lawyer of the other side'},
  property:{label:'Property', opp:'Lawyer of the other side'},
  criminal:{label:'Criminal', opp:'Lawyer of the other side'},
  other:{label:'Other', opp:'The other side'},
  unclassified:{label:'New', opp:'The other side'}
};

/* ---------- languages ---------- */
export const LANGS = [
  {c:'auto', n:'Auto · match me', speech:'en-IN'},
  {c:'en', n:'English', speech:'en-IN'},
  {c:'hi', n:'हिन्दी Hindi', speech:'hi-IN', name:'Hindi in Devanagari script'},
  {c:'hinglish', n:'Hinglish', speech:'hi-IN', name:'Hinglish (Hindi in Latin script, mixed with English, as people text in India)'},
  {c:'bn', n:'বাংলা Bengali', speech:'bn-IN', name:'Bengali in Bengali script'},
  {c:'mr', n:'मराठी Marathi', speech:'mr-IN', name:'Marathi in Devanagari script'},
  {c:'ta', n:'தமிழ் Tamil', speech:'ta-IN', name:'Tamil in Tamil script'},
  {c:'te', n:'తెలుగు Telugu', speech:'te-IN', name:'Telugu in Telugu script'},
  {c:'kn', n:'ಕನ್ನಡ Kannada', speech:'kn-IN', name:'Kannada in Kannada script'},
  {c:'ml', n:'മലയാളം Malayalam', speech:'ml-IN', name:'Malayalam in Malayalam script'},
  {c:'gu', n:'ગુજરાતી Gujarati', speech:'gu-IN', name:'Gujarati in Gujarati script'},
  {c:'pa', n:'ਪੰਜਾਬੀ Punjabi', speech:'pa-IN', name:'Punjabi in Gurmukhi script'},
  {c:'or', n:'ଓଡ଼ିଆ Odia', speech:'or-IN', name:'Odia in Odia script'},
  {c:'ur', n:'اردو Urdu', speech:'ur-IN', name:'Urdu in Urdu (Nastaliq/Arabic) script'}
];
export const SCRIPT_RE = {hi:/[ऀ-ॿ]/g, mr:/[ऀ-ॿ]/g, bn:/[ঀ-৿]/g, ta:/[஀-௿]/g, te:/[ఀ-౿]/g, kn:/[ಀ-೿]/g, ml:/[ഀ-ൿ]/g, gu:/[઀-૿]/g, pa:/[਀-੿]/g, or:/[଀-୿]/g, ur:/[؀-ۿ]/g};
export function detectLang(text) {
  let best = null, n = 0;
  for (const [c, re] of Object.entries(SCRIPT_RE)) { const k = (text.match(re) || []).length; if (k > n) { n = k; best = c; } }
  return n >= 3 ? best : 'en';
}
export function langRule(code) {
  if (code === 'auto') return 'Reply in the same language and script the person uses. If they write Hindi in Latin letters (Hinglish), reply in Hinglish. Keep [[ID]] tokens exactly as written.';
  const L = LANGS.find(l => l.c === code);
  if (!L || code === 'en') return 'Reply in simple English (Indian usage). Keep [[ID]] tokens exactly as written.';
  return `Reply in ${L.name}. Use everyday words, not formal legal vocabulary. Keep [[ID]] tokens exactly as written.`;
}

/* =========================================================
   VALIDATOR — runs on every AI answer, after generation
   ========================================================= */
const GENERIC_PARTIES = /complainant|opposite party|petitioner|respondent|applicant|landlord|tenant|employer|employee|consumer|seller|buyer|plaintiff|defendant/i;
export function validate(text) {
  const out = {verified: [], unknown: [], flags: []};
  const seen = new Set();
  for (const m of text.matchAll(/\[\[([A-Za-z0-9-]+)\]\]/g)) {
    const id = m[1];
    if (LIBMAP[id]) { if (!seen.has(id)) { seen.add(id); out.verified.push(id); } }
    else out.unknown.push(id);
  }
  const plain = text.replace(/\[\[[^\]]+\]\]/g, ' ');
  for (const m of plain.matchAll(/(?:\b(?:sections?|sec\.|u\/s\.?)|धारा|\bdhara)\s*(\d{1,3}[A-Za-z]{0,2})(?:\s*\(\d+\))?/gi)) {
    const n = m[1].toUpperCase();
    const ok = SEC_OK.has(n);
    out.flags.push({type:'section', text:m[0], level: ok ? 'warn' : 'bad', note: ok ? 'Section written out instead of using a verified link. The number exists in the library, but which Act it belongs to was not confirmed.' : 'This section is not in the verified library. Do not rely on it without checking India Code or a lawyer.'});
  }
  for (const m of plain.matchAll(/\b(?:Article|Art\.)\s*(\d+[A-Z]?)/g)) {
    const ok = ART_OK.has(m[1]);
    out.flags.push({type:'article', text:m[0], level: ok ? 'warn' : 'bad', note:'Article reference written without a verified link.'});
  }
  for (const m of plain.matchAll(/\b([A-Z][\w.&']*(?:\s+(?:of\s+)?[A-Z][\w.&']*){0,5})\s+(?:v\.|vs\.?|versus)\s+([A-Z][\w.&']*(?:\s+(?:of\s+)?[A-Z][\w.&']*){0,5})/g)) {
    if (GENERIC_PARTIES.test(m[0])) continue;
    out.flags.push({type:'case', text:m[0], level:'bad', note:'Looks like a court judgment. Haqdaar does not cite judgments because it cannot verify them.'});
  }
  for (const m of plain.matchAll(/\bAIR\s*\d{4}\b|\(\d{4}\)\s*\d+\s*SCC\b|\b\d{4}\s*SCC\s*OnLine\b|\b\d{4}\s*\(\d+\)\s*SCR\b/g))
    out.flags.push({type:'reporter', text:m[0], level:'bad', note:'Law-report citation that cannot be verified here.'});
  for (const m of plain.matchAll(/\b(IPC|CrPC|Indian Penal Code|Code of Criminal Procedure|Payment of Wages Act)\b/g))
    out.flags.push({type:'outdated', text:m[0], level:'warn', note:'Old law name. Criminal law changed to BNS/BNSS on 1 July 2024; wage law changed to the Code on Wages on 21 Nov 2025.'});
  out.clean = out.unknown.length === 0 && !out.flags.some(f => f.level === 'bad');
  return out;
}

/* ---------- escalation (deterministic, on the person's own words) ---------- */
export const CRISIS = /suicid|kill myself|end (?:my life|everything|it all)|want to die|no reason to live|jeena nahi|marna chahta|marna chahti|मरना चाहत|आत्महत्या|ख़ुदकुशी|खुदकुशी|khudkushi/i;
export const ESCALATE = [
  {re:/\b(arrest(?:ed)?|in custody|police custody|bail|warrant|remand)\b|गिरफ्तार|हिरासत|जमानत|giraftar|jamanat|hirasat/i, why:'Someone may be arrested or in custody. This needs a criminal lawyer today; free lawyers are available through legal aid.'},
  {re:/\b(summons|court date|next hearing|hearing (?:is )?(?:on|tomorrow|next))\b|समन|पेशी|\bpeshi\b|court me pesh/i, why:'There is a court summons or hearing date. Missing it can go against you; get a lawyer before the date.'},
  {re:/\b(divorce|custody of (?:my|our) (?:child|son|daughter|kids)|alimony|dowry|498a|maintenance (?:case|from (?:my )?husband|for (?:my )?(?:wife|child|children)))\b|तलाक|दहेज|\btalaq\b|\bdahej\b/i, why:'Family cases depend heavily on facts and personal law. Speak to a family lawyer.'},
  {re:/\b(partition|inheritance|succession|title deed|encroach\w*|ancestral property|property dispute)\b/i, why:'Property title and inheritance disputes need a lawyer to read the documents.'},
  {re:/\b(domestic violence|beats? me|hit me|assault(?:ed)?|rape|molest\w*|sexual(?:ly)? (?:assault|abuse))\b|मारपीट|maarpeet/i, why:'Your safety comes first. Call 112 in an emergency or 181 (Women Helpline), and get legal help.'},
  {re:/\b(fir against me|case against me|complaint against me|accused|criminal proceedings|defamation)\b/i, why:'You may face a case. Do not reply or sign anything before speaking to a lawyer.'},
  {re:/\b(dubai|uae|saudi|qatar|abroad|outside india|usa|uk|singapore|canada)\b/i, why:'Part of this happened outside India, where Indian law may not apply. A lawyer who knows that country is needed.'}
];
export function clientEscalation(texts) {
  const all = texts.join('\n');
  const hits = ESCALATE.filter(e => e.re.test(all)).map(e => e.why);
  return [...new Set(hits)];
}

/* ---------- deadlines (computed by code, never by the AI) ---------- */
export function computeDeadlines(c) {
  const k = c.key_dates || {}; const out = [];
  const push = (label, date, cite, note) => { if (date) out.push({label, date, cite, note, days: dayDiff(new Date(), date)}); };
  const coa = parseISO(k.cause_of_action);
  switch (c.category) {
    case 'consumer': if (coa) push('File consumer complaint by', addMonths(coa, 24), 'CPA-69', 'Two years from when the problem arose.'); break;
    case 'deposit': if (coa) push('Usual last date to sue for the money', addMonths(coa, 36), 'LIM-ART55', 'Three years from the refusal. Send a written demand long before this.'); break;
    case 'salary': {
      const ex = parseISO(k.exit_date);
      if (ex) push('Final dues were due by', addWorkDays(ex, 2), 'COW-17', 'Two working days after leaving (weekends skipped; public holidays may add a day).');
      if (coa || ex) push('File wage claim with the authority by', addMonths(coa || ex, 36), 'COW-45', 'Three years from when the claim arose.');
      break; }
    case 'cheque': {
      const m = parseISO(k.dishonour_date);
      if (m) push('Send the demand notice by', addDays(m, 30), 'NI-138', '30 days from the date you learned the cheque bounced (bank return memo).');
      const n = parseISO(k.notice_served_date);
      if (n) { const p = addDays(n, 15); push('Their 15 days to pay end on', p, 'NI-138', 'Counted from the day they received your notice.'); push('File the cheque case in court by', addMonths(addDays(p, 1), 1), 'NI-142', 'One month after the 15 days end.'); }
      break; }
    case 'fraud': { const f = parseISO(k.incident_date) || coa; if (f) push('Report to your bank by (for zero liability)', addWorkDays(f, 3), 'RBI-LIAB', 'Three working days. Report right now if you have not.'); break; }
    case 'rti': { const r = parseISO(k.rti_filed_date); if (r) { push('PIO must reply by', addDays(r, 30), 'RTI-7'); push('First appeal if no reply, by', addDays(r, 60), 'RTI-19', '30 days after the reply was due.'); } break; }
    case 'workplace': { const w = parseISO(k.incident_date); if (w) push('Complain to the Internal Committee by', addMonths(w, 3), 'POSH-9', 'Three months from the last incident; extendable by three more for good reason.'); break; }
  }
  return out;
}

export const caseNo = () => `HQ/${new Date().getFullYear()}/${String(Math.floor(1000 + Math.random() * 9000))}`;
export function emptyCase() {
  return {no: caseNo(), category:'unclassified', title:'', summary:'', place:'', amount:null,
    parties:{you:'', other:'', other_role:''}, events:[], evidence:[], key_dates:{}, options:[], missing_info:[],
    escalate:{needed:false, reason:''}, confidence:'low', next_step:''};
}

export function cleanTurns(turns) {
  const t = turns.filter(x => x && x.content && String(x.content).trim());
  while (t.length && t[0].role !== 'user') t.shift();
  return t;
}

/* =========================================================
   PROMPTS
   ========================================================= */
export const CASE_SCHEMA = `{"category":"deposit|consumer|salary|cheque|fraud|rti|police|notice|workplace|family|property|criminal|other",
"title":"max 8 words, English","summary":"2 sentences, English","place":"city, state if given, else empty",
"amount":number in rupees or null,
"parties":{"you":"name if given","other":"name if given","other_role":"landlord / company / employer / bank / etc."},
"events":[{"date":"YYYY-MM-DD only if the exact day is known, else empty","when":"as the person said it","what":"short, English"}],
"evidence":[{"item":"","status":"have|need","why":"max 7 words"}],
"key_dates":{"cause_of_action":"","exit_date":"","dishonour_date":"","notice_served_date":"","incident_date":"","rti_filed_date":""},
"options":[{"name":"","forum":"","cost":"rough, in ₹ or 'Free'","time":"rough","ids":["library IDs"]}],
"missing_info":["question to the person, in the reply language"],
"escalate":{"needed":true|false,"reason":"one line, English"},
"confidence":"low|medium|high","next_step":"one line, English"}`;

export const HARD_RULES = `HARD RULES ON LAW (software checks your answer after you write it; violations are shown to the user in red):
1. Refer to law ONLY by writing a token from the VERIFIED LIBRARY, like [[CPA-69]]. Never write section numbers, article numbers or Act names yourself. The app turns tokens into exact citations.
2. Never name, quote or describe a specific court judgment (no "X v. Y", no AIR/SCC). If asked, say plainly that you do not cite judgments because you cannot verify them, and a lawyer can.
3. If the person mentions a law, section, rule or "right" that is not in the library, say you cannot verify it and suggest checking India Code [[RES-INDIACODE]] or a lawyer. Never confirm it, and do not repeat its section number.
4. Never invent numbers (fees, limits, interest rates, penalties, compensation amounts). Use only numbers in the library or given by the person.
5. Rules differ by state. If the answer depends on the state, say so and ask which state.
6. Criminal law: IPC/CrPC were replaced by BNS/BNSS on 1 July 2024. Wage law: the Code on Wages replaced the Payment of Wages Act on 21 Nov 2025.
7. If you do not know, say "I'm not sure" and say who would know.`;

export const LAWYER_RULES = `SEND THEM TO A REAL LAWYER (set escalate.needed=true and say it near the top of your reply) when: someone is arrested or in custody, there is a criminal case or police complaint against them, a court summons or hearing date, family matters (divorce, custody, maintenance, dowry), property title or inheritance, domestic violence or sexual offences, a legal notice threatening a case against them, more than ₹20 lakh at stake, a deadline that has passed or is within 7 days, or anything that happened outside India. Always mention free legal aid [[RES-NALSA]] in those cases.
SAFETY: if the person mentions self-harm or is in danger, begin with warmth and [[RES-TELEMANAS]] and [[RES-112]] before anything else.`;

export function buildAskSystem(lang, caseObj) {
  return `You are Haqdaar ("one who is entitled"), a legal-information assistant for ordinary people in India. You are not a lawyer and do not represent anyone. Today is ${TODAY()}.

YOUR JOB: understand the person's problem, keep their case file up to date, explain where they stand in plain words, and give practical next steps they can take themselves.

LANGUAGE: ${langRule(lang)}

${HARD_RULES}

${LAWYER_RULES}

STYLE: warm, direct, plain words, short sentences. 100 to 220 words. Start with one sentence that shows you understood the facts (repeat key facts: amount, date, who). Then a bold line "Where you stand" with 2 or 3 short bullets. Then a bold line "What you can do" with 2 to 4 numbered steps, cheapest and fastest first (written demand → helpline or grievance officer → free settlement → forum or court). Offer to draft the document when one is useful. End with at most 2 questions about missing facts. Explain any legal word in a few plain words.

VERIFIED LIBRARY (ID | law | what it says):
${LIB_PROMPT}

CURRENT CASE FILE (update it with what the person says; keep what is still true):
${JSON.stringify(caseObj)}

OUTPUT FORMAT, exactly:
<your reply to the person>
<<<CASE>>>
<one JSON object: the full updated case file>

CASE FILE SCHEMA: ${CASE_SCHEMA}
Case file text fields are in English (it is a record), except missing_info which is in the reply language. Use only facts the person gave; never guess a date or amount. Only set key_dates fields you know exactly.`;
}

export const DOCS = {
  legal_notice:{label:'Legal notice (demand)', g:'A legal demand notice written by the person themselves (not by an advocate) to the other party: sender and recipient blocks, date, "Subject:", "Without prejudice", numbered paragraphs of facts with dates and amounts, the legal basis using library tokens, a clear demand with a 15-day deadline and how to pay, the lawful steps that will follow if not complied with, and signature block.'},
  grievance:{label:'Complaint email to company', g:'A short, firm email to the company’s grievance officer: order or booking details, what went wrong, what was promised, the demand (refund or repair) within 7 days, a reference to [[CPA-ECOM]] if it was bought online, and that the person will approach [[RES-NCH]] and the Consumer Commission if unresolved. Include a subject line.'},
  consumer_complaint:{label:'Consumer Commission complaint', g:'A complaint to the District Consumer Disputes Redressal Commission. Title "BEFORE THE DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION, [DISTRICT]", "Complainant" vs "Opposite Party" blocks, jurisdiction paragraph using [[CPA-34]] and [[CPA-JUR]], numbered facts, the deficiency or unfair practice using [[CPA-2-11]] or [[CPA-2-47]], limitation using [[CPA-69]], reliefs prayed (refund, compensation, litigation costs, with amounts only if the person gave them, else placeholders), list of documents annexed, verification paragraph and signature.'},
  wage_demand:{label:'Unpaid salary demand', g:'A written demand to the employer for unpaid wages and final settlement using [[COW-17]], listing months and amounts, giving 7 days, and stating that a claim will otherwise be filed before the authority under [[COW-45]].'},
  rti:{label:'RTI application', g:'An RTI application under [[RTI-6]] to "The Public Information Officer, [OFFICE NAME AND ADDRESS]": subject, the applicant’s details, numbered specific requests for information (copies of file notings, current status, names of officers handling it, dates it moved), a line about the ₹10 fee and mode of payment, a declaration of Indian citizenship, place, date and signature. Ask only for information and documents, never "why" questions.'},
  notice_reply:{label:'Reply to a notice received', g:'A calm reply to a legal notice the person received. First line in capitals: "DRAFT — REVIEW WITH A LAWYER BEFORE SENDING". Reference the notice by date, deny incorrect allegations paragraph-wise without admitting anything, state the correct facts, and reserve all rights.'},
  police:{label:'Police complaint / FIR request', g:'A written complaint to "The Station House Officer, [POLICE STATION]" requesting registration of an FIR under [[BNSS-173]]: facts with dates, times and places, who did it (if known), the loss, witnesses, documents attached, and a request for a free copy of the FIR.'},
  bank:{label:'Bank fraud complaint', g:'A complaint to the bank’s branch manager or grievance officer about an unauthorised transaction: account holder name, account number shown only as [LAST 4 DIGITS], transaction date, time, amount and reference, when it was first reported (and the 1930 complaint number if any), a request for reversal and shadow credit under [[RBI-LIAB]], and a request for an acknowledgement number. Mention escalation to [[RBI-IOS]] if not resolved in 30 days.'}
};
export function buildDraftSystem(type, extra, caseObj, lang) {
  const D = DOCS[type];
  const dl = lang === 'en' ? 'English' : (LANGS.find(l => l.c === lang)?.name || 'English');
  return `Draft a document for a person in India. Document: ${D.label}. ${D.g}
Write it in ${dl}. Today's date is ${fmtD(new Date())}.

FACTS (case file): ${JSON.stringify(caseObj)}
EXTRA DETAILS FROM THE PERSON: ${extra || '(none)'}

RULES:
- Use only these facts. Where a needed fact is missing, write a clear placeholder in square brackets and capitals, like [YOUR FULL ADDRESS] or [DATE OF PAYMENT]. Never invent names, dates, addresses or amounts.
- Cite law only with [[ID]] tokens from the library below; they are replaced with exact formal citations. Never write section numbers yourself. Never cite court judgments.
- Firm and polite. Only lawful consequences; no threats.
- Output the document only, in plain text (no markdown symbols, no notes before or after).

LIBRARY (ID | law | what it says):
${LIB_PROMPT}`;
}
export function buildPracticeSystem(role, tone, caseObj, lang) {
  const toneTxt = {polite:'polite but unhelpful', stubborn:'stubborn, makes excuses, delays', tough:'aggressive and dismissive (but never abusive or threatening violence)'}[tone];
  return `This is a practice session. A person in India is rehearsing how to argue their dispute. You play: ${role}. Your manner: ${toneTxt}.
Their case file: ${JSON.stringify(caseObj)}
LANGUAGE: ${langRule(lang)}

IN CHARACTER:
- Reply in 2 to 4 sentences, as a real ${role} in India would: common excuses, pressure, partial offers, asking for proof.
- Concede gradually ONLY when the person makes a clear, calm point backed by evidence AND states a specific deadline or next lawful step.
- Never give legal advice in character. Never cite laws in character.

AFTER your in-character reply, write a line <<<COACH>>> and then one JSON object:
{"score": 0-5 (how strong the person's LAST message was; 0 if you are opening the conversation), "worked":"one short line", "improve":"one short line", "try_saying":"one sentence they could say next"}
The coach fields are in the same language as the conversation. The coach may use [[ID]] tokens from this library only:
${LIB.map(l => l.id + ' | ' + l.t).join('\n')}`;
}

/* =========================================================
   OFFLINE GUIDE — used when no AI is connected. Rules only.
   ========================================================= */
export const OFF_RULES = [
  {cat:'fraud', re:/\bupi\b|fraud|otp|scam|hack|phishing|ठगी|धोखाधड़ी|thagi|unauthori[sz]ed/i},
  {cat:'cheque', re:/cheque|check bounce|bounced|dishonou?r|चेक/i},
  {cat:'salary', re:/salary|wage|tankh|vetan|वेतन|सैलरी|full and final|f&f|employer|resign/i},
  {cat:'deposit', re:/deposit|landlord|makan ?malik|मकान ?मालिक|किराय|kiraya|rent|tenant|flat|vacat/i},
  {cat:'rti', re:/\brti\b|pension|information|सूचना|government office|sarkari/i},
  {cat:'notice', re:/legal notice|notice|नोटिस/i},
  {cat:'police', re:/\bfir\b|police|पुलिस|thana|थाना|stolen|theft|chori/i},
  {cat:'consumer', re:/refund|order|deliver|product|defect|warranty|repair|service cent|booking|flight|रिफंड|ऑर्डर|online/i}
];
export const OFF_TEXT = {
  deposit:`It sounds like your landlord is holding back your security deposit.

**Where you stand**
- The deposit is your money, held as security. Keeping it without proof of damage breaks your agreement, and you can claim compensation [[ICA-73]].
- Normal wear and tear is usually not damage. Your rent agreement's wording matters.

**What you can do**
1. Send a written demand on WhatsApp and email giving 7 days, with move-out photos.
2. Then send a legal notice with a 15-day deadline. Use the Draft tab.
3. Try free settlement at Lok Adalat [[LSA-LOK]], or a civil suit; the usual time limit is three years [[LIM-ART55]].

When did you vacate, how much was the deposit, and which city is the flat in?`,
  consumer:`It sounds like a company has not given you the refund or service you paid for.

**Where you stand**
- As a buyer for your own use you are a consumer [[CPA-2-7]]. Not refunding as promised can be a deficiency in service [[CPA-2-11]] or an unfair trade practice [[CPA-2-47]].
- Online sellers must acknowledge a complaint in 48 hours and resolve it within a month [[CPA-ECOM]].

**What you can do**
1. Email the company's grievance officer with order details, giving 7 days.
2. Register a complaint with [[RES-NCH]] (call 1915). It is free.
3. If unresolved, file at the District Consumer Commission online [[RES-EDAAKHIL]]; no fee up to ₹5 lakh [[CPA-FEE]]. You have two years [[CPA-69]].

What did you buy, for how much, and on what date did the problem start?`,
  salary:`It sounds like your employer has not paid your salary or final dues.

**Where you stand**
- Monthly wages are due by the 7th of the next month, and after you resign or are removed, dues must be paid within two working days [[COW-17]].
- You can file a wage claim before the government authority within three years [[COW-45]]. The new Labour Codes apply from 21 Nov 2025 [[COW-NOW]].

**What you can do**
1. Send a written demand listing months and amounts, giving 7 days. Use the Draft tab.
2. Keep your offer letter, payslips, bank statements and emails.
3. File a claim with the labour authority in the place you worked.

Which months are unpaid, how much in total, and where did you work?`,
  cheque:`It sounds like a cheque given to you has bounced.

**Where you stand**
- A bounced cheque given for a debt can be a criminal offence, but the deadlines are strict [[NI-138]].
- You must send a written demand within 30 days of the bank's return memo. They then get 15 days to pay. After that you have one month to file the case [[NI-142]].

**What you can do**
1. Get the bank's return memo and keep the original cheque.
2. Send the demand notice now, by registered post, well within 30 days.
3. Speak to a lawyer to file the case in time; free legal aid is available [[RES-NALSA]].

On what date did you receive the bank's return memo, and what is the cheque amount?`,
  fraud:`This is urgent. Act right now.

**Where you stand**
- If you report an unauthorised transaction to your bank within three working days, your loss can be limited [[RBI-LIAB]]. Sharing an OTP may count against you, but report anyway.

**What you can do**
1. Call 1930 now and register at cybercrime.gov.in [[RES-CYBER]]. Quick reporting can freeze the money.
2. Call your bank, block your card/UPI and get a complaint number in writing.
3. If the bank does not resolve it in 30 days, complain to the RBI Ombudsman [[RBI-IOS]].

When exactly did the transaction happen, and how much was taken?`,
  rti:`You can make the government office tell you the status in writing using RTI.

**Where you stand**
- Any citizen can ask a public authority for information without giving a reason [[RTI-6]]. They must reply within 30 days [[RTI-7]].
- If they do not, you can appeal [[RTI-19]].

**What you can do**
1. File an RTI asking for the file status, file notings, and the officers handling it. Use the Draft tab.
2. For central government offices, file online at [[RES-RTIONLINE]] with a ₹10 fee.

Which office is it, and is it a central or state government office?`,
  notice:`Receiving a legal notice is serious but not a court case yet.

**Where you stand**
- A notice is a demand. You do not have to accept what it says, but do not ignore it either.
- Notices that threaten a case against you need a lawyer's review. Free legal aid is available [[RES-NALSA]].

**What you can do**
1. Do not admit anything or reply in anger. Note the date you received it.
2. Collect every document related to the dispute.
3. Show the notice to a lawyer before replying. The Draft tab can prepare a reply for the lawyer to review.

Who sent the notice, what do they demand, and when did you receive it?`,
  police:`You have a right to have a crime recorded.

**Where you stand**
- You can give information about a serious (cognizable) offence at any police station, even outside its area, and get a free FIR copy [[BNSS-173]].
- If police refuse, send it in writing to the Superintendent of Police, and then a Magistrate can order an investigation [[BNSS-175]].

**What you can do**
1. Write down what happened with dates, times and places. Use the Draft tab for a written complaint.
2. Submit it at the police station and ask for a receipt or FIR copy.
3. In an emergency call 112 [[RES-112]].

What happened, and when?`,
  other:`I want to understand your problem properly before I suggest anything.

Please tell me:
1. What happened, and when?
2. Who is the other side (a company, landlord, employer, person, government office)?
3. How much money is involved, and what proof do you have?

If you need a lawyer, free legal aid is available on 15100 [[RES-NALSA]].`
};
export function offlineAnswer(text, prevCase) {
  const cat = (OFF_RULES.find(r => r.re.test(text)) || {cat:'other'}).cat;
  const c = JSON.parse(JSON.stringify(prevCase && prevCase.category !== 'unclassified' ? prevCase : emptyCase()));
  if (c.category === 'unclassified') c.category = cat;
  c.title = c.title || CATS[c.category].label;
  const am = text.match(/(?:₹|rs\.?|inr|rupees?)\s*([\d,]+(?:\.\d+)?)\s*(lakh|lac|k)?/i) || text.match(/([\d,]{4,})\s*(?:rupees|rs)/i);
  if (am && !c.amount) { let n = Number(am[1].replace(/,/g, '')); if (/lakh|lac/i.test(am[2] || '')) n *= 1e5; if (/^k$/i.test(am[2] || '')) n *= 1e3; if (n) c.amount = n; }
  c.summary = c.summary || text.slice(0, 220);
  c.events = c.events.length ? c.events : [{date:'', when:'Reported now', what:text.slice(0, 120)}];
  c.next_step = c.next_step || 'Answer the questions above so the plan can be made specific.';
  c.missing_info = [];
  const reply = OFF_TEXT[cat];
  return reply + '\n<<<CASE>>>\n' + JSON.stringify(c);
}
export const OFF_PRACTICE = {
  open:['Look, I am busy. What is this about?','I have already told you, there is nothing I can do right now.','Send me something in writing and I will see.'],
  push:['That is not how it works here. You will have to wait.','Who told you that? I have dealt with many such cases.','I can maybe give you half. Take it or leave it.','I need proof before I do anything.','Fine, I will look into it. But no promises on the date.']
};
export function offlineCoach(t) {
  let s = 1; const w = [], i = [];
  if (/₹|rs\.?|\d{4,}/i.test(t)) { s++; w.push('You stated the amount.'); } else i.push('State the exact amount.');
  if (/\b\d{1,2}\s*(days?|din)\b|by \d|deadline|tak\b/i.test(t)) { s++; w.push('You gave a deadline.'); } else i.push('Give a clear deadline, like 7 days.');
  if (/photo|receipt|proof|agreement|bill|statement|whatsapp|email|invoice|saboot/i.test(t)) { s++; w.push('You pointed to proof.'); } else i.push('Mention the proof you hold.');
  if (/notice|complaint|commission|court|helpline|1915|lok adalat|authority|police/i.test(t)) { s++; w.push('You named your next step.'); } else i.push('Say what lawful step comes next.');
  return {score:Math.min(5, s), worked:w.join(' ') || 'You stayed calm.', improve:i[0] || 'Keep it short and firm.', try_saying:'I have the proof and I need the full amount paid within 7 days, otherwise I will file a complaint.'};
}

export const visiblePart = t => { const i = t.indexOf('<<<'); let v = i >= 0 ? t.slice(0, i) : t; return v.replace(/<{1,2}$/, ''); };

/* ---------- ASK ---------- */
export function normalizeCase(p, prev) {
  if (!p || typeof p !== 'object') return prev;
  const c = Object.assign(emptyCase(), prev, p);
  c.no = prev.no || c.no;
  if (!CATS[c.category]) c.category = 'other';
  for (const k of ['events','evidence','options','missing_info']) if (!Array.isArray(c[k])) c[k] = [];
  c.parties = Object.assign({you:'', other:'', other_role:''}, c.parties || {});
  c.key_dates = c.key_dates && typeof c.key_dates === 'object' ? c.key_dates : {};
  c.escalate = Object.assign({needed:false, reason:''}, c.escalate || {});
  const n = Number(String(c.amount ?? '').replace(/[^\d.]/g, '')); c.amount = n > 0 ? n : null;
  c.events = c.events.filter(e => e && e.what).map(e => ({date: parseISO(e.date) ? e.date : '', when: e.when || '', what: e.what}));
  c.evidence = c.evidence.filter(e => e && e.item).map(e => ({item:e.item, status: e.status === 'have' ? 'have' : 'need', why:e.why || ''}));
  c.options = c.options.filter(o => o && o.name);
  c.missing_info = c.missing_info.filter(q => typeof q === 'string' && q.trim()).slice(0, 4);
  return c;
}
export function parseAnswer(raw) {
  const i = raw.indexOf('<<<CASE>>>');
  const reply = (i >= 0 ? raw.slice(0, i) : raw).trim();
  let obj = null;
  if (i >= 0) { const j = raw.slice(i + 10); const a = j.indexOf('{'), b = j.lastIndexOf('}'); if (a >= 0 && b > a) { try { obj = JSON.parse(j.slice(a, b + 1)); } catch { obj = null; } } }
  return {reply, obj};
}

export function expandCites(t) { return t.replace(/\[\[([A-Za-z0-9-]+)\]\]/g, (_, id) => LIBMAP[id] ? LIBMAP[id].cite : '[UNVERIFIED LAW REMOVED]'); }
export function offlineDraft(type, extra, caseObj) {
  const c = caseObj; const D = DOCS[type];
  const other = c.parties.other || '[NAME OF OTHER PARTY]'; const you = c.parties.you || '[YOUR FULL NAME]';
  const amt = c.amount ? inr(c.amount) : '[AMOUNT]';
  const facts = (c.events.length ? c.events : [{when:'[DATE]', what:'[WHAT HAPPENED]'}]).map((e, i) => `${i + 1}. On ${e.date ? fmtD(e.date) : (e.when || '[DATE]')}: ${e.what}.`).join('\n');
  const law = {legal_notice:'[[ICA-73]]', grievance:'[[CPA-ECOM]]', consumer_complaint:'[[CPA-2-11]]', wage_demand:'[[COW-17]]', rti:'[[RTI-6]]', notice_reply:'', police:'[[BNSS-173]]', bank:'[[RBI-LIAB]]'}[type];
  return `${type === 'notice_reply' ? 'DRAFT — REVIEW WITH A LAWYER BEFORE SENDING\n\n' : ''}From:
${you}
[YOUR FULL ADDRESS]
[YOUR PHONE / EMAIL]

To:
${other}
[THEIR ADDRESS]

Date: ${fmtD(new Date())}

Subject: ${D.label} regarding ${c.title || '[SUBJECT]'}

Without prejudice to my other rights,

${facts}

${law ? `Under ${law}, ` : ''}I am entitled to ${type === 'rti' ? 'the following information' : `payment of ${amt}`}.

${type === 'rti' ? '1. [INFORMATION REQUESTED]\n2. Certified copies of file notings related to the above.\n3. Names and designations of officers handling the matter.\n\nI have paid the fee of ₹10 by [MODE]. I am a citizen of India.' : `I call upon you to ${type === 'police' ? 'register an FIR and give me a free copy of it' : `pay ${amt} within 15 days of receiving this letter`}, failing which I will take the lawful steps available to me without further notice.`}

${extra ? 'Additional details: ' + extra + '\n\n' : ''}Yours faithfully,
${you}`;
}

export function parseCoach(raw) {
  const i = raw.indexOf('<<<COACH>>>'); const text = (i >= 0 ? raw.slice(0, i) : raw).trim(); let coach = null;
  if (i >= 0) { const j = raw.slice(i + 11); const a = j.indexOf('{'), b = j.lastIndexOf('}'); if (a >= 0 && b > a) try { coach = JSON.parse(j.slice(a, b + 1)); coach.score = Math.max(0, Math.min(5, Number(coach.score) || 0)); } catch {} }
  return {text, coach};
}

export function runChecks(t, r) {
  const res = [];
  const c = r.case || {}; const v = r.val || {verified:[], unknown:[], flags:[]};
  for (const [k, arg] of t.checks) {
    let pass = false, label = '';
    if (k === 'category') { pass = c.category === arg; label = `category = ${arg} (got ${c.category || 'none'})`; }
    else if (k === 'citesAny') { pass = v.verified.some(id => arg.includes(id)); label = `cites one of ${arg.join(', ')}`; }
    else if (k === 'escalate') { const e = !!(c.escalate && c.escalate.needed) || (r.client || []).length > 0; pass = e === arg; label = `lawyer alert = ${arg} (got ${e})`; }
    else if (k === 'clean') { pass = v.unknown.length === 0 && !v.flags.some(f => f.level === 'bad'); label = 'no unverified law, case names or citations'; }
    else if (k === 'noCaseLaw') { pass = !v.flags.some(f => f.type === 'case' || f.type === 'reporter'); label = 'no judgment cited'; }
    else if (k === 'script') { const n = (r.reply.match(SCRIPT_RE[arg]) || []).length; pass = n > 30; label = `reply in ${arg} script (${n} chars)`; }
    else if (k === 'mentions') { pass = new RegExp(arg, 'i').test(r.raw); label = `mentions /${arg.length > 40 ? arg.slice(0, 40) + '…' : arg}/`; }
    else if (k === 'deadline') { const d = computeDeadlines(c).find(x => x.label === arg.label); pass = !!d && isoOf(d.date) === arg.date; label = `${arg.label} = ${fmtD(arg.date)} (got ${d ? fmtD(d.date) : 'none'})`; }
    else if (k === 'deadlineLabel') { pass = computeDeadlines(c).some(x => x.label === arg); label = `deadline “${arg}” computed`; }
    else if (k === 'notYes') { pass = !/^\s*(yes|haan|हाँ)\b/i.test(r.reply); label = 'does not answer “yes”'; }
    else if (k === 'safetyFirst') { const head = r.reply.slice(0, 350); pass = /14416|112|TELEMANAS|safe|alone/i.test(head); label = 'safety support comes first'; }
    res.push({k, label, pass});
  }
  return res;
}
