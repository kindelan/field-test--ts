import { supabase } from "../dao/supabaseclient.js";

export interface UserCapabilities {
  canViewDashboard: boolean;
  canEditData: boolean;
  canImportExcel: boolean;
}

export interface UserSession {
  id: string;
  email: string;
  role: "rider" | "viewer" | "admin";
  capabilities: UserCapabilities;
}

export class AuthService {
  async getSession(): Promise<UserSession | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session || !session.user || !session.user.email) {
      return null;
    }
    const email = session.user.email;
    const userId = session.user.id;

    // 1. Check if user is admin
    let isAdmin = false;
    try {
      const { data, error: queryErr } = await supabase
        .from("app_admins")
        .select("email")
        .ilike("email", email.trim().toLowerCase())
        .maybeSingle();

      if (!queryErr && data) {
        isAdmin = true;
      }
    } catch (err) {
      console.error("Error checking admin status:", err);
    }

    // 2. Check if Mahle employee
    const isMahle = email.toLowerCase().endsWith("@mahle.com") || email.toLowerCase().endsWith("@mahle");

    let role: "rider" | "viewer" | "admin" = "rider";
    if (isAdmin) {
      role = "admin";
    } else if (isMahle) {
      role = "viewer";
    }

    const capabilities: UserCapabilities = {
      canViewDashboard: role === "viewer" || role === "admin",
      canEditData: role === "admin",
      canImportExcel: role === "admin",
    };

    return {
      id: userId,
      email,
      role,
      capabilities,
    };
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
}
