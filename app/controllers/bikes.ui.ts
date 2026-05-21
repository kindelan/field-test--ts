import type { BikeDTO } from "../dto/index.js";
import type { CreateBikeInput } from "../services/bikes.service.js";
import type { BikeHistoryRow } from "../services/bikes.service.js";

/* ======================================================
 * LISTADO DE BICIS
 * ====================================================== */
export function renderBikeList(
  bikes: BikeDTO[],
  container: HTMLElement,
  onSelect: (bike: BikeDTO) => void,
  selectedId?: string | null
) {
  container.innerHTML = "";
  const listWrapper = document.createElement("div");
  listWrapper.className = "bike-list-wrapper";

  for (const b of bikes) {
    const card = document.createElement("div");
    card.className = "bike-item-card";
    if (selectedId && b.id === selectedId) {
      card.classList.add("active");
    }

    card.innerHTML = `
      <div class="bike-item-header">
        <span class="bike-item-code">${b.bikecode}</span>
        <span class="bike-item-badge ${b.location ? 'has-loc' : 'no-loc'}">${b.location || "Sin loc."}</span>
      </div>
      <div class="bike-item-details">
        <span>Motor: <strong>${b.motortype || "—"}</strong></span>
        <span>Scope: <strong>${b.scope || "—"}</strong></span>
      </div>
    `;

    card.onclick = () => onSelect(b);
    listWrapper.appendChild(card);
  }

  container.appendChild(listWrapper);
}

/* ======================================================
 * DETALLE DE BICI
 * ====================================================== */
export function renderBikeDetail(
  bike: BikeDTO,
  container: HTMLElement,
  actions: {
    onEditMeta: () => void;
    onShowHistory: () => void;
    onChangeComponent: (type: "motor" | "battery" | "hmi" | "other") => void;
    onClose: () => void;
  }
) {
  container.innerHTML = "";
  
  // Header with title and close button
  const header = document.createElement("div");
  header.className = "panel-header";
  
  const title = document.createElement("h3");
  title.textContent = `Bicicleta: ${bike.bikecode}`;
  
  const closeBtn = document.createElement("button");
  closeBtn.className = "close-btn";
  closeBtn.innerHTML = "✕";
  closeBtn.title = "Cerrar detalles";
  closeBtn.onclick = actions.onClose;
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  container.appendChild(header);

  // Metadata Grid
  const grid = document.createElement("div");
  grid.className = "bike-meta-grid";

  const addMetaCard = (label: string, val: string | null | undefined) => {
    const card = document.createElement("div");
    card.className = "meta-card";
    card.innerHTML = `
      <div class="meta-card-label">${label}</div>
      <div class="meta-card-value">${val && val.trim() !== "" ? val : "—"}</div>
    `;
    grid.appendChild(card);
  };

  const motorDetails = bike.motortype 
    ? `${bike.motortype} (SN: ${bike.motorcode || '—'}, FW: ${bike.motorfirmware || '—'})` 
    : "—";
  addMetaCard("Motor", motorDetails);

  const batteryDetails = bike.batterytype 
    ? `${bike.batterytype} (SN: ${bike.batterycode || '—'}, FW: ${bike.batteryfirmware || '—'})` 
    : "—";
  addMetaCard("Batería", batteryDetails);

  const hmiDetails = bike.hmicode 
    ? `SN: ${bike.hmicode} (FW: ${bike.hmifirmware || '—'})` 
    : "—";
  addMetaCard("HMI", hmiDetails);

  addMetaCard("Ubicación", bike.location);
  addMetaCard("Ámbito (Scope)", bike.scope);
  addMetaCard("Objetivo (Target)", bike.target);
  addMetaCard("Otros", bike.other);
  addMetaCard("Comentarios", bike.comments);

  container.appendChild(grid);

  // Actions group
  const actionGroup = document.createElement("div");
  actionGroup.className = "action-group";

  const editBtn = document.createElement("button");
  editBtn.className = "primary-action";
  editBtn.innerHTML = "✏️ Editar metadatos";
  editBtn.onclick = actions.onEditMeta;
  actionGroup.appendChild(editBtn);

  const changeComponents: { type: "motor" | "battery" | "hmi" | "other"; label: string }[] = [
    { type: "motor", label: "🔧 Cambiar Motor" },
    { type: "battery", label: "🔋 Cambiar Batería" },
    { type: "hmi", label: "🖥️ Cambiar HMI" },
    { type: "other", label: "📦 Cambiar Otros" }
  ];

  changeComponents.forEach(comp => {
    const btn = document.createElement("button");
    btn.textContent = comp.label;
    btn.onclick = () => actions.onChangeComponent(comp.type);
    actionGroup.appendChild(btn);
  });

  const historyBtn = document.createElement("button");
  historyBtn.innerHTML = "📜 Ver Histórico";
  historyBtn.onclick = actions.onShowHistory;
  actionGroup.appendChild(historyBtn);

  container.appendChild(actionGroup);
}

