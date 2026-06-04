import { context, formatWeekYear, getColor, normalizeBikeCode } from "./ft.context.js";

// ✅ 1. RENDER ERRORS POPUP
export function renderErrorsPopup(popup: Window, name: string, errors: any[]) {
  const tagCounts: { [key: string]: number } = {};
  const componentCounts: { [key: string]: number } = {};

  errors.forEach(e => {
    const tagName = e.error_tags?.name || "Sin Nombre";
    const compName = e.error_tags?.component || "Otro";
    tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
    componentCounts[compName] = (componentCounts[compName] || 0) + 1;
  });

  const tagLabels = Object.keys(tagCounts);
  const tagData = Object.values(tagCounts);

  const compLabels = Object.keys(componentCounts);
  const compData = Object.values(componentCounts);

  popup.document.open();
  popup.document.write(`
<html>
<head>
  <meta charset="UTF-8" />
  <title>Reporte de Errores - ${name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg-main: #0b0f19;
      --bg-card: #151c2c;
      --border-color: #222e45;
      --text-primary: #f3f4f6;
      --text-secondary: #9ca3af;
      --accent-red: #ef4444;
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
      gap: 25px;
    }
    h2 {
      font-size: 24px;
      font-weight: 700;
      background: linear-gradient(to right, #ef4444, #f59e0b, #ec4899);
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
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 25px;
    }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    }
    .chart {
      height: 300px;
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
    .badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 12px;
      text-transform: uppercase;
    }
    .badge-component {
      background: rgba(6, 182, 212, 0.1);
      color: var(--accent-cyan);
      border: 1px solid rgba(6, 182, 212, 0.2);
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Reporte de Errores: ${name}</h2>
    
    <div class="grid">
      <div class="card">
        <h3>Frecuencia por Etiqueta</h3>
        <div class="chart">
          <canvas id="chart-tags"></canvas>
        </div>
      </div>
      
      <div class="card">
        <h3>Errores por Componente</h3>
        <div class="chart">
          <canvas id="chart-components"></canvas>
        </div>
      </div>
    </div>
    
    <div class="card">
      <h3>Detalle de Errores Registrados</h3>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Bici</th>
            <th>Componente</th>
            <th>Error / Fallo</th>
            <th>Km del Fallo</th>
            <th>Observaciones</th>
          </tr>
        </thead>
        <tbody>
          ${errors.length === 0 ? `
            <tr>
              <td colspan="6" style="text-align: center; color: var(--text-secondary);">No hay errores registrados en este Field Test</td>
            </tr>
          ` : errors.map(e => `
            <tr>
              <td>${new Date(e.error_date).toLocaleDateString()}</td>
              <td>
                <strong>${e.bikes?.bikecode ?? "—"}</strong>
                ${e.motor_code ? `<br/><span style="font-size: 11px; color: var(--text-secondary);">Motor: ${e.motor_code}</span>` : ""}
                ${e.battery_code ? `<br/><span style="font-size: 11px; color: var(--text-secondary);">Batería: ${e.battery_code}</span>` : ""}
              </td>
              <td><span class="badge badge-component">${e.error_tags?.component ?? "—"}</span></td>
              <td><span style="color: var(--accent-red); font-weight: 600;">${e.error_tags?.name ?? "—"}</span></td>
              <td>${Number(e.km_at_failure || 0).toFixed(1)} km</td>
              <td>${e.description ?? "—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    function getColor(i) {
      const colors = ["#ef4444", "#f59e0b", "#ec4899", "#6366f1", "#06b6d4", "#10b981", "#8b5cf6"];
      return colors[i % colors.length];
    }

    new Chart(document.getElementById("chart-tags"), {
      type: "bar",
      data: {
        labels: ${JSON.stringify(tagLabels)},
        datasets: [{
          label: "Cantidad",
          data: ${JSON.stringify(tagData)},
          backgroundColor: ${JSON.stringify(tagData.map((_, i) => `getColor(${i})`))}
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: '#222e45' }, ticks: { color: '#9ca3af' } },
          y: { grid: { color: '#222e45' }, ticks: { color: '#9ca3af', stepSize: 1 } }
        }
      }
    });

    new Chart(document.getElementById("chart-components"), {
      type: "doughnut",
      data: {
        labels: ${JSON.stringify(compLabels)},
        datasets: [{
          data: ${JSON.stringify(compData)},
          backgroundColor: ${JSON.stringify(compData.map((_, i) => `getColor(${i + 3})`))},
          borderColor: "#151c2c",
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: { color: '#f3f4f6', font: { family: 'Inter' } }
          }
        }
      }
    });
  </script>
</body>
</html>
  `);
  popup.document.close();
}

// Helper to generate weeks between two dates
function getWeeksBetween(startWeekStr: string, endWeekStr: string): string[] {
  const weeksList: string[] = [];
  const current = new Date(startWeekStr);
  const end = new Date(endWeekStr);
  
  current.setHours(12, 0, 0, 0);
  end.setHours(12, 0, 0, 0);

  let limit = 0;
  while (current <= end && limit < 1000) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const date = String(current.getDate()).padStart(2, "0");
    weeksList.push(`${year}-${month}-${date}`);
    
    current.setDate(current.getDate() + 7);
    limit++;
  }
  return weeksList;
}

// ✅ 2. RENDER BIKE DETAILS / METRICS & ERRORS POPUP
export async function renderBikePopup(popup: Window, bikecode: string, data: any[], fieldTestId: string) {
  const allBikes = await context.service.getAllBikes();
  const bike = allBikes.find(b => {
    const normB = normalizeBikeCode(b.bikecode || "")?.toLowerCase();
    const normSearch = normalizeBikeCode(bikecode || "")?.toLowerCase();
    return normB === normSearch;
  });

  const history = bike ? await context.service.getBikeHistory(bike.id) : [];
  let errorTags: any[] = [];
  let bikeErrors: any[] = [];
  let errorSystemEnabled = true;
  try {
    errorTags = await context.service.getErrorTags();
  } catch (err) {
    console.warn("Could not load error tags in popup:", err);
    errorSystemEnabled = false;
  }
  try {
    if (bike && errorSystemEnabled) {
      bikeErrors = await context.service.getBikeErrors(fieldTestId, bike.id);
    }
  } catch (err) {
    console.warn("Could not load bike errors in popup:", err);
  }

  // Generate continuous timeline of weeks
  let minWeek: string | null = null;
  let maxWeek: string | null = null;

  if (data.length > 0) {
    const sortedRides = [...data.map(d => d.week)].sort();
    minWeek = sortedRides[0];
    maxWeek = sortedRides[sortedRides.length - 1];
  }

  // Include error weeks to make sure the error is always visible in the timeline
  bikeErrors.forEach((e: any) => {
    const errorDate = new Date(e.error_date);
    const day = errorDate.getDay();
    const diff = errorDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(errorDate.setDate(diff));
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, "0");
    const date = String(monday.getDate()).padStart(2, "0");
    const mondayStr = `${year}-${month}-${date}`;
    
    if (!minWeek || mondayStr < minWeek) minWeek = mondayStr;
    if (!maxWeek || mondayStr > maxWeek) maxWeek = mondayStr;
  });

  const weeks = minWeek && maxWeek ? getWeeksBetween(minWeek, maxWeek) : [];
  const labels = weeks.map(w => formatWeekYear(w));
  const motors = [...new Set(data.map(d => d.motor_code))].sort();
  const batteries = [...new Set(data.map(d => d.battery_code))].sort();

  const datasets: any[] = [];
  
  // Add KM bar datasets
  motors.forEach((motor, i) => {
    datasets.push({
      type: "bar",
      label: `Motor ${motor}`,
      data: weeks.map(w => {
        const row = data.find(d => d.week === w && d.motor_code === motor);
        return row ? row.km : 0;
      }),
      backgroundColor: getColor(i),
      yAxisID: "y",
      order: 2
    });
  });

  // Add Elevation line datasets
  motors.forEach((motor, i) => {
    const weeklyElevations = weeks.map(w => {
      const row = data.find(d => d.week === w && d.motor_code === motor);
      const val = row ? Number(row.elevation || 0) : 0;
      return val > 0 ? val : null;
    });

    // Only add dataset if there's at least one non-null elevation value
    if (weeklyElevations.some(v => v !== null)) {
      datasets.push({
        type: "line",
        label: `Desnivel Motor ${motor}`,
        data: weeklyElevations,
        borderColor: getColor(i + 2),
        backgroundColor: getColor(i + 2),
        borderWidth: 1.5,
        tension: 0.3,
        fill: false,
        yAxisID: "y1",
        pointRadius: 2.5,
        pointHoverRadius: 4.5,
        spanGaps: true,
        order: 1
      });
    }
  });

  const totalKm = data.reduce((acc, r) => acc + r.km, 0);
  const totalElevation = data.reduce((acc, r) => acc + Number(r.elevation || 0), 0);

  const kmByMotor = motors.map(m => {
    const km = data
      .filter(d => d.motor_code === m)
      .reduce((acc, r) => acc + r.km, 0);
    const elevation = data
      .filter(d => d.motor_code === m)
      .reduce((acc, r) => acc + Number(r.elevation || 0), 0);
    return { motor: m, km, elevation };
  });

  const kmByBattery = batteries.map(b => {
    const km = data
      .filter(d => d.battery_code === b)
      .reduce((acc, r) => acc + r.km, 0);
    const elevation = data
      .filter(d => d.battery_code === b)
      .reduce((acc, r) => acc + Number(r.elevation || 0), 0);
    return { battery: b, km, elevation };
  });

  const historyRows = history.map(h => `
    <tr>
      <td>${new Date(h.start_at).toLocaleDateString()}</td>
      <td>${h.component_type}</td>
      <td>${h.component_serial_code ?? "—"}</td>
      <td>${h.component_version ?? "—"}</td>
      <td>${h.notes ?? "—"}</td>
    </tr>
  `).join("");

  const errorRows = bikeErrors.map((e: any) => `
    <tr>
      <td>${new Date(e.error_date).toLocaleDateString()}</td>
      <td>
        <span class="badge badge-component">${e.error_tags?.component ?? "—"}</span>
        ${e.motor_code ? `<br/><span style="font-size: 10px; color: var(--text-secondary); font-weight: bold;">Motor: ${e.motor_code}</span>` : ""}
        ${e.battery_code ? `<br/><span style="font-size: 10px; color: var(--text-secondary); font-weight: bold;">Batería: ${e.battery_code}</span>` : ""}
      </td>
      <td><span style="color: var(--accent-red); font-weight: 600;">${e.error_tags?.name ?? "—"}</span></td>
      <td>${Number(e.km_at_failure || 0).toFixed(1)} km</td>
      <td>${e.description ?? "—"}</td>
      <td style="text-align: right;">
        <button class="btn-delete-error" onclick="deleteError('${e.id}')" style="background: transparent; border: 1px solid rgba(239, 68, 68, 0.2); color: var(--accent-red); padding: 4px 8px; border-radius: 6px; font-size: 11px; cursor: pointer;">Eliminar</button>
      </td>
    </tr>
  `).join("");

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

  const errorChanges = bikeErrors.map((e: any) => {
    const errorDate = new Date(e.error_date);
    const day = errorDate.getDay();
    const diff = errorDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(errorDate.setDate(diff));
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, "0");
    const date = String(monday.getDate()).padStart(2, "0");
    const mondayStr = `${year}-${month}-${date}`;
    const weekLabel = formatWeekYear(mondayStr);
    return {
      weekLabel,
      name: e.error_tags?.name || "Error"
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
      --accent-red: #ef4444;
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
    .chart-container {
      width: 100%;
      height: 400px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 25px;
    }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
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
    .badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 12px;
      text-transform: uppercase;
    }
    .badge-component {
      background: rgba(6, 182, 212, 0.1);
      color: var(--accent-cyan);
      border: 1px solid rgba(6, 182, 212, 0.2);
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

    <div class="card" style="margin-bottom: 0px;">
      <h3>Resumen de Kilómetros y Desnivel</h3>
      <p style="font-size: 15px; margin-bottom: 15px;">
        <strong>Total general:</strong> <span style="color: var(--accent-cyan); font-weight: 600;">${totalKm.toFixed(1)} km</span>
        <span style="color: var(--text-secondary); margin: 0 10px;">|</span>
        <strong>Desnivel positivo:</strong> <span style="color: #10b981; font-weight: 600;">${totalElevation.toLocaleString()} m</span>
      </p>
      <div style="display: flex; gap: 20px;">
        <div style="flex: 1;">
          <h4 style="margin-top: 0; margin-bottom: 8px; color: var(--text-secondary); font-size: 14px;">Motores</h4>
          <table>
            <thead>
              <tr>
                <th>Motor</th>
                <th>Km</th>
                <th>Desnivel</th>
              </tr>
            </thead>
            <tbody>
              ${kmByMotor.map(m => `
                <tr>
                  <td>${m.motor}</td>
                  <td>${m.km.toFixed(1)} km</td>
                  <td>${m.elevation.toLocaleString()} m</td>
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
                <th>Desnivel</th>
              </tr>
            </thead>
            <tbody>
              ${kmByBattery.map(b => `
                <tr>
                  <td>${b.battery}</td>
                  <td>${b.km.toFixed(1)} km</td>
                  <td>${b.elevation.toLocaleString()} m</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="grid" ${!errorSystemEnabled ? 'style="grid-template-columns: 1fr;"' : ''}>
      ${errorSystemEnabled ? `
      <div class="card">
        <h3>Errores Registrados</h3>
        <div style="max-height: 250px; overflow-y: auto; margin-bottom: 15px;">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Componente</th>
                <th>Error</th>
                <th>KM Fallo</th>
                <th>Detalles</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${errorRows || `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">Sin errores registrados</td></tr>`}
            </tbody>
          </table>
        </div>

        <h4 style="margin-top: 20px; margin-bottom: 10px; font-size: 14px; font-weight: 600;">Registrar Fallo / Incidencia</h4>
        <form id="add-error-form" onsubmit="event.preventDefault(); window.opener.handleAddBikeError('${bike?.id}', document.getElementById('new-error-tag').value, document.getElementById('new-error-date').value, document.getElementById('new-error-desc').value); window.location.reload();" style="display: flex; flex-direction: column; gap: 12px; background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); padding: 15px; border-radius: 12px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div class="form-group">
              <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 4px;">Fecha de Ocurrencia</label>
              <input type="date" id="new-error-date" required style="width: 100%; background: var(--bg-main); border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 12px; border-radius: 8px; font-size: 13px;" />
            </div>
            <div class="form-group">
              <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 4px;">Tipo de Error / Componente</label>
              <select id="new-error-tag" required style="width: 100%; background: var(--bg-main); border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 12px; border-radius: 8px; font-size: 13px; cursor: pointer;">
                <option value="">Selecciona un error...</option>
                ${errorTags.map(t => `<option value="${t.id}">${t.name} (${t.component})</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 4px;">Observaciones / Detalles</label>
            <input type="text" id="new-error-desc" placeholder="Ej. Ocurrió subiendo pendientes..." style="width: 100%; background: var(--bg-main); border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 12px; border-radius: 8px; font-size: 13px;" />
          </div>
          <button type="submit" style="background: var(--accent-red); border: 1px solid var(--accent-red); justify-content: center; padding: 10px; font-size: 13px; font-weight: 600; cursor: pointer; color: white; border-radius: 8px; text-transform: uppercase;">
            Registrar Incidencia
          </button>
        </form>
      </div>
      ` : ''}

      <div class="card">
        <h3>Histórico de Componentes</h3>
        <div style="max-height: 480px; overflow-y: auto;">
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
  </div>

  <script>
    const batteryChanges = ${JSON.stringify(batteryChanges)};
    const errorChanges = ${JSON.stringify(errorChanges)};

    function deleteError(id) {
      if (confirm("¿Estás seguro de que deseas eliminar este registro de error?")) {
        window.opener.handleDeleteBikeError(id);
        window.location.reload();
      }
    }

    const dateEl = document.getElementById('new-error-date');
    if (dateEl) {
      dateEl.value = new Date().toISOString().split('T')[0];
    }

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
              ctx.strokeStyle = "#f59e0b"; // amber/orange
              ctx.lineWidth = 1.5;
              ctx.setLineDash([5, 5]);
              ctx.beginPath();
              ctx.moveTo(xPos, top);
              ctx.lineTo(xPos, bottom);
              ctx.stroke();

              ctx.fillStyle = "#f59e0b";
              ctx.font = "bold 10px sans-serif";
              ctx.textBaseline = "bottom";
              ctx.textAlign = "center";
              ctx.setLineDash([]);
              ctx.fillText("🔋 Batería: " + change.serial, xPos, top - 8);
            }
          }
        });
        
        ctx.restore();
      }
    };

    const errorLinesPlugin = {
      id: "errorLines",
      afterDatasetsDraw(chart) {
        const { ctx, chartArea: { top, bottom, left, right }, scales: { x } } = chart;
        ctx.save();

        errorChanges.forEach(change => {
          const idx = chart.data.labels.indexOf(change.weekLabel);
          if (idx !== -1) {
            const xPos = x.getPixelForValue(change.weekLabel);
            if (xPos >= left && xPos <= right) {
              ctx.strokeStyle = "#ef4444"; // red
              ctx.lineWidth = 1.5;
              ctx.setLineDash([5, 5]);
              ctx.beginPath();
              ctx.moveTo(xPos, top);
              ctx.lineTo(xPos, bottom);
              ctx.stroke();

              ctx.fillStyle = "#ef4444";
              ctx.font = "bold 10px sans-serif";
              ctx.textBaseline = "top";
              ctx.textAlign = "center";
              ctx.setLineDash([]);
              ctx.fillText("⚠️ " + change.name, xPos, top + 8);
            }
          }
        });

        ctx.restore();
      }
    };

    new Chart(document.getElementById("chart"), {
      type: "bar",
      plugins: [batteryLinesPlugin, errorLinesPlugin],
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
          y: { 
            stacked: true, 
            grid: { color: '#222e45' }, 
            ticks: { color: '#9ca3af', font: { family: 'Inter' } },
            title: { display: true, text: 'Distancia (KM)', color: '#9ca3af', font: { family: 'Inter', weight: 'bold' } }
          },
          y1: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#10b981', font: { family: 'Inter' } },
            title: { display: true, text: 'Desnivel Positivo (m)', color: '#10b981', font: { family: 'Inter', weight: 'bold' } }
          }
        }
      }
    });
  </script>
