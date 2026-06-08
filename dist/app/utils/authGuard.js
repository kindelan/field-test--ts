import { AuthService } from "../services/auth.service.js";
/**
 * Enforces dashboard and form authentication.
 * If user is not logged in, they are redirected to login.html.
 * If dashboardOnly is true and they are a Rider, they are redirected to form.html.
 */
export async function requireAuth(dashboardOnly = true) {
    const authService = new AuthService();
    let session = null;
    try {
        session = await authService.getSession();
    }
    catch (err) {
        console.error("Failed checking auth status:", err);
    }
    if (!session) {
        window.location.href = "login.html";
        throw new Error("Redirecting to login...");
    }
    if (dashboardOnly && !session.capabilities.canViewDashboard) {
        window.location.href = "form.html";
        throw new Error("Restricted access redirect...");
    }
    // If Rider is logged in, hide dashboard navigation tabs dynamically
    if (!session.capabilities.canViewDashboard) {
        const navLinks = document.querySelectorAll(".nav-container a");
        navLinks.forEach(link => {
            const href = link.getAttribute("href");
            if (href && (href.includes("bikes.html") || href.includes("ft.html") || href.includes("import.html") || href.includes("finance.html"))) {
                link.style.display = "none";
            }
        });
    }
    // Dynamically bind logout button if it exists on the page
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.onclick = async (e) => {
            e.preventDefault();
            try {
                await authService.signOut();
            }
            catch (err) {
                console.error("Error signing out:", err);
            }
            window.location.href = "login.html";
        };
    }
    return session;
}
