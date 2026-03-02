/**
 * Canonical Nepali → English district name lookup.
 *
 * Single source of truth used by both:
 *   - parseUpstreamData.ts  (archive/live frontend parsing)
 *   - (Python equivalent: backend/district_names.py)
 *
 * Rules:
 *   - Keys are the exact Nepali DistrictName strings from the upstream JSON.
 *   - Values are the official English district names as used by the Election
 *     Commission and Nepal government.
 *   - Where the same Nepali string maps to two different districts (Nawalparasi
 *     was split), use DISTRICT_STATE_OVERRIDE keyed by STATE_ID.
 *   - Any Nepali key not found here will produce a "<Province>-District"
 *     fallback — add missing entries rather than living with the fallback.
 */

// ── Primary lookup ────────────────────────────────────────────────────────────

export const DISTRICT_EN: Record<string, string> = {
  // Koshi Province (STATE_ID 1)
  "ताप्लेजुङ":       "Taplejung",
  "पाँचथर":          "Panchthar",
  "इलाम":            "Ilam",
  "सङ्खुवासभा":      "Sankhuwasabha",
  "संखुवासभा":       "Sankhuwasabha",   // upstream alternate spelling
  "भोजपुर":          "Bhojpur",
  "धनकुटा":          "Dhankuta",
  "तेह्रथुम":        "Tehrathum",
  "खोटाङ":           "Khotang",
  "सोलुखुम्बु":      "Solukhumbu",
  "ओखलढुङ्गा":       "Okhaldhunga",
  "ओखलढुंगा":        "Okhaldhunga",     // upstream alternate (anusvara vs chandrabindu)
  "झापा":            "Jhapa",
  "मोरङ":            "Morang",
  "सुनसरी":          "Sunsari",
  "उदयपुर":          "Udayapur",

  // Madhesh Province (STATE_ID 2)
  "सप्तरी":          "Saptari",
  "सिरहा":           "Siraha",
  "सिराहा":          "Siraha",           // upstream alternate spelling
  "धनुषा":           "Dhanusha",
  "महोत्तरी":        "Mahottari",
  "सर्लाही":         "Sarlahi",
  "रौतहट":           "Rautahat",
  "बारा":            "Bara",
  "पर्सा":           "Parsa",

  // Bagmati Province (STATE_ID 3)
  "दोलखा":           "Dolakha",
  "रामेछाप":         "Ramechhap",
  "सिन्धुली":        "Sindhuli",
  "रसुवा":           "Rasuwa",
  "धादिङ":           "Dhading",
  "नुवाकोट":         "Nuwakot",
  "काठमाडौँ":        "Kathmandu",
  "काठमाडौं":        "Kathmandu",       // alternate Unicode form
  "भक्तपुर":         "Bhaktapur",
  "ललितपुर":         "Lalitpur",
  "काभ्रेपलाञ्चोक":  "Kavrepalanchok",
  "सिन्धुपाल्चोक":   "Sindhupalchok",
  "मकवानपुर":        "Makwanpur",
  "चितवन":           "Chitwan",

  // Gandaki Province (STATE_ID 4)
  "गोर्खा":          "Gorkha",
  "गोरखा":           "Gorkha",           // upstream alternate (no halanta)
  "मनाङ":            "Manang",
  "लमजुङ":           "Lamjung",
  "कास्की":          "Kaski",
  "तनहुँ":           "Tanahun",
  "स्याङ्जा":        "Syangja",
  "स्याङजा":         "Syangja",          // upstream alternate (no chandrabindu)
  // "नवलपुर" / "नवलपरासी…" → handled by DISTRICT_STATE_OVERRIDE below
  "मुस्ताङ":         "Mustang",
  "म्याग्दी":        "Myagdi",
  "बाग्लुङ":         "Baglung",
  "पर्वत":           "Parbat",

  // Lumbini Province (STATE_ID 5)
  "गुल्मी":          "Gulmi",
  "पाल्पा":          "Palpa",
  "अर्घाखाँची":      "Arghakhanchi",
  // "नवलपुर" / "नवलपरासी…" → handled by DISTRICT_STATE_OVERRIDE below
  "रूपन्देही":       "Rupandehi",
  "कपिलवस्तु":       "Kapilvastu",
  "कपिलबस्तु":       "Kapilvastu",       // upstream alternate spelling
  "रुकुम पूर्व":     "Rukum East",
  "रोल्पा":          "Rolpa",
  "प्युठान":         "Pyuthan",
  "प्यूठान":         "Pyuthan",          // upstream alternate (diirgha uu)
  "दाङ":             "Dang",
  "बाँके":           "Banke",
  "बर्दिया":         "Bardiya",

  // Karnali Province (STATE_ID 6)
  "सल्यान":          "Salyan",
  "डोल्पा":          "Dolpa",
  "मुगु":            "Mugu",
  "जुम्ला":          "Jumla",
  "कालिकोट":         "Kalikot",
  "हुम्ला":          "Humla",
  "जाजरकोट":         "Jajarkot",
  "दैलेख":           "Dailekh",
  "सुर्खेत":         "Surkhet",
  "रुकुम पश्चिम":    "Rukum West",

  // Sudurpashchim Province (STATE_ID 7)
  "बाजुरा":          "Bajura",
  "अछाम":            "Achham",
  "बझाङ":            "Bajhang",
  "डोटी":            "Doti",
  "कैलाली":          "Kailali",
  "दार्चुला":        "Darchula",
  "बैतडी":           "Baitadi",
  "डडेलधुरा":        "Dadeldhura",
  "कञ्चनपुर":        "Kanchanpur",
};

