import { useState, useEffect } from "react";

export function isLoggedIn() {
    const token = localStorage.getItem("is_logged_in");
    const accessToken = localStorage.getItem("access_token");
    return Boolean(token && token !== "false" && accessToken);
}

export function getToken() {
    return localStorage.getItem("access_token");
}

export function logout() {
    localStorage.removeItem("is_logged_in");
    localStorage.removeItem("access_token");
    localStorage.clear();
    window.dispatchEvent(new Event("auth_change"));
    window.location.href = "/";
}

/**
 * Custom React hook to subscribe to authentication state changes.
 */
export function useAuth() {
    const [authenticated, setAuthenticated] = useState(() => isLoggedIn());

    useEffect(() => {
        const handleAuthChange = () => {
            setAuthenticated(isLoggedIn());
        };

        window.addEventListener("auth_change", handleAuthChange);
        window.addEventListener("storage", handleAuthChange);

        return () => {
            window.removeEventListener("auth_change", handleAuthChange);
            window.removeEventListener("storage", handleAuthChange);
        };
    }, []);

    return {
        isAuthenticated: authenticated,
        isLoggedIn: authenticated,
        refreshAuth: () => setAuthenticated(isLoggedIn()),
    };
}

