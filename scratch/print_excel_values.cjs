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

console.log("=== SCANNING EXCEL ROWS ===");
let count = 0;
for (let i = 0; i < excelRows.length; i++) {
  const row = excelRows[i];
  const kmRaw = getVal(row, ...kmKeys);
  const elevRaw = getVal(row, ...elevKeys);

  const isSimpleNumber = (v) => {
    if (v === null || v === undefined) return true;
    const s = String(v).trim();
    if (s === "") return true;
    return /^\d+([.,]\d+)?$/.test(s);
  };

  const isKmSimple = isSimpleNumber(kmRaw);
  const isElevSimple = isSimpleNumber(elevRaw);

  if (!isKmSimple || !isElevSimple) {
    count++;
    console.log(`Row ${i + 2}:`);
    if (!isKmSimple) console.log(`  KM: "${kmRaw}"`);
    if (!isElevSimple) console.log(`  ELEV: "${elevRaw}"`);
  }
}
console.log(`\nTotal rows with non-simple values: ${count}`);
