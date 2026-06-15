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

const bikeCounts = {};
excelRows.forEach(r => {
  const bikeRaw = getVal(r, "Bike Code", "Bike code2", "Bike");
  if (bikeRaw) {
    const norm = normalizeBikeCode(bikeRaw);
    if (norm) {
      bikeCounts[norm] = (bikeCounts[norm] || 0) + 1;
    }
  }
});

console.log("Excel rows matching target bikes:");
['Prob_80', 'Prob_82', 'Prob_28', 'Prob_38'].forEach(b => {
  console.log(`${b}: ${bikeCounts[b] || 0} rows`);
});