</body>
</html>
  `);
  popup.document.close();
}

// ✅ 3. EXPOSE WINDOW GLOBAL HANDLERS
(window as any).handleAddBikeError = async (bikeId: string, errorTagId: string, errorDate: string, desc: string) => {
  try {
    await context.service.addBikeError(context.selectedFTId!, bikeId, errorTagId, errorDate, desc);
    try {
      await context.loadKmSummary();
    } catch (err) {
      console.error(err);
    }
  } catch (err) {
    console.error("Error adding bike error:", err);
    alert("Error al registrar el fallo: " + err);
  }
};

(window as any).handleDeleteBikeError = async (errorId: string) => {
  try {
    await context.service.deleteBikeError(errorId);
    try {
      await context.loadKmSummary();
    } catch (err) {
      console.error(err);
    }
  } catch (err) {
    console.error("Error deleting bike error:", err);
    alert("Error al eliminar el fallo: " + err);
  }
};

(window as any).handleAddGenericError = async (
  targetType: 'bike' | 'motor' | 'battery',
  targetValue: string,
  errorTagId: string,
  errorDate: string,
  desc: string
) => {
  try {
    await context.service.addGenericError(
      context.selectedFTId!,
      targetType,
      targetValue,
      errorTagId,
      errorDate,
      desc
    );
    try {
      await context.loadKmSummary();
    } catch (err) {
      console.error(err);
    }
  } catch (err) {
    console.error("Error adding generic error:", err);
    throw err;
  }
};

// ✅ 4. RENDER INCIDENCE POPUP (POPUP TAB)
export function renderAddErrorPopup(
  popup: Window,
  ftName: string,
  tags: any[],
  bikes: { id: string; code: string; motor?: string; battery?: string }[]
) {
  // Extract unique motors and batteries
  const motors = [...new Set(bikes.map(b => b.motor).filter(Boolean))].sort();
  const batteries = [...new Set(bikes.map(b => b.battery).filter(Boolean))].sort();

  popup.document.open();
  popup.document.write(`
