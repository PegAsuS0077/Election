"""
district_names.py — Canonical Nepali → English district name lookup.

Single source of truth used by both scraper.py and publish_to_r2.py.
Frontend mirror: frontend/src/lib/districtNames.ts

Rules:
  - Keys are the exact Nepali DistrictName strings from the upstream JSON.
  - Values are the official English district names.
  - Where the same Nepali string maps to two different districts (Nawalparasi
    was split), use DISTRICT_STATE_OVERRIDE keyed by STATE_ID.
  - Any unknown key falls back to "<Province>-District" — add missing entries
    here rather than living with that fallback.
"""

# ── Primary lookup ─────────────────────────────────────────────────────────────

DISTRICT_EN: dict[str, str] = {
    # Koshi Province (STATE_ID 1)
    "ताप्लेजुङ":       "Taplejung",
    "पाँचथर":          "Panchthar",
    "इलाम":            "Ilam",
    "सङ्खुवासभा":      "Sankhuwasabha",
    "संखुवासभा":       "Sankhuwasabha",    # upstream alternate spelling
    "भोजपुर":          "Bhojpur",
    "धनकुटा":          "Dhankuta",
    "तेह्रथुम":        "Tehrathum",
    "खोटाङ":           "Khotang",
    "सोलुखुम्बु":      "Solukhumbu",
    "ओखलढुङ्गा":       "Okhaldhunga",
    "ओखलढुंगा":        "Okhaldhunga",      # upstream alternate (anusvara vs chandrabindu)
    "झापा":            "Jhapa",
    "मोरङ":            "Morang",
    "सुनसरी":          "Sunsari",
    "उदयपुर":          "Udayapur",

    # Madhesh Province (STATE_ID 2)
    "सप्तरी":          "Saptari",
    "सिरहा":           "Siraha",
    "सिराहा":          "Siraha",            # upstream alternate spelling
    "धनुषा":           "Dhanusha",
    "महोत्तरी":        "Mahottari",
    "सर्लाही":         "Sarlahi",
    "रौतहट":           "Rautahat",
    "बारा":            "Bara",
    "पर्सा":           "Parsa",

    # Bagmati Province (STATE_ID 3)
    "दोलखा":           "Dolakha",
    "रामेछाप":         "Ramechhap",
    "सिन्धुली":        "Sindhuli",
    "रसुवा":           "Rasuwa",
    "धादिङ":           "Dhading",
    "नुवाकोट":         "Nuwakot",
    "काठमाडौँ":        "Kathmandu",
    "काठमाडौं":        "Kathmandu",        # alternate Unicode form
    "भक्तपुर":         "Bhaktapur",
    "ललितपुर":         "Lalitpur",
    "काभ्रेपलाञ्चोक":  "Kavrepalanchok",
    "सिन्धुपाल्चोक":   "Sindhupalchok",
    "मकवानपुर":        "Makwanpur",
    "चितवन":           "Chitwan",

    # Gandaki Province (STATE_ID 4)
    "गोर्खा":          "Gorkha",
    "गोरखा":           "Gorkha",            # upstream alternate (no halanta)
    "मनाङ":            "Manang",
    "लमजुङ":           "Lamjung",
    "कास्की":          "Kaski",
    "तनहुँ":           "Tanahun",
    "स्याङ्जा":        "Syangja",
    "स्याङजा":         "Syangja",           # upstream alternate (no chandrabindu)
    # "नवलपुर" / "नवलपरासी…" → handled by DISTRICT_STATE_OVERRIDE
    "मुस्ताङ":         "Mustang",
    "म्याग्दी":        "Myagdi",
    "बाग्लुङ":         "Baglung",
    "पर्वत":           "Parbat",

    # Lumbini Province (STATE_ID 5)
    "गुल्मी":          "Gulmi",
    "पाल्पा":          "Palpa",
    "अर्घाखाँची":      "Arghakhanchi",
    # "नवलपुर" / "नवलपरासी…" → handled by DISTRICT_STATE_OVERRIDE
    "रूपन्देही":       "Rupandehi",
    "कपिलवस्तु":       "Kapilvastu",
    "कपिलबस्तु":       "Kapilvastu",        # upstream alternate spelling
    "रुकुम पूर्व":     "Rukum East",
    "रोल्पा":          "Rolpa",
    "प्युठान":         "Pyuthan",
    "प्यूठान":         "Pyuthan",           # upstream alternate (diirgha uu)
    "दाङ":             "Dang",
    "बाँके":           "Banke",
    "बर्दिया":         "Bardiya",

    # Karnali Province (STATE_ID 6)
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

    # Sudurpashchim Province (STATE_ID 7)
    "बाजुरा":          "Bajura",
    "अछाम":            "Achham",
    "बझाङ":            "Bajhang",
    "डोटी":            "Doti",
    "कैलाली":          "Kailali",
    "दार्चुला":        "Darchula",
    "बैतडी":           "Baitadi",
    "डडेलधुरा":        "Dadeldhura",
    "कञ्चनपुर":        "Kanchanpur",
}

# ── State-ID-based overrides ───────────────────────────────────────────────────
# Nawalparasi was split; upstream uses two forms:
#   Short: "नवलपुर" — STATE_ID 4 → Nawalpur, STATE_ID 5 → Parasi
#   Full:  "नवलपरासी (बर्दघाट सुस्ता पूर्व)"  — always STATE_ID 4 → Nawalpur
#          "नवलपरासी (बर्दघाट सुस्ता पश्चिम)" — always STATE_ID 5 → Parasi
# Rukum was split; upstream uses full descriptive names:
#   "रुकुम (पूर्वी भाग)"  — STATE_ID 5 (Lumbini) → Rukum East
#   "रुकुम (पश्चिम भाग)" — STATE_ID 6 (Karnali) → Rukum West

DISTRICT_STATE_OVERRIDE: dict[str, dict[int, str]] = {
    # Short Nawalparasi (same string, different province)
    "नवलपुर": {4: "Nawalpur", 5: "Parasi"},
    # Full Nawalparasi strings (unambiguous, mapped for completeness)
    "नवलपरासी (बर्दघाट सुस्ता पूर्व)":  {4: "Nawalpur"},
    "नवलपरासी (बर्दघाट सुस्ता पश्चिम)": {5: "Parasi"},
    # Full Rukum strings
    "रुकुम (पूर्वी भाग)":  {5: "Rukum East"},
    "रुकुम (पश्चिम भाग)": {6: "Rukum West"},
}

# ── Province fallback map ──────────────────────────────────────────────────────

_PROVINCE_EN: dict[int, str] = {
    1: "Koshi", 2: "Madhesh", 3: "Bagmati",
    4: "Gandaki", 5: "Lumbini", 6: "Karnali", 7: "Sudurpashchim",
}


def district_name_en(nepali: str, state_id: int) -> str:
    """Resolve a Nepali DistrictName + STATE_ID to the canonical English name.

    Falls back to '<Province>-District' if truly unknown — add missing entries
    to DISTRICT_EN above rather than relying on this fallback.
    """
    override = DISTRICT_STATE_OVERRIDE.get(nepali)
    if override:
        return override.get(
            state_id,
            DISTRICT_EN.get(nepali, f"{_PROVINCE_EN.get(state_id, 'Unknown')}-District"),
        )
    return DISTRICT_EN.get(
        nepali,
        f"{_PROVINCE_EN.get(state_id, 'Unknown')}-District",
    )
