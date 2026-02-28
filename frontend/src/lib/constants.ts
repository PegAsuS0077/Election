// Shared UI constants — kept outside component files to avoid fast-refresh warnings.

export const PROVINCE_COLORS: Record<string, string> = {
  Koshi:          "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  Madhesh:        "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Bagmati:        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  Gandaki:        "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  Lumbini:        "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  Karnali:        "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  Sudurpashchim:  "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
};

export const PARTY_HEX: Record<string, string> = {
  "bg-red-600":     "#dc2626",  // NC
  "bg-blue-600":    "#2563eb",  // CPN-UML
  "bg-orange-600":  "#ea580c",  // NCP
  "bg-emerald-600": "#059669",  // RSP
  "bg-yellow-600":  "#ca8a04",  // RPP
  "bg-cyan-600":    "#0891b2",  // JSP
  "bg-purple-600":  "#9333ea",  // CPN-US
  "bg-teal-600":    "#0d9488",  // LSP
  "bg-amber-600":   "#d97706",  // NUP
  "bg-rose-700":    "#be123c",  // RJM
  "bg-green-700":   "#15803d",  // NMKP
  "bg-indigo-600":  "#4f46e5",  // JMP
  "bg-red-800":     "#991b1b",  // CPN-ML
  "bg-stone-600":   "#57534e",  // NPD
  "bg-violet-500":  "#8b5cf6",  // IND
  "bg-slate-400":   "#94a3b8",  // computed "Others" row in charts
};
