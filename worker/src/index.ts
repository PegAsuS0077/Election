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
  CandidateID: number | string;
  CandidateName: string;
  PoliticalPartyName: string;
  SYMBOLCODE: number | string;
  SymbolId?: number | string;
  SymbolID?: number | string;
  PartyId?: number | string;
  PoliticalPartyID?: number | string;
  SymbolName?: string;
  STATE_ID?: number | string;
  State?: number | string;
  DistrictName: string;
  District?: string;
  SCConstID: number | string;
  ScConstId?: number | string;
  TotalVoteReceived: number | string;
  R: number | string;
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

interface PrPartySnapshotEntry {
  partyId: string;
  partyName: string;
  prVotes: number;
  voteShare: number;
}

interface PrPartySnapshot {
  lastUpdated: string;
  totalPrVotes: number;
  parties: PrPartySnapshotEntry[];
  sourceFile: string;
}

type HorLeaderRow = Partial<UpstreamRecord> & {
  CandidateId?: number | string;
  TotalVote?: number | string;
};

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

const SESSION_PAGE_URL = "https://result.election.gov.np/ElectionResultCentral2082.aspx";
const SESSION_BOOTSTRAP_URLS = [
  "https://result.election.gov.np/ElectionResultCentral2082.aspx",
  "https://result.election.gov.np/",
];

const UPSTREAM_URL =
  "https://result.election.gov.np/Handlers/SecureJson.ashx" +
  "?file=JSONFiles/ElectionResultCentral2082.txt";
const UPSTREAM_PR_HOR_URL =
  "https://result.election.gov.np/Handlers/SecureJson.ashx" +
  "?file=JSONFiles/Election2082/Common/PRHoRPartyTop5.txt";
const UPSTREAM_HOR_MERGE_URL =
  "https://result.election.gov.np/Handlers/SecureJson.ashx" +
  "?file=JSONFiles/Election2082/Common/HOR-T5Leader.json";
const UPSTREAM_HOR_WINNER_URL =
  "https://result.election.gov.np/Handlers/SecureJson.ashx" +
  "?file=JSONFiles/Election2082/Common/HOR-T5Winner.json";
const HOR_TOP5_REFERER_URL = "https://result.election.gov.np/FPTPWLChartResult2082.aspx";

const TOTAL_SEATS = 275;
const PR_SEATS = 110;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504, 520, 521, 522, 523, 524]);
const MAX_FETCH_ATTEMPTS = 2; // 1 initial + 1 retry
const RETRY_BACKOFF_MS = 300;
const REQUEST_TIMEOUT_MS = 15_000;
const OPTIONAL_MAX_FETCH_ATTEMPTS = 1;
const OPTIONAL_REQUEST_TIMEOUT_MS = 8_000;
const LAST_GOOD_CONSTITUENCIES_KEY = "constituencies.last_good.json";
const LAST_GOOD_SNAPSHOT_KEY = "snapshot.last_good.json";
const LAST_GOOD_PARTIES_KEY = "parties.last_good.json";

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

function derivePartyId(rec: Partial<UpstreamRecord>): string {
  const partyName = (rec.PoliticalPartyName ?? "").trim();
  if (partyName === "स्वतन्त्र") return "IND";

  const symbolCode = toInt(
    rec.SYMBOLCODE ??
    rec.SymbolID ??
    rec.SymbolId ??
    rec.PartyId ??
    rec.PoliticalPartyID,
  );
  if (symbolCode !== null) return String(symbolCode);

  if (partyName) return partyName;
  return "IND";
}

function isWinner(rec: UpstreamRecord): boolean {
  return rec.E_STATUS === "W";
}

function mapGender(g: string | undefined): "M" | "F" {
  return g === "महिला" ? "F" : "M";
}

function omitIfZeroOrDash(s: string | undefined): string | undefined {
  if (!s || s === "-" || s === "0") return undefined;
  return s;
}

function toInt(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
  }
  return null;
}

function recordStateId(rec: UpstreamRecord): number | null {
  return toInt(rec.STATE_ID ?? rec.State);
}

function recordConstId(rec: UpstreamRecord): number | null {
  return toInt(rec.SCConstID ?? rec.ScConstId);
}

function recordDistrictNp(rec: UpstreamRecord): string {
  return (rec.DistrictName ?? rec.District ?? "").trim();
}

