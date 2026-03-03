/**
 * simulate-counting.mjs
 *
 * Fetches the real upstream JSON and injects fake vote counts so you can
 * preview exactly what the frontend will look like during counting/declaring.
 *
 * Does NOT touch R2, does NOT require wrangler or Cloudflare credentials.
 * Writes output to stdout so you can pipe it into a file or inspect it.
 *
 * Usage (from worker/ directory):
 *
 *   # Preview "partial counting" — ~40 constituencies counting, no winners yet
 *   node simulate-counting.mjs counting | head -50
 *
 *   # Preview "partial results" — ~20 constituencies declared, rest counting
 *   node simulate-counting.mjs declared | head -50
 *
 *   # Write snapshot.json + constituencies.json to a local ./sim-output/ folder
 *   node simulate-counting.mjs declared --write
 *
 * Then point your frontend dev server at the local files:
 *   VITE_RESULTS_MODE=live VITE_CDN_URL=http://localhost:4000 npm run dev
 *   # and in another terminal: npx serve sim-output --cors -p 4000
 */

import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const UPSTREAM_URL =
  "https://result.election.gov.np/JSONFiles/ElectionResultCentral2082.txt";

const SCENARIO = process.argv[2] ?? "counting";  // "counting" | "declared"
const WRITE    = process.argv.includes("--write");

