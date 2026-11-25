import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { useVenue } from "../../hooks/useVenue";

// After "Not now", wait this long before showing the banner again.
const DISMISS_KEY = "install-banner-dismissed-at";
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

function wasRecentlyDismissed() {
    try {
        const at = Number(localStorage.getItem(DISMISS_KEY));
        return Number.isFinite(at) && at > 0 && Date.now() - at < DISMISS_FOR_MS;
    } catch {
        return false;
    }
}

function rememberDismiss() {
    try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
        /* storage blocked — banner just comes back next visit */
    }
}

function isStandalone() {
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true
    );
}

// iPhone/iPad Safari never fires `beforeinstallprompt`; installing is a manual
// Share → "Add to Home Screen", so we show those steps instead of a button.
function isIosSafari() {
    const ua = window.navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) ||
        (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    const otherBrowser = /crios|fxios|edgios|opios/i.test(ua);
    return ios && !otherBrowser;
}

export default function InstallAppButton() {
    const { venueName, loading } = useVenue();
    const [installPrompt, setInstallPrompt] = useState(null);
    // null = hidden, "prompt" = browser install prompt ready, "ios" = manual steps
    const [mode, setMode] = useState(() =>
        !isStandalone() && !wasRecentlyDismissed() && isIosSafari() ? "ios" : null
    );
    const [showIosSteps, setShowIosSteps] = useState(false);
    const [installing, setInstalling] = useState(false);

    useEffect(() => {
        if (isStandalone() || wasRecentlyDismissed() || isIosSafari()) return;

        function handleBeforeInstallPrompt(event) {
            event.preventDefault();
            setInstallPrompt(event);
            setMode("prompt");
        }

        function handleInstalled() {
            setInstallPrompt(null);
            setMode(null);
        }

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleInstalled);
        };
    }, []);

    async function handleInstall() {
        if (mode === "ios") {
            setShowIosSteps((v) => !v);
            return;
        }
        if (!installPrompt) return;

        setInstalling(true);
        try {
            await installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            // The browser's prompt can only be used once either way.
            setInstallPrompt(null);
            setMode(null);
            if (outcome !== "accepted") rememberDismiss();
        } finally {
            setInstalling(false);
        }
    }

    function handleDismiss() {
        rememberDismiss();
        setMode(null);
    }

    if (!mode) return null;

    const appName = loading ? "Book your slot" : venueName;

    return (
        <div className="bg-[#0b0d0e] px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
            <section
                role="region"
                aria-label="Install app"
                className="install-banner-in overflow-hidden rounded-2xl border border-emerald-400/20 bg-linear-to-br from-emerald-400/[0.12] via-surface-container to-surface-container p-3 shadow-lg shadow-black/30"
            >
                <div className="flex items-center gap-3">
                    <img
                        src="/pwa-icon-192.png"
                        alt=""
                        width="44"
                        height="44"
                        className="h-11 w-11 shrink-0 rounded-xl border border-white/10 bg-surface-container-highest object-cover"
                    />

                    <div className="min-w-0 flex-1">
                        <p className="font-['Space_Grotesk'] text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                            Install app
                        </p>
                        <p className="line-clamp-2 break-words font-['Barlow_Condensed'] text-[17px] font-bold uppercase leading-tight tracking-wide text-white">
                            {appName}
                        </p>
                        <p className="text-[11px] leading-snug text-on-surface-variant">
                            Faster booking from your home screen
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleInstall}
                        disabled={installing}
                        aria-expanded={mode === "ios" ? showIosSteps : undefined}
                        className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 font-['Space_Grotesk'] text-xs font-bold text-on-primary transition hover:brightness-110 active:scale-95 disabled:opacity-60"
                    >
                        <Download size={14} strokeWidth={2.4} />
                        {installing ? "Opening…" : "Install"}
                    </button>

                    <button
                        type="button"
                        onClick={handleDismiss}
                        aria-label="Not now"
                        title="Not now"
                        className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-white/10 hover:text-white"
                    >
                        <X size={15} strokeWidth={2.2} />
                    </button>
                </div>

                {mode === "ios" && showIosSteps && (
                    <ol className="mt-3 space-y-2 border-t border-white/10 pt-3 text-xs text-on-surface">
                        <li className="flex items-center gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold">1</span>
                            Tap
                            <Share size={14} className="text-primary" aria-label="Share" />
                            <span className="font-semibold">Share</span> in Safari's toolbar
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold">2</span>
                            Choose
                            <SquarePlus size={14} className="text-primary" aria-hidden="true" />
                            <span className="font-semibold">Add to Home Screen</span>
                        </li>
                    </ol>
                )}

            </section>
        </div>
    );
}