function mergeHigherVotesFromRows(
  baseRecords: UpstreamRecord[],
  fresherRows: HorLeaderRow[],
): { upgraded: number; missingCandidateRows: number; usableRows: number } {
  const fresherVoteByCandidateId = new Map<number, number>();
  for (const row of fresherRows) {
    const candidateId = toInt(row.CandidateID ?? row.CandidateId);
    const votes = toInt(row.TotalVoteReceived ?? row.TotalVote);
    if (candidateId === null || votes === null || votes < 0) continue;
    const prev = fresherVoteByCandidateId.get(candidateId);
    if (prev === undefined || votes > prev) {
      fresherVoteByCandidateId.set(candidateId, votes);
    }
  }

  let upgraded = 0;
  const seenBaseCandidateIds = new Set<number>();
  for (const rec of baseRecords) {
    const candidateId = toInt(rec.CandidateID);
    if (candidateId === null) continue;
    seenBaseCandidateIds.add(candidateId);

    const fresherVotes = fresherVoteByCandidateId.get(candidateId);
    if (fresherVotes === undefined) continue;

    const currentVotes = toInt(rec.TotalVoteReceived) ?? 0;
    if (fresherVotes > currentVotes) {
      rec.TotalVoteReceived = fresherVotes;
      upgraded++;
    }
  }

  let missingCandidateRows = 0;
  for (const candidateId of fresherVoteByCandidateId.keys()) {
    if (!seenBaseCandidateIds.has(candidateId)) missingCandidateRows++;
  }

  return {
    upgraded,
    missingCandidateRows,
    usableRows: fresherVoteByCandidateId.size,
  };
}

function mergeOfficialWinnersFromRows(
  baseRecords: UpstreamRecord[],
  winnerRows: HorLeaderRow[],
): { winnerRows: number; matchedCandidates: number; missingCandidateRows: number; newlyMarked: number } {
  const winnerCandidateIds = new Set<number>();
  for (const row of winnerRows) {
    const candidateId = toInt(row.CandidateID ?? row.CandidateId);
    if (candidateId === null) continue;
    winnerCandidateIds.add(candidateId);
  }

  if (winnerCandidateIds.size === 0) {
    return {
      winnerRows: 0,
      matchedCandidates: 0,
      missingCandidateRows: 0,
      newlyMarked: 0,
    };
  }

  let matchedCandidates = 0;
  let newlyMarked = 0;
  const seenBaseCandidateIds = new Set<number>();
  for (const rec of baseRecords) {
    const candidateId = toInt(rec.CandidateID);
    if (candidateId === null) continue;
    seenBaseCandidateIds.add(candidateId);
    if (!winnerCandidateIds.has(candidateId)) continue;

    matchedCandidates++;
    if (rec.E_STATUS !== "W") {
      rec.E_STATUS = "W";
      newlyMarked++;
    }
  }

  let missingCandidateRows = 0;
  for (const candidateId of winnerCandidateIds) {
    if (!seenBaseCandidateIds.has(candidateId)) missingCandidateRows++;
  }

  return {
    winnerRows: winnerCandidateIds.size,
    matchedCandidates,
    missingCandidateRows,
    newlyMarked,
  };
}

function applyPrSeatsFromSnapshot(
  snapshot: Snapshot,
  prSnapshot: PrPartySnapshot | null,
): void {
  if (!prSnapshot || prSnapshot.totalPrVotes <= 0 || prSnapshot.parties.length === 0) return;

  for (const p of prSnapshot.parties) {
    if (!snapshot.seatTally[p.partyId]) {
      snapshot.seatTally[p.partyId] = { fptp: 0, pr: 0 };
    }
  }

  for (const p of prSnapshot.parties) {
    const prSeats = Math.round((p.prVotes / prSnapshot.totalPrVotes) * PR_SEATS);
    snapshot.seatTally[p.partyId]!.pr = prSeats;
  }
}

async function loadPreviousConstituencies(bucket: R2Bucket): Promise<ConstituencyResult[] | null> {
  try {
    const obj = await bucket.get("constituencies.json");
    if (!obj) return null;

    const text = await obj.text();
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as ConstituencyResult[];
  } catch (err) {
    console.warn("[scraper] unable to load previous constituencies.json:", err);
    return null;
  }
}

async function loadPreviousCandidateVotes(bucket: R2Bucket): Promise<Map<number, number>> {
  const byCandidateId = new Map<number, number>();
  const previousConstituencies = await loadPreviousConstituencies(bucket);
  if (!previousConstituencies) return byCandidateId;

  for (const constituency of previousConstituencies) {
    for (const cand of constituency.candidates) {
      const candidateId = toInt(cand.candidateId);
      const votes = toInt(cand.votes);
      if (candidateId === null || votes === null || votes < 0) continue;

      const prev = byCandidateId.get(candidateId);
      if (prev === undefined || votes > prev) byCandidateId.set(candidateId, votes);
    }
  }
  return byCandidateId;
}

