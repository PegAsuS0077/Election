/**
 * Devanagari → Latin transliteration for Nepali text.
 *
 * Handles the inherent-'a' rule: every consonant carries an inherent 'a'
 * that is suppressed when followed by a vowel matra or virama.
 *
 * Two-pass algorithm:
 *  1. Map each codepoint → token string. Consonants emit their letters
 *     wrapped in INHERENT sentinels so the second pass can find and strip them.
 *  2. Strip INHERENT when it is immediately followed by a vowel string or
 *     virama sentinel; replace remaining INHERENT with "a".
 *
 * No external library — runs fully offline in the browser.
 */

// Internal sentinels (non-printable, won't appear in real text)
const C_START = "\x01"; // marks start of a consonant's inherent-a slot
const C_END   = "\x02"; // marks end — replaced with "a" or stripped
const VIRAMA  = "\x03"; // virama (halant) sentinel

// Vowel matra strings (what matras output — used in the strip regex)
// We also mark matra output with M_START so the regex can match them
const M_START = "\x04";

function cons(roman: string): string {
  // Wrap the inherent-a slot: C_START + roman letters + C_END
  return C_START + roman + C_END;
}

/** Map a single Devanagari codepoint to its token. */
function charToToken(ch: string): string {
  switch (ch) {
    // ── Independent vowels ────────────────────────────────────────────────
    case "अ": return "a";
    case "आ": return "aa";
    case "इ": return "i";
    case "ई": return "ee";
    case "उ": return "u";
    case "ऊ": return "oo";
    case "ऋ": return "ri";
    case "ए": return "e";
    case "ऐ": return "ai";
    case "ओ": return "o";
    case "औ": return "au";
    // ── Vowel matras (suppress preceding consonant's inherent-a) ──────────
    // Wrapped in M_START so the regex in pass 2 can find them
    case "ा": return M_START + "a";
    case "ि": return M_START + "i";
    case "ी": return M_START + "i";
    case "ु": return M_START + "u";
    case "ू": return M_START + "u";
    case "ृ": return M_START + "ri";
    case "े": return M_START + "e";
    case "ै": return M_START + "ai";
    case "ो": return M_START + "o";
    case "ौ": return M_START + "au";
    // ── Virama — suppresses inherent-a of preceding consonant ────────────
    case "्": return VIRAMA;
    // ── Anusvara / chandrabindu / visarga ─────────────────────────────────
    case "ं": return "n";
    case "ँ": return "n";
    case "ः": return "h";
    // ── Nukta standalone — consumed in look-ahead loop ────────────────────
    case "़": return "";
    // ── Consonants ────────────────────────────────────────────────────────
    case "क": return cons("k");
    case "ख": return cons("kh");
    case "ग": return cons("g");
    case "घ": return cons("gh");
    case "ङ": return cons("ng");
    case "च": return cons("ch");
    case "छ": return cons("chh");
    case "ज": return cons("j");
    case "झ": return cons("jh");
    case "ञ": return cons("ny");
    case "ट": return cons("t");
    case "ठ": return cons("th");
    case "ड": return cons("d");
    case "ढ": return cons("dh");
    case "ण": return cons("n");
    case "त": return cons("t");
    case "थ": return cons("th");
    case "द": return cons("d");
    case "ध": return cons("dh");
    case "न": return cons("n");
    case "प": return cons("p");
    case "फ": return cons("ph");
    case "ब": return cons("b");
    case "भ": return cons("bh");
    case "म": return cons("m");
    case "य": return cons("y");
    case "र": return cons("r");
    case "ल": return cons("l");
    case "व": return cons("v");
    case "श": return cons("sh");
    case "ष": return cons("sh");
    case "स": return cons("s");
    case "ह": return cons("h");
    // ── Digits ────────────────────────────────────────────────────────────
    case "०": return "0"; case "१": return "1"; case "२": return "2";
    case "३": return "3"; case "४": return "4"; case "५": return "5";
    case "६": return "6"; case "७": return "7"; case "८": return "8";
    case "९": return "9";
    case "।": return ".";
    // Pass through everything else (ASCII, spaces, punctuation)
    default:  return ch;
  }
}

function nuktaToken(base: string): string {
  switch (base) {
    case "ड": return cons("r");
    case "ढ": return cons("rh");
    case "क": return cons("q");
    case "फ": return cons("f");
    case "ग": return cons("gh");
    case "ज": return cons("z");
    default:  return charToToken(base);
  }
}

// ── Pass 2 regex ───────────────────────────────────────────────────────────
// Matches: C_START + (consonant letters) + C_END when followed by a matra or virama.
// The C_END is replaced with "" (stripped). Remaining C_END→"a".
// Then strip M_START and VIRAMA sentinels.

const RE_SUPPRESS = new RegExp(
  C_START + "([^" + C_END + "]*)" + C_END + "(?=[" + M_START + VIRAMA + "]|$)",
  "g",
);
const RE_KEEP     = new RegExp(C_START + "([^" + C_END + "]*)" + C_END, "g");

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Transliterates a Devanagari string to Roman script.
 * Non-Devanagari characters pass through unchanged.
 */
export function transliterateDevanagari(text: string): string {
  if (!text) return text;

  // Pass 1: build token stream
  const chars = [...text];
  let tokens = "";
  for (let i = 0; i < chars.length; i++) {
    if (chars[i + 1] === "़") {
      tokens += nuktaToken(chars[i]);
      i++;
    } else {
      tokens += charToToken(chars[i]);
    }
  }

  // Pass 2: resolve inherent-a
  let result = tokens
    .replace(RE_SUPPRESS, "$1")       // strip inherent-a before matra/virama
    .replace(RE_KEEP, "$1a")          // keep inherent-a elsewhere → "a"
    .replace(new RegExp(VIRAMA, "g"), "")  // drop remaining virama sentinels
    .replace(new RegExp(M_START, "g"), ""); // drop matra-start sentinels

  return result;
}

/**
 * Converts a Nepali name (Devanagari) to a display-ready English name.
 * Title-cases each word.
 */
export function nepaliNameToEnglish(name: string): string {
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

/**
 * Transliterates a free-text biographical field (address, qualification, etc.)
 * Converts Devanagari → Roman; leaves ASCII text unchanged.
 */
export function transliterateBioField(text: string): string {
  if (!text) return text;
  if (/^[\x00-\x7F\s,.\-/()]+$/.test(text)) return text.trim();
  return transliterateDevanagari(text).trim();
}
