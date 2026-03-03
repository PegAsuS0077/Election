/**
 * Cloudflare Worker — Nepal Election 2082 live results scraper.
 *
 * Triggered by a Cron Trigger (every 2 minutes by default).
 * Fetches the upstream JSON from result.election.gov.np server-side
 * (no CORS), normalises it into the same shapes the frontend expects,
 * and writes three files to the R2 bucket:
 *   - constituencies.json   — ConstituencyResult[]
 *   - snapshot.json         — Snapshot (seat tally + metadata)
 *   - parties.json          — PartyInfo[] (derived from data)
 *
 * R2 binding: RESULTS_BUCKET (configured in wrangler.toml)
 */

// ── Upstream types ────────────────────────────────────────────────────────────

interface UpstreamRecord {
  CandidateID: number;
  CandidateName: string;
  PoliticalPartyName: string;
  SYMBOLCODE: number;
  SymbolName?: string;
  STATE_ID: number;
  DistrictName: string;
  SCConstID: number;
  TotalVoteReceived: number;
  R: number;
  E_STATUS: string | null;
  Gender?: string;
  AGE_YR?: number;
  FATHER_NAME?: string;
  SPOUCE_NAME?: string;
  QUALIFICATION?: string;
  NAMEOFINST?: string;
  EXPERIENCE?: string;
  ADDRESS?: string;
}

// ── Frontend types (must match frontend/src/types.ts exactly) ─────────────────

type Province =
  | "Koshi" | "Madhesh" | "Bagmati" | "Gandaki"
  | "Lumbini" | "Karnali" | "Sudurpashchim";

type ConstituencyStatus = "DECLARED" | "COUNTING" | "PENDING";

interface Candidate {
  candidateId: number;
  nameNp: string;
  name: string;
  partyName: string;
  partyId: string;
  votes: number;
  gender: "M" | "F";
  isWinner: boolean;
  age?: number;
  fatherName?: string;
  spouseName?: string;
  qualification?: string;
  institution?: string;
  experience?: string;
  address?: string;
}

interface ConstituencyResult {
  province: Province;
  district: string;
  districtNp: string;
  code: string;
  name: string;
  nameNp: string;
  status: ConstituencyStatus;
  lastUpdated: string;
  candidates: Candidate[];
  votesCast: number;
  totalVoters?: number;
}

interface SeatEntry { fptp: number; pr: number; }
type SeatTally = Record<string, SeatEntry>;

interface Snapshot {
  totalSeats: number;
  declaredSeats: number;
  lastUpdated: string;
  seatTally: SeatTally;
}

interface PartyInfo {
  partyId: string;
  partyName: string;
  nameEn: string;
  color: string;
  hex: string;
  symbol: string;
  symbolUrl: string;
  candidateCount: number;
}

// ── Env bindings ──────────────────────────────────────────────────────────────

interface Env {
  RESULTS_BUCKET: R2Bucket;
  FRONTEND_URL: string;
}

// ── Voter rolls lookup ────────────────────────────────────────────────────────
// Static JSON: "{District} Constituency {N}" → registered voter count.
// Loaded once from frontend/public/voter_rolls.json via FRONTEND_URL.
// Used to populate totalVoters on each ConstituencyResult for turnout calculation.

let _voterRolls: Map<string, number> | null = null;
let _voterRollsPromise: Promise<Map<string, number>> | null = null;