function mergeLeaderVotesIntoConstituencies(
  constituencies: ConstituencyResult[],
  fresherRows: HorLeaderRow[],
): { upgradedVotes: number; updatedConstituencies: number; usableRows: number } {
  const fresherVoteByCandidateId = new Map<number, number>();
  for (const row of fresherRows) {
    const candidateId = toInt(row.CandidateID ?? row.CandidateId);
    const votes = toInt(row.TotalVoteReceived ?? row.TotalVote);
    if (candidateId === null || votes === null || votes < 0) continue;
    const prev = fresherVoteByCandidateId.get(candidateId);
    if (prev === undefined || votes > prev) {
      fresherVoteByCandidateId.set(candidateId, votes);
    }
  }

  const now = new Date().toISOString();
  let upgradedVotes = 0;
  let updatedConstituencies = 0;

  for (const constituency of constituencies) {
    let changed = false;
    for (const cand of constituency.candidates) {
      const candidateId = toInt(cand.candidateId);
      if (candidateId === null) continue;
      const fresherVotes = fresherVoteByCandidateId.get(candidateId);
      if (fresherVotes === undefined) continue;
      if (fresherVotes > cand.votes) {
        cand.votes = fresherVotes;
        upgradedVotes++;
        changed = true;
      }
    }

    if (!changed) continue;
    updatedConstituencies++;
    constituency.votesCast = constituency.candidates.reduce((sum, cand) => sum + cand.votes, 0);
    const hasWinner = constituency.candidates.some((cand) => cand.isWinner);
    const hasVotes = constituency.candidates.some((cand) => cand.votes > 0);
    constituency.status = hasWinner ? "DECLARED" : (hasVotes ? "COUNTING" : "PENDING");
    constituency.lastUpdated = now;
  }

  return {
    upgradedVotes,
    updatedConstituencies,
    usableRows: fresherVoteByCandidateId.size,
  };
}

