/**
 * useConstituencyNotifications — browser Notification API helper.
 *
 * Client-only: notifications fire while the tab is open.
 * No push server required.
 */

import type { ConstituencyResult } from "../types";

const ICON = "/icons/icon-192.png";

/** Ask for notification permission (only prompts if still "default"). */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * Fire a browser notification for a constituency that just declared a result.
 * No-ops silently if permission isn't granted or Notification API unavailable.
 */
export function notifyDeclared(r: ConstituencyResult): void {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const winner = r.candidates.find((c) => c.isWinner)
    ?? [...r.candidates].sort((a, b) => b.votes - a.votes)[0];

  const title = `${r.name} — Result Declared`;
  const body = winner
    ? `Winner: ${winner.name} (${winner.partyName.split(" (")[0]})`
    : "Result has been declared.";

  try {
    new Notification(title, { body, icon: ICON, tag: `declared-${r.code}` });
  } catch {
    // Some browsers (Firefox private) throw on Notification constructor
  }
}