async function loadVoterRolls(frontendUrl: string): Promise<Map<string, number>> {
  if (_voterRolls !== null) return _voterRolls;
  if (_voterRollsPromise !== null) return _voterRollsPromise;

  _voterRollsPromise = (async () => {
    try {
      const res = await fetch(`${frontendUrl}/voter_rolls.json`);
      if (!res.ok) throw new Error(`voter_rolls fetch failed: ${res.status}`);
      const raw = await res.json() as Record<string, number>;
      const map = new Map<string, number>();
      for (const [k, v] of Object.entries(raw)) {
        if (k.startsWith("_")) continue;
        // "Kathmandu Constituency 1" → "Kathmandu-1"
        const m = k.match(/^(.+?)\s+Constituency\s+(\d+)$/i);
        if (m) map.set(`${m[1]}-${m[2]}`, v);
      }
      console.log(`[scraper] loaded ${map.size} voter roll entries (cached for isolate lifetime)`);
      _voterRolls = map;
      return map;
    } catch (err) {
      console.warn("[scraper] voter_rolls unavailable — totalVoters will be omitted:", err);
      _voterRolls = new Map<string, number>();
      return _voterRolls;
    } finally {
      _voterRollsPromise = null;
    }
  })();

  return _voterRollsPromise;
}

// ── NEU lookup ────────────────────────────────────────────────────────────────
// Cached at module level so it's loaded once per isolate lifetime, not per cron tick.
// Workers reuse the same isolate for many cron invocations — this avoids a 205 KB
// network fetch + JSON.parse on every scheduled() call.

interface NeuRecord {
  id: number;
  n?: string;  // English name
  f?: string;  // father's English name
  s?: string;  // spouse's English name
  h?: string;  // hometown
}

let _neuCache: Map<number, NeuRecord> | null = null;
let _neuFetchPromise: Promise<Map<number, NeuRecord>> | null = null;

async function loadNeuLookup(frontendUrl: string): Promise<Map<number, NeuRecord>> {
  // Return immediately if already cached
  if (_neuCache !== null) return _neuCache;
  // Coalesce concurrent callers into a single in-flight fetch
  if (_neuFetchPromise !== null) return _neuFetchPromise;

  _neuFetchPromise = (async () => {
    try {
      const res = await fetch(`${frontendUrl}/neu_candidates.json`);
      if (!res.ok) throw new Error(`NEU fetch failed: ${res.status}`);
      const records: NeuRecord[] = await res.json() as NeuRecord[];
      const map = new Map<number, NeuRecord>();
      for (const r of records) map.set(r.id, r);
      console.log(`[scraper] loaded ${map.size} NEU records (cached for isolate lifetime)`);
      _neuCache = map;
      return map;
    } catch (err) {
      console.warn("[scraper] NEU lookup unavailable — names will be Nepali:", err);
      // Cache an empty map so we don't retry on every run after a transient failure.
      // The cache is invalidated when the isolate is recycled (typically every few hours).
      _neuCache = new Map<number, NeuRecord>();
      return _neuCache;
    } finally {
      _neuFetchPromise = null;
    }
  })();

  return _neuFetchPromise;
}

// ── Devanagari transliteration ────────────────────────────────────────────────
// Mirrors frontend/src/lib/transliterate.ts exactly.
// Inherent-'a' rule: every consonant carries an inherent 'a' that is suppressed
// when followed by a vowel matra, virama, or end-of-word.

const _CS = "\x01"; // C_START sentinel
const _CE = "\x02"; // C_END sentinel
const _VI = "\x03"; // virama sentinel
const _MS = "\x04"; // matra-start sentinel

function _cons(r: string): string { return _CS + r + _CE; }