// ── State-ID-based overrides ──────────────────────────────────────────────────
// For cases where the same Nepali DistrictName maps to different English names
// depending on the province (STATE_ID).
//
// Nawalparasi was split; upstream uses two different string forms:
//   Short form "नवलपुर" — STATE_ID 4 → Nawalpur, STATE_ID 5 → Parasi
//   Full form  "नवलपरासी (बर्दघाट सुस्ता पूर्व)"  — always STATE_ID 4 → Nawalpur
//   Full form  "नवलपरासी (बर्दघाट सुस्ता पश्चिम)" — always STATE_ID 5 → Parasi
//
// Rukum was split; upstream uses:
//   "रुकुम (पूर्वी भाग)"  — always STATE_ID 5 (Lumbini)  → Rukum East
//   "रुकुम (पश्चिम भाग)" — always STATE_ID 6 (Karnali)  → Rukum West
// These are unambiguous strings so they go directly into DISTRICT_EN above,
// but they also appear here as overrides for robustness.

export const DISTRICT_STATE_OVERRIDE: Record<string, Record<number, string>> = {
  // Short Nawalparasi (same string, different province)
  "नवलपुर": { 4: "Nawalpur", 5: "Parasi" },
  // Full Nawalparasi strings (unambiguous, but mapped for completeness)
  "नवलपरासी (बर्दघाट सुस्ता पूर्व)":  { 4: "Nawalpur" },
  "नवलपरासी (बर्दघाट सुस्ता पश्चिम)": { 5: "Parasi" },
  // Full Rukum strings
  "रुकुम (पूर्वी भाग)":  { 5: "Rukum East" },
  "रुकुम (पश्चिम भाग)": { 6: "Rukum West" },
};

// ── Resolver (the only function callers need) ─────────────────────────────────

/**
 * Resolve a Nepali DistrictName + STATE_ID to the canonical English name.
 * Falls back to "<province-key>-District" if truly unknown — add any missing
 * entries to DISTRICT_EN above rather than relying on this fallback.
 */
export function districtNameEn(
  nepali: string,
  stateId: number,
  provinceFallback = "Unknown",
): string {
  const override = DISTRICT_STATE_OVERRIDE[nepali];
  if (override) {
    return override[stateId] ?? DISTRICT_EN[nepali] ?? `${provinceFallback}-District`;
  }
  return DISTRICT_EN[nepali] ?? `${provinceFallback}-District`;
}
