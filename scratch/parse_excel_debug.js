const XLSX = require('xlsx');

const filePath = 'C:\\Users\\Nacho Perez\\Downloads\\Field test review(1-1437).xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

const rows = XLSX.utils.sheet_to_json(sheet, {
  raw: false,
  defval: null
});

console.log("Total rows in Excel sheet:", rows.length);
if (rows.length > 0) {
  console.log("Keys in first row:", Object.keys(rows[0]));
  console.log("Sample first row:", rows[0]);
}

// Helper to check if bike matches 80
function isBike80(bikeStr) {
  if (!bikeStr) return false;
  const s = String(bikeStr).toLowerCase().replace(/[^a-z0-9]/g, "");
  return s.includes("80") || s.includes("prob80");
}

const rides80 = rows.filter(r => {
  const bikeCode = r["Bike Code"] || r["Bike code2"] || r["Bike"] || r["bike_code"];
  return isBike80(bikeCode);
});

console.log("Number of rides for Prob_80 in Excel:", rides80.length);

let sumDistanceExcel = 0;
let sumElevationExcel = 0;

rides80.forEach((r, idx) => {
  const distanceKey = Object.keys(r).find(k => k.toLowerCase().includes("distance") || k.toLowerCase().includes("distancia"));
  const elevationKey = Object.keys(r).find(k => k.toLowerCase().includes("elevation") || k.toLowerCase().includes("desnivel"));
  
  const distVal = distanceKey ? r[distanceKey] : null;
  const elevVal = elevationKey ? r[elevationKey] : null;
  
  let parsedDist = 0;
  let parsedElev = 0;
  
  if (distVal !== null && distVal !== undefined) {
    let s = String(distVal).replace(/[^\d.,]/g, "");
    if (s.includes(",") && s.includes(".")) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        s = s.replace(/,/g, "");
      }
    } else {
      s = s.replace(",", ".");
    }
    const n = Number(s);
    if (Number.isFinite(n)) {
      parsedDist = n;
      sumDistanceExcel += n;
    }
  }
  
  if (elevVal !== null && elevVal !== undefined) {
    let s = String(elevVal).replace(/[^\d.,]/g, "");
    if (s.includes(",") && s.includes(".")) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        s = s.replace(/,/g, "");
      }
    } else {
      s = s.replace(",", ".");
    }
    const n = Number(s);
    if (Number.isFinite(n)) {
      parsedElev = n;
      sumElevationExcel += n;
    }
  }

  console.log(`Index: ${idx} | Date: ${r["Ride date"]} | RawDist: "${distVal}" -> Parsed: ${parsedDist} | RawElev: "${elevVal}" -> Parsed: ${parsedElev}`);
});

console.log("Excel Raw Sum Distance for Prob_80:", sumDistanceExcel);
console.log("Excel Raw Sum Elevation for Prob_80:", sumElevationExcel);