/* ======================================================
 * FORMULARIO EDICIÓN METADATOS
 * ====================================================== */
export function renderEditForm(
  bike: BikeDTO,
  container: HTMLElement,
  onSubmit: (changes: Partial<CreateBikeInput>) => void,
  onClose: () => void
) {
  container.innerHTML = "";

  const header = document.createElement("div");
  header.className = "panel-header";
  
  const title = document.createElement("h3");
  title.textContent = `Editar datos de ${bike.bikecode}`;
  
  const closeBtn = document.createElement("button");
  closeBtn.className = "close-btn";
  closeBtn.innerHTML = "✕";
  closeBtn.onclick = onClose;
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  container.appendChild(header);

  const form = document.createElement("form");

  const fields: { key: keyof CreateBikeInput; label: string; placeholder: string }[] = [
    { key: "location", label: "Ubicación (Location)", placeholder: "Ej. Barcelona, Múnich..." },
    { key: "scope", label: "Ámbito (Scope)", placeholder: "Ej. Test de duración, desarrollo..." },
    { key: "target", label: "Objetivo (Target)", placeholder: "Ej. 5000 km, pruebas de motor..." },
    { key: "comments", label: "Comentarios", placeholder: "Observaciones de la bici..." }
  ];

  const inputs: Record<string, HTMLInputElement | HTMLTextAreaElement> = {};

  fields.forEach(f => {
    const group = document.createElement("div");
    group.className = "form-group";
    
    const label = document.createElement("label");
    label.textContent = f.label;
    
    let input: HTMLInputElement | HTMLTextAreaElement;
    if (f.key === "comments") {
      input = document.createElement("textarea");
    } else {
      input = document.createElement("input");
    }
    input.placeholder = f.placeholder;
    input.value = (bike as any)[f.key] || "";
    inputs[f.key] = input;
    
    group.appendChild(label);
    group.appendChild(input);
    form.appendChild(group);
  });

  const buttonsDiv = document.createElement("div");
  buttonsDiv.className = "form-buttons";

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "cancel-btn";
  cancel.textContent = "Cancelar";
  cancel.onclick = onClose;

  const save = document.createElement("button");
  save.type = "submit";
  save.textContent = "Guardar cambios";

  buttonsDiv.appendChild(cancel);
  buttonsDiv.appendChild(save);
  form.appendChild(buttonsDiv);

  form.onsubmit = (e) => {
    e.preventDefault();
    const changes: any = {};
    for (const k in inputs) {
      const val = inputs[k].value.trim();
      if (val !== ((bike as any)[k] || "")) {
        changes[k] = val || null;
      }
    }
    onSubmit(changes);
  };

  container.appendChild(form);
}

/* ======================================================
 * FORMULARIO CAMBIO COMPONENTE
 * ====================================================== */
export function renderChangeComponentForm(
  bike: any,
  container: HTMLElement,
  componentType: "motor" | "battery" | "hmi" | "other",
  onSubmit: (data: { type: string; code: string; fw?: string | null; notes?: string | null }) => void,
  onClose: () => void
) {
  container.innerHTML = "";

  const labels: Record<string, string> = {
    motor: "Motor",
    battery: "Batería",
    hmi: "HMI",
    other: "Otros"
  };

  const header = document.createElement("div");
  header.className = "panel-header";
  
  const title = document.createElement("h3");
  title.textContent = `Cambiar ${labels[componentType]}`;
  
  const closeBtn = document.createElement("button");
  closeBtn.className = "close-btn";
  closeBtn.innerHTML = "✕";
  closeBtn.onclick = onClose;
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  container.appendChild(header);

  const form = document.createElement("form");

  const createFormGroup = (id: string, labelText: string, placeholder: string, value: string = "") => {
    const group = document.createElement("div");
    group.className = "form-group";
    
    const label = document.createElement("label");
    label.textContent = labelText;
    
    const input = document.createElement("input");
    input.id = id;
    input.placeholder = placeholder;
    input.value = value;
    
    group.appendChild(label);
    group.appendChild(input);
    form.appendChild(group);
    return input;
  };

  // Pre-fill current details if they exist
  let curType = "";
  let curCode = "";
  let curFw = "";

  if (componentType === "motor") {
    curType = bike.motortype || "";
    curCode = bike.motorcode || "";
    curFw = bike.motorfirmware || "";
  } else if (componentType === "battery") {
    curType = bike.batterytype || "";
    curCode = bike.batterycode || "";
    curFw = bike.batteryfirmware || "";
  } else if (componentType === "hmi") {
    curCode = bike.hmicode || "";
    curFw = bike.hmifirmware || "";
  } else if (componentType === "other") {
    if (bike.other && bike.other.includes("/")) {
      const parts = bike.other.split("/");
      curType = parts[0] || "";
      curCode = parts[1] || "";
    }
  }

  let typeInput: HTMLInputElement | null = null;
  if (componentType !== "hmi") {
    typeInput = createFormGroup("type", "Modelo / Tipo", `Ej. M40, iM8, Lithium-Ion...`, curType);
  }
  
  const codeInput = createFormGroup("code", "Código de Serie / Identificador", "Número de serie o código único...", curCode);
  
  let fwInput: HTMLInputElement | null = null;
  if (componentType !== "other") {
    fwInput = createFormGroup("fw", "Versión de Firmware", "Ej. v1.4.2...", curFw);
  }
  
  const notesInput = createFormGroup("notes", "Notas del cambio / Comentario", "Notas sobre el por qué de la sustitución...", "");

  const buttonsDiv = document.createElement("div");
  buttonsDiv.className = "form-buttons";

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "cancel-btn";
  cancel.textContent = "Cancelar";
  cancel.onclick = onClose;

  const save = document.createElement("button");
  save.type = "submit";
  save.textContent = "Guardar Cambio";

  buttonsDiv.appendChild(cancel);
  buttonsDiv.appendChild(save);
  form.appendChild(buttonsDiv);

  form.onsubmit = (e) => {
    e.preventDefault();
    
    const code = codeInput.value.trim();
    const type = typeInput ? typeInput.value.trim() : (componentType === "hmi" ? "HMI" : "");

    if (!code) {
      alert("El código de serie o identificador es obligatorio.");
      return;
    }

    onSubmit({
      type,
      code,
      fw: fwInput ? fwInput.value.trim() : null,
      notes: notesInput.value.trim() || null
    });
  };

  container.appendChild(form);
}

