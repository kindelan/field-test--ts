import type { BikeDTO } from "../dto/index.js";
import type { CreateBikeInput } from "../services/bikes.service.js";
import type { BikeHistoryRow } from "../services/bikes.service.js";

/* ======================================================
 * LISTADO DE BICIS
 * ====================================================== */
export function renderBikeList(
  bikes: BikeDTO[],
  container: HTMLElement,
  onSelect: (bike: BikeDTO) => void
) {
  container.innerHTML = "";
  const ul = document.createElement("ul");

  for (const b of bikes) {
    const li = document.createElement("li");
    li.textContent = `${b.bikecode} | ${b.motortype ?? "—"} | ${b.location ?? "—"}`;
    li.style.cursor = "pointer";
    li.onclick = () => onSelect(b);
    ul.appendChild(li);
  }

  container.appendChild(ul);
}

/* ======================================================
 * DETALLE DE BICI
 * ====================================================== */
export function renderBikeDetail(
  bike: BikeDTO,
  container: HTMLElement,
  onEditMeta: () => void,
  onShowHistory: () => void,
  onChangeMotor: () => void
) {
  container.innerHTML = "";
  container.style.border = "1px solid #333";
  container.style.padding = "12px";
  container.style.marginTop = "15px";

  const title = document.createElement("h2");
  title.textContent = bike.bikecode;
  container.appendChild(title);

  const row = (label: string, value: any) => {
    const p = document.createElement("p");
    p.innerHTML = `<strong>${label}:</strong> ${value ?? "—"}`;
    container.appendChild(p);
  };

  row("Motor", `${bike.motortype} / ${bike.motorcode} / FW ${bike.motorfirmware}`);
  row("Battery", `${bike.batterytype} / ${bike.batterycode} / FW ${bike.batteryfirmware}`);
  row("HMI", `${bike.hmicode} / FW ${bike.hmifirmware}`);
  row("Location", bike.location);
  row("Scope", bike.scope);
  row("Comments", bike.comments);

  const actions = document.createElement("div");

  const edit = document.createElement("button");
  edit.textContent = "✏️ Editar metadatos";
  edit.onclick = onEditMeta;

  const changeMotor = document.createElement("button");
  changeMotor.textContent = "🔧 Cambiar motor";
  changeMotor.style.marginLeft = "8px";
  changeMotor.onclick = onChangeMotor;

  const history = document.createElement("button");
  history.textContent = "📜 Histórico";
  history.style.marginLeft = "8px";
  history.onclick = onShowHistory;

  actions.append(edit, changeMotor, history);
  container.appendChild(actions);
}

/* ======================================================
 * FORMULARIO CAMBIAR MOTOR
 * ====================================================== */
export function renderChangeMotorForm(
  bike: BikeDTO,
  container: HTMLElement,
  onSubmit: (data: {
    motortype: string;
    motorcode: string;
    motorfirmware?: string | null;
  }) => void
) {
  container.innerHTML = "";
  container.style.border = "2px solid #0077cc";
  container.style.padding = "12px";
  container.style.marginTop = "15px";

  const title = document.createElement("h3");
  title.textContent = "Cambiar motor";
  container.appendChild(title);

  const form = document.createElement("form");

  const makeInput = (labelText: string, value?: string | null) => {
    const label = document.createElement("label");
    label.textContent = labelText;
    label.style.display = "block";

    const input = document.createElement("input");
    input.value = value ?? "";
    input.style.width = "100%";

    label.appendChild(input);
    form.appendChild(label);
    return input;
  };

  const typeInput = makeInput("Motor type", bike.motortype);
  const codeInput = makeInput("Motor code", bike.motorcode);
  const fwInput = makeInput("Motor firmware", bike.motorfirmware);

  const save = document.createElement("button");
  save.type = "submit";
  save.textContent = "Guardar";

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancelar";
  cancel.style.marginLeft = "10px";
  cancel.onclick = () => (container.innerHTML = "");

  form.append(save, cancel);

  form.onsubmit = (e) => {
    e.preventDefault();
    if (!typeInput.value || !codeInput.value) {
      alert("Motor type y motor code son obligatorios");
      return;
    }

    onSubmit({
      motortype: typeInput.value.trim(),
      motorcode: codeInput.value.trim(),
      motorfirmware: fwInput.value.trim() || null
    });

    container.innerHTML = "";
  };

  container.appendChild(form);
}

/* ======================================================
 * FORMULARIO EDICIÓN METADATOS
 * ====================================================== */
export function renderEditForm(
  bike: BikeDTO,
  container: HTMLElement,
  onSubmit: (changes: Partial<CreateBikeInput>) => void
) {
  container.innerHTML = "";

  const form = document.createElement("form");

  const fields: (keyof CreateBikeInput)[] = [
    "location",
    "scope",
    "target",
    "comments"
  ];

  const inputs: Record<string, HTMLInputElement> = {};

  for (const f of fields) {
    const label = document.createElement("label");
    label.textContent = f;
    const input = document.createElement("input");
    input.value = (bike as any)[f] ?? "";
    input.style.width = "100%";
    inputs[f] = input;
    label.appendChild(input);
    form.appendChild(label);
  }

  const save = document.createElement("button");
  save.type = "submit";
  save.textContent = "Guardar";

  form.appendChild(save);

  form.onsubmit = (e) => {
    e.preventDefault();
    const changes: any = {};
    for (const k in inputs) {
      if (inputs[k].value !== (bike as any)[k]) {
        changes[k] = inputs[k].value || null;
      }
    }
    onSubmit(changes);
  };

  container.appendChild(form);
}

/* ======================================================
 * HISTÓRICO
 * ====================================================== */
export function renderBikeHistory(
  history: BikeHistoryRow[],
  container: HTMLElement
) {
  container.innerHTML = "<h3>Histórico</h3>";

  if (!history.length) {
    container.append("Sin cambios.");
    return;
  }

  history.forEach(h => {

  const div = document.createElement("div");

  let content = `<b>${h.event_type}</b> – ${new Date(h.changed_at).toLocaleString()}<br/>`;

  const changes = h.changes || {};

  for (const field in changes) {
    const change = changes[field];

    content += `
      ${field}: 
      ${change.old ?? "-"} → ${change.new ?? "-"}<br/>
    `;
  }

  content += "<hr/>";

  div.innerHTML = content;

  container.appendChild(div);
});
};

export function renderChangeComponentForm(
  bike: any,
  container: HTMLElement,
  componentType: string,
  onSubmit: (data: any) => void
) {

  const labels: any = {
    motor: "Motor",
    battery: "Batería",
    hmi: "HMI",
    other: "Otros"
  };

  container.innerHTML = `
    <h3>Cambiar ${labels[componentType] || componentType}</h3>

    <input id="type" placeholder="Type (M40, iM8...)" />
    <input id="code" placeholder="Serial (S252009...)" />
    <input id="fw" placeholder="Firmware" />
    <input id="notes" placeholder="Comentario" />

    <button id="save">Guardar</button>
  `;

  const btn = container.querySelector("#save") as HTMLButtonElement;

  btn.onclick = () => {
    const data = {
      type: (container.querySelector("#type") as HTMLInputElement).value,
      code: (container.querySelector("#code") as HTMLInputElement).value,
      fw: (container.querySelector("#fw") as HTMLInputElement).value,
      notes: (container.querySelector("#notes") as HTMLInputElement).value
    };

    onSubmit(data);
  };
}