<html>
<head>
  <meta charset="UTF-8" />
  <title>Reportar Incidencia - ${ftName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-main: #0b0f19;
      --bg-card: #151c2c;
      --border-color: #222e45;
      --text-primary: #f3f4f6;
      --text-secondary: #9ca3af;
      --accent-red: #ef4444;
      --accent-cyan: #06b6d4;
      --bg-input: #1e293b;
    }
    body {
      margin: 0;
      padding: 30px;
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-main);
      color: var(--text-primary);
    }
    .card {
      max-width: 600px;
      margin: 0 auto;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
    }
    h2 {
      font-size: 22px;
      font-weight: 700;
      background: linear-gradient(to right, #ef4444, #f59e0b);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-top: 0;
      margin-bottom: 5px;
    }
    .subtitle {
      font-size: 14px;
      color: var(--text-secondary);
      margin-bottom: 25px;
    }
    .form-group {
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    label {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    input, select, textarea {
      width: 100%;
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13.5px;
      outline: none;
      box-sizing: border-box;
    }
    input:focus, select:focus, textarea:focus {
      border-color: var(--accent-cyan);
    }
    .radio-group {
      display: flex;
      gap: 20px;
      margin-top: 5px;
    }
    .radio-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      color: var(--text-primary);
      text-transform: none;
      letter-spacing: normal;
      cursor: pointer;
    }
    .radio-label input {
      width: auto;
      cursor: pointer;
    }
    button {
      background: var(--accent-red);
      border: 1px solid var(--accent-red);
      width: 100%;
      padding: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      color: white;
      border-radius: 8px;
      text-transform: uppercase;
      transition: all 0.2s ease;
      margin-top: 10px;
    }
    button:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>Reportar Incidencia</h2>
    <div class="subtitle">Field Test: <strong>${ftName}</strong></div>

    <form id="generic-error-form" onsubmit="submitForm(event)">
      <div class="form-group">
        <label>Asignar Incidencia A</label>
        <div class="radio-group">
          <label class="radio-label">
            <input type="radio" name="target-type" value="bike" checked onchange="toggleTargets()" />
            Bicicleta
          </label>
          <label class="radio-label">
            <input type="radio" name="target-type" value="motor" onchange="toggleTargets()" />
            Motor
          </label>
          <label class="radio-label">
            <input type="radio" name="target-type" value="battery" onchange="toggleTargets()" />
            Batería
          </label>
        </div>
      </div>

      <!-- Bicicletas Selector -->
      <div class="form-group" id="bike-group">
        <label>Seleccionar Bicicleta</label>
        <select id="bike-select" required>
          <option value="">Selecciona una bicicleta...</option>
          ${bikes.map(b => `<option value="${b.id}">${b.code}</option>`).join("")}
        </select>
      </div>

      <!-- Motores Selector -->
      <div class="form-group" id="motor-group" style="display: none;">
        <label>Seleccionar Motor (Código Serial)</label>
        <select id="motor-select">
          <option value="">Selecciona un motor...</option>
          ${motors.map(m => `<option value="${m}">${m}</option>`).join("")}
        </select>
      </div>

      <!-- Baterías Selector -->
      <div class="form-group" id="battery-group" style="display: none;">
        <label>Seleccionar Batería (Código Serial)</label>
        <select id="battery-select">
          <option value="">Selecciona una batería...</option>
          ${batteries.map(b => `<option value="${b}">${b}</option>`).join("")}
        </select>
      </div>

      <!-- Error Tag Selector -->
      <div class="form-group">
        <label>Tipo de Error / Etiqueta</label>
        <select id="error-tag-select" required>
          <option value="">Selecciona un error...</option>
          ${tags.map(t => `<option value="${t.id}">${t.name} (${t.component})</option>`).join("")}
        </select>
      </div>

      <!-- Fecha de Ocurrencia -->
      <div class="form-group">
        <label>Fecha del Fallo</label>
        <input type="date" id="error-date" required />
      </div>

      <!-- Descripción -->
      <div class="form-group">
        <label>Observaciones / Detalles</label>
        <textarea id="error-desc" placeholder="Ej. El motor dejó de asistir a mitad de ruta en subida pronunciada..." rows="3"></textarea>
      </div>

      <button type="submit">Registrar Incidencia</button>
    </form>
  </div>

  <script>
    // Set default date to today
    document.getElementById('error-date').value = new Date().toISOString().split('T')[0];

    function toggleTargets() {
      const type = document.querySelector('input[name="target-type"]:checked').value;
      
      const bikeGroup = document.getElementById('bike-group');
      const motorGroup = document.getElementById('motor-group');
      const batteryGroup = document.getElementById('battery-group');

      const bikeSelect = document.getElementById('bike-select');
      const motorSelect = document.getElementById('motor-select');
      const batterySelect = document.getElementById('battery-select');

      if (type === 'bike') {
        bikeGroup.style.display = 'flex';
        motorGroup.style.display = 'none';
        batteryGroup.style.display = 'none';

        bikeSelect.required = true;
        motorSelect.required = false;
        batterySelect.required = false;
      } else if (type === 'motor') {
        bikeGroup.style.display = 'none';
        motorGroup.style.display = 'flex';
        batteryGroup.style.display = 'none';

        bikeSelect.required = false;
        motorSelect.required = true;
        batterySelect.required = false;
      } else if (type === 'battery') {
        bikeGroup.style.display = 'none';
        motorGroup.style.display = 'none';
        batteryGroup.style.display = 'flex';

        bikeSelect.required = false;
        motorSelect.required = false;
        batterySelect.required = true;
      }
    }

    async function submitForm(e) {
      e.preventDefault();
      const type = document.querySelector('input[name="target-type"]:checked').value;
      let val = '';
      if (type === 'bike') {
        val = document.getElementById('bike-select').value;
      } else if (type === 'motor') {
        val = document.getElementById('motor-select').value;
      } else if (type === 'battery') {
        val = document.getElementById('battery-select').value;
      }

      const tagId = document.getElementById('error-tag-select').value;
      const date = document.getElementById('error-date').value;
      const desc = document.getElementById('error-desc').value;

      try {
        await window.opener.handleAddGenericError(type, val, tagId, date, desc);
        window.close();
      } catch (err) {
        alert("Error al registrar incidencia: " + err);
      }
    }
  </script>
</body>
</html>
  `);
  popup.document.close();
}

// Bind tag creation form submission
export function initErrorLog() {
  const createTagForm = document.getElementById("create-tag-form") as HTMLFormElement;
  if (!createTagForm) return;

  createTagForm.onsubmit = async (e) => {
    e.preventDefault();
    const nameEl = document.getElementById("new-tag-name") as HTMLInputElement;
    const compEl = document.getElementById("new-tag-component") as HTMLSelectElement;

    try {
      await context.service.createErrorTag(nameEl.value.trim(), compEl.value);
      nameEl.value = "";
      alert("Etiqueta de error creada correctamente.");
      if (context.selectedFTId) {
        try {
          await context.loadKmSummary();
        } catch (err) {
          console.error(err);
        }
      }
    } catch (err) {
      console.error("Error creating tag:", err);
      alert("Error al crear la etiqueta: " + err);
    }
  };
}
