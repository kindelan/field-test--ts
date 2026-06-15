import XLSX from 'xlsx';
import fs from 'fs';

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

console.log("Total rows in Excel:", excelRows.length);
console.log("Keys in first row:", Object.keys(excelRows[0] || {}));

// Let's write a helper to normalize keys
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

console.log("\n--- EXAMPLES OF STRANGE/NON-NUMERIC ENTRIES OR ERRORS ---");
let kmIssues = 0;
let elevIssues = 0;

for (let i = 0; i < excelRows.length; i++) {
  const row = excelRows[i];
  const kmRaw = getVal(row, ...kmKeys);
  const elevRaw = getVal(row, ...elevKeys);

  // Check if km has non-digits (excluding single dot/comma)
  if (kmRaw !== null && kmRaw !== undefined) {
    const s = String(kmRaw).trim();
    if (/[^\d.,]/.test(s) && s !== "") {
      kmIssues++;
      if (kmIssues <= 30) {
        console.log(`Row ${i + 2} - KM Raw: "${kmRaw}"`);
      }
    }
  }

  // Check if elevation has non-digits
  if (elevRaw !== null && elevRaw !== undefined) {
    const s = String(elevRaw).trim();
    if (/[^\d.,]/.test(s) && s !== "") {
      elevIssues++;
      if (elevIssues <= 30) {
        console.log(`Row ${i + 2} - ELEV Raw: "${elevRaw}"`);
      }
    }
  }
}

console.log(`\nTotal KM rows with non-numeric text: ${kmIssues}`);
console.log(`Total ELEV rows with non-numeric text: ${elevIssues}`);