// ── Devanagari transliteration (mirrors worker/src/index.ts exactly) ─────────
const _CS = "\x01", _CE = "\x02", _VI = "\x03", _MS = "\x04";
const _cons = r => _CS + r + _CE;
function _charToken(ch) {
  switch (ch) {
    case "अ": return "a";   case "आ": return "aa";  case "इ": return "i";
    case "ई": return "ee";  case "उ": return "u";   case "ऊ": return "oo";
    case "ऋ": return "ri";  case "ए": return "e";   case "ऐ": return "ai";
    case "ओ": return "o";   case "औ": return "au";
    case "ा": return _MS+"a"; case "ि": return _MS+"i"; case "ी": return _MS+"i";
    case "ु": return _MS+"u"; case "ू": return _MS+"u"; case "ृ": return _MS+"ri";
    case "े": return _MS+"e"; case "ै": return _MS+"ai"; case "ो": return _MS+"o";
    case "ौ": return _MS+"au";
    case "्": return _VI;
    case "ं": return "n"; case "ँ": return "n"; case "ः": return "h";
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
    default: return ch;
  }
}
function _nuktaToken(base) {
  switch (base) {
    case "ड": return _cons("r"); case "ढ": return _cons("rh");
    case "क": return _cons("q"); case "फ": return _cons("f");
    case "ग": return _cons("gh"); case "ज": return _cons("z");
    default: return _charToken(base);
  }
}
const _RE_SUPPRESS = new RegExp(_CS + "([^" + _CE + "]*)" + _CE + "(?=[" + _MS + _VI + "]|$)", "g");
const _RE_KEEP     = new RegExp(_CS + "([^" + _CE + "]*)" + _CE, "g");
function transliterateDevanagari(text) {
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
function nepaliNameToEnglish(name) {
  if (!name) return name;
  if (/^[\x00-\x7F\s]+$/.test(name)) return name.trim();
  return transliterateDevanagari(name)
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .trim();
}

// ── Province mapping ──────────────────────────────────────────────────────────
const STATE_TO_PROVINCE = {
  1: "Koshi", 2: "Madhesh", 3: "Bagmati", 4: "Gandaki",
  5: "Lumbini", 6: "Karnali", 7: "Sudurpashchim",
};

const DISTRICT_EN = {
  // Koshi Province
  "ताप्लेजुङ": "Taplejung", "पाँचथर": "Panchthar", "इलाम": "Ilam",
  "सङ्खुवासभा": "Sankhuwasabha", "संखुवासभा": "Sankhuwasabha",
  "भोजपुर": "Bhojpur", "धनकुटा": "Dhankuta", "तेह्रथुम": "Tehrathum",
  "खोटाङ": "Khotang", "सोलुखुम्बु": "Solukhumbu",
  "ओखलढुङ्गा": "Okhaldhunga", "ओखलढुंगा": "Okhaldhunga",
  "झापा": "Jhapa", "मोरङ": "Morang", "सुनसरी": "Sunsari", "उदयपुर": "Udayapur",
  // Madhesh Province
  "सप्तरी": "Saptari", "सिरहा": "Siraha", "सिराहा": "Siraha",
  "धनुषा": "Dhanusha", "महोत्तरी": "Mahottari", "सर्लाही": "Sarlahi",
  "रौतहट": "Rautahat", "बारा": "Bara", "पर्सा": "Parsa",
  // Bagmati Province
  "दोलखा": "Dolakha", "रामेछाप": "Ramechhap", "सिन्धुली": "Sindhuli",
  "रसुवा": "Rasuwa", "धादिङ": "Dhading", "नुवाकोट": "Nuwakot",
  "काठमाडौँ": "Kathmandu", "काठमाडौं": "Kathmandu",
  "भक्तपुर": "Bhaktapur", "ललितपुर": "Lalitpur",
  "काभ्रेपलाञ्चोक": "Kavrepalanchok", "सिन्धुपाल्चोक": "Sindhupalchok",
  "मकवानपुर": "Makwanpur", "चितवन": "Chitwan",
  // Gandaki Province
  "गोर्खा": "Gorkha", "गोरखा": "Gorkha", "मनाङ": "Manang",
  "लमजुङ": "Lamjung", "कास्की": "Kaski", "तनहुँ": "Tanahun",
  "स्याङ्जा": "Syangja", "स्याङजा": "Syangja", "मुस्ताङ": "Mustang",
  "म्याग्दी": "Myagdi", "बाग्लुङ": "Baglung", "पर्वत": "Parbat",
  // Lumbini Province
  "गुल्मी": "Gulmi", "पाल्पा": "Palpa", "अर्घाखाँची": "Arghakhanchi",
  "रूपन्देही": "Rupandehi", "कपिलवस्तु": "Kapilvastu", "कपिलबस्तु": "Kapilvastu",
  "रुकुम पूर्व": "Rukum East", "रोल्पा": "Rolpa",
  "प्युठान": "Pyuthan", "प्यूठान": "Pyuthan", "दाङ": "Dang",
  "बाँके": "Banke", "बर्दिया": "Bardiya",
  // Karnali Province
  "सल्यान": "Salyan", "डोल्पा": "Dolpa", "मुगु": "Mugu", "जुम्ला": "Jumla",
  "कालिकोट": "Kalikot", "हुम्ला": "Humla", "जाजरकोट": "Jajarkot",
  "दैलेख": "Dailekh", "सुर्खेत": "Surkhet", "रुकुम पश्चिम": "Rukum West",
  // Sudurpashchim Province
  "बाजुरा": "Bajura", "अछाम": "Achham", "बझाङ": "Bajhang", "डोटी": "Doti",
  "कैलाली": "Kailali", "दार्चुला": "Darchula", "बैतडी": "Baitadi",
  "डडेलधुरा": "Dadeldhura", "कञ्चनपुर": "Kanchanpur",
  // Nawalparasi split (unambiguous full strings)
  "नवलपरासी (बर्दघाट सुस्ता पूर्व)": "Nawalpur",
  "नवलपरासी (बर्दघाट सुस्ता पश्चिम)": "Parasi",
  "रुकुम (पूर्वी भाग)": "Rukum East",
  "रुकुम (पश्चिम भाग)": "Rukum West",
};
const NAWALPARASI_SHORT = { 4: "Nawalpur", 5: "Parasi" };

function districtEn(np, stateId) {
  if (np === "नवलपुर") return NAWALPARASI_SHORT[stateId] ?? "Nawalpur";
  return DISTRICT_EN[np] ?? `Province${stateId}-District`;
}

// ── Voter rolls lookup (registered voters per constituency) ───────────────────
// Keyed by nepsebajar English name: "{District} Constituency {N}"
// which maps 1:1 to the worker's constituency name "{District}-{N}".
let _voterRolls = null;
function loadVoterRolls() {
  if (_voterRolls) return _voterRolls;
  try {
    const path = join(__dirname, "../frontend/public/voter_rolls.json");
    const raw = JSON.parse(readFileSync(path, "utf8"));
    // Build lookup keyed by "{District}-{N}" to match worker name field
    const map = new Map();
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith("_")) continue;
      // "Kathmandu Constituency 1" → "Kathmandu-1"
      const m = k.match(/^(.+?)\s+Constituency\s+(\d+)$/i);
      if (m) map.set(`${m[1]}-${m[2]}`, v);
    }
    _voterRolls = map;
  } catch {
    _voterRolls = new Map();
  }
  return _voterRolls;
}