function _charToken(ch: string): string {
  switch (ch) {
    case "अ": return "a";   case "आ": return "aa";  case "इ": return "i";
    case "ई": return "ee";  case "उ": return "u";   case "ऊ": return "oo";
    case "ऋ": return "ri";  case "ए": return "e";   case "ऐ": return "ai";
    case "ओ": return "o";   case "औ": return "au";
    case "ा": return _MS+"a";  case "ि": return _MS+"i";  case "ी": return _MS+"i";
    case "ु": return _MS+"u";  case "ू": return _MS+"u";  case "ृ": return _MS+"ri";
    case "े": return _MS+"e";  case "ै": return _MS+"ai"; case "ो": return _MS+"o";
    case "ौ": return _MS+"au";
    case "्": return _VI;
    case "ं": return "n";  case "ँ": return "n";  case "ः": return "h";
    case "़": return "";
    case "क": return _cons("k");   case "ख": return _cons("kh");
    case "ग": return _cons("g");   case "घ": return _cons("gh");
    case "ङ": return _cons("ng");  case "च": return _cons("ch");
    case "छ": return _cons("chh"); case "ज": return _cons("j");
    case "झ": return _cons("jh");  case "ञ": return _cons("ny");
    case "ट": return _cons("t");   case "ठ": return _cons("th");
    case "ड": return _cons("d");   case "ढ": return _cons("dh");
    case "ण": return _cons("n");   case "त": return _cons("t");
    case "थ": return _cons("th");  case "द": return _cons("d");
    case "ध": return _cons("dh");  case "न": return _cons("n");
    case "प": return _cons("p");   case "फ": return _cons("ph");
    case "ब": return _cons("b");   case "भ": return _cons("bh");
    case "म": return _cons("m");   case "य": return _cons("y");
    case "र": return _cons("r");   case "ल": return _cons("l");
    case "व": return _cons("v");   case "श": return _cons("sh");
    case "ष": return _cons("sh");  case "स": return _cons("s");
    case "ह": return _cons("h");
    case "०": return "0"; case "१": return "1"; case "२": return "2";
    case "३": return "3"; case "४": return "4"; case "५": return "5";
    case "६": return "6"; case "७": return "7"; case "८": return "8";
    case "९": return "9"; case "।": return ".";
    default:  return ch;
  }
}

function _nuktaToken(base: string): string {
  switch (base) {
    case "ड": return _cons("r");  case "ढ": return _cons("rh");
    case "क": return _cons("q");  case "फ": return _cons("f");
    case "ग": return _cons("gh"); case "ज": return _cons("z");
    default:  return _charToken(base);
  }
}

// Suppress inherent-a before matra/virama OR at end of token (word boundary)
const _RE_SUPPRESS = new RegExp(_CS + "([^" + _CE + "]*)" + _CE + "(?=[" + _MS + _VI + "]|$)", "g");
const _RE_KEEP     = new RegExp(_CS + "([^" + _CE + "]*)" + _CE, "g");

function transliterateDevanagari(text: string): string {
  if (!text) return text;
  const chars = [...text];
  let tokens = "";
  for (let i = 0; i < chars.length; i++) {
    if (chars[i + 1] === "़") { tokens += _nuktaToken(chars[i]); i++; }
    else { tokens += _charToken(chars[i]); }
  }
  return tokens
    .replace(_RE_SUPPRESS, "$1")
    .replace(_RE_KEEP, "$1a")
    .replace(new RegExp(_VI, "g"), "")
    .replace(new RegExp(_MS, "g"), "");
}

function nepaliNameToEnglish(name: string): string {
  if (!name) return name;
  if (/^[\x00-\x7F\s]+$/.test(name)) return name.trim();
  const roman = transliterateDevanagari(name);
  return roman
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .trim();
}

// ── Constants ─────────────────────────────────────────────────────────────────

const UPSTREAM_URL =
  "https://result.election.gov.np/JSONFiles/ElectionResultCentral2082.txt";

const TOTAL_SEATS = 275;
const PR_SEATS = 110;

// ── Province mapping ──────────────────────────────────────────────────────────

const STATE_TO_PROVINCE: Record<number, Province> = {
  1: "Koshi",
  2: "Madhesh",
  3: "Bagmati",
  4: "Gandaki",
  5: "Lumbini",
  6: "Karnali",
  7: "Sudurpashchim",
};

// ── District name lookup (Nepali → English) ───────────────────────────────────
// Mirrors frontend/src/lib/districtNames.ts exactly.

