import { context } from "./ft.context.js";
export async function loadBikes() {
    if (!context.selectedFTId)
        return;
    const assignedDiv = document.getElementById("bikes-assigned");
    const availableDiv = document.getElementById("bikes-available");
    assignedDiv.innerHTML = "";
    availableDiv.innerHTML = "";
    const assigned = await context.service.getBikesAssigned(context.selectedFTId);
    const all = await context.service.getAllBikes();
    const activeAssignments = await context.service.getActiveAssignments();
    const assignedIds = new Set(assigned
        .filter(a => a && a.bikes)
        .map(a => a.bikes.id));
    const activeMap = new Map();
    activeAssignments.forEach(a => {
        if (a.bike_id) {
            activeMap.set(a.bike_id, a.field_test?.name || "Otro Test");
        }
    });
    // ✅ asignadas
    assigned.forEach(r => {
        if (!r || !r.bikes)
            return;
        const div = document.createElement("div");
        const btn = document.createElement("button");
        btn.textContent = "Quitar";
        btn.onclick = async () => {
            try {
                await context.service.unassignBike(r.bikes.id);
            }
            catch (err) {
                console.error("Error unassigning bike:", err);
            }
            try {
                await context.loadBikes();
            }
            catch (err) {
                console.error("Error loading bikes:", err);
            }
            try {
                await context.loadKmSummary();
            }
            catch (err) {
                console.error("Error loading KM summary:", err);
            }
        };
        div.textContent = r.bikes.bikecode + " ";
        div.appendChild(btn);
        assignedDiv.appendChild(div);
    });
    // ✅ disponibles
    all.forEach(b => {
        if (assignedIds.has(b.id))
            return;
        const div = document.createElement("div");
        const btn = document.createElement("button");
        const occupiedBy = activeMap.get(b.id);
        if (occupiedBy) {
            btn.textContent = `En ${occupiedBy.trim()}`;
            btn.disabled = true;
        }
        else {
            btn.textContent = "Añadir";
            btn.onclick = async () => {
                try {
                    await context.service.assignBike(b.id, context.selectedFTId);
                }
                catch (err) {
                    console.error("Error assigning bike:", err);
                }
                try {
                    await context.loadBikes();
                }
                catch (err) {
                    console.error("Error loading bikes:", err);
                }
                try {
                    await context.loadKmSummary();
                }
                catch (err) {
                    console.error("Error loading KM summary:", err);
                }
            };
        }
        div.textContent = b.bikecode + " ";
        div.appendChild(btn);
        availableDiv.appendChild(div);
    });
}
// Register the function in context for circular imports avoidance
context.loadBikes = loadBikes;