function applyMonotonicVoteFloor(
  records: UpstreamRecord[],
  previousVotesByCandidateId: Map<number, number>,
): { pinned: number } {
  let pinned = 0;
  for (const rec of records) {
    const candidateId = toInt(rec.CandidateID);
    if (candidateId === null) continue;

    const prevVotes = previousVotesByCandidateId.get(candidateId);
    if (prevVotes === undefined) continue;

    const currentVotes = toInt(rec.TotalVoteReceived) ?? 0;
    if (prevVotes > currentVotes) {
      rec.TotalVoteReceived = prevVotes;
      pinned++;
    }
  }
  return { pinned };
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
  let droppedForGrouping = 0;
  for (const rec of records) {
    const stateId = recordStateId(rec);
    const districtNp = recordDistrictNp(rec);
    const constId = recordConstId(rec);
    if (stateId === null || constId === null || !districtNp) {
      droppedForGrouping++;
      continue;
    }
    const key = `${stateId}-${districtNp}-${constId}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.push(rec);
    } else {
      grouped.set(key, [rec]);
    }
  }
  if (droppedForGrouping > 0) {
    console.warn(`[scraper] dropped ${droppedForGrouping} records with missing state/district/constituency fields`);
  }

  // Build aggregates while processing each constituency once.
  const partyCandidateCount = new Map<string, number>();
  const partyNameByPartyId = new Map<string, string>();
  let declaredSeats = 0;
  const tally: SeatTally = {};

  const constituencies: ConstituencyResult[] = [];

  for (const [key, recs] of grouped) {
    const first = recs[0];
    const stateId = recordStateId(first);
    if (stateId === null) continue;
    const province = STATE_TO_PROVINCE[stateId];
    if (!province) continue;

    const districtNp = recordDistrictNp(first);
    const constNum = recordConstId(first);
    if (!districtNp || constNum === null) continue;
    const district = districtEn(districtNp, stateId);

    let hasWinner = false;
    let hasVotes = false;
    let votesCast = 0;
    let winnerPartyId: string | null = null;
    let leaderPartyId: string | null = null;
    let leaderVotes = -1;

    const candidates: Candidate[] = [];
    for (const rec of recs) {
      const partyId = derivePartyId(rec);
      const partyName = rec.PoliticalPartyName ?? "";

      // Track party metadata
      partyCandidateCount.set(partyId, (partyCandidateCount.get(partyId) ?? 0) + 1);
      if (!partyNameByPartyId.has(partyId)) {
        partyNameByPartyId.set(partyId, partyName);
      }

      const candidateId = toInt(rec.CandidateID);
      if (candidateId === null) continue;

      const nameNp = rec.CandidateName ?? "";
      const neu = neuLookup.get(candidateId);
      const nameEn = neu?.n ?? nepaliNameToEnglish(nameNp);

      const votes = toInt(rec.TotalVoteReceived) ?? 0;
      const cand: Candidate = {
        candidateId,
        nameNp,
        name: nameEn,
        partyName,
        partyId,
        votes,
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

      candidates.push(cand);

      votesCast += cand.votes;
      if (cand.votes > 0) hasVotes = true;
      if (cand.isWinner) {
        hasWinner = true;
        if (!winnerPartyId) winnerPartyId = partyId;
      }
      if (cand.votes > leaderVotes) {
        leaderVotes = cand.votes;
        leaderPartyId = partyId;
      }
    }

    const status: ConstituencyStatus = hasWinner
      ? "DECLARED"
      : hasVotes
        ? "COUNTING"
        : "PENDING";
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

    if (status === "DECLARED") {
      declaredSeats++;
      const fptpWinner = winnerPartyId ?? leaderPartyId;
      if (fptpWinner) {
        if (tally[fptpWinner]) {
          (tally[fptpWinner] as SeatEntry).fptp += 1;
        } else {
          tally[fptpWinner] = { fptp: 1, pr: 0 };
        }
      }
    }
  }

  // Ensure all parties with candidates have an entry
  for (const pid of partyCandidateCount.keys()) {
    if (!tally[pid]) tally[pid] = { fptp: 0, pr: 0 };
  }

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

async function rotateLastGood(
  bucket: R2Bucket,
  sourceKey: string,
  fallbackKey: string,
): Promise<boolean> {
  try {
    const current = await bucket.get(sourceKey);
    if (!current) return false;
    const body = await current.arrayBuffer();
    await bucket.put(fallbackKey, body, {
      httpMetadata: {
        contentType: "application/json; charset=utf-8",
        cacheControl: "public, max-age=25",
      },
    });
    return true;
  } catch (err) {
    console.warn(`[scraper] failed rotating ${sourceKey} -> ${fallbackKey}:`, err);
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  label: string,
  url: string,
  init: RequestInit,
  retryOnStatus: Set<number> = new Set(),
  options: { maxAttempts?: number; timeoutMs?: number } = {},
): Promise<Response> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? MAX_FETCH_ATTEMPTS);
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort("request timeout"), timeoutMs);
      let res: Response;
      try {
        res = await fetch(url, { ...init, signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
      if (res.ok) return res;
      if (retryOnStatus.has(res.status) && attempt < maxAttempts) {
        const waitMs = RETRY_BACKOFF_MS * (2 ** (attempt - 1));
        console.warn(
          `[scraper] ${label} returned ${res.status} (attempt ${attempt}/${maxAttempts}), retrying in ${waitMs}ms`,
        );
        await sleep(waitMs);
        continue;
      }
      return res;
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const waitMs = RETRY_BACKOFF_MS * (2 ** (attempt - 1));
      console.warn(
        `[scraper] ${label} network error (attempt ${attempt}/${maxAttempts}, timeout ${timeoutMs}ms), retrying in ${waitMs}ms`,
        err,
      );
      await sleep(waitMs);
    }
  }
  throw new Error(`[scraper] ${label} exhausted retries`);
}

function splitSetCookieHeader(value: string): string[] {
  const parts: string[] = [];
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] !== ",") continue;
    const rest = value.slice(i + 1);
    // Split only when the comma is the boundary between cookie entries.
    if (/^\s*[!#$%&'*+\-.^_`|~0-9A-Za-z]+=/.test(rest)) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  const tail = value.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

function getSetCookieValues(headers: Headers): string[] {
  const maybeHeaders = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof maybeHeaders.getSetCookie === "function") {
    const fromApi = maybeHeaders.getSetCookie().map((v) => v.trim()).filter(Boolean);
    if (fromApi.length > 0) return fromApi;
  }

  const values: string[] = [];
  for (const [name, value] of headers.entries()) {
    if (name.toLowerCase() === "set-cookie") values.push(value);
  }

  if (values.length === 0) {
    const combined = headers.get("set-cookie");
    if (combined) values.push(combined);
  }

  return values.flatMap((v) => splitSetCookieHeader(v)).map((v) => v.trim()).filter(Boolean);
}

function parseCookieFromSetCookie(setCookie: string): { name: string; value: string } | null {
  const firstSegment = setCookie.split(";")[0]?.trim();
  if (!firstSegment) return null;
  const eqIndex = firstSegment.indexOf("=");
  if (eqIndex <= 0) return null;
  return {
    name: firstSegment.slice(0, eqIndex).trim(),
    value: firstSegment.slice(eqIndex + 1).trim(),
  };
}

