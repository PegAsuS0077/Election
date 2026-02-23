export type PartyKey = "NC" | "CPN-UML" | "NCP" | "RSP" | "RPP" | "JSP" | "IND" | "OTH";

export const parties: Record<PartyKey, { name: string; color: string; symbol: string }> = {
  NC:        { name: "Nepali Congress (NC)",                   color: "bg-red-600",     symbol: "🌳" },
  "CPN-UML": { name: "CPN-UML",                                color: "bg-blue-600",    symbol: "☀️" },
  NCP:       { name: "Nepali Communist Party (NCP)",           color: "bg-orange-600",  symbol: "🌙" },
  RSP:       { name: "Rastriya Swatantra Party (RSP)",         color: "bg-emerald-600", symbol: "⚡" },
  RPP:       { name: "Rastriya Prajatantra Party (RPP)",       color: "bg-yellow-600",  symbol: "👑" },
  JSP:       { name: "Janata Samajwadi Party (JSP)",           color: "bg-cyan-600",    symbol: "⚙️" },
  IND:       { name: "Independent",                            color: "bg-violet-500",  symbol: "🧑" },
  OTH:       { name: "Others",                                 color: "bg-slate-500",   symbol: "🏳️" },
};

// Mock "change vs previous election" (positive = gain, negative = loss)
export const seatChange: Record<PartyKey, number> = {
  NC: +3,
  "CPN-UML": -2,
  NCP: +1,
  RSP: +6,
  RPP: 0,
  JSP: 0,
  IND: 0,
  OTH: -1,
};

// Static snapshot only used for totalSeats; seatTally & declaredSeats are derived in store
export const mockSnapshot = {
  totalSeats: 275,
  lastUpdated: new Date().toISOString(),
};

export type Province =
  | "Koshi"
  | "Madhesh"
  | "Bagmati"
  | "Gandaki"
  | "Lumbini"
  | "Karnali"
  | "Sudurpashchim";

export type Candidate = {
  name: string;
  party: PartyKey;
  votes: number;
};

export type ConstituencyResult = {
  province: Province;
  district: string;
  code: string;
  name: string;
  status: "DECLARED" | "COUNTING";
  lastUpdated: string;
  candidates: Candidate[];
  totalVoters: number;
  votesCast: number;
};

export const provinces: Province[] = [
  "Koshi",
  "Madhesh",
  "Bagmati",
  "Gandaki",
  "Lumbini",
  "Karnali",
  "Sudurpashchim",
];

