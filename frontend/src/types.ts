/**
 * Canonical election data types — single source of truth.
 *
 * These types are independent of mockData and are used throughout
 * the application. They map directly to the upstream data model from
 * https://result.election.gov.np/JSONFiles/ElectionResultCentral2082.txt
 *
 * Party identity:
 *   partyId  = SYMBOLCODE as string, or "IND" for स्वतन्त्र
 *   partyName = raw PoliticalPartyName from upstream (official Nepali text)
 *
 * Vote counts:
 *   In RESULTS_MODE=archive, vote counts come from the saved post-election
 *   dataset used for analysis and archive browsing.
 *   In RESULTS_MODE=live, vote counts come from the CDN-backed live feed.
 */

// ── Province ─────────────────────────────────────────────────────────────────

export type Province =
  | "Koshi"
  | "Madhesh"
  | "Bagmati"
  | "Gandaki"
  | "Lumbini"
  | "Karnali"
  | "Sudurpashchim";

export const PROVINCES: Province[] = [
  "Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim",
];

export const PROVINCE_NP: Record<Province, string> = {
  Koshi:          "कोशी प्रदेश",
  Madhesh:        "मधेश प्रदेश",
  Bagmati:        "बागमती प्रदेश",
  Gandaki:        "गण्डकी प्रदेश",
  Lumbini:        "लुम्बिनी प्रदेश",
  Karnali:        "कर्णाली प्रदेश",
  Sudurpashchim:  "सुदूरपश्चिम प्रदेश",
};

// ── Candidate ────────────────────────────────────────────────────────────────

export type Candidate = {
  /** Upstream CandidateID — used for photo URL */
  candidateId: number;
  /** Candidate name in Nepali (Devanagari) from upstream CandidateName */
  nameNp: string;
  /** English transliteration (same as nameNp when not available) */
  name: string;
  /** Raw PoliticalPartyName from upstream — never invented or mapped */
  partyName: string;
  /** Stable party identifier: String(SYMBOLCODE) or "IND" for independents */
  partyId: string;
  /**
   * Votes received from the saved archive or live CDN feed.
   */
  votes: number;
  gender: "M" | "F";
  /** Whether this candidate has won their seat (E_STATUS == "W") */
  isWinner: boolean;
  // ── Biographical fields (optional — present when parsed from upstream JSON) ──
  age?: number;
  fatherName?: string;
  spouseName?: string;
  qualification?: string;
  institution?: string;
  experience?: string;
  address?: string;
};

// ── Constituency ─────────────────────────────────────────────────────────────

export type ConstituencyStatus = "DECLARED" | "COUNTING" | "PENDING";

export type ConstituencyResult = {
  province: Province;
  /** English district name */
  district: string;
  /** Devanagari district name from upstream DistrictName */
  districtNp: string;
  /**
   * Stable composite ID: `${STATE_ID}-${DistrictName}-${SCConstID}`
   * SCConstID alone is not unique across districts.
   */
  code: string;
  /** English display name e.g. "Taplejung-1" */
  name: string;
  /** Devanagari display name e.g. "ताप्लेजुङ क्षेत्र नं. १" */
  nameNp: string;
  status: ConstituencyStatus;
  lastUpdated: string;
  candidates: Candidate[];
  /** Sum of all candidate votes recorded for this constituency. */
  votesCast: number;
  /** Optional registered voter total used for turnout calculations. */
  totalVoters?: number;
};

// ── Party (derived / display) ─────────────────────────────────────────────────

/**
 * A party entry derived from upstream data.
 * The canonical identity is partyId (SYMBOLCODE string or "IND").
 * partyName is the official Nepali text from PoliticalPartyName — never invented.
 */
export type PartyInfo = {
  partyId: string;
  /** Official Nepali name from upstream PoliticalPartyName */
  partyName: string;
  /** English short name for display (derived from known mapping, else partyName) */
  nameEn: string;
  /** Tailwind bg class for colour coding */
  color: string;
  /** Hex colour for charts */
  hex: string;
  /** Symbol emoji for display (fallback when image unavailable) */
  symbol: string;
  /** URL of the official party symbol image from nepalelectionupdates.com */
  symbolUrl: string;
  /** Number of FPTP candidates in this election */
  candidateCount: number;
};

// ── Seat tally ────────────────────────────────────────────────────────────────

export type SeatEntry = { fptp: number; pr: number };
export type SeatTally = Record<string, SeatEntry>;

// ── Snapshot ─────────────────────────────────────────────────────────────────

export type Snapshot = {
  totalSeats: number;
  declaredSeats: number;
  lastUpdated: string;
  seatTally: SeatTally;
};

// ── Mode ─────────────────────────────────────────────────────────────────────

/**
 * RESULTS_MODE controls how saved election data is served.
 *
 * archive — default post-election mode: loads the saved final dataset once
 *           and powers archive browsing, visualisation, and analysis pages.
 *
 * live    — optional polling mode: reads the CDN payload repeatedly for
 *           near-real-time updates while counts are still changing.
 *
 * Set via VITE_RESULTS_MODE env var. Defaults to "archive".
 */
export type ResultsMode = "archive" | "live";

export const RESULTS_MODE: ResultsMode =
  (import.meta.env.VITE_RESULTS_MODE as ResultsMode | undefined) === "live"
    ? "live"
    : "archive";

// ── WebSocket message ─────────────────────────────────────────────────────────

export type WsMessage =
  | { type: "snapshot"; data: Snapshot }
  | { type: "constituencies"; data: ConstituencyResult[] };

// ── Upstream raw record ───────────────────────────────────────────────────────

/** Raw record shape from the Election Commission JSON feed */
export type UpstreamRecord = {
  CandidateID: number;
  CandidateName: string;
  PoliticalPartyName: string;
  SYMBOLCODE: number;
  SymbolName?: string;
  STATE_ID: number;
  DistrictName: string;
  SCConstID: number;
  TotalVoteReceived: number;
  /** Rank (1 = leading pre-election; 1 = winner post-election) */
  R: number;
  /** null pre-election; "W" when elected */
  E_STATUS: string | null;
  Gender?: string;
  // ── Biographical fields (present in upstream, optional) ──────────────────
  AGE_YR?: number;
  FATHER_NAME?: string;
  SPOUCE_NAME?: string;
  QUALIFICATION?: string;
  NAMEOFINST?: string;
  EXPERIENCE?: string;
  ADDRESS?: string;
};
