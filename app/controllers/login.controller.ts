import { supabase } from "../dao/supabaseclient.js";
import { AuthService } from "../services/auth.service.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form") as HTMLFormElement;
  const emailInput = document.getElementById("email-input") as HTMLInputElement;
  const passwordInput = document.getElementById("password-input") as HTMLInputElement;
  const submitBtn = document.getElementById("submit-btn") as HTMLButtonElement;
  const errorAlert = document.getElementById("error-alert") as HTMLDivElement;

  const authService = new AuthService();

  // Redirect to appropriate page if already authenticated
  (async () => {
    try {
      const session = await authService.getSession();
      if (session) {
        if (session.capabilities.canViewDashboard) {
          window.location.href = "ft.html";
        } else {
          window.location.href = "form.html";
        }
      }
    } catch (e) {
      console.warn("Failed to check initial session:", e);
    }
  })();

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) return;

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

        if (session.capabilities.canViewDashboard) {
          window.location.href = "ft.html";
        } else {
          window.location.href = "form.html";
        }

      } catch (err: any) {
        console.error(err);
        errorAlert.textContent = err.message || "Error desconocido durante el inicio de sesión.";
        errorAlert.style.display = "block";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Iniciar Sesión";
      }
    };
  }
});
