export const SPONSORED_LINK_URL = "https://omg10.com/4/10688870";
const SPONSORED_GATE_STATE_KEY = "sponsored_gate_state_v2";

export const SPONSORED_REDIRECT_CLICK_THRESHOLD = 5;
export const SPONSORED_REDIRECT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

type SponsoredGateState = {
  clicksSinceLastRedirect: number;
  lastRedirectAtMs: number;
};

const DEFAULT_STATE: SponsoredGateState = {
  clicksSinceLastRedirect: 0,
  lastRedirectAtMs: 0,
};

function readGateState(): SponsoredGateState {
  if (typeof window === "undefined") return DEFAULT_STATE;

  try {
    const raw = window.localStorage.getItem(SPONSORED_GATE_STATE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<SponsoredGateState>;
    return {
      clicksSinceLastRedirect: Number.isFinite(parsed.clicksSinceLastRedirect) ? Math.max(0, Number(parsed.clicksSinceLastRedirect)) : 0,
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
  const nextClicks = state.clicksSinceLastRedirect + 1;
  const inCooldown = state.lastRedirectAtMs > 0 && (nowMs - state.lastRedirectAtMs) < SPONSORED_REDIRECT_COOLDOWN_MS;
  const shouldRedirect = !inCooldown && nextClicks >= SPONSORED_REDIRECT_CLICK_THRESHOLD;

  if (shouldRedirect) {
    writeGateState({
      clicksSinceLastRedirect: 0,
      lastRedirectAtMs: nowMs,
    });
  } else {
    writeGateState({
      clicksSinceLastRedirect: nextClicks,
      lastRedirectAtMs: state.lastRedirectAtMs,
    });
  }

  return shouldRedirect;
}

export function openSponsoredLinkInNewTab(url = SPONSORED_LINK_URL): void {
  if (typeof window === "undefined") return;

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened) {
    opened.opener = null;
    return;
  }

  // Fallback for popup blockers: trigger a direct anchor click.
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer nofollow sponsored";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
