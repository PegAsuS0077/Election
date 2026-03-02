// All real registered parties — no "CPN-US" catch-all.
// "Others" is computed dynamically in the UI from whichever parties fall outside the top N.
export type PartyKey =
  | "NC"
  | "CPN-UML"
  | "NCP"
  | "RSP"
  | "RPP"
  | "JSP"
  | "CPN-US"
  | "LSP"
  | "NUP"
  | "RJM"
  | "NMKP"
  | "JMP"
  | "CPN-ML"
  | "NPD"
  | "IND";

export const parties: Record<PartyKey, { name: string; nameNp: string; color: string; symbol: string }> = {
  // ── Major parties ────────────────────────────────────────────────────────────
  NC:        { name: "Nepali Congress",                    nameNp: "नेपाली काँग्रेस",                          color: "bg-red-600",      symbol: "🌳" },
  "CPN-UML": { name: "CPN (Unified Marxist-Leninist)",    nameNp: "नेकपा (एमाले)",                             color: "bg-blue-600",     symbol: "☀️" },
  NCP:       { name: "NCP (Maoist Centre)",               nameNp: "नेकपा (माओवादी केन्द्र)",                   color: "bg-orange-600",   symbol: "🌙" },
  RSP:       { name: "Rastriya Swatantra Party",          nameNp: "राष्ट्रिय स्वतन्त्र पार्टी",               color: "bg-emerald-600",  symbol: "⚡" },
  RPP:       { name: "Rastriya Prajatantra Party",        nameNp: "राष्ट्रिय प्रजातन्त्र पार्टी",             color: "bg-yellow-600",   symbol: "👑" },
  JSP:       { name: "Janata Samajwadi Party Nepal",      nameNp: "जनता समाजवादी पार्टी, नेपाल",              color: "bg-cyan-600",     symbol: "⚙️" },
  // ── Registered smaller parties ───────────────────────────────────────────────
  "CPN-US":  { name: "CPN (Unified Socialist)",           nameNp: "नेकपा (एकीकृत समाजवादी)",                  color: "bg-purple-600",   symbol: "✊" },
  LSP:       { name: "Loktantrik Samajwadi Party",        nameNp: "लोकतान्त्रिक समाजवादी पार्टी",             color: "bg-teal-600",     symbol: "🌿" },
  NUP:       { name: "Nagarik Unmukti Party",             nameNp: "नागरिक उन्मुक्ति पार्टी",                  color: "bg-amber-600",    symbol: "🕊️" },
  RJM:       { name: "Rastriya Janamorcha",               nameNp: "राष्ट्रिय जनमोर्चा",                        color: "bg-rose-700",     symbol: "⚒️" },
  NMKP:      { name: "Nepal Majdoor Kisan Party",         nameNp: "नेपाल मजदुर किसान पार्टी",                 color: "bg-green-700",    symbol: "🌾" },
  JMP:       { name: "Janamat Party",                     nameNp: "जनमत पार्टी",                               color: "bg-indigo-600",   symbol: "🗳️" },
  "CPN-ML":  { name: "CPN (Marxist-Leninist)",            nameNp: "नेकपा (मार्क्सवादी-लेनिनवादी)",             color: "bg-red-800",      symbol: "⭐" },
  NPD:       { name: "Nepal Parivar Dal",                 nameNp: "नेपाल परिवार दल",                           color: "bg-stone-600",    symbol: "🏠" },
  // ── Independent ─────────────────────────────────────────────────────────────
  IND:       { name: "Independent",                       nameNp: "स्वतन्त्र",                                  color: "bg-violet-500",   symbol: "🧑" },
};

// Mock "change vs previous election" (positive = gain, negative = loss)
export const seatChange: Record<PartyKey, number> = {
  NC: +3, "CPN-UML": -2, NCP: +1, RSP: +6, RPP: 0, JSP: 0,
  "CPN-US": 0, LSP: 0, NUP: +1, RJM: 0, NMKP: 0, JMP: +1, "CPN-ML": 0, NPD: 0,
  IND: 0,
};

export const mockSnapshot = {
  totalSeats: 275,
  lastUpdated: new Date().toISOString(),
};

export type Province =
  | "Koshi" | "Madhesh" | "Bagmati" | "Gandaki"
  | "Lumbini" | "Karnali" | "Sudurpashchim";

export const provinceNp: Record<Province, string> = {
  Koshi:           "कोशी प्रदेश",
  Madhesh:         "मधेश प्रदेश",
  Bagmati:         "बागमती प्रदेश",
  Gandaki:         "गण्डकी प्रदेश",
  Lumbini:         "लुम्बिनी प्रदेश",
  Karnali:         "कर्णाली प्रदेश",
  Sudurpashchim:   "सुदूरपश्चिम प्रदेश",
};

export type Candidate = {
  candidateId: number;   // matches real CandidateID for photo URL
  name: string;          // English transliteration
  nameNp: string;        // Devanagari from upstream
  party: PartyKey;
  votes: number;
  gender: "M" | "F";
};

export type ConstituencyResult = {
  province: Province;
  district: string;       // English
  districtNp: string;     // Devanagari
  code: string;           // composite: "{stateId}-{districtNp}-{constNum}"
  name: string;           // English e.g. "Taplejung-1"
  nameNp: string;         // Devanagari e.g. "ताप्लेजुङ क्षेत्र नं. १"
  status: "DECLARED" | "COUNTING" | "PENDING";
  lastUpdated: string;
  candidates: Candidate[];
  votesCast: number;      // sum of candidate votes (no total-voters in upstream)
  totalVoters?: number;   // optional — not provided by upstream pre-election
};

export const provinces: Province[] = [
  "Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim",
];

