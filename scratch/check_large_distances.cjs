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
    if (normalizedRow[cleanKey] !== undefined) {
      return normalizedRow[cleanKey];
    }
  }
  return null;
}

const kmKeys = [
  "Distance ridden / Distancia",
  "Distance ridden/Distancia",
  "Distance ridden",
  "Distance (km)",
  "Distancia (km)",
  "Distance",
  "Distancia"
];

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

let largeCount = 0;
for (let i = 0; i < excelRows.length; i++) {
  const row = excelRows[i];
  const kmRaw = getVal(row, ...kmKeys);
  const parsed = parseDistance(kmRaw);
  if (parsed !== null && parsed >= 100) {
    largeCount++;
    console.log(`Row ${i + 2}: Raw: "${kmRaw}" -> Parsed: ${parsed}`);
  }
}
console.log(`\nTotal rides with distance >= 100 km: ${largeCount}`);
