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

function parseDistance(v) {
  if (v === null || v === undefined) return 0;
  let s = String(v).trim();
  if (s === "") return 0;

  // Extract first numeric sequence
  const match = s.match(/[\d.,'’‘`´]+/);
  if (!match) return 0;

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
  return Number.isFinite(n) ? n : 0;
}

function correctDistance(dist) {
  if (dist >= 100) {
    const numDigits = String(Math.floor(dist)).length;
    if (numDigits > 2) {
      return dist / Math.pow(10, numDigits - 2);
    }
  }
  return dist;
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

function normalizeCompletionDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const parts = s.split(/\s+/);
  if (parts.length < 2) return s;
  const datePart = parts[0];
  const timePart = parts[1];
  const timeSubparts = timePart.split(":");
  if (timeSubparts.length >= 2) {
    return `${datePart} ${timeSubparts[0]}:${timeSubparts[1]}`;
  }
  return s;
}

// Assignment configurations from Supabase Database:
const assignmentConfigs = {
  "Prob_80": { start_at: new Date("2025-01-01T00:00:00Z"), end_at: null },
  "Prob_82": { start_at: new Date("2025-05-11T18:48:02.330Z"), end_at: null },
  "Prob_38": { start_at: new Date("2025-09-12T10:58:08Z"), end_at: null },
  "Prob_28": null // No assignment
};

const kmKeys = [
  "Distance ridden / Distancia",
  "Distance ridden/Distancia",
  "Distance ridden",
  "Distance (km)",
  "Distancia (km)",
  "Distance",
  "Distancia"
];

const targetBikes = ["Prob_80", "Prob_82", "Prob_38", "Prob_28"];

targetBikes.forEach(bikeCode => {
  console.log(`\n==================================================`);
  console.log(`ANALYSIS FOR BIKE: ${bikeCode}`);
  const config = assignmentConfigs[bikeCode];
  if (config) {
    console.log(`Assignment start date: ${config.start_at.toISOString()}`);
    console.log(`Assignment end date:   ${config.end_at ? config.end_at.toISOString() : 'None (Active)'}`);
  } else {
    console.log(`Assignment status:     NO ACTIVE OR HISTORICAL FIELD TEST ASSIGNMENT`);
  }

  // Filter rides from Excel
  const rides = [];
  for (let i = 0; i < excelRows.length; i++) {
    const row = excelRows[i];
    const bikeRaw = getVal(row, "Bike Code", "Bike code2", "Bike");
    const norm = normalizeBikeCode(bikeRaw);
    if (norm === bikeCode) {
      const completion_date_txt = normalizeCompletionDate(
        getVal(row, "Completion time", "Completion date", "Date")
      );
      const ride_date_raw = getVal(row, "Ride date", "Date", "Ride_date");
      const ride_date_txt = (ride_date_raw !== null && String(ride_date_raw).trim() !== "")
        ? String(ride_date_raw).trim()
        : completion_date_txt;

      const kmRaw = getVal(row, ...kmKeys);
      const parsedDist = parseDistance(kmRaw);
      const correctedDist = correctDistance(parsedDist);

      rides.push({
        excelRowIndex: i + 2,
        ride_date_txt,
        completion_date_txt,
        kmRaw,
        parsedDist,
        correctedDist,
      });
    }
  }

  // Sort rides by date
  rides.sort((a, b) => {
    const dA = new Date(a.ride_date_txt || a.completion_date_txt).getTime();
    const dB = new Date(b.ride_date_txt || b.completion_date_txt).getTime();
    return dA - dB;
  });

  console.log(`Total rides found in Excel: ${rides.length}`);
  console.log(`\nRow-by-Row breakdown:`);
  console.log(`ExcelRow | Date | Raw KM | Corrected KM | Within FT Assignment? | Acc DB Km | Acc FT Km`);
  console.log(`-----------------------------------------------------------------------------------------`);

  let dbTotal = 0;
  let ftTotal = 0;

  rides.forEach(r => {
    const rDate = new Date(r.ride_date_txt || r.completion_date_txt);
    let isWithin = false;
    if (config) {
      isWithin = rDate >= config.start_at && (!config.end_at || rDate <= config.end_at);
    }

    dbTotal += r.correctedDist;
    if (isWithin) {
      ftTotal += r.correctedDist;
    }

    console.log(
      `${String(r.excelRowIndex).padEnd(8)} | ${String(r.ride_date_txt).padEnd(14)} | ${String(r.kmRaw).padEnd(8)} | ${String(r.correctedDist.toFixed(1)).padEnd(12)} | ${String(isWithin).padEnd(20)} | ${String(dbTotal.toFixed(1)).padEnd(9)} | ${ftTotal.toFixed(1)}`
    );
  });

  console.log(`-----------------------------------------------------------------------------------------`);
  console.log(`FINAL RESULTS FOR ${bikeCode}:`);
  console.log(`Total DB Kilometers (All Rides):        ${dbTotal.toFixed(1)} km`);
  console.log(`Field Test Kilometers (Filtered):        ${ftTotal.toFixed(1)} km`);
  console.log(`Difference (Excluded before assignment): ${(dbTotal - ftTotal).toFixed(1)} km`);
});
