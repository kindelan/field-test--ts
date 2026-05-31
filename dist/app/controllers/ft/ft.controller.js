import { context } from "./ft.context.js";
import { initErrorLog } from "./ft.errorLog.js";
// Make sure sub-controllers are imported so they register themselves in the context
import "./ft.kmSummary.js";
import "./ft.bikeManagement.js";
document.addEventListener("DOMContentLoaded", () => {
    const statusSelect = document.getElementById("selected-ft-status");
    const deleteBtn = document.getElementById("delete-ft-btn");
    const totalEl = document.getElementById("ft-total-km");
    const tbody = document.getElementById("ft-km-tbody");
    const filterSelect = document.getElementById("ft-filter-status");
    const createForm = document.getElementById("create-ft-form");
    /* ============================= */
    createForm.onsubmit = async (e) => {
        e.preventDefault();
        const form = new FormData(createForm);
        const name = form.get("name");
        await context.service.create(name);
        createForm.reset();
        await loadFieldTests();
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
                statusSelect.value = ft.status;
                statusSelect.removeAttribute("disabled");
                deleteBtn.removeAttribute("disabled");
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
        await context.service.updateStatus(context.selectedFTId, statusSelect.value);
        await loadFieldTests();
    };
    deleteBtn.onclick = async () => {
        if (!context.selectedFTId)
            return;
        if (!confirm(`¿Estás seguro de que deseas eliminar el Field Test "${context.selectedFTName}"?`)) {
            return;
        }
        await context.service.delete(context.selectedFTId);
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
    };
    // Register coordinator function in context
    context.loadFieldTests = loadFieldTests;
    // Initialize and run
    loadFieldTests();
    initErrorLog();
});