// ── Seed-based deterministic random (avoids Math.random() non-determinism) ────
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ── Inject fake votes into a constituency's records ───────────────────────────
function injectVotes(recs, scenario, constIdx) {
  const rand = seededRand(constIdx * 31337);

  if (scenario === "counting") {
    // 40% of constituencies are counting (rest pending)
    if (constIdx % 5 !== 0 && constIdx % 5 !== 1) return recs; // pending

    // Assign random vote totals — no winner yet (E_STATUS stays null, R stays as-is)
    let remaining = 15000 + Math.floor(rand() * 25000);
    const shuffled = [...recs].sort(() => rand() - 0.5);
    for (let i = 0; i < shuffled.length; i++) {
      const share = i === 0 ? 0.35 + rand() * 0.2 : rand();
      shuffled[i].TotalVoteReceived = i < shuffled.length - 1
        ? Math.floor(remaining * (share / shuffled.length))
        : Math.max(0, remaining - shuffled.slice(0, -1).reduce((s, r) => s + r.TotalVoteReceived, 0));
    }
    // Sort by votes desc and assign R rank
    shuffled.sort((a, b) => b.TotalVoteReceived - a.TotalVoteReceived);
    shuffled.forEach((r, i) => { r.R = i + 1; });
    return shuffled;
  }

  if (scenario === "declared") {
    // 20 constituencies declared, 60 counting, rest pending
    if (constIdx < 20) {
      // DECLARED — pick a winner
      let remaining = 20000 + Math.floor(rand() * 30000);
      const shuffled = [...recs].sort(() => rand() - 0.5);
      // Give winner ~35-45% of votes
      const winnerShare = 0.35 + rand() * 0.10;
      shuffled[0].TotalVoteReceived = Math.floor(remaining * winnerShare);
      const rest = remaining - shuffled[0].TotalVoteReceived;
      for (let i = 1; i < shuffled.length; i++) {
        shuffled[i].TotalVoteReceived = Math.floor((rest / (shuffled.length - 1)) * (0.5 + rand()));
      }
      shuffled.sort((a, b) => b.TotalVoteReceived - a.TotalVoteReceived);
      shuffled.forEach((r, i) => {
        r.R = i + 1;
        r.E_STATUS = i === 0 ? "W" : null;
      });
      return shuffled;
    }
    if (constIdx < 80) {
      // COUNTING — votes but no winner
      let remaining = 10000 + Math.floor(rand() * 20000);
      const shuffled = [...recs].sort(() => rand() - 0.5);
      for (let i = 0; i < shuffled.length; i++) {
        shuffled[i].TotalVoteReceived = Math.floor(remaining * (0.05 + rand() * 0.3) / shuffled.length * 3);
      }
      shuffled.sort((a, b) => b.TotalVoteReceived - a.TotalVoteReceived);
      shuffled.forEach((r, i) => { r.R = i + 1; });
      return shuffled;
    }
    return recs; // PENDING
  }

  return recs;
}

