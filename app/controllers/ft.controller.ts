import { FieldTestService, FieldTestStatus } from "../services/fieldTest.service.js";

const service = new FieldTestService();

/* ===================================================== */
function formatWeekYear(dateStr: string): string {
  const d = new Date(dateStr);
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `W${week} / ${date.getUTCFullYear()}`;
}

document.addEventListener("DOMContentLoaded", () => {

  let selectedFTId: string | null = null;
  let selectedFTName: string | null = null;

  const statusSelect = document.getElementById("selected-ft-status") as HTMLSelectElement;
  const deleteBtn = document.getElementById("delete-ft-btn") as HTMLButtonElement;
  const totalEl = document.getElementById("ft-total-km")!;
  const tbody = document.getElementById("ft-km-tbody")!;

  const filterSelect = document.getElementById("ft-filter-status") as HTMLSelectElement;
  const createForm = document.getElementById("create-ft-form") as HTMLFormElement;

  /* ============================= */
  createForm.onsubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(createForm);
    const name = form.get("name") as string;

    await service.create(name);
    createForm.reset();
    await loadFieldTests();
  };

  async function loadFieldTests() {
    const filter = filterSelect.value as any;
    const fts = await service.listFiltered(filter);

    const list = document.getElementById("ft-list")!;
    list.innerHTML = "";

    fts.forEach(ft => {
      const btn = document.createElement("button");
      btn.textContent = `${ft.name} (${ft.status})`;

      btn.onclick = async () => {
        selectedFTId = ft.id;
        selectedFTName = ft.name;

        statusSelect.value = ft.status;

        await loadKmSummary();
        await loadBikes();
      };

      list.appendChild(btn);
    });
  }

  filterSelect.onchange = loadFieldTests;

  statusSelect.onchange = async () => {
    if (!selectedFTId) return;

    await service.updateStatus(selectedFTId, statusSelect.value as FieldTestStatus);
    await loadFieldTests();
  };

  deleteBtn.onclick = async () => {
    if (!selectedFTId) return;

    await service.delete(selectedFTId);
    selectedFTId = null;
    totalEl.innerHTML = "";
    tbody.innerHTML = "";

    await loadFieldTests();
  };

  /* ============================= */
  async function loadKmSummary() {
    if (!selectedFTId) return;

    tbody.innerHTML = "";

    const kmTotal = await service.getFieldTestKmTotal(selectedFTId);

totalEl.innerHTML = `
  <strong>Km Field Test:</strong> ${kmTotal.toFixed(1)} km
  <button id="ft-motor-btn">Ver gráfico motores</button>
  <button id="ft-bike-btn">Ver gráfico bicis</button>
`;


    
document.getElementById("ft-motor-btn")!.onclick = async () => {
  const popup = window.open("", "_blank");
  if (!popup) return;

  popup.document.write("<p>Cargando…</p>");

  const data = await service.getFieldTestWeeklyKmByMotor(selectedFTId!);
  simpleMotorPopup(popup, data);
};

document.getElementById("ft-bike-btn")!.onclick = async () => {
  const popup = window.open("", "_blank");
  if (!popup) return;

  popup.document.write("<p>Cargando…</p>");

  const res = await service.getAssignedBikesKmSummary(selectedFTId!);
  simpleBikePopup(popup, res.rows);
};
  

    const res = await service.getAssignedBikesKmSummary(selectedFTId);
    const assigned = await service.getBikesAssigned(selectedFTId);
    const all = await service.getAllBikes();

    const activeIds = new Set(assigned.map(a => a.bikes.id));

    res.rows.forEach(r => {
      const bike = all.find(b => b.bikecode === r.bikecode);
      const isActive = bike && activeIds.has(bike.id);

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${r.bikecode}</td>
        <td>${bike?.motortype ?? "—"}</td>
        <td>${r.km.toFixed(1)}</td>
        <td>${isActive ? "Active" : "No active"}</td>
        <td><button>Ver detalle</button></td>
      `;

      tr.querySelector("button")!.onclick = () => {
        const popup = window.open("", "_blank");
        if (!popup) return;

        popup.document.write("<p>Cargando…</p>");

        (async () => {
          const data = await service.getFieldTestWeeklyKmByMotor(selectedFTId!);
          const filtered = data.filter(d => d.bike_code === r.bikecode);
          renderBikePopup(popup, r.bikecode, filtered);
        })();
      };

      tbody.appendChild(tr);
    });
  }

  /* ============================= */
  async function loadBikes() {
    if (!selectedFTId) return;

    const assignedDiv = document.getElementById("bikes-assigned")!;
    const availableDiv = document.getElementById("bikes-available")!;

    assignedDiv.innerHTML = "";
    availableDiv.innerHTML = "";

    const assigned = await service.getBikesAssigned(selectedFTId);
    const all = await service.getAllBikes();

    const assignedIds = new Set(assigned.map(a => a.bikes.id));

    // ✅ asignadas
    assigned.forEach(r => {
      const div = document.createElement("div");

      const btn = document.createElement("button");
      btn.textContent = "Quitar";

      btn.onclick = async () => {
        await service.unassignBike(r.bikes.id);
        await loadBikes();
        await loadKmSummary();
      };

      div.textContent = r.bikes.bikecode + " ";
      div.appendChild(btn);

      assignedDiv.appendChild(div);
    });

    // ✅ disponibles
    all.forEach(b => {
      if (assignedIds.has(b.id)) return;

      const div = document.createElement("div");

      const btn = document.createElement("button");
      btn.textContent = "Añadir";

      btn.onclick = async () => {
        await service.assignBike(b.id, selectedFTId!);
        await loadBikes();
        await loadKmSummary();
      };

      div.textContent = b.bikecode + " ";
      div.appendChild(btn);

      availableDiv.appendChild(div);
    });
  }

  loadFieldTests();
});

/* ===================================================== */
/* ✅ POPUPS OK */

function renderFieldTestPopup(popup: Window, name: string, data: any[]) {

  const motors = [...new Set(data.map(d => d.motor_code))];

  const totalsByMotor = motors.map(motor => {
    const total = data
      .filter(d => d.motor_code === motor)
      .reduce((acc, r) => acc + r.km, 0);

    return { motor, km: total };
  });

  const labels = totalsByMotor.map(m => m.motor);


const dataset = [{
  label: "KM acumulados",
  data: totalsByMotor.map(m => m.km),
  backgroundColor: totalsByMotor.map((_, i) => getColor(i))
}];

  popup.document.open();
popup.document.write(`

<html>
<head>
<script src="https://cdn.jsdelivr.net/npm/chart.js
  padding: 20px;
  font-family: Arial;
}

canvas {
  width: 100%;
  height: 400px;
}
</style>
</head>

<style>
body {
  margin:0;
  padding:20px;
  font-family: Arial;
}
canvas {
  width:100% !important;
  height:400px !important;
}
</style>

</head>

<body>

<h2>${name}</h2>

<canvas id="chart"></canvas>

<script>
new Chart(document.getElementById("chart"), {
  type: "bar",
  data: {
    labels: ${JSON.stringify(labels)},
    datasets: ${JSON.stringify(dataset)}
  }
});
</script>

</body>
</html>
`);
  popup.document.close();
}


async function renderBikePopup(popup: Window, bikecode: string, data: any[]) {

  const weeks = [...new Set(data.map(d => d.week))].sort();
  const labels = weeks.map(w => formatWeekYear(w));

  const motors = [...new Set(data.map(d => d.motor_code))];

  const datasets = motors.map((motor, i) => ({
    label: `Motor ${motor}`,
    data: weeks.map(w => {
      const row = data.find(d => d.week === w && d.motor_code === motor);
      return row ? row.km : 0;
    }),
    backgroundColor: getColor(i)
  }));

  /* ---------- RESUMEN ---------- */
  const totalKm = data.reduce((acc, r) => acc + r.km, 0);

  const kmByMotor = motors.map(m => {
    const km = data
      .filter(d => d.motor_code === m)
      .reduce((acc, r) => acc + r.km, 0);

    return { motor: m, km };
  });

  /* ---------- HISTÓRICO COMPLETO ---------- */

  const allBikes = await service.getAllBikes();
  const bike = allBikes.find(b => b.bikecode === bikecode);

  const history = bike
    ? await service.getBikeHistory(bike.id)
    : [];

  const historyRows = history.map(h => `
    <tr>
      <td>${new Date(h.start_at).toLocaleDateString()}</td>
      <td>${h.component_type}</td>
      <td>${h.component_serial_code ?? "—"}</td>
      <td>${h.component_version ?? "—"}</td>
    </tr>
  `).join("");

  /* ---------- HTML ---------- */

  popup.document.open();
  popup.document.write(`
<html>
<head>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<style>
body {
  margin:0;
  font-family: Arial;
}

.container {
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 30px;
}

/* ✅ GRÁFICA FULL */
.chart-container {
  width: 100%;
  height: 400px;
}

/* ✅ GRID */
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

/* ✅ CARD */
.card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background: white;
}

/* ✅ TABLA */
table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  border: 1px solid #ccc;
  padding: 6px;
}

th {
  background: #f5f5f5;
}

/* ✅ SCROLL HISTÓRICO */
.history {
  max-height: 250px;
  overflow: auto;
}

</style>

</head>

<body>

<div class="container">

<h2>${bikecode}</h2>

<!-- ✅ GRÁFICA -->
<div class="card">
<h3>KM por semana</h3>

<div class="chart-container">
<canvas id="chart"></canvas>
</div>
</div>

<!-- ✅ RESUMEN -->
<div class="grid">

<div class="card">
<h3>Resumen</h3>

<p><strong>Total:</strong> ${totalKm.toFixed(1)} km</p>

<table>
<tr><th>Motor</th><th>Km</th></tr>
${kmByMotor.map(m => `
<tr>
<td>${m.motor}</td>
<td>${m.km.toFixed(1)}</td>
</tr>
`).join("")}
</table>

</div>

<!-- ✅ HISTORICO -->
<div class="card history">
<h3>Histórico componentes</h3>

<table>
<tr>
<th>Fecha</th>
<th>Tipo</th>
<th>Serial</th>
<th>Versión</th>
</tr>

${historyRows || `<tr><td colspan="4">Sin datos</td></tr>`}

</table>

</div>

</div>

</div>

<script>
new Chart(document.getElementById("chart"), {
  type: "bar",
  data: {
    labels: ${JSON.stringify(labels)},
    datasets: ${JSON.stringify(datasets)}
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { stacked: true },
      y: { stacked: true }
    }
  }
});
</script>