function ago(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

// id base per province so candidateIds are unique across all constituencies
// Real IDs cluster 300000-400000; we use 3xxxxx ranges per province
function c(id: number, name: string, nameNp: string, party: PartyKey, votes: number, gender: "M" | "F" = "M"): Candidate {
  return { candidateId: id, name, nameNp, party, votes, gender };
}

function sumVotes(cands: Candidate[]): number {
  return cands.reduce((s, c) => s + c.votes, 0);
}

function con(
  province: Province,
  district: string,
  districtNp: string,
  stateId: number,
  constNum: number,
  status: "DECLARED" | "COUNTING" | "PENDING",
  minutesAgo: number,
  candidates: Candidate[]
): ConstituencyResult {
  return {
    province,
    district,
    districtNp,
    code: `${stateId}-${districtNp}-${constNum}`,
    name: `${district}-${constNum}`,
    nameNp: `${districtNp} क्षेत्र नं. ${constNum}`,
    status,
    lastUpdated: ago(minutesAgo),
    candidates,
    votesCast: sumVotes(candidates),
  };
}

export const constituencyResults: ConstituencyResult[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // KOSHI PROVINCE — STATE_ID 1 — 28 constituencies
  // ═══════════════════════════════════════════════════════════════════════════

  con("Koshi","Taplejung","ताप्लेजुङ",1,1,"DECLARED",140,[
    c(310001,"Pasang Sherpa","पासाङ शेर्पा","NCP",16200,"M"),
    c(310002,"Hari Limbu","हरि लिम्बु","NC",13800,"M"),
    c(310003,"Ram Rai","राम राई","CPN-UML",4500,"M"),
    c(310004,"Dawa Lama","दावा लामा","LSP",820,"M"),
  ]),
  con("Koshi","Panchthar","पाँचथर",1,1,"COUNTING",20,[
    c(310011,"Rajan Limbu","राजन लिम्बु","NCP",19800,"M"),
    c(310012,"Sabina Rai","सबिना राई","NC",18900,"F"),
    c(310013,"Hem Tamang","हेम तामाङ","CPN-UML",7100,"M"),
    c(310014,"Bimal Sherpa","बिमल शेर्पा","NUP",1200,"M"),
  ]),
  con("Koshi","Ilam","इलाम",1,1,"DECLARED",80,[
    c(310021,"Mina Subba","मिना सुब्बा","NC",24500,"F"),
    c(310022,"Karna Limbu","कर्ण लिम्बु","CPN-UML",21800,"M"),
    c(310023,"Prabha Rai","प्रभा राई","RSP",9300,"F"),
    c(310024,"Gokul Ghimire","गोकुल घिमिरे","RJM",1800,"M"),
  ]),
  con("Koshi","Ilam","इलाम",1,2,"COUNTING",5,[
    c(310031,"Roshan Limbu","रोशन लिम्बु","CPN-UML",21900,"M"),
    c(310032,"Anita Subba","अनिता सुब्बा","NC",20700,"F"),
    c(310033,"Dipak Rai","दिपक राई","NCP",8600,"M"),
    c(310034,"Sanu Tamang","सानु तामाङ","NMKP",1400,"F"),
  ]),
  con("Koshi","Taplejung","ताप्लेजुङ",1,2,"PENDING",0,[
    c(310041,"Kamal Sherpa","कमल शेर्पा","NC",0,"M"),
    c(310042,"Doma Lama","डोमा लामा","CPN-UML",0,"F"),
    c(310043,"Biru Rai","बिरु राई","NCP",0,"M"),
  ]),
  con("Koshi","Sankhuwasabha","सङ्खुवासभा",1,1,"COUNTING",8,[
    c(310051,"Bhim Tamang","भिम तामाङ","CPN-UML",18700,"M"),
    c(310052,"Nirmala Rai","निर्मला राई","NC",17900,"F"),
    c(310053,"Kiran Limbu","किरण लिम्बु","NCP",5200,"M"),
    c(310054,"Manoj Majhi","मनोज माझी","JMP",1100,"M"),
  ]),
  con("Koshi","Sankhuwasabha","सङ्खुवासभा",1,2,"DECLARED",115,[
    c(310061,"Sita Rai","सिता राई","NC",19800,"F"),
    c(310062,"Mohan Tamang","मोहन तामाङ","CPN-UML",17200,"M"),
    c(310063,"Prem Limbu","प्रेम लिम्बु","NCP",5900,"M"),
    c(310064,"Gita Sherpa","गिता शेर्पा","CPN-ML",900,"F"),
  ]),
  con("Koshi","Bhojpur","भोजपुर",1,1,"DECLARED",95,[
    c(310071,"Sita Rai","सिता राई","NC",21300,"F"),
    c(310072,"Gopal Limbu","गोपाल लिम्बु","CPN-UML",18200,"M"),
    c(310073,"Saroj Karki","सरोज कार्की","NCP",6400,"M"),
    c(310074,"Tilak BK","तिलक बि.क.","NPD",900,"M"),
  ]),
  con("Koshi","Bhojpur","भोजपुर",1,2,"COUNTING",18,[
    c(310081,"Dipak Rai","दिपक राई","CPN-UML",20100,"M"),
    c(310082,"Maya Sherpa","माया शेर्पा","NC",18900,"F"),
    c(310083,"Kamala Limbu","कमला लिम्बु","RSP",7200,"F"),
    c(310084,"Nanda Majhi","नन्दा माझी","CPN-US",1100,"F"),
  ]),
  con("Koshi","Dhankuta","धनकुटा",1,1,"COUNTING",12,[
    c(310091,"Deepak Limbu","दिपक लिम्बु","CPN-UML",22100,"M"),
    c(310092,"Maya Rai","माया राई","NC",20400,"F"),
    c(310093,"Suresh Sherpa","सुरेश शेर्पा","RSP",8200,"M"),
    c(310094,"Lokendra Tamang","लोकेन्द्र तामाङ","LSP",1500,"M"),
  ]),
  con("Koshi","Tehrathum","तेह्रथुम",1,1,"DECLARED",110,[
    c(310101,"Kamala Rai","कमला राई","NC",14900,"F"),
    c(310102,"Bishnu Limbu","बिष्णु लिम्बु","CPN-UML",11200,"M"),
    c(310103,"Tika Sherpa","टिका शेर्पा","NCP",3800,"M"),
    c(310104,"Anita BK","अनिता बि.क.","NUP",600,"F"),
  ]),
  con("Koshi","Khotang","खोटाङ",1,1,"DECLARED",90,[
    c(310111,"Ram Bahadur Rai","राम बहादुर राई","CPN-UML",18500,"M"),
    c(310112,"Sita Limbu","सिता लिम्बु","NC",16800,"F"),
    c(310113,"Prem Sherpa","प्रेम शेर्पा","NCP",5100,"M"),
    c(310114,"Hari Majhi","हरि माझी","RJM",800,"M"),
  ]),
  con("Koshi","Khotang","खोटाङ",1,2,"COUNTING",14,[
    c(310121,"Mina Tamang","मिना तामाङ","NC",17200,"F"),
    c(310122,"Bikash Rai","बिकास राई","CPN-UML",16400,"M"),
    c(310123,"Anita Limbu","अनिता लिम्बु","RSP",6800,"F"),
    c(310124,"Gopal BK","गोपाल बि.क.","NMKP",950,"M"),
  ]),
  con("Koshi","Solukhumbu","सोलुखुम्बु",1,1,"DECLARED",105,[
    c(310131,"Kami Sherpa","कामी शेर्पा","NCP",15600,"M"),
    c(310132,"Dawa Sherpa","डावा शेर्पा","NC",13800,"M"),
    c(310133,"Lhakpa Sherpa","ल्हाक्पा शेर्पा","CPN-UML",4200,"M"),
    c(310134,"Ang Sherpa","अङ शेर्पा","JMP",700,"M"),
  ]),
  con("Koshi","Okhaldhunga","ओखलढुङ्गा",1,1,"COUNTING",22,[
    c(310141,"Priya Rai","प्रिया राई","NC",16900,"F"),
    c(310142,"Bikash Limbu","बिकास लिम्बु","CPN-UML",15700,"M"),
    c(310143,"Kamala Tamang","कमला तामाङ","NCP",5400,"F"),
    c(310144,"Sita BK","सिता बि.क.","CPN-ML",800,"F"),
  ]),
  con("Koshi","Jhapa","झापा",1,1,"DECLARED",130,[
    c(310151,"Sunita Koirala","सुनिता कोइराला","NC",31200,"F"),
    c(310152,"Harka Giri","हर्क गिरी","CPN-UML",28100,"M"),
    c(310153,"Priya Adhikari","प्रिया अधिकारी","RSP",10500,"F"),
    c(310154,"Mohan Karki","मोहन कार्की","NPD",2100,"M"),
  ]),
  con("Koshi","Jhapa","झापा",1,2,"DECLARED",100,[
    c(310161,"Ram Karki","राम कार्की","CPN-UML",33400,"M"),
    c(310162,"Parbati Sharma","पार्वती शर्मा","NC",30100,"F"),
    c(310163,"Suresh Bista","सुरेश बिस्ता","NCP",9800,"M"),
    c(310164,"Devi Thapaliya","देवी थापलिया","CPN-US",1900,"F"),
  ]),
  con("Koshi","Jhapa","झापा",1,3,"COUNTING",15,[
    c(310171,"Mina Sharma","मिना शर्मा","NC",29800,"F"),
    c(310172,"Bikash Giri","बिकास गिरी","CPN-UML",28500,"M"),
    c(310173,"Anita Rai","अनिता राई","RSP",10200,"F"),
    c(310174,"Ram BK","राम बि.क.","LSP",1600,"M"),
  ]),
  con("Koshi","Morang","मोरङ",1,1,"COUNTING",15,[
    c(310181,"Dipak Sharma","दिपक शर्मा","NC",29800,"M"),
    c(310182,"Sita Thapa","सिता थापा","CPN-UML",29200,"F"),
    c(310183,"Ramesh Basnet","रमेश बस्नेत","RSP",9800,"M"),
    c(310184,"Gita Karki","गिता कार्की","NUP",1600,"F"),
  ]),
  con("Koshi","Morang","मोरङ",1,2,"DECLARED",88,[
    c(310191,"Kiran Adhikari","किरण अधिकारी","CPN-UML",34200,"M"),
    c(310192,"Sunita Rai","सुनिता राई","NC",31700,"F"),
    c(310193,"Nabin Sherpa","नबिन शेर्पा","NCP",8500,"M"),
    c(310194,"Priya Tamang","प्रिया तामाङ","RJM",2200,"F"),
  ]),
  con("Koshi","Morang","मोरङ",1,3,"COUNTING",10,[
    c(310201,"Ramesh Khadka","रमेश खड्का","NC",30400,"M"),
    c(310202,"Rita Dahal","रिता दाहाल","CPN-UML",28900,"F"),
    c(310203,"Anita Karki","अनिता कार्की","NCP",9200,"F"),
    c(310204,"Dinesh Yadav","दिनेश यादव","NMKP",1600,"M"),
  ]),
  con("Koshi","Morang","मोरङ",1,4,"DECLARED",75,[
    c(310211,"Kiran Poudel","किरण पौडेल","CPN-UML",41210,"M"),
    c(310212,"Rita Basnet","रिता बस्नेत","NC",39955,"F"),
    c(310213,"Raju Karki","राजु कार्की","NCP",9200,"M"),
    c(310214,"Gita Sharma","गिता शर्मा","JMP",1600,"F"),
  ]),
  con("Koshi","Sunsari","सुनसरी",1,1,"DECLARED",115,[
    c(310221,"Pramod Koirala","प्रमोद कोइराला","NC",35200,"M"),
    c(310222,"Sabita Thapa","सबिता थापा","CPN-UML",32100,"F"),
    c(310223,"Roshan Bista","रोशन बिस्ता","RSP",12400,"M"),
    c(310224,"Laxmi Bohara","लक्ष्मी बोहरा","CPN-ML",2100,"F"),
  ]),
  con("Koshi","Sunsari","सुनसरी",1,2,"COUNTING",18,[
    c(310231,"Gita Rai","गिता राई","CPN-UML",30200,"F"),
    c(310232,"Hari Basnet","हरि बस्नेत","NC",28900,"M"),
    c(310233,"Puja Sharma","पूजा शर्मा","NCP",9600,"F"),
    c(310234,"Bikash Tamang","बिकास तामाङ","NPD",1800,"M"),
  ]),
  con("Koshi","Sunsari","सुनसरी",1,3,"DECLARED",92,[
    c(310241,"Suman Giri","सुमन गिरी","CPN-UML",28400,"M"),
    c(310242,"Kamala Koirala","कमला कोइराला","NC",26100,"F"),
    c(310243,"Bikash Karki","बिकास कार्की","RSP",10800,"M"),
    c(310244,"Nirmala Rai","निर्मला राई","CPN-US",1900,"F"),
  ]),
  con("Koshi","Udayapur","उदयपुर",1,1,"DECLARED",92,[
    c(310251,"Nanda Rai","नन्दा राई","NCP",22800,"F"),
    c(310252,"Meena Thapa","मिना थापा","NC",20100,"F"),
    c(310253,"Bhola Limbu","भोला लिम्बु","CPN-UML",8300,"M"),
    c(310254,"Gopal BK","गोपाल बि.क.","LSP",1400,"M"),
  ]),
  con("Koshi","Udayapur","उदयपुर",1,2,"COUNTING",22,[
    c(310261,"Dhan Bahadur Rai","धन बहादुर राई","NC",20500,"M"),
    c(310262,"Sita Sherpa","सिता शेर्पा","CPN-UML",19100,"F"),
    c(310263,"Nirmal Tamang","निर्मल तामाङ","RSP",7900,"M"),
    c(310264,"Bimala BK","बिमला बि.क.","NUP",1200,"F"),
  ]),
  con("Koshi","Udayapur","उदयपुर",1,3,"DECLARED",98,[
    c(310271,"Hari Basnet","हरि बस्नेत","NC",21200,"M"),
    c(310272,"Sita Karki","सिता कार्की","CPN-UML",19500,"F"),
    c(310273,"Rajan Rai","राजन राई","NCP",7100,"M"),
    c(310274,"Kamala Tamang","कमला तामाङ","RJM",1100,"F"),
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // MADHESH PROVINCE — STATE_ID 2 — 32 constituencies
  // ═══════════════════════════════════════════════════════════════════════════

  con("Madhesh","Saptari","सप्तरी",2,1,"DECLARED",135,[
    c(320001,"Ramesh Yadav","रमेश यादव","JSP",34700,"M"),
    c(320002,"Sita Devi Sah","सिता देवी साह","NC",30200,"F"),
    c(320003,"Ali Khan","अली खान","CPN-UML",7800,"M"),
    c(320004,"Raj Kishor Mahato","राज किशोर महतो","NMKP",3200,"M"),
  ]),
  con("Madhesh","Saptari","सप्तरी",2,2,"COUNTING",14,[
    c(320011,"Md. Iqbal Ansari","मो. इकबाल अन्सारी","NCP",35100,"M"),
    c(320012,"Laxmi Devi Sah","लक्ष्मी देवी साह","NC",33800,"F"),
    c(320013,"Tulsi Mehta","तुलसी मेहता","CPN-UML",8200,"M"),
    c(320014,"Shankar Yadav","शंकर यादव","JMP",2900,"M"),
  ]),
  con("Madhesh","Saptari","सप्तरी",2,3,"DECLARED",105,[
    c(320021,"Kamala Devi","कमला देवी","JSP",32400,"F"),
    c(320022,"Mohan Yadav","मोहन यादव","NC",29800,"M"),
    c(320023,"Sunita Jha","सुनिता झा","CPN-UML",7600,"F"),
    c(320024,"Rajan Mahato","राजन महतो","CPN-ML",2700,"M"),
  ]),
  con("Madhesh","Siraha","सिरहा",2,1,"DECLARED",108,[
    c(320031,"Priya Yadav","प्रिया यादव","NC",36400,"F"),
    c(320032,"Rohit Kumar Sah","रोहित कुमार साह","NCP",34100,"M"),
    c(320033,"Radha Mehta","राधा मेहता","CPN-UML",8700,"F"),
    c(320034,"Janaki Devi","जानकी देवी","NPD",2900,"F"),
  ]),
  con("Madhesh","Siraha","सिरहा",2,2,"COUNTING",7,[
    c(320041,"Suresh Yadav","सुरेश यादव","NCP",33800,"M"),
    c(320042,"Kamala Sah","कमला साह","NC",32200,"F"),
    c(320043,"Ganesh Kumar","गणेश कुमार","CPN-UML",9200,"M"),
    c(320044,"Mohan Lal","मोहन लाल","CPN-US",2600,"M"),
  ]),
  con("Madhesh","Siraha","सिरहा",2,3,"DECLARED",118,[
    c(320051,"Bimala Devi","बिमला देवी","NC",31800,"F"),
    c(320052,"Rajendra Yadav","राजेन्द्र यादव","NCP",29500,"M"),
    c(320053,"Suresh Jha","सुरेश झा","CPN-UML",8100,"M"),
    c(320054,"Anita Kumari","अनिता कुमारी","LSP",2400,"F"),
  ]),
  con("Madhesh","Dhanusha","धनुषा",2,1,"DECLARED",122,[
    c(320061,"Vidya Devi Jha","विद्या देवी झा","NC",38100,"F"),
    c(320062,"Birendra Yadav","बिरेन्द्र यादव","NCP",35600,"M"),
    c(320063,"Ram Narayan","राम नारायण","CPN-UML",9200,"M"),
    c(320064,"Sushila Mehta","सुशीला मेहता","NUP",2900,"F"),
  ]),
  con("Madhesh","Dhanusha","धनुषा",2,2,"COUNTING",55,[
    c(320071,"Md. Aftab Ansari","मो. अफताब अन्सारी","NCP",29888,"M"),
    c(320072,"Bhola Yadav","भोला यादव","CPN-UML",28741,"M"),
    c(320073,"Nirmala Devi","निर्मला देवी","NC",13200,"F"),
    c(320074,"Raj Kishor","राज किशोर","RJM",2400,"M"),
  ]),
  con("Madhesh","Dhanusha","धनुषा",2,3,"DECLARED",88,[
    c(320081,"Kamla Jha","कमला झा","NC",34500,"F"),
    c(320082,"Siyaram Yadav","सियाराम यादव","NCP",32100,"M"),
    c(320083,"Mohan Mehta","मोहन मेहता","CPN-UML",8800,"M"),
    c(320084,"Sita Tharu","सिता थारु","NMKP",2100,"F"),
  ]),
  con("Madhesh","Dhanusha","धनुषा",2,4,"COUNTING",11,[
    c(320091,"Ramji Yadav","रामजी यादव","NCP",31200,"M"),
    c(320092,"Sunita Jha","सुनिता झा","NC",29800,"F"),
    c(320093,"Bijay Kumar","बिजय कुमार","CPN-UML",8400,"M"),
    c(320094,"Priya Mahato","प्रिया महतो","JMP",2200,"F"),
  ]),
  con("Madhesh","Mahottari","महोत्तरी",2,1,"DECLARED",98,[
    c(320101,"Geeta Yadav","गीता यादव","NC",36200,"F"),
    c(320102,"Ramji Sah","रामजी साह","NCP",33100,"M"),
    c(320103,"Sunita Jha","सुनिता झा","CPN-UML",8900,"F"),
    c(320104,"Mohan Mahato","मोहन महतो","CPN-ML",2900,"M"),
  ]),
  con("Madhesh","Mahottari","महोत्तरी",2,2,"COUNTING",11,[
    c(320111,"Krishna Devi","कृष्णा देवी","NCP",33800,"F"),
    c(320112,"Shambhu Prasad","शम्भु प्रसाद","NC",32100,"M"),
    c(320113,"Asha Tharu","आशा थारु","CPN-UML",9900,"F"),
    c(320114,"Prakash Mehta","प्रकाश मेहता","NPD",2600,"M"),
  ]),
  con("Madhesh","Mahottari","महोत्तरी",2,3,"DECLARED",112,[
    c(320121,"Neeraj Mahato","नीरज महतो","NC",33800,"M"),
    c(320122,"Pooja Sah","पूजा साह","NCP",31200,"F"),
    c(320123,"Hari Jha","हरि झा","CPN-UML",8100,"M"),
    c(320124,"Laxmi Kumari","लक्ष्मी कुमारी","CPN-US",2000,"F"),
  ]),
  con("Madhesh","Sarlahi","सर्लाही",2,1,"DECLARED",118,[
    c(320131,"Neeraj Yadav","नीरज यादव","NC",38200,"M"),
    c(320132,"Pooja Sah","पूजा साह","NCP",35700,"F"),
    c(320133,"Hari Mahato","हरि महतो","CPN-UML",8800,"M"),
    c(320134,"Laxmi Kumari","लक्ष्मी कुमारी","LSP",2100,"F"),
  ]),
  con("Madhesh","Sarlahi","सर्लाही",2,2,"COUNTING",16,[
    c(320141,"Suresh Mahato","सुरेश महतो","NCP",34900,"M"),
    c(320142,"Ranjana Devi","रन्जना देवी","NC",33200,"F"),
    c(320143,"Bijay Kumar","बिजय कुमार","CPN-UML",9800,"M"),
    c(320144,"Saraswati Jha","सरस्वती झा","NUP",2700,"F"),
  ]),
  con("Madhesh","Sarlahi","सर्लाही",2,3,"DECLARED",95,[
    c(320151,"Kamla Mahato","कमला महतो","NC",32100,"F"),
    c(320152,"Bijaya Yadav","बिजया यादव","NCP",29800,"M"),
    c(320153,"Mohan Sah","मोहन साह","CPN-UML",8400,"M"),
    c(320154,"Saroj Tharu","सरोज थारु","RJM",2200,"M"),
  ]),
  con("Madhesh","Rautahat","रौतहट",2,1,"DECLARED",105,[
    c(320161,"Kamla Mahato","कमला महतो","NC",35500,"F"),
    c(320162,"Bijaya Yadav","बिजया यादव","NCP",32800,"M"),
    c(320163,"Mohan Sah","मोहन साह","CPN-UML",9200,"M"),
    c(320164,"Saroj Tharu","सरोज थारु","NMKP",2800,"M"),
  ]),
  con("Madhesh","Rautahat","रौतहट",2,2,"COUNTING",9,[
    c(320171,"Sunita Mahato","सुनिता महतो","NCP",33400,"F"),
    c(320172,"Ramesh Jha","रमेश झा","NC",32100,"M"),
    c(320173,"Anita Sah","अनिता साह","CPN-UML",9600,"F"),
    c(320174,"Gopal Yadav","गोपाल यादव","JMP",2700,"M"),
  ]),
  con("Madhesh","Rautahat","रौतहट",2,3,"DECLARED",128,[
    c(320181,"Rajan Yadav","राजन यादव","NC",33800,"M"),
    c(320182,"Meena Sah","मिना साह","NCP",31400,"F"),
    c(320183,"Priya Mahato","प्रिया महतो","CPN-UML",8800,"F"),
    c(320184,"Dilip Kumar","दिलीप कुमार","CPN-ML",2600,"M"),
  ]),
  con("Madhesh","Bara","बारा",2,1,"COUNTING",9,[
    c(320191,"Sunita Mahato","सुनिता महतो","NCP",35100,"F"),
    c(320192,"Ramesh Jha","रमेश झा","NC",34200,"M"),
    c(320193,"Anita Sah","अनिता साह","CPN-UML",10200,"F"),
    c(320194,"Gopal Yadav","गोपाल यादव","NPD",2800,"M"),
  ]),
  con("Madhesh","Bara","बारा",2,2,"DECLARED",128,[
    c(320201,"Rajan Yadav","राजन यादव","NC",36100,"M"),
    c(320202,"Meena Sah","मिना साह","NCP",33500,"F"),
    c(320203,"Priya Mahato","प्रिया महतो","CPN-UML",9200,"F"),
    c(320204,"Dilip Kumar","दिलीप कुमार","CPN-US",2800,"M"),
  ]),
  con("Madhesh","Bara","बारा",2,3,"COUNTING",12,[
    c(320211,"Santosh Yadav","सन्तोष यादव","NCP",31800,"M"),
    c(320212,"Lila Sah","लीला साह","NC",30500,"F"),
    c(320213,"Mohan Mahato","मोहन महतो","CPN-UML",9200,"M"),
    c(320214,"Sita Tharu","सिता थारु","LSP",2500,"F"),
  ]),
  con("Madhesh","Parsa","पर्सा",2,1,"COUNTING",6,[
    c(320221,"Santosh Yadav","सन्तोष यादव","NCP",34200,"M"),
    c(320222,"Lila Sah","लीला साह","NC",33100,"F"),
    c(320223,"Mohan Mahato","मोहन महतो","CPN-UML",9600,"M"),
    c(320224,"Sita Tharu","सिता थारु","NUP",2800,"F"),
  ]),
  con("Madhesh","Parsa","पर्सा",2,2,"DECLARED",102,[
    c(320231,"Anjali Kumari","अन्जली कुमारी","NC",34500,"F"),
    c(320232,"Ganesh Yadav","गणेश यादव","NCP",32900,"M"),
    c(320233,"Bimala Jha","बिमला झा","CPN-UML",8800,"F"),
    c(320234,"Saroj Mahato","सरोज महतो","RJM",2500,"M"),
  ]),
  con("Madhesh","Parsa","पर्सा",2,3,"DECLARED",118,[
    c(320241,"Ram Prasad Yadav","राम प्रसाद यादव","NC",32800,"M"),
    c(320242,"Sita Kumari","सिता कुमारी","NCP",30200,"F"),
    c(320243,"Hari Mahato","हरि महतो","CPN-UML",8400,"M"),
    c(320244,"Priya Tharu","प्रिया थारु","NMKP",2200,"F"),
  ]),
  con("Madhesh","Parsa","पर्सा",2,4,"COUNTING",8,[
    c(320251,"Kamal Yadav","कमल यादव","NCP",31500,"M"),
    c(320252,"Sunita Jha","सुनिता झा","NC",29800,"F"),
    c(320253,"Bijay Sah","बिजय साह","CPN-UML",9100,"M"),
    c(320254,"Nirmala Tharu","निर्मला थारु","JMP",2300,"F"),
  ]),
  con("Madhesh","Rautahat","रौतहट",2,4,"PENDING",0,[
    c(320261,"Mohan Yadav","मोहन यादव","NC",0,"M"),
    c(320262,"Sita Sah","सिता साह","NCP",0,"F"),
    c(320263,"Hari Jha","हरि झा","CPN-UML",0,"M"),
  ]),
  con("Madhesh","Sarlahi","सर्लाही",2,4,"PENDING",0,[
    c(320271,"Kamla Yadav","कमला यादव","NC",0,"F"),
    c(320272,"Ramji Sah","रामजी साह","NCP",0,"M"),
    c(320273,"Gopal Mahato","गोपाल महतो","CPN-UML",0,"M"),
  ]),
  con("Madhesh","Mahottari","महोत्तरी",2,4,"PENDING",0,[
    c(320281,"Nirmala Devi","निर्मला देवी","NC",0,"F"),
    c(320282,"Raj Kumar","राज कुमार","NCP",0,"M"),
    c(320283,"Sunita Tharu","सुनिता थारु","CPN-UML",0,"F"),
  ]),
  con("Madhesh","Dhanusha","धनुषा",2,5,"PENDING",0,[
    c(320291,"Hari Yadav","हरि यादव","NCP",0,"M"),
    c(320292,"Kamla Jha","कमला झा","NC",0,"F"),
    c(320293,"Rajan Mahato","राजन महतो","CPN-UML",0,"M"),
  ]),
  con("Madhesh","Siraha","सिरहा",2,4,"PENDING",0,[
    c(320301,"Priya Yadav","प्रिया यादव","NC",0,"F"),
    c(320302,"Ramesh Sah","रमेश साह","NCP",0,"M"),
    c(320303,"Sunita Jha","सुनिता झा","CPN-UML",0,"F"),
  ]),
  con("Madhesh","Saptari","सप्तरी",2,4,"PENDING",0,[
    c(320311,"Gopal Yadav","गोपाल यादव","JSP",0,"M"),
    c(320312,"Kamala Devi","कमला देवी","NC",0,"F"),
    c(320313,"Suresh Jha","सुरेश झा","CPN-UML",0,"M"),
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // BAGMATI PROVINCE — STATE_ID 3 — 35 constituencies
  // ═══════════════════════════════════════════════════════════════════════════

  con("Bagmati","Sindhuli","सिन्धुली",3,1,"COUNTING",18,[
    c(330001,"Hari Basnet","हरि बस्नेत","CPN-UML",24200,"M"),
    c(330002,"Sita Koirala","सिता कोइराला","NC",22800,"F"),
    c(330003,"Roshan Tamang","रोशन तामाङ","RSP",9100,"M"),
    c(330004,"Gita Bhusal","गिता भुसाल","CPN-ML",1800,"F"),
  ]),
  con("Bagmati","Sindhuli","सिन्धुली",3,2,"DECLARED",95,[
    c(330011,"Kamala Tamang","कमला तामाङ","NC",21800,"F"),
    c(330012,"Rajan Basnet","राजन बस्नेत","CPN-UML",19600,"M"),
    c(330013,"Priya Sherpa","प्रिया शेर्पा","RSP",8200,"F"),
    c(330014,"Hari BK","हरि बि.क.","NPD",1100,"M"),
  ]),
  con("Bagmati","Ramechhap","रामेछाप",3,1,"DECLARED",98,[
    c(330021,"Kamala Tamang","कमला तामाङ","NC",20200,"F"),
    c(330022,"Shiva Thapa","शिव थापा","CPN-UML",18100,"M"),
    c(330023,"Prabha Sherpa","प्रभा शेर्पा","NCP",7800,"F"),
    c(330024,"Bikram Majhi","बिक्रम माझी","CPN-US",900,"M"),
  ]),
  con("Bagmati","Ramechhap","रामेछाप",3,2,"COUNTING",14,[
    c(330031,"Suman Tamang","सुमन तामाङ","CPN-UML",19400,"M"),
    c(330032,"Mina Basnet","मिना बस्नेत","NC",17800,"F"),
    c(330033,"Priya Sherpa","प्रिया शेर्पा","RSP",7400,"F"),
    c(330034,"Hari Majhi","हरि माझी","LSP",900,"M"),
  ]),
  con("Bagmati","Dolakha","दोलखा",3,1,"COUNTING",12,[
    c(330041,"Nirmala Tamang","निर्मला तामाङ","CPN-UML",19800,"F"),
    c(330042,"Dipak Sunuwar","दिपक सुनुवार","NC",18900,"M"),
    c(330043,"Sabina Sherpa","सबिना शेर्पा","RSP",8100,"F"),
    c(330044,"Hari Majhi","हरि माझी","NUP",900,"M"),
  ]),
  con("Bagmati","Dolakha","दोलखा",3,2,"DECLARED",105,[
    c(330051,"Ram Sunuwar","राम सुनुवार","NC",18400,"M"),
    c(330052,"Sita Tamang","सिता तामाङ","CPN-UML",16900,"F"),
    c(330053,"Bikash Sherpa","बिकास शेर्पा","RSP",7100,"M"),
    c(330054,"Kamala Majhi","कमला माझी","RJM",800,"F"),
  ]),
  con("Bagmati","Sindhupalchok","सिन्धुपाल्चोक",3,1,"DECLARED",122,[
    c(330061,"Ramesh Tamang","रमेश तामाङ","NC",23100,"M"),
    c(330062,"Sita Lama","सिता लामा","CPN-UML",20800,"F"),
    c(330063,"Bikash Sherpa","बिकास शेर्पा","RSP",8200,"M"),
    c(330064,"Kamal BK","कमल बि.क.","NMKP",1100,"M"),
  ]),
  con("Bagmati","Sindhupalchok","सिन्धुपाल्चोक",3,2,"COUNTING",10,[
    c(330071,"Mina Lama","मिना लामा","CPN-UML",21200,"F"),
    c(330072,"Deepak Tamang","दिपक तामाङ","NC",19800,"M"),
    c(330073,"Sabina Sherpa","सबिना शेर्पा","RSP",7900,"F"),
    c(330074,"Hari BK","हरि बि.क.","JMP",900,"M"),
  ]),
  con("Bagmati","Kavrepalanchok","काभ्रेपलाञ्चोक",3,1,"DECLARED",115,[
    c(330081,"Deepak Shrestha","दिपक श्रेष्ठ","NC",28100,"M"),
    c(330082,"Mina Tamang","मिना तामाङ","CPN-UML",24900,"F"),
    c(330083,"Priya Lama","प्रिया लामा","RSP",10200,"F"),
    c(330084,"Tilak BK","तिलक बि.क.","CPN-ML",1700,"M"),
  ]),
  con("Bagmati","Kavrepalanchok","काभ्रेपलाञ्चोक",3,2,"COUNTING",8,[
    c(330091,"Suman Tamang","सुमन तामाङ","RSP",25200,"M"),
    c(330092,"Bina Shrestha","बिना श्रेष्ठ","NC",24100,"F"),
    c(330093,"Ram Thapa","राम थापा","CPN-UML",10800,"M"),
    c(330094,"Sunita Lama","सुनिता लामा","NPD",1400,"F"),
  ]),
  con("Bagmati","Kavrepalanchok","काभ्रेपलाञ्चोक",3,3,"DECLARED",88,[
    c(330101,"Hari Shrestha","हरि श्रेष्ठ","CPN-UML",22800,"M"),
    c(330102,"Kamala Tamang","कमला तामाङ","NC",20400,"F"),
    c(330103,"Rajan Lama","राजन लामा","RSP",9100,"M"),
    c(330104,"Sita BK","सिता बि.क.","CPN-US",1200,"F"),
  ]),
  con("Bagmati","Bhaktapur","भक्तपुर",3,1,"DECLARED",105,[
    c(330111,"Kiran Shrestha","किरण श्रेष्ठ","CPN-UML",29500,"M"),
    c(330112,"Anita Maharjan","अनिता महर्जन","NC",27200,"F"),
    c(330113,"Ramesh Thapa","रमेश थापा","RSP",10800,"M"),
    c(330114,"Sita Tamang","सिता तामाङ","LSP",1800,"F"),
  ]),
  con("Bagmati","Bhaktapur","भक्तपुर",3,2,"COUNTING",9,[
    c(330121,"Sunita Pradhan","सुनिता प्रधान","NC",26800,"F"),
    c(330122,"Hari Shrestha","हरि श्रेष्ठ","CPN-UML",25200,"M"),
    c(330123,"Rajan Tamang","राजन तामाङ","RSP",10100,"M"),
    c(330124,"Kamala Maharjan","कमला महर्जन","NUP",1600,"F"),
  ]),
  con("Bagmati","Lalitpur","ललितपुर",3,1,"DECLARED",90,[
    c(330131,"Bina Maharjan","बिना महर्जन","NC",33440,"F"),
    c(330132,"Keshav Adhikari","केशव अधिकारी","CPN-UML",31802,"M"),
    c(330133,"Saraswati Rai","सरस्वती राई","RSP",8200,"F"),
    c(330134,"Kiran Shahi","किरण शाही","RJM",1800,"M"),
  ]),
  con("Bagmati","Lalitpur","ललितपुर",3,2,"COUNTING",10,[
    c(330141,"Narayan Maharjan","नारायण महर्जन","RSP",26700,"M"),
    c(330142,"Parbati Shrestha","पार्वती श्रेष्ठ","NC",24900,"F"),
    c(330143,"Bijay Tamang","बिजय तामाङ","CPN-UML",11800,"M"),
    c(330144,"Sushila Lama","सुशीला लामा","NMKP",1400,"F"),
  ]),
  con("Bagmati","Lalitpur","ललितपुर",3,3,"DECLARED",108,[
    c(330151,"Sujata Maharjan","सुजाता महर्जन","NC",24100,"F"),
    c(330152,"Bikash Shrestha","बिकास श्रेष्ठ","CPN-UML",22400,"M"),
    c(330153,"Priya Tamang","प्रिया तामाङ","RSP",9600,"F"),
    c(330154,"Ram Lama","राम लामा","JMP",1300,"M"),
  ]),
  con("Bagmati","Kathmandu","काठमाडौं",3,1,"COUNTING",6,[
    c(330161,"Pradeep Giri","प्रदीप गिरी","NC",31200,"M"),
    c(330162,"Bidhya Sundar","विद्यासुन्दर","CPN-UML",29800,"M"),
    c(330163,"Ranju Darshana","रञ्जु दर्शना","RSP",14800,"F"),
    c(330164,"Katwal Dhiraj","कट्वाल धिराज","NCP",8100,"M"),
  ]),
  con("Bagmati","Kathmandu","काठमाडौं",3,2,"DECLARED",128,[
    c(330171,"Gita Pathak","गिता पाठक","RSP",31800,"F"),
    c(330172,"Mohan Basnet","मोहन बस्नेत","CPN-UML",29400,"M"),
    c(330173,"Anil Shrestha","अनिल श्रेष्ठ","NC",20100,"M"),
    c(330174,"Subash Lama","सुभाष लामा","CPN-ML",2200,"M"),
  ]),
  con("Bagmati","Kathmandu","काठमाडौं",3,3,"COUNTING",35,[
    c(330181,"Suman Shrestha","सुमन श्रेष्ठ","RSP",28754,"M"),
    c(330182,"Prakash Koirala","प्रकाश कोइराला","NC",26111,"M"),
    c(330183,"Gita Lama","गिता लामा","CPN-UML",11420,"F"),
    c(330184,"Ramesh BK","रमेश बि.क.","NPD",3200,"M"),
  ]),
  con("Bagmati","Kathmandu","काठमाडौं",3,4,"DECLARED",92,[
    c(330191,"Rajan Bhattarai","राजन भट्टराई","NC",30100,"M"),
    c(330192,"Anu Bhattarai","अनु भट्टराई","CPN-UML",27800,"F"),
    c(330193,"Sarad Adhikari","सारद अधिकारी","RSP",14200,"M"),
    c(330194,"Hom Bahadur","होम बहादुर","NCP",6100,"M"),
  ]),
  con("Bagmati","Kathmandu","काठमाडौं",3,5,"COUNTING",14,[
    c(330201,"Sujata Koirala","सुजाता कोइराला","NC",30900,"F"),
    c(330202,"Top Bahadur","टप बहादुर","CPN-UML",28700,"M"),
    c(330203,"Rekha Sharma","रेखा शर्मा","RSP",13600,"F"),
    c(330204,"Bimal BK","बिमल बि.क.","NCP",6200,"M"),
  ]),
  con("Bagmati","Kathmandu","काठमाडौं",3,6,"DECLARED",100,[
    c(330211,"Kiran Gurung","किरण गुरुङ","CPN-UML",28400,"M"),
    c(330212,"Sunita Shrestha","सुनिता श्रेष्ठ","NC",26900,"F"),
    c(330213,"Priya Lama","प्रिया लामा","RSP",12100,"F"),
    c(330214,"Hari Bhusal","हरि भुसाल","NCP",5800,"M"),
  ]),
  con("Bagmati","Kathmandu","काठमाडौं",3,7,"COUNTING",7,[
    c(330221,"Bina Shrestha","बिना श्रेष्ठ","RSP",26800,"F"),
    c(330222,"Ramesh Bhattarai","रमेश भट्टराई","NC",25200,"M"),
    c(330223,"Sita Tamang","सिता तामाङ","CPN-UML",11400,"F"),
    c(330224,"Bikash Lama","बिकास लामा","CPN-US",2800,"M"),
  ]),
  con("Bagmati","Nuwakot","नुवाकोट",3,1,"DECLARED",102,[
    c(330231,"Gokul Ghimire","गोकुल घिमिरे","NC",24200,"M"),
    c(330232,"Maya Tamang","माया तामाङ","CPN-UML",21900,"F"),
    c(330233,"Bikash Sherpa","बिकास शेर्पा","RSP",9100,"M"),
    c(330234,"Tilak Thapa","तिलक थापा","LSP",1400,"M"),
  ]),
  con("Bagmati","Nuwakot","नुवाकोट",3,2,"COUNTING",16,[
    c(330241,"Sita Tamang","सिता तामाङ","CPN-UML",22400,"F"),
    c(330242,"Hari Ghimire","हरि घिमिरे","NC",20800,"M"),
    c(330243,"Priya Sherpa","प्रिया शेर्पा","RSP",8600,"F"),
    c(330244,"Kamala BK","कमला बि.क.","NUP",1100,"F"),
  ]),
  con("Bagmati","Makwanpur","मकवानपुर",3,1,"DECLARED",118,[
    c(330251,"Hari Tamang","हरि तामाङ","CPN-UML",29200,"M"),
    c(330252,"Mina Sherpa","मिना शेर्पा","NC",27100,"F"),
    c(330253,"Suresh Lama","सुरेश लामा","RSP",10600,"M"),
    c(330254,"Nirmala BK","निर्मला बि.क.","RJM",1500,"F"),
  ]),
  con("Bagmati","Makwanpur","मकवानपुर",3,2,"COUNTING",20,[
    c(330261,"Anita Tamang","अनिता तामाङ","NC",27100,"F"),
    c(330262,"Kiran Thapa","किरण थापा","CPN-UML",25800,"M"),
    c(330263,"Deepa Lama","दीपा लामा","RSP",10200,"F"),
    c(330264,"Ram BK","राम बि.क.","NMKP",1600,"M"),
  ]),
  con("Bagmati","Chitwan","चितवन",3,1,"DECLARED",112,[
    c(330271,"Dil Bahadur Ghimire","दिल बहादुर घिमिरे","CPN-UML",36200,"M"),
    c(330272,"Rita Ghimire","रिता घिमिरे","NC",33700,"F"),
    c(330273,"Pramod Poudel","प्रमोद पौडेल","RSP",12100,"M"),
    c(330274,"Sunita Adhikari","सुनिता अधिकारी","NCP",7800,"F"),
  ]),
  con("Bagmati","Chitwan","चितवन",3,2,"COUNTING",9,[
    c(330281,"Roshan Poudel","रोशन पौडेल","NC",33200,"M"),
    c(330282,"Sabita Giri","सबिता गिरी","CPN-UML",31800,"F"),
    c(330283,"Nabin Thapa","नबिन थापा","RSP",12400,"M"),
    c(330284,"Laxmi Bhusal","लक्ष्मी भुसाल","NCP",7100,"F"),
  ]),
  con("Bagmati","Chitwan","चितवन",3,3,"DECLARED",98,[
    c(330291,"Kamala Adhikari","कमला अधिकारी","NC",31400,"F"),
    c(330292,"Bishnu Poudel","बिष्णु पौडेल","CPN-UML",29100,"M"),
    c(330293,"Rajan Thapa","राजन थापा","RSP",11800,"M"),
    c(330294,"Nirmala Bhusal","निर्मला भुसाल","NCP",6900,"F"),
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // GANDAKI PROVINCE — STATE_ID 4 — 25 constituencies
  // ═══════════════════════════════════════════════════════════════════════════

  con("Gandaki","Gorkha","गोर्खा",4,1,"DECLARED",130,[
    c(340001,"Mina Gurung","मिना गुरुङ","CPN-UML",23300,"F"),
    c(340002,"Suresh Thapa","सुरेश थापा","NC",21200,"M"),
    c(340003,"Anita Lama","अनिता लामा","NCP",8200,"F"),
    c(340004,"Karna BK","कर्ण बि.क.","JMP",1200,"M"),
  ]),
  con("Gandaki","Gorkha","गोर्खा",4,2,"COUNTING",13,[
    c(340011,"Dipak Gurung","दिपक गुरुङ","NC",21100,"M"),
    c(340012,"Sabina Thapa","सबिना थापा","CPN-UML",19800,"F"),
    c(340013,"Roshan Ghale","रोशन घले","NCP",8400,"M"),
    c(340014,"Sita Bhujel","सिता भुजेल","CPN-ML",900,"F"),
  ]),
  con("Gandaki","Lamjung","लम्जुङ",4,1,"DECLARED",108,[
    c(340021,"Hari Gurung","हरि गुरुङ","NC",20800,"M"),
    c(340022,"Kamala Ghale","कमला घले","CPN-UML",18600,"F"),
    c(340023,"Prem Thapa","प्रेम थापा","NCP",7900,"M"),
    c(340024,"Bina Bhujel","बिना भुजेल","NPD",900,"F"),
  ]),
  con("Gandaki","Lamjung","लम्जुङ",4,2,"COUNTING",11,[
    c(340031,"Sita Gurung","सिता गुरुङ","NC",19200,"F"),
    c(340032,"Hari Ghale","हरि घले","CPN-UML",17800,"M"),
    c(340033,"Kamala Thapa","कमला थापा","NCP",7100,"F"),
    c(340034,"Rajan BK","राजन बि.क.","CPN-US",800,"M"),
  ]),
  con("Gandaki","Tanahun","तनहुँ",4,1,"COUNTING",17,[
    c(340041,"Rajan Paudel","राजन पौडेल","NC",25300,"M"),
    c(340042,"Mina Adhikari","मिना अधिकारी","CPN-UML",23100,"F"),
    c(340043,"Suraj Gurung","सुराज गुरुङ","RSP",9600,"M"),
    c(340044,"Laxmi Bhatta","लक्ष्मी भट्ट","LSP",1300,"F"),
  ]),
  con("Gandaki","Tanahun","तनहुँ",4,2,"DECLARED",92,[
    c(340051,"Kamala Paudel","कमला पौडेल","NC",22800,"F"),
    c(340052,"Hari Adhikari","हरि अधिकारी","CPN-UML",20400,"M"),
    c(340053,"Rajan Gurung","राजन गुरुङ","RSP",8800,"M"),
    c(340054,"Sita BK","सिता बि.क.","NUP",1100,"F"),
  ]),
  con("Gandaki","Tanahun","तनहुँ",4,3,"PENDING",0,[
    c(340061,"Suresh Paudel","सुरेश पौडेल","NC",0,"M"),
    c(340062,"Mina Gurung","मिना गुरुङ","CPN-UML",0,"F"),
    c(340063,"Anita Adhikari","अनिता अधिकारी","RSP",0,"F"),
  ]),
  con("Gandaki","Kaski","कास्की",4,1,"DECLARED",145,[
    c(340071,"Ram Bahadur Gurung","राम बहादुर गुरुङ","CPN-UML",27200,"M"),
    c(340072,"Sita Paudel","सिता पौडेल","NC",25100,"F"),
    c(340073,"Pramod Bista","प्रमोद बिस्ता","RSP",11400,"M"),
    c(340074,"Anita Ghale","अनिता घले","NCP",6800,"F"),
  ]),
  con("Gandaki","Kaski","कास्की",4,2,"DECLARED",120,[
    c(340081,"Deepak Gurung","दिपक गुरुङ","NC",26703,"M"),
    c(340082,"Saraswati Thapa","सरस्वती थापा","NCP",25590,"F"),
    c(340083,"Niraj Shrestha","निराज श्रेष्ठ","CPN-UML",10100,"M"),
    c(340084,"Tika Rana","टिका राणा","RJM",900,"F"),
  ]),
  con("Gandaki","Syangja","स्याङ्जा",4,1,"COUNTING",11,[
    c(340091,"Priya Poudel","प्रिया पौडेल","NC",22100,"F"),
    c(340092,"Roshan Adhikari","रोशन अधिकारी","CPN-UML",21000,"M"),
    c(340093,"Laxmi Gurung","लक्ष्मी गुरुङ","NCP",8100,"F"),
    c(340094,"Sita Bhattarai","सिता भट्टराई","NMKP",900,"F"),
  ]),
  con("Gandaki","Syangja","स्याङ्जा",4,2,"DECLARED",102,[
    c(340101,"Hari Poudel","हरि पौडेल","NC",21400,"M"),
    c(340102,"Sita Adhikari","सिता अधिकारी","CPN-UML",19800,"F"),
    c(340103,"Rajan Gurung","राजन गुरुङ","NCP",7800,"M"),
    c(340104,"Kamala Bhattarai","कमला भट्टराई","JMP",900,"F"),
  ]),
  con("Gandaki","Parbat","पर्वत",4,1,"DECLARED",95,[
    c(340111,"Hari Bahadur Thapa","हरि बहादुर थापा","NC",19200,"M"),
    c(340112,"Mina Gurung","मिना गुरुङ","CPN-UML",16900,"F"),
    c(340113,"Bikash Poudel","बिकास पौडेल","RSP",7800,"M"),
    c(340114,"Kamala BK","कमला बि.क.","CPN-ML",1000,"F"),
  ]),
  con("Gandaki","Baglung","बागलुङ",4,1,"COUNTING",16,[
    c(340121,"Sita Adhikari","सिता अधिकारी","CPN-UML",21300,"F"),
    c(340122,"Nanda Kumar","नन्द कुमार","NC",20100,"M"),
    c(340123,"Priya Gurung","प्रिया गुरुङ","NCP",8400,"F"),
    c(340124,"Ramesh Magar","रमेश मगर","NPD",1200,"M"),
  ]),
  con("Gandaki","Baglung","बागलुङ",4,2,"DECLARED",88,[
    c(340131,"Ram Adhikari","राम अधिकारी","NC",20400,"M"),
    c(340132,"Sita Gurung","सिता गुरुङ","CPN-UML",18800,"F"),
    c(340133,"Priya Magar","प्रिया मगर","NCP",7900,"F"),
    c(340134,"Hari BK","हरि बि.क.","CPN-US",1000,"M"),
  ]),
  con("Gandaki","Myagdi","म्याग्दी",4,1,"DECLARED",112,[
    c(340141,"Nir Bahadur Pun","निर बहादुर पुन","NC",17600,"M"),
    c(340142,"Sita Thapa","सिता थापा","CPN-UML",15200,"F"),
    c(340143,"Bikash Magar","बिकास मगर","NCP",6400,"M"),
    c(340144,"Hari Rawal","हरि रावल","LSP",900,"M"),
  ]),
  con("Gandaki","Nawalpur","नवलपुर",4,1,"COUNTING",9,[
    c(340151,"Ramesh Poudel","रमेश पौडेल","NC",27100,"M"),
    c(340152,"Sabita Ghimire","सबिता घिमिरे","CPN-UML",25200,"F"),
    c(340153,"Priya Gurung","प्रिया गुरुङ","RSP",10400,"F"),
    c(340154,"Santosh Adhikari","सन्तोष अधिकारी","NUP",1500,"M"),
  ]),
  con("Gandaki","Nawalpur","नवलपुर",4,2,"DECLARED",100,[
    c(340161,"Kamala Poudel","कमला पौडेल","NC",25800,"F"),
    c(340162,"Hari Ghimire","हरि घिमिरे","CPN-UML",23900,"M"),
    c(340163,"Sita Gurung","सिता गुरुङ","RSP",9800,"F"),
    c(340164,"Rajan Adhikari","राजन अधिकारी","RJM",1300,"M"),
  ]),
  con("Gandaki","Mustang","मुस्ताङ",4,1,"DECLARED",138,[
    c(340171,"Karna Thakali","कर्ण थकाली","CPN-UML",8200,"M"),
    c(340172,"Sita Bista","सिता बिस्ता","NC",7100,"F"),
    c(340173,"Hari Gurung","हरि गुरुङ","NCP",2400,"M"),
    c(340174,"Nanda Thapa","नन्दा थापा","NMKP",400,"F"),
  ]),
  con("Gandaki","Manang","मनाङ",4,1,"DECLARED",142,[
    c(340181,"Bikash Gurung","बिकास गुरुङ","NC",3800,"M"),
    c(340182,"Sita Lama","सिता लामा","CPN-UML",3100,"F"),
    c(340183,"Hari Ghale","हरि घले","NCP",1200,"M"),
    c(340184,"Dawa Tamang","डावा तामाङ","JMP",300,"M"),
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // LUMBINI PROVINCE — STATE_ID 5 — 32 constituencies
  // ═══════════════════════════════════════════════════════════════════════════

  con("Lumbini","Parasi","नवलपुर",5,1,"DECLARED",128,[
    c(350001,"Devi Gyawali","देवी ज्ञवाली","CPN-UML",28100,"F"),
    c(350002,"Tika Dhakal","तिका ढकाल","NC",25900,"M"),
    c(350003,"Sabita Poudel","सबिता पौडेल","RSP",9800,"F"),
    c(350004,"Hari Tharu","हरि थारु","CPN-ML",1900,"M"),
  ]),
  con("Lumbini","Rupandehi","रुपन्देही",5,1,"DECLARED",132,[
    c(350011,"Sita Bhattarai","सिता भट्टराई","NC",37800,"F"),
    c(350012,"Roshan Thapa","रोशन थापा","CPN-UML",35200,"M"),
    c(350013,"Hari Adhikari","हरि अधिकारी","RSP",13800,"M"),
    c(350014,"Gita Sharma","गिता शर्मा","NCP",6800,"F"),
  ]),
  con("Lumbini","Rupandehi","रुपन्देही",5,2,"COUNTING",7,[
    c(350021,"Mohan Poudel","मोहन पौडेल","CPN-UML",35500,"M"),
    c(350022,"Anita Koirala","अनिता कोइराला","NC",34100,"F"),
    c(350023,"Bikash Sharma","बिकास शर्मा","RSP",13200,"M"),
    c(350024,"Sunita Adhikari","सुनिता अधिकारी","NCP",6400,"F"),
  ]),
  con("Lumbini","Rupandehi","रुपन्देही",5,3,"COUNTING",28,[
    c(350031,"Anil Bista","अनिल बिस्ता","CPN-UML",36140,"M"),
    c(350032,"Niraj Poudel","निराज पौडेल","RSP",33901,"M"),
    c(350033,"Sita Kandel","सिता कँडेल","NC",15400,"F"),
    c(350034,"Hari Chaudhary","हरि चौधरी","NPD",2100,"M"),
  ]),
  con("Lumbini","Rupandehi","रुपन्देही",5,4,"DECLARED",115,[
    c(350041,"Kamala Bhattarai","कमला भट्टराई","NC",34200,"F"),
    c(350042,"Roshan Sharma","रोशन शर्मा","CPN-UML",31800,"M"),
    c(350043,"Priya Bista","प्रिया बिस्ता","RSP",12900,"F"),
    c(350044,"Nirmala Adhikari","निर्मला अधिकारी","NCP",6200,"F"),
  ]),
  con("Lumbini","Kapilvastu","कपिलवस्तु",5,1,"DECLARED",115,[
    c(350051,"Kamal Thapa","कमल थापा","CPN-UML",32100,"M"),
    c(350052,"Sita Paudel","सिता पौडेल","NC",29800,"F"),
    c(350053,"Rajan Budha","राजन बुढा","RSP",11100,"M"),
    c(350054,"Mina Chaudhary","मिना चौधरी","CPN-US",2400,"F"),
  ]),
  con("Lumbini","Kapilvastu","कपिलवस्तु",5,2,"COUNTING",13,[
    c(350061,"Laxmi Chaudhary","लक्ष्मी चौधरी","NC",29200,"F"),
    c(350062,"Gopal Thapa","गोपाल थापा","CPN-UML",27900,"M"),
    c(350063,"Sunita Budha","सुनिता बुढा","RSP",10800,"F"),
    c(350064,"Ram Paudel","राम पौडेल","LSP",2200,"M"),
  ]),
  con("Lumbini","Kapilvastu","कपिलवस्तु",5,3,"DECLARED",108,[
    c(350071,"Hari Thapa","हरि थापा","NC",28400,"M"),
    c(350072,"Sita Chaudhary","सिता चौधरी","CPN-UML",26100,"F"),
    c(350073,"Rajan Budha Magar","राजन बुढा मगर","RSP",10200,"M"),
    c(350074,"Nirmala Paudel","निर्मला पौडेल","NUP",2100,"F"),
  ]),
  con("Lumbini","Arghakhanchi","अर्घाखाँची",5,1,"DECLARED",108,[
    c(350081,"Bishnu Paudel","बिष्णु पौडेल","CPN-UML",23100,"M"),
    c(350082,"Tika Sharma","टिका शर्मा","NC",21200,"F"),
    c(350083,"Sabina Thapa","सबिना थापा","NCP",8200,"F"),
    c(350084,"Karna Magar","कर्ण मगर","RJM",1100,"M"),
  ]),
  con("Lumbini","Arghakhanchi","अर्घाखाँची",5,2,"COUNTING",12,[
    c(350091,"Mina Paudel","मिना पौडेल","NC",21400,"F"),
    c(350092,"Ramesh Khadka","रमेश खड्का","CPN-UML",19900,"M"),
    c(350093,"Priya Sharma","प्रिया शर्मा","NCP",7800,"F"),
    c(350094,"Gopal Magar","गोपाल मगर","NMKP",1100,"M"),
  ]),
  con("Lumbini","Gulmi","गुल्मी",5,1,"COUNTING",11,[
    c(350101,"Mina Paudel","मिना पौडेल","NC",23200,"F"),
    c(350102,"Ramesh Khadka","रमेश खड्का","CPN-UML",21800,"M"),
    c(350103,"Deepa Sharma","दीपा शर्मा","NCP",8100,"F"),
    c(350104,"Gopal Adhikari","गोपाल अधिकारी","JMP",1200,"M"),
  ]),
  con("Lumbini","Gulmi","गुल्मी",5,2,"DECLARED",118,[
    c(350111,"Hari Khadka","हरि खड्का","NC",22100,"M"),
    c(350112,"Sita Paudel","सिता पौडेल","CPN-UML",20200,"F"),
    c(350113,"Rajan Sharma","राजन शर्मा","NCP",7600,"M"),
    c(350114,"Kamala Magar","कमला मगर","CPN-ML",1100,"F"),
  ]),
  con("Lumbini","Palpa","पाल्पा",5,1,"DECLARED",125,[
    c(350121,"Sita Koirala","सिता कोइराला","NC",25300,"F"),
    c(350122,"Hari Khadka","हरि खड्का","CPN-UML",23100,"M"),
    c(350123,"Priya Sharma","प्रिया शर्मा","RSP",8900,"F"),
    c(350124,"Laxmi Paudel","लक्ष्मी पौडेल","NPD",1200,"F"),
  ]),
  con("Lumbini","Palpa","पाल्पा",5,2,"COUNTING",9,[
    c(350131,"Kamala Koirala","कमला कोइराला","NC",22800,"F"),
    c(350132,"Hari Thapa","हरि थापा","CPN-UML",20900,"M"),
    c(350133,"Rajan Sharma","राजन शर्मा","RSP",8200,"M"),
    c(350134,"Mina Paudel","मिना पौडेल","CPN-US",1100,"F"),
  ]),
  con("Lumbini","Dang","दाङ",5,1,"COUNTING",15,[
    c(350141,"Ram Thapa","राम थापा","CPN-UML",29200,"M"),
    c(350142,"Sunita Chaudhary","सुनिता चौधरी","NC",27800,"F"),
    c(350143,"Rajan Budha Magar","राजन बुढा मगर","RSP",10400,"M"),
    c(350144,"Nirmala Tharu","निर्मला थारु","LSP",2200,"F"),
  ]),
  con("Lumbini","Dang","दाङ",5,2,"DECLARED",100,[
    c(350151,"Hari Bahadur Chaudhary","हरि बहादुर चौधरी","NC",28400,"M"),
    c(350152,"Mina Rana","मिना राणा","CPN-UML",26200,"F"),
    c(350153,"Bikash Thapa","बिकास थापा","RSP",10100,"M"),
    c(350154,"Anita Tharu","अनिता थारु","NUP",2100,"F"),
  ]),
  con("Lumbini","Dang","दाङ",5,3,"DECLARED",112,[
    c(350161,"Kamala Tharu","कमला थारु","NC",26800,"F"),
    c(350162,"Hari Chaudhary","हरि चौधरी","CPN-UML",24900,"M"),
    c(350163,"Sunita Budha Magar","सुनिता बुढा मगर","RSP",9800,"F"),
    c(350164,"Rajan Rana","राजन राणा","RJM",1900,"M"),
  ]),
  con("Lumbini","Banke","बाँके",5,1,"COUNTING",8,[
    c(350171,"Santosh Mishra","सन्तोष मिश्र","NC",31200,"M"),
    c(350172,"Kavita Tharu","कविता थारु","CPN-UML",29100,"F"),
    c(350173,"Suresh Budha","सुरेश बुढा","RSP",11300,"M"),
    c(350174,"Laxmi Sharma","लक्ष्मी शर्मा","NMKP",2800,"F"),
  ]),
  con("Lumbini","Banke","बाँके",5,2,"DECLARED",118,[
    c(350181,"Kamala Tharu","कमला थारु","CPN-UML",29800,"F"),
    c(350182,"Sita Chaudhary","सिता चौधरी","NC",27600,"F"),
    c(350183,"Nabin Budha Magar","नबिन बुढा मगर","RSP",10400,"M"),
    c(350184,"Priya Rana","प्रिया राणा","JMP",2200,"F"),
  ]),
  con("Lumbini","Bardiya","बर्दिया",5,1,"DECLARED",118,[
    c(350191,"Kamala Tharu","कमला थारु","CPN-UML",30200,"F"),
    c(350192,"Sita Chaudhary","सिता चौधरी","NC",28100,"F"),
    c(350193,"Nabin Budha Magar","नबिन बुढा मगर","RSP",10800,"M"),
    c(350194,"Priya Rana","प्रिया राणा","CPN-ML",2300,"F"),
  ]),
  con("Lumbini","Bardiya","बर्दिया",5,2,"COUNTING",11,[
    c(350201,"Hari Chaudhary","हरि चौधरी","NC",27800,"M"),
    c(350202,"Mina Tharu","मिना थारु","CPN-UML",26100,"F"),
    c(350203,"Sunita Budha Magar","सुनिता बुढा मगर","RSP",9900,"F"),
    c(350204,"Rajan Rana","राजन राणा","NPD",2000,"M"),
  ]),
  con("Lumbini","Rolpa","रोल्पा",5,1,"DECLARED",122,[
    c(350211,"Prem Budha Magar","प्रेम बुढा मगर","NCP",18400,"M"),
    c(350212,"Kamala Thapa","कमला थापा","NC",16200,"F"),
    c(350213,"Hari BK","हरि बि.क.","CPN-UML",5800,"M"),
    c(350214,"Sita Rawal","सिता रावल","CPN-US",900,"F"),
  ]),
  con("Lumbini","Rolpa","रोल्पा",5,2,"COUNTING",14,[
    c(350221,"Sita Budha Magar","सिता बुढा मगर","NCP",17200,"F"),
    c(350222,"Ram Thapa","राम थापा","NC",15100,"M"),
    c(350223,"Bikash BK","बिकास बि.क.","CPN-UML",5400,"M"),
    c(350224,"Nirmala Rawal","निर्मला रावल","LSP",800,"F"),
  ]),
  con("Lumbini","Rukum West","रुकुम पश्चिम",5,1,"DECLARED",128,[
    c(350231,"Deepak Budha Magar","दिपक बुढा मगर","NCP",15800,"M"),
    c(350232,"Sita Shahi","सिता शाही","NC",13900,"F"),
    c(350233,"Ram BK","राम बि.क.","CPN-UML",4800,"M"),
    c(350234,"Mina Rawal","मिना रावल","NUP",700,"F"),
  ]),
  con("Lumbini","Rukum West","रुकुम पश्चिम",5,2,"PENDING",0,[
    c(350241,"Hari Budha Magar","हरि बुढा मगर","NCP",0,"M"),
    c(350242,"Kamala Shahi","कमला शाही","NC",0,"F"),
    c(350243,"Bikash BK","बिकास बि.क.","CPN-UML",0,"M"),
  ]),
  con("Lumbini","Pyuthan","प्युठान",5,1,"DECLARED",115,[
    c(350251,"Rajan Pun","राजन पुन","NC",19200,"M"),
    c(350252,"Mina Shrestha","मिना श्रेष्ठ","CPN-UML",17400,"F"),
    c(350253,"Bikash Budha Magar","बिकास बुढा मगर","NCP",6800,"M"),
    c(350254,"Sita BK","सिता बि.क.","RJM",900,"F"),
  ]),
  con("Lumbini","Pyuthan","प्युठान",5,2,"COUNTING",10,[
    c(350261,"Kamala Pun","कमला पुन","NC",17800,"F"),
    c(350262,"Hari Shrestha","हरि श्रेष्ठ","CPN-UML",16100,"M"),
    c(350263,"Sita Budha Magar","सिता बुढा मगर","NCP",6200,"F"),
    c(350264,"Ram BK","राम बि.क.","NMKP",800,"M"),
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // KARNALI PROVINCE — STATE_ID 6 — 25 constituencies
  // ═══════════════════════════════════════════════════════════════════════════

  con("Karnali","Dolpa","डोल्पा",6,1,"DECLARED",148,[
    c(360001,"Mana Bahadur Rawal","मन बहादुर रावल","NC",10900,"M"),
    c(360002,"Nanda Kumar Budha","नन्द कुमार बुढा","CPN-UML",8800,"M"),
    c(360003,"Sita Bohara","सिता बोहरा","NCP",3200,"F"),
    c(360004,"Hari BK","हरि बि.क.","JMP",700,"M"),
  ]),
  con("Karnali","Mugu","मुगु",6,1,"COUNTING",22,[
    c(360011,"Nanda Budha","नन्दा बुढा","CPN-UML",9200,"F"),
    c(360012,"Laxmi Rawal","लक्ष्मी रावल","NC",8700,"F"),
    c(360013,"Karna Shahi","कर्ण शाही","NCP",2800,"M"),
    c(360014,"Dil BK","दिल बि.क.","CPN-ML",600,"M"),
  ]),
  con("Karnali","Humla","हुम्ला",6,1,"DECLARED",138,[
    c(360021,"Mahindra Shahi","महिन्द्र शाही","NC",8600,"M"),
    c(360022,"Prakash Bohara","प्रकाश बोहरा","CPN-UML",7200,"M"),
    c(360023,"Sita Rawal","सिता रावल","NCP",2500,"F"),
    c(360024,"Hari BK","हरि बि.क.","NPD",500,"M"),
  ]),
  con("Karnali","Jumla","जुम्ला",6,1,"COUNTING",16,[
    c(360031,"Rajan Shahi","राजन शाही","NC",13200,"M"),
    c(360032,"Mina Bohara","मिना बोहरा","CPN-UML",12100,"F"),
    c(360033,"Bikash Rawal","बिकास रावल","NCP",4400,"M"),
    c(360034,"Kamala BK","कमला बि.क.","CPN-US",800,"F"),
  ]),
  con("Karnali","Kalikot","कालिकोट",6,1,"DECLARED",125,[
    c(360041,"Deepak Rawal","दिपक रावल","CPN-UML",14900,"M"),
    c(360042,"Sita Shahi","सिता शाही","NC",13600,"F"),
    c(360043,"Nirmala Bohara","निर्मला बोहरा","NCP",4700,"F"),
    c(360044,"Hari BK","हरि बि.क.","LSP",700,"M"),
  ]),
  con("Karnali","Dailekh","दैलेख",6,1,"COUNTING",14,[
    c(360051,"Sabina Bohara","सबिना बोहरा","NC",19200,"F"),
    c(360052,"Ram Shahi","राम शाही","CPN-UML",17800,"M"),
    c(360053,"Anita Rawal","अनिता रावल","NCP",6400,"F"),
    c(360054,"Karna BK","कर्ण बि.क.","NUP",1200,"M"),
  ]),
  con("Karnali","Dailekh","दैलेख",6,2,"DECLARED",112,[
    c(360061,"Hari Shahi","हरि शाही","NC",17800,"M"),
    c(360062,"Mina Bohara","मिना बोहरा","CPN-UML",16200,"F"),
    c(360063,"Rajan Rawal","राजन रावल","NCP",5900,"M"),
    c(360064,"Sita BK","सिता बि.क.","RJM",1100,"F"),
  ]),
  con("Karnali","Jajarkot","जाजरकोट",6,1,"DECLARED",115,[
    c(360071,"Hari Bohara","हरि बोहरा","CPN-UML",17400,"M"),
    c(360072,"Mina Shahi","मिना शाही","NC",15900,"F"),
    c(360073,"Priya Rawal","प्रिया रावल","NCP",5600,"F"),
    c(360074,"Bikash BK","बिकास बि.क.","NMKP",900,"M"),
  ]),
  con("Karnali","Jajarkot","जाजरकोट",6,2,"COUNTING",10,[
    c(360081,"Sita Bohara","सिता बोहरा","CPN-UML",15800,"F"),
    c(360082,"Hari Shahi","हरि शाही","NC",14200,"M"),
    c(360083,"Kamala Rawal","कमला रावल","NCP",5100,"F"),
    c(360084,"Ram BK","राम बि.क.","JMP",800,"M"),
  ]),
  con("Karnali","Salyan","सल्यान",6,1,"COUNTING",10,[
    c(360091,"Kamala Bohara","कमला बोहरा","NC",20400,"F"),
    c(360092,"Hari Shahi","हरि शाही","CPN-UML",18900,"M"),
    c(360093,"Rajan Rawal","राजन रावल","NCP",6900,"M"),
    c(360094,"Sunita BK","सुनिता बि.क.","CPN-ML",1100,"F"),
  ]),
  con("Karnali","Salyan","सल्यान",6,2,"DECLARED",118,[
    c(360101,"Hari Bohara","हरि बोहरा","NC",19200,"M"),
    c(360102,"Mina Shahi","मिना शाही","CPN-UML",17600,"F"),
    c(360103,"Sita Rawal","सिता रावल","NCP",6400,"F"),
    c(360104,"Bikash BK","बिकास बि.क.","NPD",1000,"M"),
  ]),
  con("Karnali","Rukum East","रुकुम पूर्व",6,1,"DECLARED",132,[
    c(360111,"Deepa Shahi","दीपा शाही","NC",15900,"F"),
    c(360112,"Karna Budha","कर्ण बुढा","CPN-UML",14200,"M"),
    c(360113,"Mina Rawal","मिना रावल","NCP",5100,"F"),
    c(360114,"Hari BK","हरि बि.क.","CPN-US",900,"M"),
  ]),
  con("Karnali","Surkhet","सुर्खेत",6,1,"COUNTING",62,[
    c(360121,"Harka Bahadur BK","हर्क बहादुर बि.क.","IND",18922,"M"),
    c(360122,"Laxmi Rawal","लक्ष्मी रावल","NC",18110,"F"),
    c(360123,"Dawa Tamang","डावा तामाङ","NCP",9200,"M"),
    c(360124,"Rajan Shahi","राजन शाही","CPN-UML",5400,"M"),
  ]),
  con("Karnali","Surkhet","सुर्खेत",6,2,"DECLARED",105,[
    c(360131,"Bimala Shahi","बिमला शाही","CPN-UML",22600,"F"),
    c(360132,"Nanda Bohara","नन्दा बोहरा","NC",21200,"F"),
    c(360133,"Hari Rawal","हरि रावल","NCP",7200,"M"),
    c(360134,"Sita BK","सिता बि.क.","LSP",1400,"F"),
  ]),
  con("Karnali","Surkhet","सुर्खेत",6,3,"DECLARED",125,[
    c(360141,"Kamala Rawal","कमला रावल","NC",20800,"F"),
    c(360142,"Hari Shahi","हरि शाही","CPN-UML",19100,"M"),
    c(360143,"Rajan Bohara","राजन बोहरा","NCP",6900,"M"),
    c(360144,"Sita BK","सिता बि.क.","NUP",1200,"F"),
  ]),
  con("Karnali","Kalikot","कालिकोट",6,2,"COUNTING",14,[
    c(360151,"Mina Shahi","मिना शाही","NC",12800,"F"),
    c(360152,"Hari Rawal","हरि रावल","CPN-UML",11600,"M"),
    c(360153,"Sita Bohara","सिता बोहरा","NCP",4200,"F"),
    c(360154,"Ram BK","राम बि.क.","RJM",600,"M"),
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // SUDURPASHCHIM PROVINCE — STATE_ID 7 — 23 constituencies
  // ═══════════════════════════════════════════════════════════════════════════

  con("Sudurpashchim","Bajura","बाजुरा",7,1,"DECLARED",142,[
    c(370001,"Karna Bahadur Rawal","कर्ण बहादुर रावल","NC",12400,"M"),
    c(370002,"Sita Bohara","सिता बोहरा","CPN-UML",10100,"F"),
    c(370003,"Bikash Budha","बिकास बुढा","NCP",3600,"M"),
    c(370004,"Deepa BK","दीपा बि.क.","NMKP",700,"F"),
  ]),
  con("Sudurpashchim","Bajhang","बझाङ",7,1,"COUNTING",19,[
    c(370011,"Mina Rawal","मिना रावल","CPN-UML",14900,"F"),
    c(370012,"Hari Bohara","हरि बोहरा","NC",13600,"M"),
    c(370013,"Priya Budha","प्रिया बुढा","NCP",4400,"F"),
    c(370014,"Kamala BK","कमला बि.क.","JMP",900,"F"),
  ]),
  con("Sudurpashchim","Bajhang","बझाङ",7,2,"DECLARED",125,[
    c(370021,"Hari Rawal","हरि रावल","NC",13200,"M"),
    c(370022,"Sita Bohara","सिता बोहरा","CPN-UML",11800,"F"),
    c(370023,"Bikash Budha","बिकास बुढा","NCP",4100,"M"),
    c(370024,"Nirmala BK","निर्मला बि.क.","CPN-ML",800,"F"),
  ]),
  con("Sudurpashchim","Darchula","डार्चुला",7,1,"DECLARED",128,[
    c(370031,"Ram Bahadur Bohara","राम बहादुर बोहरा","NC",13500,"M"),
    c(370032,"Sita Dhami","सिता धामी","CPN-UML",11400,"F"),
    c(370033,"Nirmala Budha","निर्मला बुढा","NCP",3800,"F"),
    c(370034,"Karna BK","कर्ण बि.क.","NPD",700,"M"),
  ]),
  con("Sudurpashchim","Baitadi","बैतडी",7,1,"COUNTING",14,[
    c(370041,"Gokul Bista","गोकुल बिस्ता","NC",19200,"M"),
    c(370042,"Mina Bohara","मिना बोहरा","CPN-UML",17300,"F"),
    c(370043,"Sunita Rawal","सुनिता रावल","NCP",5900,"F"),
    c(370044,"Hari BK","हरि बि.क.","CPN-US",1100,"M"),
  ]),
  con("Sudurpashchim","Baitadi","बैतडी",7,2,"DECLARED",118,[
    c(370051,"Sita Bista","सिता बिस्ता","NC",17800,"F"),
    c(370052,"Hari Bohara","हरि बोहरा","CPN-UML",16200,"M"),
    c(370053,"Kamala Rawal","कमला रावल","NCP",5400,"F"),
    c(370054,"Ram BK","राम बि.क.","LSP",900,"M"),
  ]),
  con("Sudurpashchim","Dadeldhura","डडेलधुरा",7,1,"DECLARED",118,[
    c(370061,"Sita Bista","सिता बिस्ता","CPN-UML",17100,"F"),
    c(370062,"Hari Bohara","हरि बोहरा","NC",15600,"M"),
    c(370063,"Priya Rawal","प्रिया रावल","NCP",5100,"F"),
    c(370064,"Kamala BK","कमला बि.क.","NUP",900,"F"),
  ]),
  con("Sudurpashchim","Doti","डोटी",7,1,"COUNTING",9,[
    c(370071,"Nirmala Bohara","निर्मला बोहरा","NC",20400,"F"),
    c(370072,"Ram Bista","राम बिस्ता","CPN-UML",18900,"M"),
    c(370073,"Mina Rawal","मिना रावल","NCP",6200,"F"),
    c(370074,"Sunita BK","सुनिता बि.क.","RJM",1200,"F"),
  ]),
  con("Sudurpashchim","Doti","डोटी",7,2,"DECLARED",122,[
    c(370081,"Hari Bohara","हरि बोहरा","NC",18800,"M"),
    c(370082,"Mina Bista","मिना बिस्ता","CPN-UML",17200,"F"),
    c(370083,"Sita Rawal","सिता रावल","NCP",5800,"F"),
    c(370084,"Ram BK","राम बि.क.","NMKP",1000,"M"),
  ]),
  con("Sudurpashchim","Achham","अछाम",7,1,"DECLARED",135,[
    c(370091,"Kamal Shahi","कमल शाही","CPN-UML",19100,"M"),
    c(370092,"Sita Bohara","सिता बोहरा","NC",17200,"F"),
    c(370093,"Deepak Rawal","दिपक रावल","NCP",5800,"M"),
    c(370094,"Hari BK","हरि बि.क.","JMP",1100,"M"),
  ]),
  con("Sudurpashchim","Achham","अछाम",7,2,"COUNTING",12,[
    c(370101,"Mina Shahi","मिना शाही","NC",17800,"F"),
    c(370102,"Hari Bohara","हरि बोहरा","CPN-UML",16100,"M"),
    c(370103,"Sita Rawal","सिता रावल","NCP",5400,"F"),
    c(370104,"Bikash BK","बिकास बि.क.","CPN-ML",900,"M"),
  ]),
  con("Sudurpashchim","Kailali","कैलाली",7,1,"COUNTING",11,[
    c(370111,"Hari Chaudhary","हरि चौधरी","NC",31800,"M"),
    c(370112,"Mina Tharu","मिना थारु","CPN-UML",29400,"F"),
    c(370113,"Bikash Bista","बिकास बिस्ता","RSP",11200,"M"),
    c(370114,"Gita Rana","गिता राणा","NPD",2700,"F"),
  ]),
  con("Sudurpashchim","Kailali","कैलाली",7,2,"DECLARED",108,[
    c(370121,"Ram Bahadur Thapa","राम बहादुर थापा","CPN-UML",30800,"M"),
    c(370122,"Kamala Chaudhary","कमला चौधरी","NC",28700,"F"),
    c(370123,"Sunita Bista","सुनिता बिस्ता","RSP",10900,"F"),
    c(370124,"Nirmala Tharu","निर्मला थारु","CPN-US",2400,"F"),
  ]),
  con("Sudurpashchim","Kailali","कैलाली",7,3,"COUNTING",7,[
    c(370131,"Anita Tharu","अनिता थारु","NC",28900,"F"),
    c(370132,"Kamal Bista","कमल बिस्ता","CPN-UML",27200,"M"),
    c(370133,"Priya Chaudhary","प्रिया चौधरी","RSP",10800,"F"),
    c(370134,"Bikash Rawal","बिकास रावल","LSP",2300,"M"),
  ]),
  con("Sudurpashchim","Kailali","कैलाली",7,4,"DECLARED",140,[
    c(370141,"Manju Chaudhary","मञ्जु चौधरी","NCP",24410,"F"),
    c(370142,"Tek Bahadur Thapa","टेक बहादुर थापा","NC",23007,"M"),
    c(370143,"Bishnu Bohara","बिष्णु बोहरा","CPN-UML",9800,"M"),
    c(370144,"Gopal BK","गोपाल बि.क.","NUP",1200,"M"),
  ]),
  con("Sudurpashchim","Kanchanpur","कञ्चनपुर",7,1,"COUNTING",13,[
    c(370151,"Sita Bista","सिता बिस्ता","NC",30400,"F"),
    c(370152,"Hari Tharu","हरि थारु","CPN-UML",28200,"M"),
    c(370153,"Priya Rawal","प्रिया रावल","RSP",11100,"F"),
    c(370154,"Mina Chaudhary","मिना चौधरी","RJM",2600,"F"),
  ]),
  con("Sudurpashchim","Kanchanpur","कञ्चनपुर",7,2,"DECLARED",122,[
    c(370161,"Ram Bahadur Bista","राम बहादुर बिस्ता","CPN-UML",29800,"M"),
    c(370162,"Kamala Tharu","कमला थारु","NC",27900,"F"),
    c(370163,"Sunita Rawal","सुनिता रावल","RSP",10800,"F"),
    c(370164,"Nirmala Chaudhary","निर्मला चौधरी","NMKP",2400,"F"),
  ]),
];
