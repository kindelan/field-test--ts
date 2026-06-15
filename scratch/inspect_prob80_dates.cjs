const XLSX = require('xlsx');
const fs = require('fs');

const filePath = "C:\\Users\\Nacho Perez\\Downloads\\Field test review(1-1859).xlsx";
if (!fs.existsSync(filePath)) {
  console.error("File does not exist:", filePath);
  process.exit(1);
}

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const excelRows = XLSX.utils.sheet_to_json(sheet, {
  raw: false,
  defval: null
});

function getVal(row, ...keys) {
  if (!row) return null;
  const normalizedRow = {};
  for (const k of Object.keys(row)) {
    const cleanKey = k.replace(/\s+/g, " ").trim().toLowerCase();
    normalizedRow[cleanKey] = row[k];
  }

  for (const key of keys) {
    const cleanKey = key.replace(/\s+/g, " ").trim().toLowerCase();
    const val = normalizedRow[cleanKey];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return val;
    }
  }
  return null;
}

function parseDistance(v) {
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  if (s === "") return null;
  const match = s.match(/[\d.,'’‘`´]+/);
  if (!match) return null;
  let numStr = match[0].replace(/[’'‘`´]/g, ".");
  if (numStr.includes(",") && numStr.includes(".")) {
    if (numStr.lastIndexOf(",") > numStr.lastIndexOf(".")) {
      numStr = numStr.replace(/\./g, "").replace(",", ".");
    } else {
      numStr = numStr.replace(/,/g, "");
    }
  } else if (numStr.includes(",")) {
    const commaCount = (numStr.match(/,/g) || []).length;
    if (commaCount > 1) {
      numStr = numStr.replace(/,/g, "");
    } else {
      numStr = numStr.replace(",", ".");
    }
  } else if (numStr.includes(".")) {
    const dotCount = (numStr.match(/\./g) || []).length;
    if (dotCount > 1) {
      numStr = numStr.replace(/\./g, "");
    }
  }
  const n = Number(numStr);
  return Number.isFinite(n) ? n : null;
}

function sanitizeBikeCode(raw) {
  if (!raw) return null;
  let s = String(raw).toUpperCase().trim();
  s = s.replace(/\(.*?\)/g, "");
  s = s.replace(
    /\b(COLOR|NEGRO|NEGRA|BLANCO|BLANCA|PLATA|DIGITAL|PROC|PRO|BICI|CON|SUSPENSION|DELANTERA|GRIS)\b/g,
    ""
  );
  s = s.replace(/[_\-\.]+/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s || null;
}

function normalizeBikeCode(raw) {
  const s = sanitizeBikeCode(raw);
  if (!s) return null;

  const prob = s.match(/\bPROB\s*(\d{1,3})\b/);
  if (prob) return `Prob_${prob[1].padStart(2, "0")}`;

  const onlyNum = s.match(/^0*(\d{1,3})$/);
  if (onlyNum) return `Prob_${onlyNum[1].padStart(2, "0")}`;

  return s.replace(/\s+/g, "_");
}

let totalKm = 0;
const dateGroups = {};

for (let i = 0; i < excelRows.length; i++) {
  const r = excelRows[i];
  const bikeRaw = getVal(r, "Bike Code", "Bike code2", "Bike");
  const bikeNorm = normalizeBikeCode(bikeRaw);

  if (bikeNorm === "Prob_80") {
    const dist = parseDistance(getVal(r, "Distance ridden / Distancia", "Distance ridden/Distancia", "Distance ridden", "Distance (km)", "Distancia (km)", "Distance", "Distancia")) || 0;
    const completion_date_raw = getVal(r, "Completion time", "Completion date", "Date");
    
    totalKm += dist;

    // Group by year-month to see distribution
    if (completion_date_raw) {
      const parts = String(completion_date_raw).split(/\s+/)[0].split("/");
      if (parts.length === 3) {
        let year = parts[2];
        if (year.length === 2) year = "20" + year;
        const key = `${year}-${parts[0].padStart(2, '0')}`;
        dateGroups[key] = (dateGroups[key] || 0) + dist;
      }
    }
  }
}

console.log("Prob_80 Excel total km:", totalKm);
console.log("Monthly distribution of kilometers for Prob_80 in Excel:");
console.log(dateGroups);
