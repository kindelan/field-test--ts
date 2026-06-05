import { supabase } from "../dao/supabaseclient.js";
export class AuthService {
    async getSession() {
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
                .eq("email", email)
                .maybeSingle();
            if (!queryErr && data) {
                isAdmin = true;
            }
        }
        catch (err) {
            console.error("Error checking admin status:", err);
        }
        // 2. Check if Mahle employee
        const isMahle = email.toLowerCase().endsWith("@mahle.com") || email.toLowerCase().endsWith("@mahle");
        let role = "rider";
        if (isAdmin) {
            role = "admin";
        }
        else if (isMahle) {
            role = "viewer";
        }
        const capabilities = {
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
    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error)
            throw error;
    }
}