const DISTRICT_EN: Record<string, string> = {
  // Koshi Province
  "ताप्लेजुङ": "Taplejung",
  "पाँचथर": "Panchthar",
  "इलाम": "Ilam",
  "सङ्खुवासभा": "Sankhuwasabha",
  "संखुवासभा": "Sankhuwasabha",
  "भोजपुर": "Bhojpur",
  "धनकुटा": "Dhankuta",
  "तेह्रथुम": "Tehrathum",
  "खोटाङ": "Khotang",
  "सोलुखुम्बु": "Solukhumbu",
  "ओखलढुङ्गा": "Okhaldhunga",
  "ओखलढुंगा": "Okhaldhunga",
  "झापा": "Jhapa",
  "मोरङ": "Morang",
  "सुनसरी": "Sunsari",
  "उदयपुर": "Udayapur",
  // Madhesh Province
  "सप्तरी": "Saptari",
  "सिरहा": "Siraha",
  "सिराहा": "Siraha",
  "धनुषा": "Dhanusha",
  "महोत्तरी": "Mahottari",
  "सर्लाही": "Sarlahi",
  "रौतहट": "Rautahat",
  "बारा": "Bara",
  "पर्सा": "Parsa",
  // Bagmati Province
  "दोलखा": "Dolakha",
  "रामेछाप": "Ramechhap",
  "सिन्धुली": "Sindhuli",
  "रसुवा": "Rasuwa",
  "धादिङ": "Dhading",
  "नुवाकोट": "Nuwakot",
  "काठमाडौँ": "Kathmandu",
  "काठमाडौं": "Kathmandu",
  "भक्तपुर": "Bhaktapur",
  "ललितपुर": "Lalitpur",
  "काभ्रेपलाञ्चोक": "Kavrepalanchok",
  "सिन्धुपाल्चोक": "Sindhupalchok",
  "मकवानपुर": "Makwanpur",
  "चितवन": "Chitwan",
  // Gandaki Province
  "गोर्खा": "Gorkha",
  "गोरखा": "Gorkha",
  "मनाङ": "Manang",
  "लमजुङ": "Lamjung",
  "कास्की": "Kaski",
  "तनहुँ": "Tanahun",
  "स्याङ्जा": "Syangja",
  "स्याङजा": "Syangja",
  "मुस्ताङ": "Mustang",
  "म्याग्दी": "Myagdi",
  "बाग्लुङ": "Baglung",
  "पर्वत": "Parbat",
  // Lumbini Province
  "गुल्मी": "Gulmi",
  "पाल्पा": "Palpa",
  "अर्घाखाँची": "Arghakhanchi",
  "रूपन्देही": "Rupandehi",
  "कपिलवस्तु": "Kapilvastu",
  "कपिलबस्तु": "Kapilvastu",
  "रुकुम पूर्व": "Rukum East",
  "रोल्पा": "Rolpa",
  "प्युठान": "Pyuthan",
  "प्यूठान": "Pyuthan",
  "दाङ": "Dang",
  "बाँके": "Banke",
  "बर्दिया": "Bardiya",
  // Karnali Province
  "सल्यान": "Salyan",
  "डोल्पा": "Dolpa",
  "मुगु": "Mugu",
  "जुम्ला": "Jumla",
  "कालिकोट": "Kalikot",
  "हुम्ला": "Humla",
  "जाजरकोट": "Jajarkot",
  "दैलेख": "Dailekh",
  "सुर्खेत": "Surkhet",
  "रुकुम पश्चिम": "Rukum West",
  // Sudurpashchim Province
  "बाजुरा": "Bajura",
  "अछाम": "Achham",
  "बझाङ": "Bajhang",
  "डोटी": "Doti",
  "कैलाली": "Kailali",
  "दार्चुला": "Darchula",
  "बैतडी": "Baitadi",
  "डडेलधुरा": "Dadeldhura",
  "कञ्चनपुर": "Kanchanpur",
  // Nawalparasi / Rukum split overrides (full unambiguous strings)
  "नवलपरासी (बर्दघाट सुस्ता पूर्व)": "Nawalpur",
  "नवलपरासी (बर्दघाट सुस्ता पश्चिम)": "Parasi",
  "रुकुम (पूर्वी भाग)": "Rukum East",
  "रुकुम (पश्चिम भाग)": "Rukum West",
};