/* ======================================================
 * TIMELINE / HISTORIAL DE CAMBIOS
 * ====================================================== */
export function renderBikeHistory(
  history: BikeHistoryRow[],
  container: HTMLElement,
  onClose: () => void
) {
  container.innerHTML = "";

  const header = document.createElement("div");
  header.className = "panel-header";
  
  const title = document.createElement("h3");
  title.textContent = "Historial de Cambios";
  
  const closeBtn = document.createElement("button");
  closeBtn.className = "close-btn";
  closeBtn.innerHTML = "✕";
  closeBtn.onclick = onClose;
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  container.appendChild(header);

  if (!history || !history.length) {
    const empty = document.createElement("div");
    empty.className = "no-history-placeholder";
    empty.textContent = "Esta bicicleta no registra cambios previos en su historial.";
    container.appendChild(empty);
    return;
  }

  const listWrapper = document.createElement("div");
  listWrapper.className = "history-list-wrapper";

  history.forEach(h => {
    const item = document.createElement("div");
    item.className = `history-item ${h.event_type || ""}`;

    const timeDiv = document.createElement("div");
    timeDiv.className = "history-time";
    timeDiv.textContent = new Date(h.changed_at).toLocaleString();

    const titleDiv = document.createElement("div");
    titleDiv.className = "history-title";
    
    // Human-friendly event names
    let eventName = h.event_type;
    if (h.event_type === "component_change") eventName = "🔧 Cambio de Componente";
    else if (h.event_type === "creation") eventName = "🆕 Creación de Bicicleta";
    else if (h.event_type === "update") eventName = "✏️ Edición de Metadatos";
    
    titleDiv.textContent = eventName;

    item.appendChild(timeDiv);
    item.appendChild(titleDiv);

    // Render detailed field updates
    if (h.changes && Object.keys(h.changes).length > 0) {
      const detailsDiv = document.createElement("div");
      detailsDiv.className = "history-details";
      
      let detailsHTML = "";
      for (const field in h.changes) {
        const change = h.changes[field];
        
        let fieldLabel = field;
        if (field === "motor") fieldLabel = "Motor";
        else if (field === "battery") fieldLabel = "Batería";
        else if (field === "hmi") fieldLabel = "HMI";
        else if (field === "location") fieldLabel = "Ubicación";
        else if (field === "scope") fieldLabel = "Ámbito";
        else if (field === "target") fieldLabel = "Objetivo";
        else if (field === "comments") fieldLabel = "Comentarios";
        
        detailsHTML += `<div><strong>${fieldLabel}:</strong> <span style="text-decoration: line-through; opacity: 0.6;">${change.old || '—'}</span> ➔ <span>${change.new || '—'}</span></div>`;
      }
      detailsDiv.innerHTML = detailsHTML;
      item.appendChild(detailsDiv);
    }

    if (h.snapshot && h.snapshot.notes) {
      const notesSpan = document.createElement("span");
      notesSpan.className = "history-note";
      notesSpan.textContent = `Nota: "${h.snapshot.notes}"`;
      item.appendChild(notesSpan);
    }

    listWrapper.appendChild(item);
  });

  container.appendChild(listWrapper);
}
