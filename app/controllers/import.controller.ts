// @ts-ignore
declare const XLSX: any;

import { supabase } from "../dao/supabaseclient.js";
import { normalizeBikeCode } from "../utils/sanitizeBikeCode.js";

function parseRideDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();
  
  // YYYY-MM-DD format
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(cleaned)) {
    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d;
  }
  
  // M/D/YY or M/D/YYYY format (e.g. "4/18/26 16:31:35")
  const slashParts = cleaned.split(/\s+/)[0].split("/");
  if (slashParts.length === 3) {
    const month = parseInt(slashParts[0], 10) - 1;
    const day = parseInt(slashParts[1], 10);
    let year = parseInt(slashParts[2], 10);
    if (year < 100) {
      year += 2000;
    }
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }
  
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("excel-file") as HTMLInputElement;
  const uploadBtn = document.getElementById("upload-btn") as HTMLButtonElement;
  const statusDiv = document.getElementById("import-status") as HTMLElement;
  
  const filterBike = document.getElementById("filter-bike") as HTMLInputElement;
  const filterMotor = document.getElementById("filter-motor") as HTMLInputElement;
  const filterDateStart = document.getElementById("filter-date-start") as HTMLInputElement;
  const filterDateEnd = document.getElementById("filter-date-end") as HTMLInputElement;
  const btnClearFilters = document.getElementById("btn-clear-filters") as HTMLButtonElement;
  
  const tableBody = document.getElementById("summary-body") as HTMLTableSectionElement;

  let rides: any[] = [];
  let uploadedBikeCodes: Set<string> | null = null;

  // Creamos contenedor para el botón de limpiar filtros dinámicamente si no existe
  const clearFilterBtn = document.createElement("button");
  clearFilterBtn.className = "secondary-action";
  clearFilterBtn.style.display = "none";
  clearFilterBtn.style.marginLeft = "10px";
  clearFilterBtn.style.padding = "4px 8px";
  clearFilterBtn.style.fontSize = "12px";
  clearFilterBtn.textContent = "Ver todas las bicis de la BBDD";
  clearFilterBtn.onclick = () => {
    uploadedBikeCodes = null;
    clearFilterBtn.style.display = "none";
    statusDiv.textContent = "Mostrando todas las bicicletas.";
    renderTable();
  };
  statusDiv.parentNode?.insertBefore(clearFilterBtn, statusDiv.nextSibling);

  function correctDistance(dist: number): number {
    if (dist >= 100) {
      const numDigits = String(Math.floor(dist)).length;
      if (numDigits > 2) {
        return dist / Math.pow(10, numDigits - 2);
      }
    }
    return dist;
  }

  function renderTable() {
    const bikeFilter = filterBike.value.trim().toLowerCase();
    const motorFilter = filterMotor.value.trim().toLowerCase();
    const dateStartVal = filterDateStart.value;
    const dateEndVal = filterDateEnd.value;

    const start = dateStartVal ? new Date(dateStartVal + "T00:00:00") : null;
    const end = dateEndVal ? new Date(dateEndVal + "T23:59:59") : null;

    tableBody.innerHTML = "";

    // 1. Filtrar las salidas individuales
    const filteredRides = rides.filter(r => {
      const normCode = normalizeBikeCode(r.bike_code) || r.bike_code;
      
      // Filtro por código de bicicleta
      if (bikeFilter && !normCode.toLowerCase().includes(bikeFilter) && !r.bike_code.toLowerCase().includes(bikeFilter)) {
        return false;
      }

      // Filtro por tipo de motor
      const motorType = r.motor_type || "";
      if (motorFilter && !motorType.toLowerCase().includes(motorFilter)) {
        return false;
      }

      // Filtro de subida (si aplica)
      if (uploadedBikeCodes) {
        const norm = normalizeBikeCode(r.bike_code);
        if (!norm || !uploadedBikeCodes.has(norm.toLowerCase())) {
          return false;
        }
      }

      // Filtro por rango de fechas
      const rideDate = parseRideDate(r.completion_date_txt);
      if (rideDate) {
        if (start && rideDate < start) return false;
        if (end && rideDate > end) return false;
      } else if (start || end) {
        // Excluir registros sin fecha válida si hay filtro activo de fecha
        return false;
      }

      return true;
    });

    // 2. Agrupar y consolidar distancias
    const groupedRows = new Map<string, { bike_code: string; motor_type: string; total_distance_km: number }>();
    filteredRides.forEach(r => {
      const normCode = normalizeBikeCode(r.bike_code) || r.bike_code;
      const motorType = r.motor_type || "—";
      const key = `${normCode.toLowerCase()}|${motorType.toLowerCase()}`;
      
      const dist = correctDistance(Number(r.distance_km || 0));
      const existing = groupedRows.get(key);
      if (existing) {
        existing.total_distance_km += dist;
      } else {
        groupedRows.set(key, {
          bike_code: normCode,
          motor_type: motorType,
          total_distance_km: dist
        });
      }
    });

    const groupedArray = Array.from(groupedRows.values());

    // 3. Renderizar en la tabla
    groupedArray.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.bike_code}</td>
        <td>${r.motor_type}</td>
        <td style="text-align:right">
          ${Number(r.total_distance_km).toFixed(1)} km
        </td>
      `;
      tableBody.appendChild(tr);
    });

    if (uploadedBikeCodes) {
      clearFilterBtn.style.display = "inline-block";
    } else {
      clearFilterBtn.style.display = "none";
    }
  }

  // Listeners de filtros
  filterBike.addEventListener("input", renderTable);
  filterMotor.addEventListener("input", renderTable);
  filterDateStart.addEventListener("change", renderTable);
  filterDateEnd.addEventListener("change", renderTable);

  btnClearFilters.addEventListener("click", () => {
    filterBike.value = "";
    filterMotor.value = "";
    filterDateStart.value = "";
    filterDateEnd.value = "";
    uploadedBikeCodes = null;
    clearFilterBtn.style.display = "none";
    statusDiv.textContent = "Filtros limpiados. Mostrando todas las bicicletas.";
    renderTable();
  });

  async function loadRidesFromDB() {
    let all: any[] = [];
    let start = 0;
    while (true) {
      const { data, error } = await supabase
        .from("test_ride_log")
        .select("bike_code, motor_type, distance_km, completion_date_txt")
        .range(start, start + 999);

      if (error) {
        console.error(error);
        statusDiv.textContent = "❌ Error cargando datos de la BBDD";
        rides = [];
        renderTable();
        return;
      }

      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < 1000) break;
      start += 1000;
    }

    rides = all;
    renderTable();
  }

  uploadBtn.addEventListener("click", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    statusDiv.textContent = "Importando Excel…";
    clearFilterBtn.style.display = "none";

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const excelRows = XLSX.utils.sheet_to_json(sheet, {
      raw: false,
      defval: null
    });

    // Guardar los códigos de bicicleta del Excel para filtrar la tabla después
    uploadedBikeCodes = new Set<string>();
    excelRows.forEach((r: any) => {
      const bikeCodeRaw = r["Bike Code"] ?? r["Bike code2"];
      if (bikeCodeRaw) {
        const norm = normalizeBikeCode(String(bikeCodeRaw));
        if (norm) {
          uploadedBikeCodes!.add(norm.toLowerCase());
        }
      }
    });

    // Guardar estado previo de kilómetros por bici/motor para calcular diferencias
    const preTotals = new Map<string, number>();
    rides.forEach(r => {
      const norm = normalizeBikeCode(r.bike_code) || r.bike_code;
      const motorType = r.motor_type || "—";
      const key = `${norm.toLowerCase()}|${motorType.toLowerCase()}`;
      preTotals.set(key, (preTotals.get(key) || 0) + correctDistance(Number(r.distance_km || 0)));
    });

    const { data: result, error } =
      await supabase.functions.invoke(
        "import-field-test",
        { body: excelRows }
      );

    if (error) {
      console.error(error);
      statusDiv.textContent = "❌ Error importando Excel";
      uploadedBikeCodes = null;
      return;
    }

    fileInput.value = "";
    
    // Recargar datos individuales y calcular la diferencia por bici
    await loadRidesFromDB();

    const postTotals = new Map<string, number>();
    rides.forEach(r => {
      const norm = normalizeBikeCode(r.bike_code) || r.bike_code;
      const motorType = r.motor_type || "—";
      const key = `${norm.toLowerCase()}|${motorType.toLowerCase()}`;
      postTotals.set(key, (postTotals.get(key) || 0) + correctDistance(Number(r.distance_km || 0)));
    });

    const deltas: string[] = [];
    postTotals.forEach((kmNew, key) => {
      const kmOld = preTotals.get(key) || 0;
      const diff = kmNew - kmOld;
      if (diff > 0.05) {
        const [bike, motor] = key.split("|");
        // Buscar el caso original registrado para mantener la estética
        const originalBike = rides.find(r => (normalizeBikeCode(r.bike_code) || r.bike_code).toLowerCase() === bike)?.bike_code || bike;
        const originalMotor = rides.find(r => (r.motor_type || "").toLowerCase() === motor)?.motor_type || motor;
        deltas.push(`${originalBike} (${originalMotor}): +${diff.toFixed(1)} km`);
      }
    });

    let deltaMsg = "";
    if (deltas.length > 0) {
      deltaMsg = `<div style="margin-top: 8px; font-size: 13px; font-weight: normal; color: var(--accent-cyan);">` +
        `<strong>Crecimiento de kilómetros:</strong> ${deltas.join(', ')}` +
        `</div>`;
    }

    statusDiv.innerHTML =
      `<div><strong>¡Excel importado correctamente!</strong></div>` +
      `<div style="margin-top: 5px; font-size: 13px;">Registros nuevos insertados: <strong style="color: var(--accent-green);">${result.inserted}</strong> (de ${result.attempted} procesados).</div>` +
      `${deltas.length > 0 ? deltaMsg : '<div style="margin-top: 5px; font-size: 13px; color: var(--text-secondary);">No se registraron nuevos kilómetros.</div>'}`;
  });

  loadRidesFromDB();
});