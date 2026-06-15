const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const files = [
  "C:\\Users\\Nacho Perez\\Downloads\\Field test review(1-1437).xlsx",
  "C:\\Users\\Nacho Perez\\Downloads\\Field test review(1-1731) (1).xlsx",
  "C:\\Users\\Nacho Perez\\Downloads\\Field test review(1-1859) (1).xlsx",
  "C:\\Users\\Nacho Perez\\Downloads\\Field test review(1-1859).xlsx"
];

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

const elevKeys = [
  "elevation / Desnivel positive",
  "elevation / Desnivel positivo",
  "elevation/Desnivel positive",
  "elevation/Desnivel positivo",
  "elevation",
  "Desnivel",
  "Desnivel positivo",
  "Desnivel positive",
  "Elevation (m)",
  "Desnivel (m)"
];

const isSimpleNumber = (v) => {
  if (v === null || v === undefined) return true;
  const s = String(v).trim();
  if (s === "") return true;
  return /^\d+([.,]\d+)?$/.test(s);
};

for (const filePath of files) {
  if (!fs.existsSync(filePath)) {
    console.log("File does not exist, skipping:", filePath);
    continue;
  }
  console.log(`\n=== SCANNING ${path.basename(filePath)} ===`);
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const excelRows = XLSX.utils.sheet_to_json(sheet, {
    raw: false,
    defval: null
  });

  let count = 0;
  for (let i = 0; i < excelRows.length; i++) {
    const row = excelRows[i];
    const kmRaw = getVal(row, ...kmKeys);
    const elevRaw = getVal(row, ...elevKeys);

    if (!isSimpleNumber(kmRaw) || !isSimpleNumber(elevRaw)) {
      count++;
      if (count <= 15) {
        console.log(`Row ${i + 2}:`);
        if (!isSimpleNumber(kmRaw)) console.log(`  KM: "${kmRaw}"`);
        if (!isSimpleNumber(elevRaw)) console.log(`  ELEV: "${elevRaw}"`);
      }
    }
  }
  console.log(`Total rows with non-simple values in ${path.basename(filePath)}: ${count}`);
}
