// i18n.ts — Bilingual (Nepali / English) label map for the election dashboard.
// All upstream data from result.election.gov.np is Nepali-only.
// Static UI chrome and known-value fields have English fallbacks here.

export type Lang = "np" | "en";

// Province names
export const PROVINCE_NAMES: Record<string, { np: string; en: string }> = {
  Koshi:          { np: "कोशी प्रदेश",        en: "Koshi Province" },
  Madhesh:        { np: "मधेश प्रदेश",        en: "Madhesh Province" },
  Bagmati:        { np: "बागमती प्रदेश",      en: "Bagmati Province" },
  Gandaki:        { np: "गण्डकी प्रदेश",      en: "Gandaki Province" },
  Lumbini:        { np: "लुम्बिनी प्रदेश",    en: "Lumbini Province" },
  Karnali:        { np: "कर्णाली प्रदेश",     en: "Karnali Province" },
  Sudurpashchim:  { np: "सुदूरपश्चिम प्रदेश", en: "Sudurpashchim Province" },
};

// Party names (Nepali full name → bilingual)
export const PARTY_NAMES: Record<string, { np: string; en: string }> = {
  NC:        { np: "नेपाली काँग्रेस",                                                  en: "Nepali Congress (NC)" },
  "CPN-UML": { np: "नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)",       en: "CPN-UML" },
  NCP:       { np: "नेपाल कम्युनिस्ट पार्टी (माओवादी)",                              en: "Nepali Communist Party (NCP)" },
  RSP:       { np: "राष्ट्रिय स्वतन्त्र पार्टी",                                      en: "Rastriya Swatantra Party (RSP)" },
  RPP:       { np: "राष्ट्रिय प्रजातन्त्र पार्टी",                                    en: "Rastriya Prajatantra Party (RPP)" },
  JSP:       { np: "जनता समाजवादी पार्टी, नेपाल",                                    en: "Janata Samajwadi Party (JSP)" },
  IND:       { np: "स्वतन्त्र",                                                        en: "Independent" },
  OTH:       { np: "अन्य",                                                             en: "Others" },
};

// Gender field values from upstream
export const GENDER: Record<string, { np: string; en: string }> = {
  "पुरुष": { np: "पुरुष", en: "Male" },
  "महिला": { np: "महिला", en: "Female" },
  "अन्य":  { np: "अन्य",  en: "Other" },
};

// Education qualification values (common ones)
export const QUALIFICATION: Record<string, { np: string; en: string }> = {
  "स्नातक":        { np: "स्नातक",        en: "Bachelor's" },
  "स्नातकोत्तर":   { np: "स्नातकोत्तर",   en: "Master's" },
  "प्रमाणपत्र":    { np: "प्रमाणपत्र",    en: "Certificate" },
  "एसएलसी":       { np: "एसएलसी",       en: "SLC" },
  "पिएचडी":       { np: "पिएचडी",       en: "PhD" },
};

// Election status values
export const STATUS: Record<string, { np: string; en: string }> = {
  DECLARED: { np: "घोषित",     en: "Declared" },
  COUNTING: { np: "मतगणना",   en: "Counting" },
};

