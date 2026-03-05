import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

function isAlreadyInstalled() {
  // True when running as installed PWA (standalone) or via iOS "Add to Home Screen"
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem("pwa-install-dismissed") === "1"
  );

  useEffect(() => {
    // Don't show if already running as installed PWA
    if (isAlreadyInstalled()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // Hide banner regardless of outcome — user has seen the prompt
    setDeferredPrompt(null);
    if (outcome === "dismissed") {
      localStorage.setItem("pwa-install-dismissed", "1");
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa-install-dismissed", "1");
    setDismissed(true);
  };

  return (
    <div
      role="banner"
      className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/60 bg-[#0f172a]/95 px-4 py-3 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-lg shrink-0">🇳🇵</span>
          <span className="text-xs text-slate-200 leading-tight truncate">
            Add <strong className="text-white">NepalVotes</strong> to your home screen
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstall}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
