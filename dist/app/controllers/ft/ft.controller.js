import { context } from "./ft.context.js";
import { initErrorLog } from "./ft.errorLog.js";
import { requireAuth } from "../../utils/authGuard.js";
import { showToast } from "../../utils/toast.js";
// Make sure sub-controllers are imported so they register themselves in the context
import "./ft.kmSummary.js";
import "./ft.bikeManagement.js";
document.addEventListener("DOMContentLoaded", async () => {
    let session;
    try {
        session = await requireAuth();
        context.userSession = session;
    }
    catch (err) {
        // requireAuth handles redirection
        return;
    }
    const statusSelect = document.getElementById("selected-ft-status");
    const deleteBtn = document.getElementById("delete-ft-btn");
    const totalEl = document.getElementById("ft-total-km");
    const tbody = document.getElementById("ft-km-tbody");
    const filterSelect = document.getElementById("ft-filter-status");
    const createForm = document.getElementById("create-ft-form");
    // Apply read-only view restrictions if user cannot edit data
    if (!session.capabilities.canEditData) {
        if (createForm) {
            createForm.style.display = "none";
            const sidebarSections = document.querySelectorAll(".sidebar h4");
            sidebarSections.forEach(s => {
                if (s.textContent?.includes("Nuevo")) {
                    s.style.display = "none";
                }
            });
        }
        if (deleteBtn) {
            deleteBtn.style.display = "none";
        }
    }
    /* ============================= */
    createForm.onsubmit = async (e) => {
        e.preventDefault();
        const form = new FormData(createForm);
        const name = (form.get("name") || "").trim();
        try {
            await context.service.create(name);
            createForm.reset();
            showToast("Field Test creado con éxito: " + name, "success");
            await loadFieldTests();
        }
        catch (err) {
            console.error(err);
            showToast("Error al crear Field Test: " + (err.message || err), "error");
        }
    };
    async function loadFieldTests() {
        const filter = filterSelect.value;
        const fts = await context.service.listFiltered(filter);
        const list = document.getElementById("ft-list");
        list.innerHTML = "";
        fts.forEach(ft => {
            const btn = document.createElement("button");
            btn.textContent = `${ft.name} (${ft.status})`;
            if (context.selectedFTId === ft.id) {
                btn.classList.add("active");
            }
            btn.onclick = async () => {
                list.querySelectorAll("button").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                context.selectedFTId = ft.id;
                context.selectedFTName = ft.name;
                const heading = document.getElementById("selected-ft-name-heading");
                if (heading)
                    heading.textContent = ft.name;
                if (session.capabilities.canEditData) {
                    statusSelect.value = ft.status;
                    statusSelect.removeAttribute("disabled");
                    deleteBtn.removeAttribute("disabled");
                }
                else {
                    statusSelect.value = ft.status;
                    statusSelect.setAttribute("disabled", "true");
                    if (deleteBtn)
                        deleteBtn.style.display = "none";
                }
                const placeholder = document.getElementById("placeholder-view");
                const detailView = document.getElementById("ft-detail-view");
                if (placeholder)
                    placeholder.style.display = "none";
                if (detailView)
                    detailView.style.display = "block";
                try {
                    await context.loadKmSummary();
                }
                catch (err) {
                    console.error("Error loading KM Summary:", err);
                }
                try {
                    await context.loadBikes();
                }
                catch (err) {
                    console.error("Error loading Bikes:", err);
                }
            };
            list.appendChild(btn);
        });
    }
    filterSelect.onchange = loadFieldTests;
    statusSelect.onchange = async () => {
        if (!context.selectedFTId)
            return;
        try {
            await context.service.updateStatus(context.selectedFTId, statusSelect.value);
            showToast("Estado del Field Test actualizado con éxito a: " + statusSelect.value, "success");
            await loadFieldTests();
        }
        catch (err) {
            console.error(err);
            showToast("Error al actualizar estado: " + (err.message || err), "error");
        }
    };
    deleteBtn.onclick = async () => {
        if (!context.selectedFTId)
            return;
        const ftName = context.selectedFTName;
        if (!confirm(`¿Estás seguro de que deseas eliminar el Field Test "${ftName}"?`)) {
            return;
        }
        try {
            await context.service.delete(context.selectedFTId);
            showToast("Field Test eliminado con éxito: " + ftName, "success");
            context.selectedFTId = null;
            context.selectedFTName = null;
            totalEl.innerHTML = "";
            tbody.innerHTML = "";
            statusSelect.setAttribute("disabled", "true");
            deleteBtn.setAttribute("disabled", "true");
            const placeholder = document.getElementById("placeholder-view");
            const detailView = document.getElementById("ft-detail-view");
            if (placeholder)
                placeholder.style.display = "block";
            if (detailView)
                detailView.style.display = "none";
            await loadFieldTests();
        }
        catch (err) {
            console.error(err);
            showToast("Error al eliminar Field Test: " + (err.message || err), "error");
        }
    };
    // Register coordinator function in context
    context.loadFieldTests = loadFieldTests;
    // Initialize and run
    loadFieldTests();
    initErrorLog();
});
