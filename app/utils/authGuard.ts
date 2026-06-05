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

  return session;
}
