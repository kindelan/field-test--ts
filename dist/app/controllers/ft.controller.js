import { FieldTestService } from "../services/fieldTest.service.js";
import { normalizeBikeCode } from "../utils/sanitizeBikeCode.js";
const service = new FieldTestService();
/* ===================================================== */
function formatWeekYear(dateStr) {
    const d = new Date(dateStr);
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `W${week} / ${date.getUTCFullYear()}`;
}
document.addEventListener("DOMContentLoaded", () => {
    let selectedFTId = null;
    let selectedFTName = null;
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
        await service.create(name);
        createForm.reset();
        await loadFieldTests();
    };
    async function loadFieldTests() {
        const filter = filterSelect.value;
        const fts = await service.listFiltered(filter);
        const list = document.getElementById("ft-list");
        list.innerHTML = "";
        fts.forEach(ft => {
            const btn = document.createElement("button");
            btn.textContent = `${ft.name} (${ft.status})`;
            if (selectedFTId === ft.id) {
                btn.classList.add("active");
            }
            btn.onclick = async () => {
                list.querySelectorAll("button").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                selectedFTId = ft.id;
                selectedFTName = ft.name;
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
                await loadKmSummary();
                await loadBikes();
            };
            list.appendChild(btn);
        });
    }
    filterSelect.onchange = loadFieldTests;
    statusSelect.onchange = async () => {
        if (!selectedFTId)
            return;
        await service.updateStatus(selectedFTId, statusSelect.value);
        await loadFieldTests();
    };
    deleteBtn.onclick = async () => {
        if (!selectedFTId)
            return;
        if (!confirm(`¿Estás seguro de que deseas eliminar el Field Test "${selectedFTName}"?`)) {
            return;
        }
        await service.delete(selectedFTId);
        selectedFTId = null;
        selectedFTName = null;
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
    /* ============================= */
    async function loadKmSummary() {
        if (!selectedFTId)
            return;
        tbody.innerHTML = "";
        const kmTotal = await service.getFieldTestKmTotal(selectedFTId);
        totalEl.innerHTML = `
  <strong>Km Field Test:</strong> ${kmTotal.toFixed(1)} km
  <button id="ft-motor-btn">Ver gráfico motores</button>
  <button id="ft-bike-btn">Ver gráfico bicis</button>
`;
        document.getElementById("ft-motor-btn").onclick = async () => {
            const popup = window.open("", "_blank");
            if (!popup)
                return;
            popup.document.write("<p>Cargando…</p>");
            const data = await service.getFieldTestWeeklyKmByMotor(selectedFTId);
            simpleMotorPopup(popup, data);
        };
        document.getElementById("ft-bike-btn").onclick = async () => {
            const popup = window.open("", "_blank");
            if (!popup)
                return;
            popup.document.write("<p>Cargando…</p>");
            const res = await service.getAssignedBikesKmSummary(selectedFTId);
            simpleBikePopup(popup, res.rows);
        };
        const res = await service.getAssignedBikesKmSummary(selectedFTId);
        const assigned = await service.getBikesAssigned(selectedFTId);
        const all = await service.getAllBikes();
        const activeIds = new Set(assigned.map(a => a.bikes.id));
        // Agrupar res.rows por código normalizado para evitar filas duplicadas en el desglose de Field Tests
        const groupedKm = new Map();
        res.rows.forEach(r => {
            const norm = normalizeBikeCode(r.bikecode) || r.bikecode;
            const key = norm.toLowerCase();
            const existing = groupedKm.get(key);
            if (existing) {
                existing.km += r.km;
            }
            else {
                groupedKm.set(key, { bikecode: norm, km: r.km });
            }
        });
        const consolidatedRows = Array.from(groupedKm.values());
        consolidatedRows.forEach(r => {
            const bike = all.find(b => {
                const normB = normalizeBikeCode(b.bikecode || "")?.toLowerCase();
                const normR = normalizeBikeCode(r.bikecode || "")?.toLowerCase();
                return normB === normR;
            });
            const isActive = bike && activeIds.has(bike.id);
            const tr = document.createElement("tr");
            tr.innerHTML = `
        <td>${bike?.bikecode ?? r.bikecode}</td>
        <td>${bike?.motorcode ?? "—"}</td>
        <td>${r.km.toFixed(1)} km</td>
        <td>${isActive ? '<span class="status-active">Active</span>' : '<span class="status-inactive">No active</span>'}</td>
        <td style="text-align: right;"><button class="primary-action" style="padding: 4px 8px; font-size: 12px;">Ver detalle</button></td>
      `;
            tr.querySelector("button").onclick = () => {
                const popup = window.open("", "_blank");
                if (!popup)
                    return;
                popup.document.write("<p>Cargando…</p>");
                (async () => {
                    const data = await service.getFieldTestWeeklyKmByMotor(selectedFTId);
                    const filtered = data.filter(d => {
                        const normD = normalizeBikeCode(d.bike_code || "")?.toLowerCase();
                        const normR = normalizeBikeCode(r.bikecode || "")?.toLowerCase();
                        return normD === normR;
                    });
                    renderBikePopup(popup, bike?.bikecode ?? r.bikecode, filtered);
                })();
            };
            tbody.appendChild(tr);
        });
    }
    /* ============================= */
    async function loadBikes() {
        if (!selectedFTId)
            return;
        const assignedDiv = document.getElementById("bikes-assigned");
        const availableDiv = document.getElementById("bikes-available");
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
            if (assignedIds.has(b.id))
                return;
            const div = document.createElement("div");
            const btn = document.createElement("button");
            btn.textContent = "Añadir";
            btn.onclick = async () => {
                await service.assignBike(b.id, selectedFTId);
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
/* ✅ POPUPS OK (PREMIUM DARK AESTHETIC) */
function renderFieldTestPopup(popup, name, data) {
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
  <meta charset="UTF-8" />
  <title>${name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg-main: #0b0f19;
      --bg-card: #151c2c;
      --border-color: #222e45;
      --text-primary: #f3f4f6;
      --text-secondary: #9ca3af;
    }
    body {
      margin: 0;
      padding: 30px;
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-main);
      color: var(--text-primary);
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 25px;
    }
    h2 {
      font-size: 24px;
      font-weight: 700;
      background: linear-gradient(to right, #6366f1, #a855f7, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 20px;
    }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    }
    canvas {
      width: 100% !important;
      height: 400px !important;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>${name}</h2>
    <div class="card">
      <canvas id="chart"></canvas>
    </div>
  </div>
  <script>
    new Chart(document.getElementById("chart"), {
      type: "bar",
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: ${JSON.stringify(dataset)}
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#f3f4f6', font: { family: 'Inter' } } }
        },
        scales: {
          x: { grid: { color: '#222e45' }, ticks: { color: '#9ca3af', font: { family: 'Inter' } } },
          y: { grid: { color: '#222e45' }, ticks: { color: '#9ca3af', font: { family: 'Inter' } } }
        }
      }
    });
  </script>
</body>
</html>
  `);
    popup.document.close();
}
async function renderBikePopup(popup, bikecode, data) {
    const weeks = [...new Set(data.map(d => d.week))].sort();
    const labels = weeks.map(w => formatWeekYear(w));
    const motors = [...new Set(data.map(d => d.motor_code))];
    const batteries = [...new Set(data.map(d => d.battery_code))];
    const datasets = motors.map((motor, i) => ({
        label: `Motor ${motor}`,
        data: weeks.map(w => {
            const row = data.find(d => d.week === w && d.motor_code === motor);
            return row ? row.km : 0;
        }),
        backgroundColor: getColor(i)
    }));
    const totalKm = data.reduce((acc, r) => acc + r.km, 0);
    const kmByMotor = motors.map(m => {
        const km = data
            .filter(d => d.motor_code === m)
            .reduce((acc, r) => acc + r.km, 0);
        return { motor: m, km };
    });
    const kmByBattery = batteries.map(b => {
        const km = data
            .filter(d => d.battery_code === b)
            .reduce((acc, r) => acc + r.km, 0);
        return { battery: b, km };
    });
    const allBikes = await service.getAllBikes();
    const bike = allBikes.find(b => {
        const normB = normalizeBikeCode(b.bikecode || "")?.toLowerCase();
        const normSearch = normalizeBikeCode(bikecode || "")?.toLowerCase();
        return normB === normSearch;
    });
    const history = bike ? await service.getBikeHistory(bike.id) : [];
    const historyRows = history.map(h => `
    <tr>
      <td>${new Date(h.start_at).toLocaleDateString()}</td>
      <td>${h.component_type}</td>
      <td>${h.component_serial_code ?? "—"}</td>
      <td>${h.component_version ?? "—"}</td>
      <td>${h.notes ?? "—"}</td>
    </tr>
  `).join("");
    // Extract battery changes and map them to their corresponding week labels
    const batteryChanges = history
        .filter(h => h.component_type === "battery")
        .map(h => {
        const startAtDate = new Date(h.start_at);
        const day = startAtDate.getDay();
        const diff = startAtDate.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(startAtDate.setDate(diff));
        const year = monday.getFullYear();
        const month = String(monday.getMonth() + 1).padStart(2, "0");
        const date = String(monday.getDate()).padStart(2, "0");
        const mondayStr = `${year}-${month}-${date}`;
        const weekLabel = formatWeekYear(mondayStr);
        return {
            weekLabel,
            serial: h.component_serial_code || "—"
        };
    });
    popup.document.open();
    popup.document.write(`
<html>
<head>
  <meta charset="UTF-8" />
  <title>Detalle Bici - ${bikecode}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg-main: #0b0f19;
      --bg-card: #151c2c;
      --border-color: #222e45;
      --text-primary: #f3f4f6;
      --text-secondary: #9ca3af;
      --accent-cyan: #06b6d4;
    }
    body {
      margin: 0;
      padding: 30px;
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-main);
      color: var(--text-primary);
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 30px;
    }
    h2 {
      font-size: 26px;
      font-weight: 700;
      background: linear-gradient(to right, #6366f1, #06b6d4, #10b981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 5px;
    }
    h3 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
    }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    }
    .chart-container {
      width: 100%;
      height: 400px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 25px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }
    th {
      background: rgba(255, 255, 255, 0.02);
      padding: 12px 14px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-color);
      text-transform: uppercase;
    }
    td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-primary);
      font-size: 14px;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .history {
      max-height: 350px;
      overflow-y: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Bicicleta: ${bikecode}</h2>

    <div class="card">
      <h3>KM por Semana</h3>
      <div class="chart-container">
        <canvas id="chart"></canvas>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <h3>Resumen</h3>
        <p style="font-size: 15px; margin-bottom: 15px;">
          <strong>Total general:</strong> <span style="color: var(--accent-cyan); font-weight: 600;">${totalKm.toFixed(1)} km</span>
        </p>
        <div style="display: flex; gap: 20px;">
          <div style="flex: 1;">
            <h4 style="margin-top: 0; margin-bottom: 8px; color: var(--text-secondary); font-size: 14px;">Motores</h4>
            <table>
              <thead>
                <tr>
                  <th>Motor</th>
                  <th>Km</th>
                </tr>
              </thead>
              <tbody>
                ${kmByMotor.map(m => `
                  <tr>
                    <td>${m.motor}</td>
                    <td>${m.km.toFixed(1)} km</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <div style="flex: 1;">
            <h4 style="margin-top: 0; margin-bottom: 8px; color: var(--text-secondary); font-size: 14px;">Baterías</h4>
            <table>
              <thead>
                <tr>
                  <th>Batería</th>
                  <th>Km</th>
                </tr>
              </thead>
              <tbody>
                ${kmByBattery.map(b => `
                  <tr>
                    <td>${b.battery}</td>
                    <td>${b.km.toFixed(1)} km</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card history">
        <h3>Histórico de Componentes</h3>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Serial</th>
              <th>Versión</th>
              <th>Comentarios</th>
            </tr>
          </thead>
          <tbody>
            ${historyRows || `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">Sin componentes registrados</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    const batteryChanges = ${JSON.stringify(batteryChanges)};

    const batteryLinesPlugin = {
      id: "batteryLines",
      afterDatasetsDraw(chart) {
        const { ctx, chartArea: { top, bottom, left, right }, scales: { x } } = chart;
        ctx.save();
        
        batteryChanges.forEach(change => {
          const idx = chart.data.labels.indexOf(change.weekLabel);
          if (idx !== -1) {
            const xPos = x.getPixelForValue(change.weekLabel);
            if (xPos >= left && xPos <= right) {
              // Draw dashed line
              ctx.strokeStyle = "#f59e0b"; // amber/orange
              ctx.lineWidth = 1.5;
              ctx.setLineDash([5, 5]);
              ctx.beginPath();
              ctx.moveTo(xPos, top);
              ctx.lineTo(xPos, bottom);
              ctx.stroke();

              // Draw vertical text label
              ctx.fillStyle = "#f59e0b";
              ctx.font = "bold 10px sans-serif";
              ctx.textBaseline = "bottom";
              ctx.textAlign = "center";
              ctx.setLineDash([]); // Reset dash for text
              ctx.fillText("🔋 Batería: " + change.serial, xPos, top - 8);
            }
          }
        });
        
        ctx.restore();
      }
    };

    new Chart(document.getElementById("chart"), {
      type: "bar",
      plugins: [batteryLinesPlugin],
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: ${JSON.stringify(datasets)}
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#f3f4f6', font: { family: 'Inter' } } }
        },
        scales: {
          x: { stacked: true, grid: { color: '#222e45' }, ticks: { color: '#9ca3af', font: { family: 'Inter' } } },
          y: { stacked: true, grid: { color: '#222e45' }, ticks: { color: '#9ca3af', font: { family: 'Inter' } } }
        }
      }
    });
  </script>
</body>
</html>
  `);
    popup.document.close();
}
function getColor(i) {
    const colors = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];
    return colors[i % colors.length];
}
function simpleMotorPopup(popup, data) {
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
  <meta charset="UTF-8" />
  <title>KM por Motor</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg-main: #0b0f19;
      --bg-card: #151c2c;
      --border-color: #222e45;
      --text-primary: #f3f4f6;
      --text-secondary: #9ca3af;
      --accent-cyan: #06b6d4;
    }
    body {
      margin: 0;
      padding: 30px;
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-main);
      color: var(--text-primary);
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 25px;
    }
    h2 {
      font-size: 24px;
      font-weight: 700;
      background: linear-gradient(to right, #6366f1, #06b6d4, #10b981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    h3 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
    }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    }
    .chart {
      height: 350px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }
    th {
      background: rgba(255, 255, 255, 0.02);
      padding: 12px 14px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-color);
      text-transform: uppercase;
    }
    td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-primary);
      font-size: 14px;
    }
    tr:last-child td {
      border-bottom: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>KM por Motor</h2>
    <div class="card">
      <div class="chart">
        <canvas id="chart"></canvas>
      </div>
    </div>
    
    <div class="card">
      <h3>Resumen por Motores</h3>
      <table>
        <thead>
          <tr>
            <th>Motor</th>
            <th>KM Acumulados</th>
          </tr>
        </thead>
        <tbody>
          ${totals.map(m => `
            <tr>
              <td>${m.motor}</td>
              <td>${m.km.toFixed(1)} km</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    new Chart(document.getElementById("chart"), {
      type: "bar",
      data: {
        labels: ${JSON.stringify(totals.map(x => x.motor))},
        datasets: [{
          label: "KM",
          data: ${JSON.stringify(totals.map(x => x.km))},
          backgroundColor: ${JSON.stringify(totals.map((_, i) => getColor(i)))}
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { color: '#222e45' }, ticks: { color: '#9ca3af', font: { family: 'Inter' } } },
          y: { grid: { color: '#222e45' }, ticks: { color: '#9ca3af', font: { family: 'Inter' } } }
        }
      }
    });
  </script>
</body>
</html>
  `);
    popup.document.close();
}
function simpleBikePopup(popup, rows) {
    const sorted = [...rows].sort((a, b) => b.km - a.km);
    popup.document.open();
    popup.document.write(`
<html>
<head>
  <meta charset="UTF-8" />
  <title>KM por Bici</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg-main: #0b0f19;
      --bg-card: #151c2c;
      --border-color: #222e45;
      --text-primary: #f3f4f6;
      --text-secondary: #9ca3af;
      --accent-cyan: #06b6d4;
    }
    body {
      margin: 0;
      padding: 30px;
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-main);
      color: var(--text-primary);
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 25px;
    }
    h2 {
      font-size: 24px;
      font-weight: 700;
      background: linear-gradient(to right, #6366f1, #06b6d4, #10b981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    h3 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
    }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    }
    .chart {
      height: 350px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }
    th {
      background: rgba(255, 255, 255, 0.02);
      padding: 12px 14px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-color);
      text-transform: uppercase;
    }
    td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-primary);
      font-size: 14px;
    }
    tr:last-child td {
      border-bottom: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>KM por Bici</h2>
    <div class="card">
      <div class="chart">
        <canvas id="chart"></canvas>
      </div>
    </div>

    <div class="card">
      <h3>Resumen por Bicicletas</h3>
      <table>
        <thead>
          <tr>
            <th>Bici</th>
            <th>KM Acumulados</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(b => `
            <tr>
              <td>${b.bikecode}</td>
              <td>${b.km.toFixed(1)} km</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    new Chart(document.getElementById("chart"), {
      type: "bar",
      data: {
        labels: ${JSON.stringify(sorted.map(x => x.bikecode))},
        datasets: [{
          label: "KM",
          data: ${JSON.stringify(sorted.map(x => x.km))},
          backgroundColor: ${JSON.stringify(sorted.map((_, i) => getColor(i)))}
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { autoSkip: false, color: '#9ca3af', font: { family: 'Inter' } }, grid: { color: '#222e45' } },
          y: { grid: { color: '#222e45' }, ticks: { color: '#9ca3af', font: { family: 'Inter' } } }
        }
      }
    });
  </script>
</body>
</html>
  `);
    popup.document.close();
}
