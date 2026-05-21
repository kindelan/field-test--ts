// @ts-ignore
declare const XLSX: any;

import { supabase } from "../dao/supabaseclient.js";

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("excel-file") as HTMLInputElement;
  const uploadBtn = document.getElementById("upload-btn") as HTMLButtonElement;
  const statusDiv = document.getElementById("import-status") as HTMLElement;
  const filterBike = document.getElementById("filter-bike") as HTMLInputElement;
  const filterMotor = document.getElementById("filter-motor") as HTMLInputElement;
  const tableBody = document.getElementById("summary-body") as HTMLTableSectionElement;

  let rows: any[] = [];

  function renderTable() {
    const bikeFilter = filterBike.value.toLowerCase();
    const motorFilter = filterMotor.value.toLowerCase();

    tableBody.innerHTML = "";

    rows
      .filter(r =>
        r.bike_code.toLowerCase().includes(bikeFilter) &&
        r.motor_type.toLowerCase().includes(motorFilter)
      )
      .forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${r.bike_code}</td>
          <td>${r.motor_type}</td>
          <td style="text-align:right">
            ${Number(r.total_distance_km).toFixed(1)}
          </td>
        `;
        tableBody.appendChild(tr);
      });
  }

  filterBike.addEventListener("input", renderTable);
  filterMotor.addEventListener("input", renderTable);

  async function loadTotalsFromDB() {
    const { data, error } = await supabase
      .from("bike_totals")
      .select("*");

    if (error) {
      console.error(error);
      statusDiv.textContent = "❌ Error cargando datos de la BBDD";
      rows = [];
      renderTable();
      return;
    }

    rows = data ?? [];
    renderTable();
  }

  uploadBtn.addEventListener("click", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    statusDiv.textContent = "Importando Excel…";

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const excelRows = XLSX.utils.sheet_to_json(sheet, {
      raw: false,
      defval: null
    });

    const { data: result, error } =
      await supabase.functions.invoke(
        "import-field-test",
        { body: excelRows }
      );

    if (error) {
      console.error(error);
      statusDiv.textContent = "❌ Error importando Excel";
      return;
    }

    statusDiv.textContent =
      `✅ Importado. Intentados: ${result.attempted}, Insertados: ${result.inserted}`;

    fileInput.value = "";
    await loadTotalsFromDB();
  });

  loadTotalsFromDB();
});
``