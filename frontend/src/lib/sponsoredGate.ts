export const SPONSORED_LINK_URL = "https://omg10.com/4/10688870";
const SPONSORED_GATE_STATE_KEY = "sponsored_gate_state_v2";

export const SPONSORED_REDIRECT_COOLDOWN_MS = 2 * 60 * 1000;

type SponsoredGateState = {
  lastRedirectAtMs: number;
};

const DEFAULT_STATE: SponsoredGateState = {
  lastRedirectAtMs: 0,
};

function readGateState(): SponsoredGateState {
  if (typeof window === "undefined") return DEFAULT_STATE;

  try {
    const raw = window.localStorage.getItem(SPONSORED_GATE_STATE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<SponsoredGateState>;
    return {
      lastRedirectAtMs: Number.isFinite(parsed.lastRedirectAtMs) ? Math.max(0, Number(parsed.lastRedirectAtMs)) : 0,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeGateState(state: SponsoredGateState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SPONSORED_GATE_STATE_KEY, JSON.stringify(state));
}

export function shouldTriggerSponsoredRedirect(nowMs = Date.now()): boolean {
  const state = readGateState();
  const inCooldown = state.lastRedirectAtMs > 0 && (nowMs - state.lastRedirectAtMs) < SPONSORED_REDIRECT_COOLDOWN_MS;
  if (inCooldown) return false;

  writeGateState({
    lastRedirectAtMs: nowMs,
  });
  return true;
}

export function openSponsoredLinkInNewTab(url = SPONSORED_LINK_URL): void {
  if (typeof window === "undefined") return;

  // Use a direct anchor click (in the same user gesture) to minimize popup blocks.
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer nofollow sponsored";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
