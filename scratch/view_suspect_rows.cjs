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

const rowsToInspect = [59, 61, 88];
for (const rowNum of rowsToInspect) {
  const row = excelRows[rowNum - 2];
  console.log(`\n--- ROW ${rowNum} ---`);
  if (!row) {
    console.log("Row is undefined");
    continue;
  }
  for (const k of Object.keys(row)) {
    console.log(`  "${k}": "${row[k]}"`);
  }
}