// Static UI labels
export const UI: Record<string, { np: string; en: string }> = {
  appTitle:           { np: "प्रतिनिधि सभा निर्वाचन २०८२", en: "Nepal House of Representatives Election 2026" },
  appSubtitle:        { np: "लाइभ परिणाम ड्यासबोर्ड",       en: "Live Results Dashboard" },
  lastUpdated:        { np: "अन्तिम अपडेट",                  en: "Last updated" },
  majority:           { np: "बहुमत",                         en: "Majority" },
  majorityDesc:       { np: "सरकार बनाउन चाहिने सिट",       en: "Seats needed to form government" },
  leadingParty:       { np: "अग्रणी दल",                     en: "Leading party" },
  runnerUp:           { np: "दोस्रो दल",                     en: "Runner-up" },
  seats:              { np: "सिट",                            en: "seats" },
  seatsDeclaredProg:  { np: "सिट घोषणा प्रगति",              en: "Seats Declared Progress" },
  provinces:          { np: "प्रदेश",                         en: "Provinces" },
  clickToFilter:      { np: "फिल्टर गर्न प्रदेशमा क्लिक गर्नुस्", en: "Click a province to filter the table" },
  allProvinces:       { np: "सबै प्रदेश",                    en: "All provinces" },
  all:                { np: "सबै",                            en: "All" },
  constituency:       { np: "निर्वाचन क्षेत्र",              en: "Constituency" },
  constituencyResults:{ np: "निर्वाचन क्षेत्र परिणाम",       en: "Constituency Results" },
  clickRowDetails:    { np: "विवरणका लागि पङ्क्तिमा क्लिक गर्नुस्", en: "Click a row to view details · Search and filter by province" },
  province:           { np: "प्रदेश",                         en: "Province" },
  leading:            { np: "अग्रणी",                         en: "Leading" },
  runnerUpCol:        { np: "दोस्रो",                        en: "Runner-up" },
  margin:             { np: "अन्तर",                          en: "Margin" },
  status:             { np: "स्थिति",                         en: "Status" },
  updated:            { np: "अपडेट",                          en: "Updated" },
  search:             { np: "खोज्नुस्…",                      en: "Search…" },
  searchAria:         { np: "निर्वाचन क्षेत्र खोज्नुस्",     en: "Search constituencies" },
  filterByProvince:   { np: "प्रदेश अनुसार फिल्टर",          en: "Filter by province" },
  sortBy:             { np: "क्रमबद्ध गर्नुस्",               en: "Sort by" },
  sortStatus:         { np: "क्रम: स्थिति",                   en: "Sort: Status" },
  sortMargin:         { np: "क्रम: अन्तर ↓",                  en: "Sort: Margin ↓" },
  sortProvinceAZ:     { np: "क्रम: प्रदेश A–Z",              en: "Sort: Province A–Z" },
  sortNameAZ:         { np: "क्रम: नाम A–Z",                  en: "Sort: Name A–Z" },
  noRows:             { np: "खोजसँग मेल खाने पङ्क्ति भेटिएन।", en: "No rows match your search." },
  showing:            { np: "देखाउँदै",                       en: "Showing" },
  constituenciesCount:{ np: "निर्वाचन क्षेत्रहरू",           en: "constituencies" },
  mockSubset:         { np: "(नमुना डेटा)",                   en: "(mock subset)" },
  filterByDistrict:   { np: "जिल्ला अनुसार फिल्टर",          en: "Filter by district" },
  allDistricts:       { np: "सबै जिल्ला",                     en: "All districts" },
  districtMap:        { np: "जिल्ला नक्सा",                   en: "District Map" },
  mapDesc:            { np: "७७ जिल्ला · दल रंगमा · क्लिक गर्नुस्", en: "77 districts · shaded by leading party · click to filter" },
  clearFilter:        { np: "फिल्टर हटाउनुस्",               en: "Clear filter" },
  declared:           { np: "घोषित",                          en: "declared" },
  viewTable:          { np: "📋 तालिका",                       en: "📋 Table" },
  viewMap:            { np: "🗺️ नक्सा",                        en: "🗺️ Map" },
  view:               { np: "दृश्य:",                          en: "View:" },
  projectedGovt:      { np: "सरकार बनाउन सक्षम (≥ {n} सिट)", en: "is projected to form government (≥ {n} seats)." },
  live:               { np: "लाइभ",                           en: "LIVE" },
  liveUpdated:        { np: "↕ अपडेट",                        en: "↕ Updated" },
  votesFor:           { np: "मत",                              en: "votes" },
  of:                 { np: "मध्ये",                           en: "of" },
  votesCast:          { np: "मत खसेका",                       en: "votes cast" },
  candidates:         { np: "उम्मेद्वारहरू",                   en: "Candidates" },
  details:            { np: "विवरण",                           en: "Details" },
  close:              { np: "बन्द गर्नुस्",                    en: "Close" },
  lightMode:          { np: "☀️ उज्यालो",                      en: "☀️ Light" },
  darkMode:           { np: "🌙 अँध्यारो",                     en: "🌙 Dark" },
  stillCounting:      { np: "निर्वाचन क्षेत्र मतगणना गर्दैछ।", en: "constituencies still counting." },
  hotSeats:           { np: "तातो सिटहरू",                        en: "Hot Seats" },
  hotSeatsDesc:       { np: "नजिकको प्रतिस्पर्धाका निर्वाचन क्षेत्र", en: "Closely contested constituencies" },
  closelyContested:   { np: "🔥 नजिकको प्रतिस्पर्धा",           en: "🔥 Closely Contested" },
  statsConstituencies:{ np: "निर्वाचन क्षेत्र",                   en: "Constituencies" },
  statsProvinces:     { np: "प्रदेशहरू",                           en: "Provinces" },
  statsParties:       { np: "दलहरू",                               en: "Parties" },
  statsTotalSeats:    { np: "कुल सिट",                             en: "Total Seats" },
  electionDate:       { np: "मार्च ५, २०२६",                      en: "March 5, 2026" },
  daysUntilElection:  { np: "निर्वाचनसम्म दिन",                   en: "days until election" },
  preElection:        { np: "पूर्व-निर्वाचन",                      en: "Pre-Election" },
  footerDisclaimer:   { np: "यो साइट शैक्षिक उद्देश्यका लागि मात्र हो। नेपाल निर्वाचन आयोगसँग सम्बद्ध छैन।", en: "This site is for educational purposes only. Not affiliated with the Election Commission of Nepal." },
  dataSource:         { np: "डेटा स्रोत",                          en: "Data source" },
  hotSeatsEmpty:      { np: "निर्वाचन राति नतिजा आउँदा यहाँ देखिनेछ।", en: "Hot seat results will appear here on election night." },
};

/** Get a label in the current language. Falls back to English key if missing. */
export function t(key: keyof typeof UI, lang: Lang): string {
  return UI[key]?.[lang] ?? UI[key]?.en ?? key;
}

/** Get a province label in current language. Falls back to English key. */
export function provinceName(province: string, lang: Lang): string {
  return PROVINCE_NAMES[province]?.[lang] ?? province;
}

/** Get a party name in current language. Falls back to English short key. */
export function partyName(partyKey: string, lang: Lang): string {
  return PARTY_NAMES[partyKey]?.[lang] ?? partyKey;
}

/** Get a status label in current language. */
export function statusLabel(status: string, lang: Lang): string {
  return STATUS[status]?.[lang] ?? status;
}
