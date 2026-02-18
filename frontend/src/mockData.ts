export type PartyKey = "NC" | "CPN-UML" | "NCP" | "RSP" | "OTH";

export const parties: Record<PartyKey, { name: string; color: string }> = {
  NC: { name: "Nepali Congress (NC)", color: "bg-red-600" },
  "CPN-UML": { name: "CPN-UML", color: "bg-blue-600" },
  NCP: { name: "Nepali Communist Party (NCP)", color: "bg-orange-600" },
  RSP: { name: "Rastriya Swatantra Party (RSP)", color: "bg-emerald-600" },
  OTH: { name: "Others/Ind.", color: "bg-slate-500" },
};

export const mockSnapshot = {
  totalSeats: 275,
  declaredSeats: 245,
  lastUpdated: new Date().toISOString(),
  seatTally: {
    NC: { fptp: 52, pr: 27 },
    "CPN-UML": { fptp: 49, pr: 31 },
    NCP: { fptp: 28, pr: 14 },
    RSP: { fptp: 18, pr: 12 },
    OTH: { fptp: 10, pr: 4 },
  } as Record<PartyKey, { fptp: number; pr: number }>,
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

export const constituencyResults: ConstituencyResult[] = [
  {
    province: "Bagmati",
    district: "Kathmandu",
    code: "KTM-3",
    name: "Kathmandu–3",
    status: "COUNTING",
    lastUpdated: new Date(Date.now() - 35 * 1000).toISOString(),
    candidates: [
      { name: "Suman Shrestha", party: "RSP", votes: 28754 },
      { name: "Prakash Koirala", party: "NC", votes: 26111 },
      { name: "Gita Lama", party: "CPN-UML", votes: 11420 },
      { name: "Ramesh BK", party: "OTH", votes: 3200 },
    ],
  },
  {
    province: "Bagmati",
    district: "Lalitpur",
    code: "LTP-1",
    name: "Lalitpur–1",
    status: "DECLARED",
    lastUpdated: new Date(Date.now() - 90 * 1000).toISOString(),
    candidates: [
      { name: "Bina Maharjan", party: "NC", votes: 33440 },
      { name: "Keshav Adhikari", party: "CPN-UML", votes: 31802 },
      { name: "Saraswati Rai", party: "RSP", votes: 8200 },
      { name: "Kiran Shahi", party: "OTH", votes: 1800 },
    ],
  },
  {
    province: "Koshi",
    district: "Morang",
    code: "MRG-5",
    name: "Morang–5",
    status: "DECLARED",
    lastUpdated: new Date(Date.now() - 75 * 1000).toISOString(),
    candidates: [
      { name: "Ramesh Khadka", party: "CPN-UML", votes: 41210 },
      { name: "Rita Dahal", party: "NC", votes: 39955 },
      { name: "Anita Karki", party: "NCP", votes: 9200 },
      { name: "Dinesh Yadav", party: "OTH", votes: 1600 },
    ],
  },
  {
    province: "Madhesh",
    district: "Dhanusha",
    code: "DHS-2",
    name: "Dhanusha–2",
    status: "COUNTING",
    lastUpdated: new Date(Date.now() - 55 * 1000).toISOString(),
    candidates: [
      { name: "Md. Aftab Ansari", party: "NCP", votes: 29888 },
      { name: "Bhola Yadav", party: "CPN-UML", votes: 28741 },
      { name: "Nirmala Devi", party: "NC", votes: 13200 },
      { name: "Raj Kishor", party: "OTH", votes: 2400 },
    ],
  },
  {
    province: "Gandaki",
    district: "Kaski",
    code: "KSK-2",
    name: "Kaski–2",
    status: "DECLARED",
    lastUpdated: new Date(Date.now() - 120 * 1000).toISOString(),
    candidates: [
      { name: "Deepak Gurung", party: "NC", votes: 26703 },
      { name: "Saraswati Thapa", party: "NCP", votes: 25590 },
      { name: "Niraj Shrestha", party: "CPN-UML", votes: 10100 },
      { name: "Tika Rana", party: "OTH", votes: 900 },
    ],
  },
  {
    province: "Lumbini",
    district: "Rupandehi",
    code: "RPD-3",
    name: "Rupandehi–3",
    status: "COUNTING",
    lastUpdated: new Date(Date.now() - 28 * 1000).toISOString(),
    candidates: [
      { name: "Anil Bista", party: "CPN-UML", votes: 36140 },
      { name: "Niraj Poudel", party: "RSP", votes: 33901 },
      { name: "Sita Kandel", party: "NC", votes: 15400 },
      { name: "Hari Chaudhary", party: "OTH", votes: 2100 },
    ],
  },
  {
    province: "Karnali",
    district: "Surkhet",
    code: "SRK-1",
    name: "Surkhet–1",
    status: "COUNTING",
    lastUpdated: new Date(Date.now() - 62 * 1000).toISOString(),
    candidates: [
      { name: "Harka Bahadur BK", party: "OTH", votes: 18922 },
      { name: "Laxmi Rawal", party: "NC", votes: 18110 },
      { name: "Dawa Tamang", party: "NCP", votes: 9200 },
      { name: "Rajan Shahi", party: "CPN-UML", votes: 5400 },
    ],
  },
  {
    province: "Sudurpashchim",
    district: "Kailali",
    code: "KLL-4",
    name: "Kailali–4",
    status: "DECLARED",
    lastUpdated: new Date(Date.now() - 140 * 1000).toISOString(),
    candidates: [
      { name: "Manju Chaudhary", party: "NCP", votes: 24410 },
      { name: "Tek Bahadur Thapa", party: "NC", votes: 23007 },
      { name: "Bishnu Bohara", party: "CPN-UML", votes: 9800 },
      { name: "Gopal BK", party: "OTH", votes: 1200 },
    ],
  },
];