// Short "नवलपुर" is ambiguous — depends on STATE_ID
const NAWALPARASI_SHORT: Record<number, string> = { 4: "Nawalpur", 5: "Parasi" };

function districtEn(np: string, stateId: number): string {
  if (np === "नवलपुर") return NAWALPARASI_SHORT[stateId] ?? "Nawalpur";
  return DISTRICT_EN[np] ?? `Province${stateId}-District`;
}

// ── Party display metadata ────────────────────────────────────────────────────
// Known parties get nice colours / symbols. Everything else gets a generic colour.

interface KnownPartyMeta {
  nameEn: string;
  color: string;
  hex: string;
  symbol: string;
  symbolUrl: string;
}

const KNOWN_PARTIES: Record<string, KnownPartyMeta> = {
  // Keys are SYMBOLCODE strings (or "IND")
  "2":   { nameEn: "Nepali Congress",                  color: "bg-red-600",      hex: "#dc2626", symbol: "🌳", symbolUrl: "https://nepalelectionupdates.com/wp-content/uploads/nc-symbol.jpg" },
  "3":   { nameEn: "CPN (UML)",                        color: "bg-blue-600",     hex: "#2563eb", symbol: "☀️", symbolUrl: "https://nepalelectionupdates.com/wp-content/uploads/uml-symbol.jpg" },
  "4":   { nameEn: "NCP (Maoist Centre)",              color: "bg-orange-600",   hex: "#ea580c", symbol: "🌙", symbolUrl: "" },
  "7":   { nameEn: "Rastriya Swatantra Party",         color: "bg-emerald-600",  hex: "#059669", symbol: "⚡", symbolUrl: "" },
  "5":   { nameEn: "Rastriya Prajatantra Party",       color: "bg-yellow-600",   hex: "#ca8a04", symbol: "👑", symbolUrl: "" },
  "6":   { nameEn: "Janata Samajwadi Party",           color: "bg-cyan-600",     hex: "#0891b2", symbol: "⚙️", symbolUrl: "" },
  "8":   { nameEn: "CPN (Unified Socialist)",          color: "bg-purple-600",   hex: "#9333ea", symbol: "✊", symbolUrl: "" },
  "9":   { nameEn: "Loktantrik Samajwadi Party",       color: "bg-teal-600",     hex: "#0d9488", symbol: "🌿", symbolUrl: "" },
  "10":  { nameEn: "Nagarik Unmukti Party",            color: "bg-amber-600",    hex: "#d97706", symbol: "🕊️", symbolUrl: "" },
  "11":  { nameEn: "Rastriya Janamorcha",              color: "bg-rose-700",     hex: "#be123c", symbol: "⚒️", symbolUrl: "" },
  "12":  { nameEn: "Nepal Majdoor Kisan Party",        color: "bg-green-700",    hex: "#15803d", symbol: "🌾", symbolUrl: "" },
  "13":  { nameEn: "Janamat Party",                    color: "bg-indigo-600",   hex: "#4f46e5", symbol: "🗳️", symbolUrl: "" },
  "14":  { nameEn: "CPN (Marxist-Leninist)",           color: "bg-red-800",      hex: "#991b1b", symbol: "⭐", symbolUrl: "" },
  "15":  { nameEn: "Nepal Parivar Dal",                color: "bg-stone-600",    hex: "#57534e", symbol: "🏠", symbolUrl: "" },
  "IND": { nameEn: "Independent",                      color: "bg-violet-500",   hex: "#8b5cf6", symbol: "🧑", symbolUrl: "" },
};

const GENERIC_COLORS = [
  { color: "bg-slate-500",  hex: "#64748b" },
  { color: "bg-zinc-500",   hex: "#71717a" },
  { color: "bg-neutral-500", hex: "#737373" },
  { color: "bg-lime-600",   hex: "#65a30d" },
  { color: "bg-sky-600",    hex: "#0284c7" },
  { color: "bg-fuchsia-600", hex: "#c026d3" },
];