</body>
</html>
`);
  popup.document.close();
}

function getColor(i: number) {
  const colors = ["#4CAF50","#2196F3","#FF9800","#E91E63","#9C27B0"];
  return colors[i % colors.length];
}

function simpleMotorPopup(popup: Window, data: any[]) {

  const motors = [...new Set(data.map(d => d.motor_code))];

  const totals = motors.map(m => {
    const rows = data.filter(d => d.motor_code === m);

    return {
      motor: m,
      km: rows.reduce((acc, r) => acc + r.km, 0)
    };
  });

  popup.document.open();
  popup.document.write(`
<html>
<head>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<style>
body { font-family: Arial; padding:20px; }

.container {
  display:flex;
  flex-direction:column;
  gap:20px;
}

.chart {
  height:350px;
}

table {
  width:100%;
  border-collapse:collapse;
}
th, td {
  border:1px solid #ccc;
  padding:6px;
}
th { background:#f5f5f5; }
</style>

</head>

<body>
<div class="container">

<h2>KM por motor</h2>

<div class="chart">
  <canvas id="chart"></canvas>
</div>

<h3>Resumen</h3>

<table>
<tr><th>Motor</th><th>KM</th></tr>

${totals.map(m => `
<tr>
<td>${m.motor}</td>
<td>${m.km.toFixed(1)}</td>
</tr>
`).join("")}

</table>

</div>

<script>
new Chart(document.getElementById("chart"), {
  type: "bar",
  data: {
    labels: ${JSON.stringify(totals.map(x => x.motor))},
    datasets: [{
      label: "KM",
      data: ${JSON.stringify(totals.map(x => x.km))}
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false
  }
});
</script>

</body>
</html>
  `);
  popup.document.close();
}

function simpleBikePopup(
  popup: Window,
  rows: { bikecode: string; km: number }[]
) {

  const sorted = [...rows].sort((a, b) => b.km - a.km);

  popup.document.open();
  popup.document.write(`
<html>
<head>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<style>
body { font-family: Arial; padding:20px; }

.container {
  display:flex;
  flex-direction:column;
  gap:20px;
}

.chart {
  height:350px;
}

table {
  width:100%;
  border-collapse:collapse;
}
th, td {
  border:1px solid #ccc;
  padding:6px;
}
th { background:#f5f5f5; }
</style>

</head>

<body>
<div class="container">

<h2>KM por bici</h2>

<div class="chart">
  <canvas id="chart"></canvas>
</div>

<h3>Resumen</h3>

<table>
<tr><th>Bici</th><th>KM</th></tr>

${sorted.map(b => `
<tr>
<td>${b.bikecode}</td>
<td>${b.km.toFixed(1)}</td>
</tr>
`).join("")}

</table>

</div>

<script>
new Chart(document.getElementById("chart"), {
  type: "bar",
  data: {
    labels: ${JSON.stringify(sorted.map(x => x.bikecode))},
    datasets: [{
      label: "KM",
      data: ${JSON.stringify(sorted.map(x => x.km))}
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    
    scales: {
      x: { ticks: { autoSkip: false } }
    }
  }
});
</script>

</body>
</html>
  `);

  popup.document.close();
}