// ── Minimal transform (mirrors worker transform) ──────────────────────────────
function transform(records) {
  const now = new Date().toISOString();

  // Group by constituency key
  const grouped = new Map();
  for (const rec of records) {
    const key = `${rec.STATE_ID}-${rec.DistrictName}-${rec.SCConstID}`;
    const existing = grouped.get(key);
    if (existing) existing.push(rec); else grouped.set(key, [rec]);
  }

  const constituencies = [];
  let constIdx = 0;
  const partyCandidateCount = new Map();
  const voterRolls = loadVoterRolls();

  for (const [key, recs] of grouped) {
    const injected = injectVotes(recs, SCENARIO, constIdx++);
    const first = injected[0];
    const province = STATE_TO_PROVINCE[first.STATE_ID];
    if (!province) continue;

    const districtNp = first.DistrictName;
    const district = districtEn(districtNp, first.STATE_ID);
    const constNum = first.SCConstID;

    const hasWinner = injected.some(r => r.E_STATUS === "W");
    const hasVotes  = injected.some(r => r.TotalVoteReceived > 0);
    const status    = hasWinner ? "DECLARED" : hasVotes ? "COUNTING" : "PENDING";

    const candidates = injected.map(rec => {
      const partyId = rec.PoliticalPartyName === "स्वतन्त्र" ? "IND" : String(rec.SYMBOLCODE);
      partyCandidateCount.set(partyId, (partyCandidateCount.get(partyId) ?? 0) + 1);
      const nameNp = rec.CandidateName ?? "";
      return {
        candidateId: rec.CandidateID,
        nameNp,
        name: nepaliNameToEnglish(nameNp),
        partyName: rec.PoliticalPartyName ?? "",
        partyId,
        votes: rec.TotalVoteReceived,
        gender: rec.Gender === "महिला" ? "F" : "M",
        isWinner: rec.E_STATUS === "W" || (rec.R === 1 && rec.TotalVoteReceived > 0),
        age: rec.AGE_YR,
      };
    });

    const constName = `${district}-${constNum}`;
    const totalVoters = voterRolls.get(constName);

    const entry = {
      province, district, districtNp,
      code: key,
      name: constName,
      nameNp: `${districtNp} क्षेत्र नं. ${constNum}`,
      status, lastUpdated: now,
      candidates,
      votesCast: candidates.reduce((s, c) => s + c.votes, 0),
    };
    if (totalVoters) entry.totalVoters = totalVoters;
    constituencies.push(entry);
  }

  constituencies.sort((a, b) => {
    if (a.province !== b.province) return a.province.localeCompare(b.province);
    if (a.district !== b.district) return a.district.localeCompare(b.district);
    return a.name.localeCompare(b.name);
  });

  // Seat tally
  const tally = {};
  for (const c of constituencies) {
    if (c.status !== "DECLARED") continue;
    const winner = c.candidates.find(cd => cd.isWinner)
      ?? c.candidates.reduce((a, b) => a.votes > b.votes ? a : b);
    if (tally[winner.partyId]) tally[winner.partyId].fptp += 1;
    else tally[winner.partyId] = { fptp: 1, pr: 0 };
  }
  for (const pid of partyCandidateCount.keys()) {
    if (!tally[pid]) tally[pid] = { fptp: 0, pr: 0 };
  }

  let totalVotes = 0;
  const voteShare = {};
  for (const c of constituencies) {
    for (const cd of c.candidates) {
      voteShare[cd.partyId] = (voteShare[cd.partyId] ?? 0) + cd.votes;
      totalVotes += cd.votes;
    }
  }
  const PR_SEATS = 110;
  if (totalVotes > 0) {
    for (const pid of Object.keys(tally)) {
      tally[pid].pr = Math.round(((voteShare[pid] ?? 0) / totalVotes) * PR_SEATS);
    }
  }

  const declaredSeats = constituencies.filter(c => c.status === "DECLARED").length;
  const snapshot = {
    totalSeats: 275,
    declaredSeats,
    lastUpdated: now,
    seatTally: tally,
  };

  return { constituencies, snapshot };
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.error(`[sim] fetching upstream JSON (scenario: ${SCENARIO})…`);
const res = await fetch(UPSTREAM_URL);
if (!res.ok) throw new Error(`Upstream fetch failed: ${res.status}`);

let text = await res.text();
if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
const records = JSON.parse(text);
console.error(`[sim] fetched ${records.length} records`);

const { constituencies, snapshot } = transform(records);

const declared = constituencies.filter(c => c.status === "DECLARED").length;
const counting = constituencies.filter(c => c.status === "COUNTING").length;
const pending  = constituencies.filter(c => c.status === "PENDING").length;
const totalVotes = constituencies.reduce((s, c) => s + c.votesCast, 0);

console.error(`[sim] result: ${declared} declared, ${counting} counting, ${pending} pending`);
console.error(`[sim] total votes: ${totalVotes.toLocaleString()}`);
console.error(`[sim] declared seats: ${snapshot.declaredSeats}`);
console.error(`[sim] top parties by FPTP seats:`);

const topParties = Object.entries(snapshot.seatTally)
  .filter(([, v]) => v.fptp > 0)
  .sort(([, a], [, b]) => b.fptp - a.fptp)
  .slice(0, 8);
for (const [pid, { fptp, pr }] of topParties) {
  console.error(`       ${pid.padEnd(8)} fptp=${fptp}  pr=${pr}`);
}

if (WRITE) {
  const outDir = join(__dirname, "sim-output");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "constituencies.json"), JSON.stringify(constituencies));
  writeFileSync(join(outDir, "snapshot.json"), JSON.stringify(snapshot));
  console.error(`[sim] wrote sim-output/constituencies.json and sim-output/snapshot.json`);
  console.error(`[sim] serve with: npx serve sim-output --cors -p 4000`);
  console.error(`[sim] then: VITE_RESULTS_MODE=live VITE_CDN_URL=http://localhost:4000 npm run dev`);
} else {
  // Print first 3 declared constituencies to stdout for quick inspection
  const sample = constituencies.filter(c => c.status !== "PENDING").slice(0, 3);
  console.log(JSON.stringify(sample, null, 2));
}
