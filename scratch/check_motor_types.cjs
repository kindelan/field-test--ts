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

const motorKeys = ["Motor type", "Motor"];

for (const filePath of files) {
  if (!fs.existsSync(filePath)) continue;
  console.log(`\n=== MOTOR TYPES IN ${path.basename(filePath)} ===`);
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const excelRows = XLSX.utils.sheet_to_json(sheet, {
    raw: false,
    defval: null
  });

  const motorValues = new Set();
  const examples = {};
  for (let i = 0; i < excelRows.length; i++) {
    const row = excelRows[i];
    const motorRaw = getVal(row, ...motorKeys);
    motorValues.add(String(motorRaw));
    if (!examples[motorRaw]) {
      examples[motorRaw] = [];
    }
    if (examples[motorRaw].length < 3) {
      examples[motorRaw].push(i + 2);
    }
  }
  console.log("Unique values found:", Array.from(motorValues));
  console.log("Examples by value:", examples);
}
