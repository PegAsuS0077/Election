import { useState } from "react";
import { getParty } from "../lib/partyRegistry";

/**
 * Renders a party's official election symbol image.
 * Falls back to emoji symbol, then to a colored dot if neither is available.
 *
 * size="sm"  → 16×16 (h-4 w-4)  — table rows
 * size="md"  → 20×20 (h-5 w-5)  — candidate cards / list rows  (default)
 * size="lg"  → 28×28 (h-7 w-7)  — hero / detail view
 */
type Size = "sm" | "md" | "lg";

const DIM: Record<Size, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

interface Props {
  partyId: string;
  size?: Size;
  className?: string;
}

export default function PartySymbol({ partyId, size = "md", className = "" }: Props) {
  const [imgErr, setImgErr] = useState(false);
  const party = getParty(partyId);
  const dim = DIM[size];

  if (party.symbolUrl && !imgErr) {
    return (
      <img
        src={party.symbolUrl}
        alt={party.nameEn}
        onError={() => setImgErr(true)}
        className={`${dim} rounded-sm object-contain shrink-0 bg-white ${className}`}
      />
    );
  }

  if (party.symbol && party.symbol !== "•") {
    const textSize = size === "lg" ? "text-lg" : size === "sm" ? "text-xs" : "text-sm";
    return (
      <span className={`${dim} flex items-center justify-center ${textSize} shrink-0 ${className}`}>
        {party.symbol}
      </span>
    );
  }

  return (
    <span
      className={`${dim} rounded-full shrink-0 ${className}`}
      style={{ backgroundColor: party.hex }}
    />
  );
}