// Helper to generate a timestamp in the past
function ago(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

// Helper to build candidates with a clear leader and competitive race
function race(
  leader: [string, PartyKey, number],
  others: [string, PartyKey, number][]
): Candidate[] {
  return [
    { name: leader[0], party: leader[1], votes: leader[2] },
    ...others.map(([name, party, votes]) => ({ name, party, votes })),
  ];
}

export const constituencyResults: ConstituencyResult[] = [
  // ── KOSHI PROVINCE (28 seats) ───────────────────────────────────────────
  {
    province: "Koshi", district: "Taplejung", code: "TAP-1", name: "Taplejung–1",
    status: "DECLARED", lastUpdated: ago(140),
    totalVoters: 42000, votesCast: 31000,
    candidates: race(["Pasang Sherpa", "NCP", 16200], [["Hari Limbu", "NC", 13800], ["Ram Rai", "CPN-UML", 4500], ["Dawa Lama", "OTH", 800]]),
  },
  {
    province: "Koshi", district: "Sankhuwasabha", code: "SKS-1", name: "Sankhuwasabha–1",
    status: "COUNTING", lastUpdated: ago(8),
    totalVoters: 48000, votesCast: 36000,
    candidates: race(["Bhim Tamang", "CPN-UML", 18700], [["Nirmala Rai", "NC", 17900], ["Kiran Limbu", "NCP", 5200], ["Manoj Majhi", "OTH", 1100]]),
  },
  {
    province: "Koshi", district: "Bhojpur", code: "BHJ-1", name: "Bhojpur–1",
    status: "DECLARED", lastUpdated: ago(95),
    totalVoters: 52000, votesCast: 41000,
    candidates: race(["Sita Rai", "NC", 21300], [["Gopal Limbu", "CPN-UML", 18200], ["Saroj Karki", "NCP", 6400], ["Tilak BK", "OTH", 900]]),
  },
  {
    province: "Koshi", district: "Dhankuta", code: "DHK-1", name: "Dhankuta–1",
    status: "COUNTING", lastUpdated: ago(12),
    totalVoters: 55000, votesCast: 42000,
    candidates: race(["Deepak Limbu", "CPN-UML", 22100], [["Maya Rai", "NC", 20400], ["Suresh Sherpa", "RSP", 8200], ["Lokendra Tamang", "OTH", 1500]]),
  },
  {
    province: "Koshi", district: "Terhathum", code: "TER-1", name: "Terhathum–1",
    status: "DECLARED", lastUpdated: ago(110),
    totalVoters: 38000, votesCast: 28000,
    candidates: race(["Kamala Rai", "NC", 14900], [["Bishnu Limbu", "CPN-UML", 11200], ["Tika Sherpa", "NCP", 3800], ["Anita BK", "OTH", 600]]),
  },
  {
    province: "Koshi", district: "Panchthar", code: "PCT-1", name: "Panchthar–1",
    status: "COUNTING", lastUpdated: ago(20),
    totalVoters: 51000, votesCast: 39000,
    candidates: race(["Rajan Limbu", "NCP", 19800], [["Sabina Rai", "NC", 18900], ["Hem Tamang", "CPN-UML", 7100], ["Bimal Sherpa", "OTH", 1200]]),
  },
  {
    province: "Koshi", district: "Ilam", code: "ILM-1", name: "Ilam–1",
    status: "DECLARED", lastUpdated: ago(80),
    totalVoters: 62000, votesCast: 48000,
    candidates: race(["Mina Subba", "NC", 24500], [["Karna Limbu", "CPN-UML", 21800], ["Prabha Rai", "RSP", 9300], ["Gokul Ghimire", "OTH", 1800]]),
  },
  {
    province: "Koshi", district: "Ilam", code: "ILM-2", name: "Ilam–2",
    status: "COUNTING", lastUpdated: ago(5),
    totalVoters: 59000, votesCast: 44000,
    candidates: race(["Roshan Limbu", "CPN-UML", 21900], [["Anita Subba", "NC", 20700], ["Dipak Rai", "NCP", 8600], ["Sanu Tamang", "OTH", 1400]]),
  },
  {
    province: "Koshi", district: "Jhapa", code: "JHP-1", name: "Jhapa–1",
    status: "DECLARED", lastUpdated: ago(130),
    totalVoters: 74000, votesCast: 61000,
    candidates: race(["Sunita Koirala", "NC", 31200], [["Harka Giri", "CPN-UML", 28100], ["Priya Adhikari", "RSP", 10500], ["Mohan Karki", "OTH", 2100]]),
  },
  {
    province: "Koshi", district: "Jhapa", code: "JHP-2", name: "Jhapa–2",
    status: "DECLARED", lastUpdated: ago(100),
    totalVoters: 78000, votesCast: 64000,
    candidates: race(["Ram Karki", "CPN-UML", 33400], [["Parbati Sharma", "NC", 30100], ["Suresh Bista", "NCP", 9800], ["Devi Thapaliya", "OTH", 1900]]),
  },
  {
    province: "Koshi", district: "Morang", code: "MRG-1", name: "Morang–1",
    status: "COUNTING", lastUpdated: ago(15),
    totalVoters: 77000, votesCast: 60000,
    candidates: race(["Dipak Sharma", "NC", 29800], [["Sita Thapa", "CPN-UML", 29200], ["Ramesh Basnet", "RSP", 9800], ["Gita Karki", "OTH", 1600]]),
  },
  {
    province: "Koshi", district: "Morang", code: "MRG-2", name: "Morang–2",
    status: "DECLARED", lastUpdated: ago(88),
    totalVoters: 81000, votesCast: 66000,
    candidates: race(["Kiran Adhikari", "CPN-UML", 34200], [["Sunita Rai", "NC", 31700], ["Nabin Sherpa", "NCP", 8500], ["Priya Tamang", "OTH", 2200]]),
  },
  {
    province: "Koshi", district: "Morang", code: "MRG-3", name: "Morang–3",
    status: "COUNTING", lastUpdated: ago(10),
    totalVoters: 79000, votesCast: 62000,
    candidates: race(["Mina Sharma", "NC", 30400], [["Bikash Giri", "CPN-UML", 28900], ["Anita Rai", "RSP", 11200], ["Ram BK", "OTH", 1800]]),
  },
  {
    province: "Koshi", district: "Morang", code: "MRG-4", name: "Morang–4",
    status: "DECLARED", lastUpdated: ago(75),
    totalVoters: 76000, votesCast: 62000,
    candidates: race(["Ramesh Khadka", "CPN-UML", 41210], [["Rita Dahal", "NC", 39955], ["Anita Karki", "NCP", 9200], ["Dinesh Yadav", "OTH", 1600]]),
  },
  {
    province: "Koshi", district: "Sunsari", code: "SNS-1", name: "Sunsari–1",
    status: "DECLARED", lastUpdated: ago(115),
    totalVoters: 82000, votesCast: 68000,
    candidates: race(["Pramod Koirala", "NC", 35200], [["Sabita Thapa", "CPN-UML", 32100], ["Roshan Bista", "RSP", 12400], ["Laxmi Bohara", "OTH", 2100]]),
  },
  {
    province: "Koshi", district: "Sunsari", code: "SNS-2", name: "Sunsari–2",
    status: "COUNTING", lastUpdated: ago(18),
    totalVoters: 79000, votesCast: 61000,
    candidates: race(["Gita Rai", "CPN-UML", 30200], [["Hari Basnet", "NC", 28900], ["Puja Sharma", "NCP", 9600], ["Bikash Tamang", "OTH", 1800]]),
  },
  {
    province: "Koshi", district: "Udayapur", code: "UDY-1", name: "Udayapur–1",
    status: "DECLARED", lastUpdated: ago(92),
    totalVoters: 58000, votesCast: 45000,
    candidates: race(["Nanda Rai", "NCP", 22800], [["Meena Thapa", "NC", 20100], ["Bhola Limbu", "CPN-UML", 8300], ["Gopal BK", "OTH", 1400]]),
  },
  {
    province: "Koshi", district: "Udayapur", code: "UDY-2", name: "Udayapur–2",
    status: "COUNTING", lastUpdated: ago(22),
    totalVoters: 55000, votesCast: 42000,
    candidates: race(["Dhan Bahadur Rai", "NC", 20500], [["Sita Sherpa", "CPN-UML", 19100], ["Nirmal Tamang", "RSP", 7900], ["Bimala BK", "OTH", 1200]]),
  },

  // ── MADHESH PROVINCE (32 seats) ────────────────────────────────────────
  {
    province: "Madhesh", district: "Saptari", code: "SPT-1", name: "Saptari–1",
    status: "DECLARED", lastUpdated: ago(135),
    totalVoters: 85000, votesCast: 68000,
    candidates: race(["Ramesh Yadav", "NCP", 34700], [["Sita Devi", "NC", 30200], ["Ali Khan", "CPN-UML", 7800], ["Raj Kishor", "OTH", 3200]]),
  },
  {
    province: "Madhesh", district: "Saptari", code: "SPT-2", name: "Saptari–2",
    status: "COUNTING", lastUpdated: ago(14),
    totalVoters: 88000, votesCast: 70000,
    candidates: race(["Md. Iqbal Ansari", "NCP", 35100], [["Laxmi Devi Sah", "NC", 33800], ["Tulsi Mehta", "CPN-UML", 8200], ["Shankar Yadav", "OTH", 2900]]),
  },
  {
    province: "Madhesh", district: "Siraha", code: "SRH-1", name: "Siraha–1",
    status: "DECLARED", lastUpdated: ago(108),
    totalVoters: 90000, votesCast: 72000,
    candidates: race(["Priya Yadav", "NC", 36400], [["Rohit Kumar Sah", "NCP", 34100], ["Radha Mehta", "CPN-UML", 8700], ["Janaki Devi", "OTH", 2900]]),
  },
  {
    province: "Madhesh", district: "Siraha", code: "SRH-2", name: "Siraha–2",
    status: "COUNTING", lastUpdated: ago(7),
    totalVoters: 87000, votesCast: 68000,
    candidates: race(["Suresh Yadav", "NCP", 33800], [["Kamala Sah", "NC", 32200], ["Ganesh Kumar", "CPN-UML", 9200], ["Mohan Lal", "OTH", 2600]]),
  },
  {
    province: "Madhesh", district: "Dhanusha", code: "DHS-1", name: "Dhanusha–1",
    status: "DECLARED", lastUpdated: ago(122),
    totalVoters: 91000, votesCast: 74000,
    candidates: race(["Vidya Devi Jha", "NC", 38100], [["Birendra Yadav", "NCP", 35600], ["Ram Narayan", "CPN-UML", 9200], ["Sushila Mehta", "OTH", 2900]]),
  },
  {
    province: "Madhesh", district: "Dhanusha", code: "DHS-2", name: "Dhanusha–2",
    status: "COUNTING", lastUpdated: ago(55),
    totalVoters: 82000, votesCast: 61000,
    candidates: race(["Md. Aftab Ansari", "NCP", 29888], [["Bhola Yadav", "CPN-UML", 28741], ["Nirmala Devi", "NC", 13200], ["Raj Kishor", "OTH", 2400]]),
  },
  {
    province: "Madhesh", district: "Mahottari", code: "MHT-1", name: "Mahottari–1",
    status: "DECLARED", lastUpdated: ago(98),
    totalVoters: 88000, votesCast: 70000,
    candidates: race(["Geeta Yadav", "NC", 36200], [["Ramji Sah", "NCP", 33100], ["Sunita Jha", "CPN-UML", 8900], ["Mohan Mahato", "OTH", 2900]]),
  },
  {
    province: "Madhesh", district: "Mahottari", code: "MHT-2", name: "Mahottari–2",
    status: "COUNTING", lastUpdated: ago(11),
    totalVoters: 85000, votesCast: 68000,
    candidates: race(["Krishna Devi", "NCP", 33800], [["Shambhu Prasad", "NC", 32100], ["Asha Tharu", "CPN-UML", 9900], ["Prakash Mehta", "OTH", 2600]]),
  },
  {
    province: "Madhesh", district: "Sarlahi", code: "SRL-1", name: "Sarlahi–1",
    status: "DECLARED", lastUpdated: ago(118),
    totalVoters: 92000, votesCast: 74000,
    candidates: race(["Neeraj Yadav", "NC", 38200], [["Pooja Sah", "NCP", 35700], ["Hari Mahato", "CPN-UML", 8800], ["Laxmi Kumari", "OTH", 2100]]),
  },
  {
    province: "Madhesh", district: "Sarlahi", code: "SRL-2", name: "Sarlahi–2",
    status: "COUNTING", lastUpdated: ago(16),
    totalVoters: 89000, votesCast: 70000,
    candidates: race(["Suresh Mahato", "NCP", 34900], [["Ranjana Devi", "NC", 33200], ["Bijay Kumar", "CPN-UML", 9800], ["Saraswati Jha", "OTH", 2700]]),
  },
  {
    province: "Madhesh", district: "Rautahat", code: "RTH-1", name: "Rautahat–1",
    status: "DECLARED", lastUpdated: ago(105),
    totalVoters: 86000, votesCast: 69000,
    candidates: race(["Kamla Mahato", "NC", 35500], [["Bijaya Yadav", "NCP", 32800], ["Mohan Sah", "CPN-UML", 9200], ["Saroj Tharu", "OTH", 2800]]),
  },
  {
    province: "Madhesh", district: "Bara", code: "BAR-1", name: "Bara–1",
    status: "COUNTING", lastUpdated: ago(9),
    totalVoters: 90000, votesCast: 71000,
    candidates: race(["Sunita Mahato", "NCP", 35100], [["Ramesh Jha", "NC", 34200], ["Anita Sah", "CPN-UML", 10200], ["Gopal Yadav", "OTH", 2800]]),
  },
  {
    province: "Madhesh", district: "Bara", code: "BAR-2", name: "Bara–2",
    status: "DECLARED", lastUpdated: ago(128),
    totalVoters: 88000, votesCast: 70000,
    candidates: race(["Rajan Yadav", "NC", 36100], [["Meena Sah", "NCP", 33500], ["Priya Mahato", "CPN-UML", 9200], ["Dilip Kumar", "OTH", 2800]]),
  },
  {
    province: "Madhesh", district: "Parsa", code: "PRS-1", name: "Parsa–1",
    status: "COUNTING", lastUpdated: ago(6),
    totalVoters: 87000, votesCast: 69000,
    candidates: race(["Santosh Yadav", "NCP", 34200], [["Lila Sah", "NC", 33100], ["Mohan Mahato", "CPN-UML", 9600], ["Sita Tharu", "OTH", 2800]]),
  },
  {
    province: "Madhesh", district: "Parsa", code: "PRS-2", name: "Parsa–2",
    status: "DECLARED", lastUpdated: ago(102),
    totalVoters: 85000, votesCast: 68000,
    candidates: race(["Anjali Kumari", "NC", 34500], [["Ganesh Yadav", "NCP", 32900], ["Bimala Jha", "CPN-UML", 8800], ["Saroj Mahato", "OTH", 2500]]),
  },

  // ── BAGMATI PROVINCE (35 seats) ────────────────────────────────────────
  {
    province: "Bagmati", district: "Sindhupalchok", code: "SPC-1", name: "Sindhupalchok–1",
    status: "DECLARED", lastUpdated: ago(122),
    totalVoters: 58000, votesCast: 45000,
    candidates: race(["Ramesh Tamang", "NC", 23100], [["Sita Lama", "CPN-UML", 20800], ["Bikash Sherpa", "RSP", 8200], ["Kamal BK", "OTH", 1100]]),
  },
  {
    province: "Bagmati", district: "Dolakha", code: "DLK-1", name: "Dolakha–1",
    status: "COUNTING", lastUpdated: ago(12),
    totalVoters: 52000, votesCast: 40000,
    candidates: race(["Nirmala Tamang", "CPN-UML", 19800], [["Dipak Sunuwar", "NC", 18900], ["Sabina Sherpa", "RSP", 8100], ["Hari Majhi", "OTH", 900]]),
  },
  {
    province: "Bagmati", district: "Ramechhap", code: "RMC-1", name: "Ramechhap–1",
    status: "DECLARED", lastUpdated: ago(98),
    totalVoters: 50000, votesCast: 39000,
    candidates: race(["Kamala Tamang", "NC", 20200], [["Shiva Thapa", "CPN-UML", 18100], ["Prabha Sherpa", "NCP", 7800], ["Bikram Majhi", "OTH", 900]]),
  },
  {
    province: "Bagmati", district: "Sindhuli", code: "SNL-1", name: "Sindhuli–1",
    status: "COUNTING", lastUpdated: ago(18),
    totalVoters: 62000, votesCast: 48000,
    candidates: race(["Hari Basnet", "CPN-UML", 24200], [["Sita Koirala", "NC", 22800], ["Roshan Tamang", "RSP", 9100], ["Gita Bhusal", "OTH", 1800]]),
  },
  {
    province: "Bagmati", district: "Kavre", code: "KVR-1", name: "Kavrepalanchok–1",
    status: "DECLARED", lastUpdated: ago(115),
    totalVoters: 68000, votesCast: 54000,
    candidates: race(["Deepak Shrestha", "NC", 28100], [["Mina Tamang", "CPN-UML", 24900], ["Priya Lama", "RSP", 10200], ["Tilak BK", "OTH", 1700]]),
  },
  {
    province: "Bagmati", district: "Kavre", code: "KVR-2", name: "Kavrepalanchok–2",
    status: "COUNTING", lastUpdated: ago(8),
    totalVoters: 65000, votesCast: 51000,
    candidates: race(["Suman Tamang", "RSP", 25200], [["Bina Shrestha", "NC", 24100], ["Ram Thapa", "CPN-UML", 10800], ["Sunita Lama", "OTH", 1400]]),
  },
  {
    province: "Bagmati", district: "Bhaktapur", code: "BKT-1", name: "Bhaktapur–1",
    status: "DECLARED", lastUpdated: ago(105),
    totalVoters: 70000, votesCast: 57000,
    candidates: race(["Kiran Shrestha", "CPN-UML", 29500], [["Anita Maharjan", "NC", 27200], ["Ramesh Thapa", "RSP", 10800], ["Sita Tamang", "OTH", 1800]]),
  },
  {
    province: "Bagmati", district: "Kathmandu", code: "KTM-1", name: "Kathmandu–1",
    status: "COUNTING", lastUpdated: ago(6),
    totalVoters: 80000, votesCast: 62000,
    candidates: race(["Pradeep Giri", "NC", 31200], [["Bidhya Sundar", "CPN-UML", 29800], ["Ranju Darshana", "RSP", 14800], ["Katwal Dhiraj", "NCP", 8100]]),
  },
  {
    province: "Bagmati", district: "Kathmandu", code: "KTM-2", name: "Kathmandu–2",
    status: "DECLARED", lastUpdated: ago(128),
    totalVoters: 82000, votesCast: 65000,
    candidates: race(["Gita Pathak", "RSP", 31800], [["Mohan Basnet", "CPN-UML", 29400], ["Anil Shrestha", "NC", 20100], ["Subash Lama", "OTH", 2200]]),
  },
  {
    province: "Bagmati", district: "Kathmandu", code: "KTM-3", name: "Kathmandu–3",
    status: "COUNTING", lastUpdated: ago(35),
    totalVoters: 72000, votesCast: 55000,
    candidates: race(["Suman Shrestha", "RSP", 28754], [["Prakash Koirala", "NC", 26111], ["Gita Lama", "CPN-UML", 11420], ["Ramesh BK", "OTH", 3200]]),
  },
  {
    province: "Bagmati", district: "Kathmandu", code: "KTM-4", name: "Kathmandu–4",
    status: "DECLARED", lastUpdated: ago(92),
    totalVoters: 76000, votesCast: 60000,
    candidates: race(["Rajan Bhattarai", "NC", 30100], [["Anu Bhattarai", "CPN-UML", 27800], ["Sarad Adhikari", "RSP", 14200], ["Hom Bahadur", "NCP", 6100]]),
  },
  {
    province: "Bagmati", district: "Kathmandu", code: "KTM-5", name: "Kathmandu–5",
    status: "COUNTING", lastUpdated: ago(14),
    totalVoters: 78000, votesCast: 61000,
    candidates: race(["Sujata Koirala", "NC", 30900], [["Top Bahadur", "CPN-UML", 28700], ["Rekha Sharma", "RSP", 13600], ["Bimal BK", "NCP", 6200]]),
  },
  {
    province: "Bagmati", district: "Lalitpur", code: "LTP-1", name: "Lalitpur–1",
    status: "DECLARED", lastUpdated: ago(90),
    totalVoters: 68000, votesCast: 59000,
    candidates: race(["Bina Maharjan", "NC", 33440], [["Keshav Adhikari", "CPN-UML", 31802], ["Saraswati Rai", "RSP", 8200], ["Kiran Shahi", "OTH", 1800]]),
  },
  {
    province: "Bagmati", district: "Lalitpur", code: "LTP-2", name: "Lalitpur–2",
    status: "COUNTING", lastUpdated: ago(10),
    totalVoters: 66000, votesCast: 53000,
    candidates: race(["Narayan Maharjan", "RSP", 26700], [["Parbati Shrestha", "NC", 24900], ["Bijay Tamang", "CPN-UML", 11800], ["Sushila Lama", "OTH", 1400]]),
  },
  {
    province: "Bagmati", district: "Makwanpur", code: "MKP-1", name: "Makwanpur–1",
    status: "DECLARED", lastUpdated: ago(118),
    totalVoters: 72000, votesCast: 57000,
    candidates: race(["Hari Tamang", "CPN-UML", 29200], [["Mina Sherpa", "NC", 27100], ["Suresh Lama", "RSP", 10600], ["Nirmala BK", "OTH", 1500]]),
  },
  {
    province: "Bagmati", district: "Makwanpur", code: "MKP-2", name: "Makwanpur–2",
    status: "COUNTING", lastUpdated: ago(20),
    totalVoters: 69000, votesCast: 54000,
    candidates: race(["Anita Tamang", "NC", 27100], [["Kiran Thapa", "CPN-UML", 25800], ["Deepa Lama", "RSP", 10200], ["Ram BK", "OTH", 1600]]),
  },
  {
    province: "Bagmati", district: "Chitwan", code: "CHT-1", name: "Chitwan–1",
    status: "DECLARED", lastUpdated: ago(112),
    totalVoters: 85000, votesCast: 70000,
    candidates: race(["Dil Bahadur Ghimire", "CPN-UML", 36200], [["Rita Ghimire", "NC", 33700], ["Pramod Poudel", "RSP", 12100], ["Sunita Adhikari", "NCP", 7800]]),
  },
  {
    province: "Bagmati", district: "Chitwan", code: "CHT-2", name: "Chitwan–2",
    status: "COUNTING", lastUpdated: ago(9),
    totalVoters: 82000, votesCast: 66000,
    candidates: race(["Roshan Poudel", "NC", 33200], [["Sabita Giri", "CPN-UML", 31800], ["Nabin Thapa", "RSP", 12400], ["Laxmi Bhusal", "NCP", 7100]]),
  },
  {
    province: "Bagmati", district: "Nuwakot", code: "NWK-1", name: "Nuwakot–1",
    status: "DECLARED", lastUpdated: ago(102),
    totalVoters: 60000, votesCast: 47000,
    candidates: race(["Gokul Ghimire", "NC", 24200], [["Maya Tamang", "CPN-UML", 21900], ["Bikash Sherpa", "RSP", 9100], ["Tilak Thapa", "OTH", 1400]]),
  },

  // ── GANDAKI PROVINCE (25 seats) ────────────────────────────────────────
  {
    province: "Gandaki", district: "Gorkha", code: "GRK-1", name: "Gorkha–1",
    status: "DECLARED", lastUpdated: ago(130),
    totalVoters: 58000, votesCast: 45000,
    candidates: race(["Mina Gurung", "CPN-UML", 23300], [["Suresh Thapa", "NC", 21200], ["Anita Lama", "NCP", 8200], ["Karna BK", "OTH", 1200]]),
  },
  {
    province: "Gandaki", district: "Gorkha", code: "GRK-2", name: "Gorkha–2",
    status: "COUNTING", lastUpdated: ago(13),
    totalVoters: 55000, votesCast: 42000,
    candidates: race(["Dipak Gurung", "NC", 21100], [["Sabina Thapa", "CPN-UML", 19800], ["Roshan Ghale", "NCP", 8400], ["Sita Bhujel", "OTH", 900]]),
  },
  {
    province: "Gandaki", district: "Lamjung", code: "LMJ-1", name: "Lamjung–1",
    status: "DECLARED", lastUpdated: ago(108),
    totalVoters: 52000, votesCast: 40000,
    candidates: race(["Hari Gurung", "NC", 20800], [["Kamala Ghale", "CPN-UML", 18600], ["Prem Thapa", "NCP", 7900], ["Bina Bhujel", "OTH", 900]]),
  },
  {
    province: "Gandaki", district: "Tanahu", code: "TNH-1", name: "Tanahu–1",
    status: "COUNTING", lastUpdated: ago(17),
    totalVoters: 62000, votesCast: 49000,
    candidates: race(["Rajan Paudel", "NC", 25300], [["Mina Adhikari", "CPN-UML", 23100], ["Suraj Gurung", "RSP", 9600], ["Laxmi Bhatta", "OTH", 1300]]),
  },
  {
    province: "Gandaki", district: "Kaski", code: "KSK-1", name: "Kaski–1",
    status: "DECLARED", lastUpdated: ago(145),
    totalVoters: 64000, votesCast: 52000,
    candidates: race(["Ram Bahadur Gurung", "CPN-UML", 27200], [["Sita Paudel", "NC", 25100], ["Pramod Bista", "RSP", 11400], ["Anita Ghale", "NCP", 6800]]),
  },
  {
    province: "Gandaki", district: "Kaski", code: "KSK-2", name: "Kaski–2",
    status: "DECLARED", lastUpdated: ago(120),
    totalVoters: 60000, votesCast: 48000,
    candidates: race(["Deepak Gurung", "NC", 26703], [["Saraswati Thapa", "NCP", 25590], ["Niraj Shrestha", "CPN-UML", 10100], ["Tika Rana", "OTH", 900]]),
  },
  {
    province: "Gandaki", district: "Syangja", code: "SYG-1", name: "Syangja–1",
    status: "COUNTING", lastUpdated: ago(11),
    totalVoters: 56000, votesCast: 43000,
    candidates: race(["Priya Poudel", "NC", 22100], [["Roshan Adhikari", "CPN-UML", 21000], ["Laxmi Gurung", "NCP", 8100], ["Sita Bhattarai", "OTH", 900]]),
  },
  {
    province: "Gandaki", district: "Parbat", code: "PBT-1", name: "Parbat–1",
    status: "DECLARED", lastUpdated: ago(95),
    totalVoters: 48000, votesCast: 37000,
    candidates: race(["Hari Bahadur Thapa", "NC", 19200], [["Mina Gurung", "CPN-UML", 16900], ["Bikash Poudel", "RSP", 7800], ["Kamala BK", "OTH", 1000]]),
  },
  {
    province: "Gandaki", district: "Baglung", code: "BGL-1", name: "Baglung–1",
    status: "COUNTING", lastUpdated: ago(16),
    totalVoters: 54000, votesCast: 42000,
    candidates: race(["Sita Adhikari", "CPN-UML", 21300], [["Nanda Kumar", "NC", 20100], ["Priya Gurung", "NCP", 8400], ["Ramesh Magar", "OTH", 1200]]),
  },
  {
    province: "Gandaki", district: "Myagdi", code: "MYG-1", name: "Myagdi–1",
    status: "DECLARED", lastUpdated: ago(112),
    totalVoters: 44000, votesCast: 34000,
    candidates: race(["Nir Bahadur Pun", "NC", 17600], [["Sita Thapa", "CPN-UML", 15200], ["Bikash Magar", "NCP", 6400], ["Hari Rawal", "OTH", 900]]),
  },
  {
    province: "Gandaki", district: "Nawalparasi-E", code: "NWE-1", name: "Nawalparasi(E)–1",
    status: "COUNTING", lastUpdated: ago(9),
    totalVoters: 66000, votesCast: 52000,
    candidates: race(["Ramesh Poudel", "NC", 27100], [["Sabita Ghimire", "CPN-UML", 25200], ["Priya Gurung", "RSP", 10400], ["Santosh Adhikari", "OTH", 1500]]),
  },

  // ── LUMBINI PROVINCE (32 seats) ────────────────────────────────────────
  {
    province: "Lumbini", district: "Nawalparasi-W", code: "NWW-1", name: "Nawalparasi(W)–1",
    status: "DECLARED", lastUpdated: ago(128),
    totalVoters: 68000, votesCast: 54000,
    candidates: race(["Devi Gyawali", "CPN-UML", 28100], [["Tika Dhakal", "NC", 25900], ["Sabita Poudel", "RSP", 9800], ["Hari Tharu", "OTH", 1900]]),
  },
  {
    province: "Lumbini", district: "Rupandehi", code: "RPD-1", name: "Rupandehi–1",
    status: "DECLARED", lastUpdated: ago(132),
    totalVoters: 90000, votesCast: 73000,
    candidates: race(["Sita Bhattarai", "NC", 37800], [["Roshan Thapa", "CPN-UML", 35200], ["Hari Adhikari", "RSP", 13800], ["Gita Sharma", "NCP", 6800]]),
  },
  {
    province: "Lumbini", district: "Rupandehi", code: "RPD-2", name: "Rupandehi–2",
    status: "COUNTING", lastUpdated: ago(7),
    totalVoters: 87000, votesCast: 70000,
    candidates: race(["Mohan Poudel", "CPN-UML", 35500], [["Anita Koirala", "NC", 34100], ["Bikash Sharma", "RSP", 13200], ["Sunita Adhikari", "NCP", 6400]]),
  },
  {
    province: "Lumbini", district: "Rupandehi", code: "RPD-3", name: "Rupandehi–3",
    status: "COUNTING", lastUpdated: ago(28),
    totalVoters: 88000, votesCast: 71000,
    candidates: race(["Anil Bista", "CPN-UML", 36140], [["Niraj Poudel", "RSP", 33901], ["Sita Kandel", "NC", 15400], ["Hari Chaudhary", "OTH", 2100]]),
  },
  {
    province: "Lumbini", district: "Kapilvastu", code: "KPV-1", name: "Kapilvastu–1",
    status: "DECLARED", lastUpdated: ago(115),
    totalVoters: 78000, votesCast: 62000,
    candidates: race(["Kamal Thapa", "CPN-UML", 32100], [["Sita Paudel", "NC", 29800], ["Rajan Budha", "RSP", 11100], ["Mina Chaudhary", "OTH", 2400]]),
  },
  {
    province: "Lumbini", district: "Kapilvastu", code: "KPV-2", name: "Kapilvastu–2",
    status: "COUNTING", lastUpdated: ago(13),
    totalVoters: 75000, votesCast: 59000,
    candidates: race(["Laxmi Chaudhary", "NC", 29200], [["Gopal Thapa", "CPN-UML", 27900], ["Sunita Budha", "RSP", 10800], ["Ram Paudel", "OTH", 2200]]),
  },
  {
    province: "Lumbini", district: "Arghakhanchi", code: "ARG-1", name: "Arghakhanchi–1",
    status: "DECLARED", lastUpdated: ago(108),
    totalVoters: 56000, votesCast: 44000,
    candidates: race(["Bishnu Paudel", "CPN-UML", 23100], [["Tika Sharma", "NC", 21200], ["Sabina Thapa", "NCP", 8200], ["Karna Magar", "OTH", 1100]]),
  },
  {
    province: "Lumbini", district: "Gulmi", code: "GLM-1", name: "Gulmi–1",
    status: "COUNTING", lastUpdated: ago(11),
    totalVoters: 58000, votesCast: 45000,
    candidates: race(["Mina Paudel", "NC", 23200], [["Ramesh Khadka", "CPN-UML", 21800], ["Deepa Sharma", "NCP", 8100], ["Gopal Adhikari", "OTH", 1200]]),
  },
  {
    province: "Lumbini", district: "Palpa", code: "PLP-1", name: "Palpa–1",
    status: "DECLARED", lastUpdated: ago(125),
    totalVoters: 62000, votesCast: 49000,
    candidates: race(["Sita Koirala", "NC", 25300], [["Hari Khadka", "CPN-UML", 23100], ["Priya Sharma", "RSP", 8900], ["Laxmi Paudel", "OTH", 1200]]),
  },
  {
    province: "Lumbini", district: "Dang", code: "DNG-1", name: "Dang–1",
    status: "COUNTING", lastUpdated: ago(15),
    totalVoters: 72000, votesCast: 57000,
    candidates: race(["Ram Thapa", "CPN-UML", 29200], [["Sunita Chaudhary", "NC", 27800], ["Rajan Budha Magar", "RSP", 10400], ["Nirmala Tharu", "OTH", 2200]]),
  },
  {
    province: "Lumbini", district: "Dang", code: "DNG-2", name: "Dang–2",
    status: "DECLARED", lastUpdated: ago(100),
    totalVoters: 70000, votesCast: 55000,
    candidates: race(["Hari Bahadur Chaudhary", "NC", 28400], [["Mina Rana", "CPN-UML", 26200], ["Bikash Thapa", "RSP", 10100], ["Anita Tharu", "OTH", 2100]]),
  },
  {
    province: "Lumbini", district: "Banke", code: "BNK-1", name: "Banke–1",
    status: "COUNTING", lastUpdated: ago(8),
    totalVoters: 78000, votesCast: 61000,
    candidates: race(["Santosh Mishra", "NC", 31200], [["Kavita Tharu", "CPN-UML", 29100], ["Suresh Budha", "RSP", 11300], ["Laxmi Sharma", "OTH", 2800]]),
  },
  {
    province: "Lumbini", district: "Bardiya", code: "BRD-1", name: "Bardiya–1",
    status: "DECLARED", lastUpdated: ago(118),
    totalVoters: 74000, votesCast: 59000,
    candidates: race(["Kamala Tharu", "CPN-UML", 30200], [["Sita Chaudhary", "NC", 28100], ["Nabin Budha Magar", "RSP", 10800], ["Priya Rana", "OTH", 2300]]),
  },

  // ── KARNALI PROVINCE (25 seats) ────────────────────────────────────────
  {
    province: "Karnali", district: "Dolpa", code: "DLP-1", name: "Dolpa–1",
    status: "DECLARED", lastUpdated: ago(148),
    totalVoters: 28000, votesCast: 21000,
    candidates: race(["Mana Bahadur Rawal", "NC", 10900], [["Nanda Kumar Budha", "CPN-UML", 8800], ["Sita Bohara", "NCP", 3200], ["Hari BK", "OTH", 700]]),
  },
  {
    province: "Karnali", district: "Mugu", code: "MUG-1", name: "Mugu–1",
    status: "COUNTING", lastUpdated: ago(22),
    totalVoters: 24000, votesCast: 18000,
    candidates: race(["Nanda Budha", "CPN-UML", 9200], [["Laxmi Rawal", "NC", 8700], ["Karna Shahi", "NCP", 2800], ["Dil BK", "OTH", 600]]),
  },
  {
    province: "Karnali", district: "Humla", code: "HML-1", name: "Humla–1",
    status: "DECLARED", lastUpdated: ago(138),
    totalVoters: 22000, votesCast: 16500,
    candidates: race(["Mahindra Shahi", "NC", 8600], [["Prakash Bohara", "CPN-UML", 7200], ["Sita Rawal", "NCP", 2500], ["Hari BK", "OTH", 500]]),
  },
  {
    province: "Karnali", district: "Jumla", code: "JML-1", name: "Jumla–1",
    status: "COUNTING", lastUpdated: ago(16),
    totalVoters: 34000, votesCast: 26000,
    candidates: race(["Rajan Shahi", "NC", 13200], [["Mina Bohara", "CPN-UML", 12100], ["Bikash Rawal", "NCP", 4400], ["Kamala BK", "OTH", 800]]),
  },
  {
    province: "Karnali", district: "Kalikot", code: "KLK-1", name: "Kalikot–1",
    status: "DECLARED", lastUpdated: ago(125),
    totalVoters: 38000, votesCast: 29000,
    candidates: race(["Deepak Rawal", "CPN-UML", 14900], [["Sita Shahi", "NC", 13600], ["Nirmala Bohara", "NCP", 4700], ["Hari BK", "OTH", 700]]),
  },
  {
    province: "Karnali", district: "Dailekh", code: "DLK-2", name: "Dailekh–1",
    status: "COUNTING", lastUpdated: ago(14),
    totalVoters: 48000, votesCast: 37000,
    candidates: race(["Sabina Bohara", "NC", 19200], [["Ram Shahi", "CPN-UML", 17800], ["Anita Rawal", "NCP", 6400], ["Karna BK", "OTH", 1200]]),
  },
  {
    province: "Karnali", district: "Jajarkot", code: "JJK-1", name: "Jajarkot–1",
    status: "DECLARED", lastUpdated: ago(115),
    totalVoters: 44000, votesCast: 34000,
    candidates: race(["Hari Bohara", "CPN-UML", 17400], [["Mina Shahi", "NC", 15900], ["Priya Rawal", "NCP", 5600], ["Bikash BK", "OTH", 900]]),
  },
  {
    province: "Karnali", district: "Salyan", code: "SLN-1", name: "Salyan–1",
    status: "COUNTING", lastUpdated: ago(10),
    totalVoters: 52000, votesCast: 40000,
    candidates: race(["Kamala Bohara", "NC", 20400], [["Hari Shahi", "CPN-UML", 18900], ["Rajan Rawal", "NCP", 6900], ["Sunita BK", "OTH", 1100]]),
  },
  {
    province: "Karnali", district: "Rukum-E", code: "RKE-1", name: "Rukum(E)–1",
    status: "DECLARED", lastUpdated: ago(132),
    totalVoters: 40000, votesCast: 31000,
    candidates: race(["Deepa Shahi", "NC", 15900], [["Karna Budha", "CPN-UML", 14200], ["Mina Rawal", "NCP", 5100], ["Hari BK", "OTH", 900]]),
  },
  {
    province: "Karnali", district: "Surkhet", code: "SRK-1", name: "Surkhet–1",
    status: "COUNTING", lastUpdated: ago(62),
    totalVoters: 54000, votesCast: 40000,
    candidates: race(["Harka Bahadur BK", "OTH", 18922], [["Laxmi Rawal", "NC", 18110], ["Dawa Tamang", "NCP", 9200], ["Rajan Shahi", "CPN-UML", 5400]]),
  },
  {
    province: "Karnali", district: "Surkhet", code: "SRK-2", name: "Surkhet–2",
    status: "DECLARED", lastUpdated: ago(105),
    totalVoters: 57000, votesCast: 44000,
    candidates: race(["Bimala Shahi", "CPN-UML", 22600], [["Nanda Bohara", "NC", 21200], ["Hari Rawal", "NCP", 7200], ["Sita BK", "OTH", 1400]]),
  },

  // ── SUDURPASHCHIM PROVINCE (23 seats) ──────────────────────────────────
  {
    province: "Sudurpashchim", district: "Bajura", code: "BJR-1", name: "Bajura–1",
    status: "DECLARED", lastUpdated: ago(142),
    totalVoters: 32000, votesCast: 24000,
    candidates: race(["Karna Bahadur Rawal", "NC", 12400], [["Sita Bohara", "CPN-UML", 10100], ["Bikash Budha", "NCP", 3600], ["Deepa BK", "OTH", 700]]),
  },
  {
    province: "Sudurpashchim", district: "Bajhang", code: "BJH-1", name: "Bajhang–1",
    status: "COUNTING", lastUpdated: ago(19),
    totalVoters: 38000, votesCast: 29000,
    candidates: race(["Mina Rawal", "CPN-UML", 14900], [["Hari Bohara", "NC", 13600], ["Priya Budha", "NCP", 4400], ["Kamala BK", "OTH", 900]]),
  },
  {
    province: "Sudurpashchim", district: "Darchula", code: "DRC-1", name: "Darchula–1",
    status: "DECLARED", lastUpdated: ago(128),
    totalVoters: 34000, votesCast: 26000,
    candidates: race(["Ram Bahadur Bohara", "NC", 13500], [["Sita Dhami", "CPN-UML", 11400], ["Nirmala Budha", "NCP", 3800], ["Karna BK", "OTH", 700]]),
  },
  {
    province: "Sudurpashchim", district: "Baitadi", code: "BTD-1", name: "Baitadi–1",
    status: "COUNTING", lastUpdated: ago(14),
    totalVoters: 48000, votesCast: 37000,
    candidates: race(["Gokul Bista", "NC", 19200], [["Mina Bohara", "CPN-UML", 17300], ["Sunita Rawal", "NCP", 5900], ["Hari BK", "OTH", 1100]]),
  },
  {
    province: "Sudurpashchim", district: "Dadeldhura", code: "DDL-1", name: "Dadeldhura–1",
    status: "DECLARED", lastUpdated: ago(118),
    totalVoters: 42000, votesCast: 33000,
    candidates: race(["Sita Bista", "CPN-UML", 17100], [["Hari Bohara", "NC", 15600], ["Priya Rawal", "NCP", 5100], ["Kamala BK", "OTH", 900]]),
  },
  {
    province: "Sudurpashchim", district: "Doti", code: "DTI-1", name: "Doti–1",
    status: "COUNTING", lastUpdated: ago(9),
    totalVoters: 52000, votesCast: 40000,
    candidates: race(["Nirmala Bohara", "NC", 20400], [["Ram Bista", "CPN-UML", 18900], ["Mina Rawal", "NCP", 6200], ["Sunita BK", "OTH", 1200]]),
  },
  {
    province: "Sudurpashchim", district: "Achham", code: "ACH-1", name: "Achham–1",
    status: "DECLARED", lastUpdated: ago(135),
    totalVoters: 48000, votesCast: 37000,
    candidates: race(["Kamal Shahi", "CPN-UML", 19100], [["Sita Bohara", "NC", 17200], ["Deepak Rawal", "NCP", 5800], ["Hari BK", "OTH", 1100]]),
  },
  {
    province: "Sudurpashchim", district: "Kailali", code: "KLL-1", name: "Kailali–1",
    status: "COUNTING", lastUpdated: ago(11),
    totalVoters: 78000, votesCast: 62000,
    candidates: race(["Hari Chaudhary", "NC", 31800], [["Mina Tharu", "CPN-UML", 29400], ["Bikash Bista", "RSP", 11200], ["Gita Rana", "OTH", 2700]]),
  },
  {
    province: "Sudurpashchim", district: "Kailali", code: "KLL-2", name: "Kailali–2",
    status: "DECLARED", lastUpdated: ago(108),
    totalVoters: 75000, votesCast: 60000,
    candidates: race(["Ram Bahadur Thapa", "CPN-UML", 30800], [["Kamala Chaudhary", "NC", 28700], ["Sunita Bista", "RSP", 10900], ["Nirmala Tharu", "OTH", 2400]]),
  },
  {
    province: "Sudurpashchim", district: "Kailali", code: "KLL-3", name: "Kailali–3",
    status: "COUNTING", lastUpdated: ago(7),
    totalVoters: 72000, votesCast: 57000,
    candidates: race(["Anita Tharu", "NC", 28900], [["Kamal Bista", "CPN-UML", 27200], ["Priya Chaudhary", "RSP", 10800], ["Bikash Rawal", "OTH", 2300]]),
  },
  {
    province: "Sudurpashchim", district: "Kailali", code: "KLL-4", name: "Kailali–4",
    status: "DECLARED", lastUpdated: ago(140),
    totalVoters: 63000, votesCast: 50000,
    candidates: race(["Manju Chaudhary", "NCP", 24410], [["Tek Bahadur Thapa", "NC", 23007], ["Bishnu Bohara", "CPN-UML", 9800], ["Gopal BK", "OTH", 1200]]),
  },
  {
    province: "Sudurpashchim", district: "Kanchanpur", code: "KNC-1", name: "Kanchanpur–1",
    status: "COUNTING", lastUpdated: ago(13),
    totalVoters: 76000, votesCast: 60000,
    candidates: race(["Sita Bista", "NC", 30400], [["Hari Tharu", "CPN-UML", 28200], ["Priya Rawal", "RSP", 11100], ["Mina Chaudhary", "OTH", 2600]]),
  },
  {
    province: "Sudurpashchim", district: "Kanchanpur", code: "KNC-2", name: "Kanchanpur–2",
    status: "DECLARED", lastUpdated: ago(122),
    totalVoters: 73000, votesCast: 58000,
    candidates: race(["Ram Bahadur Bista", "CPN-UML", 29800], [["Kamala Tharu", "NC", 27900], ["Sunita Rawal", "RSP", 10800], ["Nirmala Chaudhary", "OTH", 2400]]),
  },
];
