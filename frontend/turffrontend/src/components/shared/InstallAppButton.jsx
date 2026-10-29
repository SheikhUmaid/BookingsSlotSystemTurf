
import { useEffect, useState } from "react";

export default function InstallAppButton() {
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        const standalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            window.navigator.standalone === true;

        setIsInstalled(standalone);

        function handleBeforeInstallPrompt(event) {
            event.preventDefault();
            setInstallPrompt(event);
        }

        function handleInstalled() {
            setIsInstalled(true);
            setInstallPrompt(null);
        }

        window.addEventListener(
            "beforeinstallprompt",
            handleBeforeInstallPrompt
        );

        window.addEventListener("appinstalled", handleInstalled);

        return () => {
            window.removeEventListener(
                "beforeinstallprompt",
                handleBeforeInstallPrompt
            );

            window.removeEventListener("appinstalled", handleInstalled);
        };
    }, []);

    async function handleInstall() {
        if (!installPrompt) return;

        await installPrompt.prompt();

        const { outcome } = await installPrompt.userChoice;

        if (outcome === "accepted") {
            setInstallPrompt(null);
        }
    }

    if (isInstalled || !installPrompt) {
        return null;
    }

    return (
        <button type="button" onClick={handleInstall}>
            Install App
        </button>
    );
}
