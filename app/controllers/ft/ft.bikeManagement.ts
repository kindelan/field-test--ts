import { context } from "./ft.context.js";
import { showToast } from "../../utils/toast.js";

export async function loadBikes() {
  if (!context.selectedFTId) return;

  const assignedDiv = document.getElementById("bikes-assigned")!;
  const availableDiv = document.getElementById("bikes-available")!;

  assignedDiv.innerHTML = "";
  availableDiv.innerHTML = "";

  const assigned = await context.service.getBikesAssigned(context.selectedFTId);
  const all = await context.service.getAllBikes();
  const activeAssignments = await context.service.getActiveAssignments();

  const assignedIds = new Set(
    assigned
      .filter(a => a && a.bikes)
      .map(a => (a.bikes as any).id)
  );
  const activeMap = new Map<string, string>();
  activeAssignments.forEach(a => {
    if (a.bike_id) {
      activeMap.set(a.bike_id, a.field_test?.name || "Otro Test");
    }
  });

  // ✅ asignadas
  assigned.forEach(r => {
    if (!r || !r.bikes) return;
    const div = document.createElement("div");

    const btn = document.createElement("button");
    btn.textContent = "Quitar";
    if (context.userSession && !context.userSession.capabilities.canEditData) {
      btn.disabled = true;
      btn.style.display = "none";
    }

    btn.onclick = async () => {
      const bikecode = (r.bikes as any).bikecode;
      try {
        await context.service.unassignBike((r.bikes as any).id);
        showToast(`Bicicleta ${bikecode} quitada con éxito`, "success");
      } catch (err: any) {
        console.error("Error unassigning bike:", err);
        showToast("Error al quitar bicicleta: " + (err.message || err), "error");
      }
      try {
        await context.loadBikes();
      } catch (err) {
        console.error("Error loading bikes:", err);
      }
      try {
        await context.loadKmSummary();
      } catch (err) {
        console.error("Error loading KM summary:", err);
      }
    };

    div.textContent = (r.bikes as any).bikecode + " ";
    div.appendChild(btn);

    assignedDiv.appendChild(div);
  });

  // ✅ disponibles
  all.forEach(b => {
    if (assignedIds.has(b.id)) return;

    const div = document.createElement("div");

    const btn = document.createElement("button");
    const occupiedBy = activeMap.get(b.id);

    if (occupiedBy) {
      btn.textContent = `En ${occupiedBy.trim()}`;
      btn.disabled = true;
    } else {
      btn.textContent = "Añadir";
      if (context.userSession && !context.userSession.capabilities.canEditData) {
        btn.disabled = true;
        btn.style.display = "none";
      }
      btn.onclick = async () => {
        try {
          await context.service.assignBike(b.id, context.selectedFTId!);
          showToast(`Bicicleta ${b.bikecode} añadida con éxito`, "success");
        } catch (err: any) {
          console.error("Error assigning bike:", err);
          showToast("Error al añadir bicicleta: " + (err.message || err), "error");
        }
        try {
          await context.loadBikes();
        } catch (err) {
          console.error("Error loading bikes:", err);
        }
        try {
          await context.loadKmSummary();
        } catch (err) {
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
