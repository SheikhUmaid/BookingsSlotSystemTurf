export function isLoggedIn() {
    const token = localStorage.getItem('is_logged_in');
    if (token) {
        return true;
    }
    return false;
}