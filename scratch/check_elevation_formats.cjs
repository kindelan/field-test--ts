const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const files = [
  "C:\\Users\\Nacho Perez\\Downloads\\Field test review(1-1437).xlsx",
  "C:\\Users\\Nacho Perez\\Downloads\\Field test review(1-1731) (1).xlsx",
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

for (const filePath of files) {
  if (!fs.existsSync(filePath)) continue;
  console.log(`\n=== ELEVATION DOT/COMMA IN ${path.basename(filePath)} ===`);
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const excelRows = XLSX.utils.sheet_to_json(sheet, {
    raw: false,
    defval: null
  });

  let count = 0;
  for (let i = 0; i < excelRows.length; i++) {
    const row = excelRows[i];
    const elevRaw = getVal(row, ...elevKeys);

    if (elevRaw !== null && elevRaw !== undefined) {
      const s = String(elevRaw).trim();
      if (s.includes('.') || s.includes(',')) {
        count++;
        if (count <= 20) {
          console.log(`Row ${i + 2}: "${elevRaw}"`);
        }
      }
    }
  }
  console.log(`Total dot/comma elevations in ${path.basename(filePath)}: ${count}`);
}
