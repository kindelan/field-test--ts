import { supabase } from "../dao/supabaseclient.js";
import { AuthService } from "../services/auth.service.js";
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    const emailInput = document.getElementById("email-input");
    const passwordInput = document.getElementById("password-input");
    const submitBtn = document.getElementById("submit-btn");
    const errorAlert = document.getElementById("error-alert");
    const authService = new AuthService();
    // Redirect to dashboard if already authenticated with correct capabilities
    (async () => {
        try {
            const session = await authService.getSession();
            if (session && session.capabilities.canViewDashboard) {
                window.location.href = "ft.html";
            }
        }
        catch (e) {
            console.warn("Failed to check initial session:", e);
        }
    })();
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            if (!email || !password)
                return;
            submitBtn.disabled = true;
            submitBtn.textContent = "Cargando...";
            errorAlert.style.display = "none";
            errorAlert.textContent = "";
            try {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) {
                    throw new Error(error.message);
                }
                // Get session detail to verify capabilities
                const session = await authService.getSession();
                if (!session) {
                    throw new Error("No se pudo iniciar la sesión o recuperar el perfil.");
                }
                if (!session.capabilities.canViewDashboard) {
                    // Sign out immediately if they don't have access to dashboards
                    await authService.signOut();
                    throw new Error("Acceso restringido. Este panel de control es exclusivo para empleados de Mahle y administradores.");
                }
                // Access approved, redirect
                window.location.href = "ft.html";
            }
            catch (err) {
                console.error(err);
                errorAlert.textContent = err.message || "Error desconocido durante el inicio de sesión.";
                errorAlert.style.display = "block";
            }
            finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Iniciar Sesión";
            }
        };
    }
});
