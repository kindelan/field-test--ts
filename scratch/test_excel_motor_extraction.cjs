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

const motorCounts = {};
let nullCount = 0;

for (let i = 0; i < excelRows.length; i++) {
  const row = excelRows[i];
  const motor = getVal(row, "Motor type", "Motor");
  motorCounts[motor] = (motorCounts[motor] || 0) + 1;
  if (motor === null || motor === undefined) {
    nullCount++;
    if (nullCount <= 10) {
      console.log(`Row ${i + 2} has null motor. Keys present:`, Object.keys(row));
    }
  }
}

console.log("\nMotor extraction stats:", motorCounts);
console.log("Total null motor rows:", nullCount);
