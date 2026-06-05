import { AuthService, UserSession } from "../services/auth.service.js";

/**
 * Enforces dashboard authentication.
 * If user is not logged in or doesn't have dashboard access, they are redirected to login.html.
 */
export async function requireAuth(): Promise<UserSession> {
  const authService = new AuthService();
  let session: UserSession | null = null;
  
  try {
    session = await authService.getSession();
  } catch (err) {
    console.error("Failed checking auth status:", err);
  }

  if (!session) {
    window.location.href = "login.html";
    throw new Error("Redirecting to login...");
  }

  if (!session.capabilities.canViewDashboard) {
    try {
      await authService.signOut();
    } catch (e) {
      console.warn("Failed to sign out invalid user:", e);
    }
    window.location.href = "login.html";
    throw new Error("Restricted access redirect...");
  }

  // Dynamically bind logout button if it exists on the page
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.onclick = async (e) => {
      e.preventDefault();
      try {
        await authService.signOut();
      } catch (err) {
        console.error("Error signing out:", err);
      }
      window.location.href = "login.html";
    };
  }

  return session;
}
