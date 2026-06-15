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

function parseElevation(v) {
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
  } else {
    const hasComma = numStr.includes(",");
    const hasDot = numStr.includes(".");
    const separator = hasComma ? "," : ".";
    const separatorCount = (numStr.match(new RegExp("\\" + separator, "g")) || []).length;

    if (separatorCount > 1) {
      numStr = numStr.replace(new RegExp("\\" + separator, "g"), "");
    } else if (separatorCount === 1) {
      const parts = numStr.split(separator);
      const integerPart = parts[0];
      const decimalPart = parts[1];

      if (decimalPart.length === 3 && Number(integerPart) < 100) {
        numStr = integerPart + decimalPart;
      } else {
        numStr = integerPart + "." + decimalPart;
      }
    }
  }

  const n = Number(numStr);
  return Number.isFinite(n) ? n : null;
}

function pad2(n) {
  const clean = String(parseInt(n, 10));
  return clean.padStart(2, "0");
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
  if (prob) return `Prob_${pad2(prob[1])}`;

  const onlyNum = s.match(/^0*(\d{1,3})$/);
  if (onlyNum) return `Prob_${pad2(onlyNum[1])}`;

  const x20 = s.match(/^X\s*20\s*(\d{1,2})?$/);
  if (x20) return x20[1] ? `X20_${pad2(x20[1])}` : "X20";

  const x30 = s.match(/^X\s*30\s*(\d{1,2})?$/);
  if (x30) return x30[1] ? `X30_${pad2(x30[1])}` : "X30";

  const familyNum = s.match(/^(XS|PF|PB)\s*(\d{1,3})$/);
  if (familyNum) {
    return `${familyNum[1]}_${pad2(familyNum[2])}`;
  }

  return s.replace(/\s+/g, "_");
}

const xMotorRides = [];

for (let i = 0; i < excelRows.length; i++) {
  const r = excelRows[i];
  const motor_type = getVal(r, "Motor type", "Motor");
  if (motor_type && motor_type.startsWith("X")) {
    const bike_code_raw = getVal(r, "Bike Code", "Bike code2", "Bike");
    const bike_code_sanitized = normalizeBikeCode(bike_code_raw) || bike_code_raw;
    const distance_km = parseDistance(getVal(r, "Distance ridden / Distancia", "Distance ridden/Distancia", "Distance ridden", "Distance (km)", "Distancia (km)", "Distance", "Distancia"));
    const elevation_m = parseElevation(getVal(r, "elevation / Desnivel positive", "elevation / Desnivel positivo", "elevation/Desnivel positive", "elevation/Desnivel positivo", "elevation", "Desnivel", "Desnivel positivo", "Desnivel positive", "Elevation (m)", "Desnivel (m)"));

    xMotorRides.push({
      rowNum: i + 2,
      bike_code_raw,
      bike_code_sanitized,
      motor_type,
      distance_km,
      elevation_m
    });
  }
}

console.log(`Found ${xMotorRides.length} rides with X motor type.`);
console.log("Sample of mapped X motor rides:");
console.log(JSON.stringify(xMotorRides.slice(0, 15), null, 2));
