// @ts-ignore
declare const XLSX: any;

import { supabase } from "../dao/supabaseclient.js";
import { normalizeBikeCode } from "../utils/sanitizeBikeCode.js";

/* ======================================================
   HELPERS
====================================================== */

function safeLower(val: any): string {
  return (val ?? "").toString().toLowerCase();
}

// ✅ CLAVE: normalización única
function normBike(val: any): string {
  return safeLower(normalizeBikeCode(val) ?? val ?? "");
}

function parseRideDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();

  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(cleaned)) {
    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d;
  }

  const slashParts = cleaned.split(/\s+/)[0].split("/");
  if (slashParts.length === 3) {
    const month = parseInt(slashParts[0], 10) - 1;
    const day = parseInt(slashParts[1], 10);
    let year = parseInt(slashParts[2], 10);
    if (year < 100) year += 2000;

    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

/* ====================================================== */

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

  /* ====================================================== */

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

  /* ====================================================== */

  function renderTable() {

    const bikeFilter = safeLower(filterBike.value);
    const motorFilter = safeLower(filterMotor.value);

    const start = filterDateStart.value ? new Date(filterDateStart.value + "T00:00:00") : null;
    const end = filterDateEnd.value ? new Date(filterDateEnd.value + "T23:59:59") : null;

    tableBody.innerHTML = "";

    const filteredRides = rides.filter(r => {

      const bikeNorm = normBike(r.bike_code);
      const rawBike = safeLower(r.bike_code);
      const motor = safeLower(r.motor_type);

      if (bikeFilter && !bikeNorm.includes(bikeFilter) && !rawBike.includes(bikeFilter)) {
        return false;
      }

      if (motorFilter && !motor.includes(motorFilter)) {
        return false;
      }

      if (uploadedBikeCodes && !uploadedBikeCodes.has(bikeNorm)) {
        return false;
      }

      const rideDate = parseRideDate(r.completion_date_txt);

      if (rideDate) {
        if (start && rideDate < start) return false;
        if (end && rideDate > end) return false;
      } else if (start || end) {
        return false;
      }

      return true;
    });

    /* ============================= */

    const groupedRows = new Map<string, any>();

    filteredRides.forEach(r => {

      const bikeNorm = normBike(r.bike_code);
      const motor = safeLower(r.motor_type ?? "—");

      const key = `${bikeNorm}|${motor}`;

      const dist = correctDistance(Number(r.distance_km || 0));

      if (groupedRows.has(key)) {
        groupedRows.get(key).total_distance_km += dist;
      } else {
        groupedRows.set(key, {
          bike_code: r.bike_code ?? "—",
          motor_type: r.motor_type ?? "—",
          total_distance_km: dist
        });
      }
    });

    const groupedArray = Array.from(groupedRows.values());

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

    clearFilterBtn.style.display = uploadedBikeCodes ? "inline-block" : "none";
  }

  /* ====================================================== */

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

  /* ====================================================== */

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
        statusDiv.textContent = "❌ Error cargando datos";
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

  /* ====================================================== */

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

    uploadedBikeCodes = new Set<string>();

    excelRows.forEach((r: any) => {
      const raw = r["Bike Code"] ?? r["Bike code2"];
      const norm = normBike(raw);
      if (norm) uploadedBikeCodes!.add(norm);
    });

    const { data: result, error } =
      await supabase.functions.invoke("import-field-test", { body: excelRows });

    if (error) {
      console.error(error);
      statusDiv.textContent = "❌ Error importando Excel";
      uploadedBikeCodes = null;
      return;
    }

    fileInput.value = "";

    await loadRidesFromDB();

    statusDiv.textContent = `✅ Importado (${result?.inserted ?? 0})`;
  });

  loadRidesFromDB();
});