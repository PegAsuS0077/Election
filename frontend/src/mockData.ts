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

export type ConstituencyResult = {
  province: Province;
  district: string;
  code: string;
  name: string;

  leadingParty: PartyKey;
  leadingCandidate: string;
  leadingVotes: number;

  runnerUpParty: PartyKey;
  runnerUpCandidate: string;
  runnerUpVotes: number;

  status: "DECLARED" | "COUNTING";
  lastUpdated: string;
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
    leadingParty: "RSP",
    leadingCandidate: "Suman Shrestha",
    leadingVotes: 28754,
    runnerUpParty: "NC",
    runnerUpCandidate: "Prakash Koirala",
    runnerUpVotes: 26111,
    status: "COUNTING",
    lastUpdated: new Date(Date.now() - 35 * 1000).toISOString(),
  },
  {
    province: "Bagmati",
    district: "Lalitpur",
    code: "LTP-1",
    name: "Lalitpur–1",
    leadingParty: "NC",
    leadingCandidate: "Bina Maharjan",
    leadingVotes: 33440,
    runnerUpParty: "CPN-UML",
    runnerUpCandidate: "Keshav Adhikari",
    runnerUpVotes: 31802,
    status: "DECLARED",
    lastUpdated: new Date(Date.now() - 90 * 1000).toISOString(),
  },
  {
    province: "Koshi",
    district: "Morang",
    code: "MRG-5",
    name: "Morang–5",
    leadingParty: "CPN-UML",
    leadingCandidate: "Ramesh Khadka",
    leadingVotes: 41210,
    runnerUpParty: "NC",
    runnerUpCandidate: "Rita Dahal",
    runnerUpVotes: 39955,
    status: "DECLARED",
    lastUpdated: new Date(Date.now() - 75 * 1000).toISOString(),
  },
  {
    province: "Madhesh",
    district: "Dhanusha",
    code: "DHS-2",
    name: "Dhanusha–2",
    leadingParty: "NCP",
    leadingCandidate: "Md. Aftab Ansari",
    leadingVotes: 29888,
    runnerUpParty: "CPN-UML",
    runnerUpCandidate: "Bhola Yadav",
    runnerUpVotes: 28741,
    status: "COUNTING",
    lastUpdated: new Date(Date.now() - 55 * 1000).toISOString(),
  },
  {
    province: "Gandaki",
    district: "Kaski",
    code: "KSK-2",
    name: "Kaski–2",
    leadingParty: "NC",
    leadingCandidate: "Deepak Gurung",
    leadingVotes: 26703,
    runnerUpParty: "NCP",
    runnerUpCandidate: "Saraswati Thapa",
    runnerUpVotes: 25590,
    status: "DECLARED",
    lastUpdated: new Date(Date.now() - 120 * 1000).toISOString(),
  },
  {
    province: "Lumbini",
    district: "Rupandehi",
    code: "RPD-3",
    name: "Rupandehi–3",
    leadingParty: "CPN-UML",
    leadingCandidate: "Anil Bista",
    leadingVotes: 36140,
    runnerUpParty: "RSP",
    runnerUpCandidate: "Niraj Poudel",
    runnerUpVotes: 33901,
    status: "COUNTING",
    lastUpdated: new Date(Date.now() - 28 * 1000).toISOString(),
  },
  {
    province: "Karnali",
    district: "Surkhet",
    code: "SRK-1",
    name: "Surkhet–1",
    leadingParty: "OTH",
    leadingCandidate: "Harka Bahadur BK",
    leadingVotes: 18922,
    runnerUpParty: "NC",
    runnerUpCandidate: "Laxmi Rawal",
    runnerUpVotes: 18110,
    status: "COUNTING",
    lastUpdated: new Date(Date.now() - 62 * 1000).toISOString(),
  },
  {
    province: "Sudurpashchim",
    district: "Kailali",
    code: "KLL-4",
    name: "Kailali–4",
    leadingParty: "NCP",
    leadingCandidate: "Manju Chaudhary",
    leadingVotes: 24410,
    runnerUpParty: "NC",
    runnerUpCandidate: "Tek Bahadur Thapa",
    runnerUpVotes: 23007,
    status: "DECLARED",
    lastUpdated: new Date(Date.now() - 140 * 1000).toISOString(),
  },
];