// ── Helper functions ───────────────────────────────────────────────────────────

function derivePartyId(rec: UpstreamRecord): string {
  if ((rec.PoliticalPartyName ?? "") === "स्वतन्त्र") return "IND";
  return String(rec.SYMBOLCODE);
}

function isWinner(rec: UpstreamRecord): boolean {
  if (rec.E_STATUS === "W") return true;
  if (rec.R === 1 && rec.TotalVoteReceived > 0) return true;
  return false;
}

function mapGender(g: string | undefined): "M" | "F" {
  return g === "महिला" ? "F" : "M";
}

function omitIfZeroOrDash(s: string | undefined): string | undefined {
  if (!s || s === "-" || s === "0") return undefined;
  return s;
}

// ── Core transform ────────────────────────────────────────────────────────────

function transform(
  records: UpstreamRecord[],
  neuLookup: Map<number, NeuRecord>,
  voterRolls: Map<string, number>,
): {
  constituencies: ConstituencyResult[];
  snapshot: Snapshot;
  parties: PartyInfo[];
} {
  const now = new Date().toISOString();

  // Group by composite constituency key
  const grouped = new Map<string, UpstreamRecord[]>();
  for (const rec of records) {
    const key = `${rec.STATE_ID}-${rec.DistrictName}-${rec.SCConstID}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.push(rec);
    } else {
      grouped.set(key, [rec]);
    }
  }

  // Build party candidate-count map while processing
  const partyCandidateCount = new Map<string, number>();
  const partyNameByPartyId = new Map<string, string>();

  const constituencies: ConstituencyResult[] = [];

  for (const [key, recs] of grouped) {
    const first = recs[0];
    const province = STATE_TO_PROVINCE[first.STATE_ID];
    if (!province) continue;

    const districtNp = first.DistrictName;
    const district = districtEn(districtNp, first.STATE_ID);
    const constNum = first.SCConstID;

    const hasWinner = recs.some(isWinner);
    const hasVotes = recs.some((r) => r.TotalVoteReceived > 0);
    const status: ConstituencyStatus = hasWinner
      ? "DECLARED"
      : hasVotes
        ? "COUNTING"
        : "PENDING";

    const candidates: Candidate[] = recs.map((rec) => {
      const partyId = derivePartyId(rec);
      const partyName = rec.PoliticalPartyName ?? "";

      // Track party metadata
      partyCandidateCount.set(partyId, (partyCandidateCount.get(partyId) ?? 0) + 1);
      if (!partyNameByPartyId.has(partyId)) {
        partyNameByPartyId.set(partyId, partyName);
      }

      const nameNp = rec.CandidateName ?? "";
      const neu = neuLookup.get(rec.CandidateID);
      const nameEn = neu?.n ?? nepaliNameToEnglish(nameNp);

      const cand: Candidate = {
        candidateId: rec.CandidateID,
        nameNp,
        name: nameEn,
        partyName,
        partyId,
        votes: rec.TotalVoteReceived,
        gender: mapGender(rec.Gender),
        isWinner: isWinner(rec),
      };

      if (rec.AGE_YR)                                       cand.age          = rec.AGE_YR;
      if (neu?.f ?? omitIfZeroOrDash(rec.FATHER_NAME))    cand.fatherName   = neu?.f ?? rec.FATHER_NAME;
      if (neu?.s ?? omitIfZeroOrDash(rec.SPOUCE_NAME))    cand.spouseName   = neu?.s ?? rec.SPOUCE_NAME;
      if (omitIfZeroOrDash(rec.QUALIFICATION))             cand.qualification = rec.QUALIFICATION;
      if (omitIfZeroOrDash(rec.NAMEOFINST))                cand.institution  = rec.NAMEOFINST;
      if (omitIfZeroOrDash(rec.EXPERIENCE))                cand.experience   = rec.EXPERIENCE;
      if (neu?.h ?? omitIfZeroOrDash(rec.ADDRESS))        cand.address      = neu?.h ?? rec.ADDRESS;

      return cand;
    });

    const votesCast = candidates.reduce((s, c) => s + c.votes, 0);
    const constName = `${district}-${constNum}`;
    const totalVoters = voterRolls.get(constName);

    const entry: ConstituencyResult = {
      province,
      district,
      districtNp,
      code: key,
      name: constName,
      nameNp: `${districtNp} क्षेत्र नं. ${constNum}`,
      status,
      lastUpdated: now,
      candidates,
      votesCast,
    };
    if (totalVoters !== undefined) entry.totalVoters = totalVoters;
    constituencies.push(entry);
  }

  // Sort: province → district → name (mirrors frontend parseUpstreamData.ts)
  constituencies.sort((a, b) => {
    if (a.province !== b.province) return a.province.localeCompare(b.province);
    if (a.district !== b.district) return a.district.localeCompare(b.district);
    return a.name.localeCompare(b.name);
  });

  // ── Seat tally ──────────────────────────────────────────────────────────────
  const tally: SeatTally = {};

  // FPTP: winner of each declared constituency
  for (const c of constituencies) {
    if (c.status !== "DECLARED") continue;
    const winners = c.candidates.filter((cd) => cd.isWinner);
    const winner =
      winners.length > 0
        ? winners[0]
        : c.candidates.reduce((a, b) => (a.votes > b.votes ? a : b));
    if (tally[winner.partyId]) {
      (tally[winner.partyId] as SeatEntry).fptp += 1;
    } else {
      tally[winner.partyId] = { fptp: 1, pr: 0 };
    }
  }

  // Ensure all parties with candidates have an entry
  for (const pid of partyCandidateCount.keys()) {
    if (!tally[pid]) tally[pid] = { fptp: 0, pr: 0 };
  }

  // PR: 110 seats proportional by total vote share
  let totalVotes = 0;
  const voteShare: Record<string, number> = {};
  for (const c of constituencies) {
    for (const cd of c.candidates) {
      voteShare[cd.partyId] = (voteShare[cd.partyId] ?? 0) + cd.votes;
      totalVotes += cd.votes;
    }
  }
  if (totalVotes > 0) {
    for (const pid of Object.keys(tally)) {
      (tally[pid] as SeatEntry).pr = Math.round(
        ((voteShare[pid] ?? 0) / totalVotes) * PR_SEATS,
      );
    }
  }

  const declaredSeats = constituencies.filter((c) => c.status === "DECLARED").length;

  const snapshot: Snapshot = {
    totalSeats: TOTAL_SEATS,
    declaredSeats,
    lastUpdated: now,
    seatTally: tally,
  };

  // ── Party info list ─────────────────────────────────────────────────────────
  let genericIndex = 0;
  const parties: PartyInfo[] = Array.from(partyCandidateCount.entries()).map(
    ([partyId, candidateCount]) => {
      const known = KNOWN_PARTIES[partyId];
      const meta: KnownPartyMeta = known ?? (() => {
        const g = GENERIC_COLORS[genericIndex % GENERIC_COLORS.length];
        genericIndex++;
        return { nameEn: partyNameByPartyId.get(partyId) ?? partyId, ...g, symbol: "🗳️", symbolUrl: "" };
      })();
      return {
        partyId,
        partyName: partyNameByPartyId.get(partyId) ?? partyId,
        nameEn: meta.nameEn,
        color: meta.color,
        hex: meta.hex,
        symbol: meta.symbol,
        symbolUrl: meta.symbolUrl,
        candidateCount,
      };
    },
  );

  return { constituencies, snapshot, parties };
}

// ── R2 upload helper ──────────────────────────────────────────────────────────

async function putJson(bucket: R2Bucket, key: string, body: unknown): Promise<void> {
  await bucket.put(key, JSON.stringify(body), {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
      cacheControl: "public, max-age=25",
    },
  });
}

// ── Scheduled handler ─────────────────────────────────────────────────────────

async function runOnce(env: Env): Promise<void> {
  const t0 = Date.now();
  console.log("[scraper] scheduled run — fetching upstream JSON…");

  // ── Phase 1B: fetch upstream — bail out WITHOUT touching R2 on any failure ──
  let res: Response;
  try {
    res = await fetch(UPSTREAM_URL, { headers: { "Accept-Encoding": "gzip" }, cf: { cacheTtl: 0 } });
  } catch (err) {
    console.error("[scraper] upstream network error — R2 NOT updated:", err);
    return;
  }
  if (!res.ok) {
    console.error(`[scraper] upstream returned ${res.status} ${res.statusText} — R2 NOT updated`);
    return;
  }

  let text: string;
  try {
    text = await res.text();
  } catch (err) {
    console.error("[scraper] failed to read upstream response body — R2 NOT updated:", err);
    return;
  }

  // Strip UTF-8 BOM (0xFEFF) — present in the official file
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  let records: UpstreamRecord[];
  try {
    records = JSON.parse(text) as UpstreamRecord[];
  } catch (err) {
    console.error("[scraper] upstream JSON parse failed — R2 NOT updated:", err);
    return;
  }

  if (!Array.isArray(records) || records.length < 100) {
    console.error(`[scraper] upstream data looks wrong (${records?.length ?? 0} records) — R2 NOT updated`);
    return;
  }

  const fetchMs = Date.now() - t0;
  console.log(`[scraper] fetched ${records.length} records in ${fetchMs} ms`);

  // Both lookups are cached at module level — negligible cost after first run
  const [neuLookup, voterRolls] = await Promise.all([
    loadNeuLookup(env.FRONTEND_URL),
    loadVoterRolls(env.FRONTEND_URL),
  ]);

  const t1 = Date.now();
  const { constituencies, snapshot, parties } = transform(records, neuLookup, voterRolls);
  const transformMs = Date.now() - t1;

  const totalVotes = constituencies.reduce((s, c) => s + c.votesCast, 0);
  console.log(
    `[scraper] transformed in ${transformMs} ms → ` +
    `${constituencies.length} constituencies, ` +
    `${snapshot.declaredSeats} declared, ` +
    `${totalVotes} total votes`,
  );

  if (constituencies.length !== 165) {
    console.warn(`[scraper] WARNING: expected 165 constituencies, got ${constituencies.length}`);
  }

  // Upload all three files in parallel — only reached after successful parse
  const t2 = Date.now();
  await Promise.all([
    putJson(env.RESULTS_BUCKET, "constituencies.json", constituencies),
    putJson(env.RESULTS_BUCKET, "snapshot.json", snapshot),
    putJson(env.RESULTS_BUCKET, "parties.json", parties),
  ]);
  const uploadMs = Date.now() - t2;

  console.log(
    `[scraper] uploaded 3 files to R2 in ${uploadMs} ms (total ${Date.now() - t0} ms)`,
  );
}

// ── Worker export ─────────────────────────────────────────────────────────────

export default {
  /**
   * Cron trigger — the ONLY place runOnce() is called.
   * Never triggered by HTTP traffic, so bots and health checks
   * cannot consume Worker CPU budget.
   */
  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    await runOnce(env);
  },

  /**
   * HTTP handler — health check ONLY.
   *
   * Returns a lightweight JSON status response without fetching upstream
   * or doing any processing. This prevents bots, uptime monitors, and
   * Cloudflare health probes from triggering expensive scrape work and
   * hitting the CPU time limit.
   *
   * To manually trigger a scrape for testing, use `wrangler dev` with
   * `wrangler dev --test-scheduled` and POST to /__scheduled?cron=*\/2+*+*+*+*
   */
  async fetch(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health" || url.pathname === "/") {
      return new Response(
        JSON.stringify({ ok: true, service: "nepal-election-scraper", ts: new Date().toISOString() }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