function extractSessionCookies(headers: Headers): { sessionId: string; csrfToken: string } | null {
  let sessionId = "";
  let csrfToken = "";

  for (const setCookie of getSetCookieValues(headers)) {
    const parsed = parseCookieFromSetCookie(setCookie);
    if (!parsed) continue;
    if (parsed.name === "ASP.NET_SessionId") sessionId = parsed.value;
    if (parsed.name === "CsrfToken") csrfToken = parsed.value;
  }

  if (!sessionId || !csrfToken) return null;
  return { sessionId, csrfToken };
}

async function fetchPrHorPartySnapshot(
  csrfToken: string,
  cookieHeader: string,
  refererUrl: string,
): Promise<PrPartySnapshot | null> {
  let res: Response;
  try {
    res = await fetchWithRetry(
      "secure PR HOR json GET",
      UPSTREAM_PR_HOR_URL,
      {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
          "Accept": "*/*",
          "X-CSRF-Token": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
          "Origin": "https://result.election.gov.np",
          "Referer": refererUrl,
          "Cookie": cookieHeader,
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
        cf: { cacheTtl: 0 },
      },
      RETRYABLE_STATUS,
      { maxAttempts: OPTIONAL_MAX_FETCH_ATTEMPTS, timeoutMs: OPTIONAL_REQUEST_TIMEOUT_MS },
    );
  } catch (err) {
    console.warn("[scraper] optional PR HOR fetch failed:", err);
    return null;
  }
  if (!res.ok) {
    console.warn(`[scraper] optional PR HOR returned ${res.status} ${res.statusText}`);
    return null;
  }

  let text: string;
  try {
    text = await res.text();
  } catch (err) {
    console.warn("[scraper] optional PR HOR response body read failed:", err);
    return null;
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  let rows: Partial<UpstreamRecord>[];
  try {
    rows = JSON.parse(text) as Partial<UpstreamRecord>[];
  } catch (err) {
    console.warn("[scraper] optional PR HOR JSON parse failed:", err);
    return null;
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn("[scraper] optional PR HOR payload empty; skipping pr_parties.json update");
    return null;
  }

  const totals = new Map<string, { partyName: string; votes: number }>();
  let totalPrVotes = 0;
  for (const row of rows) {
    const votes = Math.max(0, toInt(row.TotalVoteReceived) ?? 0);
    const partyId = derivePartyId(row);
    const partyName = (row.PoliticalPartyName ?? "").trim() || partyId;

    const existing = totals.get(partyId);
    if (existing) {
      existing.votes += votes;
      if (!existing.partyName && partyName) existing.partyName = partyName;
    } else {
      totals.set(partyId, { partyName, votes });
    }
    totalPrVotes += votes;
  }
  if (totals.size === 0) {
    console.warn("[scraper] optional PR HOR had no valid party rows");
    return null;
  }

  const parties: PrPartySnapshotEntry[] = Array.from(totals.entries())
    .map(([partyId, v]) => ({
      partyId,
      partyName: v.partyName,
      prVotes: v.votes,
      voteShare: totalPrVotes > 0 ? Number(((v.votes / totalPrVotes) * 100).toFixed(4)) : 0,
    }))
    .sort((a, b) => b.prVotes - a.prVotes);

  return {
    lastUpdated: new Date().toISOString(),
    totalPrVotes,
    parties,
    sourceFile: "JSONFiles/Election2082/Common/PRHoRPartyTop5.txt",
  };
}

async function fetchHorTop5Rows(
  csrfToken: string,
  cookieHeader: string,
): Promise<HorLeaderRow[] | null> {
  let res: Response;
  try {
    res = await fetchWithRetry(
      "optional HOR leader json GET",
      UPSTREAM_HOR_MERGE_URL,
      {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "X-CSRF-Token": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
          "Origin": "https://result.election.gov.np",
          "Referer": HOR_TOP5_REFERER_URL,
          "Cookie": cookieHeader,
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
        cf: { cacheTtl: 0 },
      },
      RETRYABLE_STATUS,
      { maxAttempts: OPTIONAL_MAX_FETCH_ATTEMPTS, timeoutMs: OPTIONAL_REQUEST_TIMEOUT_MS },
    );
  } catch (err) {
    console.warn(`[scraper] optional HOR leader fetch failed (${UPSTREAM_HOR_MERGE_URL}):`, err);
    return null;
  }
  if (!res.ok) {
    console.warn(`[scraper] optional HOR leader returned ${res.status} ${res.statusText} (${UPSTREAM_HOR_MERGE_URL})`);
    return null;
  }

  let text: string;
  try {
    text = await res.text();
  } catch (err) {
    console.warn(`[scraper] optional HOR leader response body read failed (${UPSTREAM_HOR_MERGE_URL}):`, err);
    return null;
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  let rows: HorLeaderRow[];
  try {
    rows = JSON.parse(text) as HorLeaderRow[];
  } catch (err) {
    console.warn(`[scraper] optional HOR leader JSON parse failed (${UPSTREAM_HOR_MERGE_URL}):`, err);
    return null;
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn(`[scraper] optional HOR leader payload empty (${UPSTREAM_HOR_MERGE_URL})`);
    return null;
  }

  console.log(`[scraper] optional HOR leader collected ${rows.length} rows`);
  return rows;
}

async function fetchHorWinnerRows(
  csrfToken: string,
  cookieHeader: string,
): Promise<HorLeaderRow[] | null> {
  let res: Response;
  try {
    res = await fetchWithRetry(
      "optional HOR winner json GET",
      UPSTREAM_HOR_WINNER_URL,
      {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "X-CSRF-Token": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
          "Origin": "https://result.election.gov.np",
          "Referer": HOR_TOP5_REFERER_URL,
          "Cookie": cookieHeader,
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
        cf: { cacheTtl: 0 },
      },
      RETRYABLE_STATUS,
      { maxAttempts: OPTIONAL_MAX_FETCH_ATTEMPTS, timeoutMs: OPTIONAL_REQUEST_TIMEOUT_MS },
    );
  } catch (err) {
    console.warn(`[scraper] optional HOR winner fetch failed (${UPSTREAM_HOR_WINNER_URL}):`, err);
    return null;
  }
  if (!res.ok) {
    console.warn(`[scraper] optional HOR winner returned ${res.status} ${res.statusText} (${UPSTREAM_HOR_WINNER_URL})`);
    return null;
  }

  let text: string;
  try {
    text = await res.text();
  } catch (err) {
    console.warn(`[scraper] optional HOR winner response body read failed (${UPSTREAM_HOR_WINNER_URL}):`, err);
    return null;
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  let rows: HorLeaderRow[];
  try {
    rows = JSON.parse(text) as HorLeaderRow[];
  } catch (err) {
    console.warn(`[scraper] optional HOR winner JSON parse failed (${UPSTREAM_HOR_WINNER_URL}):`, err);
    return null;
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn(`[scraper] optional HOR winner payload empty (${UPSTREAM_HOR_WINNER_URL})`);
    return null;
  }

  console.log(`[scraper] optional HOR winner collected ${rows.length} rows`);
  return rows;
}

// ── Scheduled handler ─────────────────────────────────────────────────────────

async function runOnce(env: Env): Promise<void> {
  const t0 = Date.now();
  console.log("[scraper] scheduled run — fetching upstream JSON…");

  // ── Step 1: establish ASP.NET session and CSRF token ───────────────────────
  let sessionId = "";
  let csrfToken = "";
  let bootstrapUrlUsed = SESSION_PAGE_URL;
  for (const bootstrapUrl of SESSION_BOOTSTRAP_URLS) {
    try {
      const pageRes = await fetchWithRetry("session bootstrap", bootstrapUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
        cf: { cacheTtl: 0 },
      }, RETRYABLE_STATUS);
      if (!pageRes.ok) {
        console.warn(`[scraper] session bootstrap via ${bootstrapUrl} returned ${pageRes.status} ${pageRes.statusText}`);
        continue;
      }

      const cookies = extractSessionCookies(pageRes.headers);
      if (!cookies) {
        console.warn(`[scraper] session bootstrap via ${bootstrapUrl} missing required cookies`);
        continue;
      }

      sessionId = cookies.sessionId;
      csrfToken = cookies.csrfToken;
      bootstrapUrlUsed = bootstrapUrl;
      console.log(`[scraper] session established via ${bootstrapUrl} — csrf=true session=true`);
      break;
    } catch (err) {
      console.warn(`[scraper] session bootstrap via ${bootstrapUrl} failed`, err);
    }
  }
  if (!sessionId || !csrfToken) {
    console.warn("[scraper] session bootstrap failed after all URLs — R2 NOT updated");
    return;
  }

  // ── Step 2: secure JSON handler with session cookies + CSRF ───────────────
  const cookieHeader = `ASP.NET_SessionId=${sessionId}; CsrfToken=${csrfToken}`;
  const tryHorLeaderFallbackOnlyUpdate = async (reason: string): Promise<boolean> => {
    try {
      console.warn(`[scraper] primary candidate feed unavailable (${reason}); trying HOR leader fallback`);

      const previousConstituencies = await loadPreviousConstituencies(env.RESULTS_BUCKET);
      if (!previousConstituencies || previousConstituencies.length === 0) {
        console.warn("[scraper] HOR fallback skipped: no previous constituencies.json available");
        return false;
      }

      const horTop5Rows = await fetchHorTop5Rows(csrfToken, cookieHeader);
      if (!horTop5Rows || horTop5Rows.length === 0) {
        console.warn("[scraper] HOR fallback skipped: leader feed unavailable");
        return false;
      }

      const stats = mergeLeaderVotesIntoConstituencies(previousConstituencies, horTop5Rows);
      if (stats.upgradedVotes <= 0) {
        console.warn("[scraper] HOR fallback found no fresher votes to apply");
        return false;
      }

      await rotateLastGood(env.RESULTS_BUCKET, "constituencies.json", LAST_GOOD_CONSTITUENCIES_KEY);
      await putJson(env.RESULTS_BUCKET, "constituencies.json", previousConstituencies);
      console.warn(
        "[scraper] HOR fallback updated constituencies.json: " +
        `${stats.upgradedVotes} candidate vote updates across ${stats.updatedConstituencies} constituencies ` +
        `from ${stats.usableRows} usable leader rows`,
      );
      return true;
    } catch (err) {
      console.warn("[scraper] HOR fallback failed:", err);
      return false;
    }
  };

  let res: Response;
  try {
    res = await fetchWithRetry(
      "secure json GET",
      UPSTREAM_URL,
      {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
          "Accept": "*/*",
          "X-CSRF-Token": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
          "Origin": "https://result.election.gov.np",
          "Referer": bootstrapUrlUsed,
          "Cookie": cookieHeader,
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
        cf: { cacheTtl: 0 },
      },
      RETRYABLE_STATUS,
    );
  } catch (err) {
    console.warn("[scraper] secure json network error after retries — R2 NOT updated:", err);
    await tryHorLeaderFallbackOnlyUpdate("secure json network error");
    return;
  }

  if (!res.ok) {
    console.warn(`[scraper] secure json returned ${res.status} ${res.statusText} — R2 NOT updated`);
    await tryHorLeaderFallbackOnlyUpdate(`secure json HTTP ${res.status}`);
    return;
  }

  let text: string;
  try {
    text = await res.text();
  } catch (err) {
    console.warn("[scraper] failed to read upstream response body — R2 NOT updated:", err);
    await tryHorLeaderFallbackOnlyUpdate("upstream response read failure");
    return;
  }

  // Strip UTF-8 BOM (0xFEFF) — present in the official file
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  let records: UpstreamRecord[];
  try {
    records = JSON.parse(text) as UpstreamRecord[];
  } catch (err) {
    console.warn("[scraper] upstream JSON parse failed — R2 NOT updated:", err);
    await tryHorLeaderFallbackOnlyUpdate("upstream JSON parse failure");
    return;
  }

  if (!Array.isArray(records) || records.length < 100) {
    console.warn(`[scraper] upstream data looks wrong (${records?.length ?? 0} records) — R2 NOT updated`);
    await tryHorLeaderFallbackOnlyUpdate(`upstream payload shape invalid (${records?.length ?? 0})`);
    return;
  }

  const recordsValid = records.every(
    (r) =>
      toInt((r as Partial<UpstreamRecord>).CandidateID) !== null &&
      toInt((r as Partial<UpstreamRecord>).TotalVoteReceived) !== null,
  );
  if (!recordsValid) {
    console.warn("[scraper] upstream schema check failed (CandidateID/TotalVoteReceived missing) — R2 NOT updated");
    await tryHorLeaderFallbackOnlyUpdate("upstream schema check failed");
    return;
  }

  const horTop5Rows = await fetchHorTop5Rows(csrfToken, cookieHeader);
  if (horTop5Rows) {
    const mergeStats = mergeHigherVotesFromRows(records, horTop5Rows);
    console.log(
      "[scraper] optional HOR leader feed merged: " +
      `${mergeStats.upgraded} candidate vote updates from ${mergeStats.usableRows} usable rows` +
      (mergeStats.missingCandidateRows > 0
        ? ` (${mergeStats.missingCandidateRows} candidate rows not present in primary feed)`
        : ""),
    );
  } else {
    console.warn("[scraper] optional HOR leader feed unavailable — using primary candidate feed only");
  }

  const horWinnerRows = await fetchHorWinnerRows(csrfToken, cookieHeader);
  if (horWinnerRows) {
    const winnerVoteMergeStats = mergeHigherVotesFromRows(records, horWinnerRows);
    const winnerMergeStats = mergeOfficialWinnersFromRows(records, horWinnerRows);
    console.log(
      "[scraper] optional HOR winner feed merged: " +
      `${winnerMergeStats.newlyMarked} newly marked winners ` +
      `(${winnerMergeStats.matchedCandidates}/${winnerMergeStats.winnerRows} matched)` +
      (winnerMergeStats.missingCandidateRows > 0
        ? ` (${winnerMergeStats.missingCandidateRows} candidate rows not present in primary feed)`
        : ""),
    );
    if (winnerVoteMergeStats.usableRows > 0 && winnerVoteMergeStats.upgraded > 0) {
      console.log(
        "[scraper] optional HOR winner vote refresh merged: " +
        `${winnerVoteMergeStats.upgraded} candidate vote updates from ${winnerVoteMergeStats.usableRows} usable rows` +
        (winnerVoteMergeStats.missingCandidateRows > 0
          ? ` (${winnerVoteMergeStats.missingCandidateRows} candidate rows not present in primary feed)`
          : ""),
      );
    }
  } else {
    console.warn("[scraper] optional HOR winner feed unavailable — winner state relies on primary feed only");
  }

  const previousVotes = await loadPreviousCandidateVotes(env.RESULTS_BUCKET);
  if (previousVotes.size > 0) {
    const floorStats = applyMonotonicVoteFloor(records, previousVotes);
    if (floorStats.pinned > 0) {
      console.log(
        `[scraper] rollback guard pinned ${floorStats.pinned} candidate vote totals from previous R2 snapshot`,
      );
    }
  }

  const fetchMs = Date.now() - t0;
  console.log(`[scraper] fetched ${records.length} records in ${fetchMs} ms`);

  // Both lookups are cached at module level — negligible cost after first run
  const [neuLookup, voterRolls] = await Promise.all([
    loadNeuLookup(env.FRONTEND_URL),
    loadVoterRolls(env.FRONTEND_URL),
  ]);

  const prSnapshot = await fetchPrHorPartySnapshot(csrfToken, cookieHeader, bootstrapUrlUsed);

  const t1 = Date.now();
  const { constituencies, snapshot, parties } = transform(records, neuLookup, voterRolls);
  applyPrSeatsFromSnapshot(snapshot, prSnapshot);
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

  const [hadPrevConstituencies, hadPrevSnapshot, hadPrevParties] = await Promise.all([
    rotateLastGood(env.RESULTS_BUCKET, "constituencies.json", LAST_GOOD_CONSTITUENCIES_KEY),
    rotateLastGood(env.RESULTS_BUCKET, "snapshot.json", LAST_GOOD_SNAPSHOT_KEY),
    rotateLastGood(env.RESULTS_BUCKET, "parties.json", LAST_GOOD_PARTIES_KEY),
  ]);

  // Upload all frontend-consumed artifacts.
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

  // Seed fallback keys on first successful run when no previous artifacts existed.
  const seedFallbackWrites: Promise<void>[] = [];
  if (!hadPrevConstituencies) {
    seedFallbackWrites.push(putJson(env.RESULTS_BUCKET, LAST_GOOD_CONSTITUENCIES_KEY, constituencies));
  }
  if (!hadPrevSnapshot) {
    seedFallbackWrites.push(putJson(env.RESULTS_BUCKET, LAST_GOOD_SNAPSHOT_KEY, snapshot));
  }
  if (!hadPrevParties) {
    seedFallbackWrites.push(putJson(env.RESULTS_BUCKET, LAST_GOOD_PARTIES_KEY, parties));
  }
  if (seedFallbackWrites.length > 0) {
    await Promise.all(seedFallbackWrites);
    console.log(`[scraper] seeded ${seedFallbackWrites.length} last-good backup file(s)`);
  }

  if (!prSnapshot) {
    console.warn("[scraper] optional PR snapshot unavailable — PR seats remain 0 until PR feed is available");
    return;
  }

  try {
    await putJson(env.RESULTS_BUCKET, "pr_parties.json", prSnapshot);
    console.log(
      `[scraper] uploaded optional pr_parties.json (${prSnapshot.parties.length} parties, ${prSnapshot.totalPrVotes} votes)`,
    );
  } catch (err) {
    console.warn("[scraper] optional PR snapshot processing failed — primary outputs kept unchanged:", err);
  }
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
