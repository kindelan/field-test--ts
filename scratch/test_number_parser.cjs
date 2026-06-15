function parseDistance(v) {
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  if (s === "") return null;

  // Extract first numeric sequence: digits, dots, commas, and quote-like separators
  const match = s.match(/[\d.,'’‘`´]+/);
  if (!match) return null;

  let numStr = match[0];
  // Normalize quote-like characters to dot
  numStr = numStr.replace(/[’'‘`´]/g, ".");

  // If there are both dots and commas
  if (numStr.includes(",") && numStr.includes(".")) {
    if (numStr.lastIndexOf(",") > numStr.lastIndexOf(".")) {
      // European format: 1.234,56 -> remove dots, replace comma with dot
      numStr = numStr.replace(/\./g, "").replace(",", ".");
    } else {
      // US format: 1,234.56 -> remove commas
      numStr = numStr.replace(/,/g, "");
    }
  } else if (numStr.includes(",")) {
    // Only comma(s)
    // For distance, any single separator is decimal: 44,09 -> 44.09
    // But if there are multiple commas (e.g. 1,234,567), they are thousands separators.
    const commaCount = (numStr.match(/,/g) || []).length;
    if (commaCount > 1) {
      numStr = numStr.replace(/,/g, "");
    } else {
      numStr = numStr.replace(",", ".");
    }
  } else if (numStr.includes(".")) {
    // Only dot(s)
    const dotCount = (numStr.match(/\./g) || []).length;
    if (dotCount > 1) {
      numStr = numStr.replace(/\./g, "");
    }
    // For distance, a single dot is always decimal: 1.350 -> 1.35
  }

  const n = Number(numStr);
  return Number.isFinite(n) ? n : null;
}

function parseElevation(v) {
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  if (s === "") return null;

  // Extract first numeric sequence
  const match = s.match(/[\d.,'’‘`´]+/);
  if (!match) return null;

  let numStr = match[0];
  // Normalize quote-like characters to dot
  numStr = numStr.replace(/[’'‘`´]/g, ".");

  // If there are both dots and commas
  if (numStr.includes(",") && numStr.includes(".")) {
    if (numStr.lastIndexOf(",") > numStr.lastIndexOf(".")) {
      numStr = numStr.replace(/\./g, "").replace(",", ".");
    } else {
      numStr = numStr.replace(/,/g, "");
    }
  } else {
    // Only commas OR only dots
    const hasComma = numStr.includes(",");
    const hasDot = numStr.includes(".");
    const separator = hasComma ? "," : ".";
    const separatorCount = (numStr.match(new RegExp("\\" + separator, "g")) || []).length;

    if (separatorCount > 1) {
      // Multiple separators -> thousands separators
      numStr = numStr.replace(new RegExp("\\" + separator, "g"), "");
    } else if (separatorCount === 1) {
      // Single separator: could be thousands or decimal.
      // E.g. "1.350" (thousands) vs "1211,8" (decimal)
      // If it has exactly 3 digits after the separator, and the integer part is small (< 100),
      // it is a thousands separator (e.g. 1.350 -> 1350).
      const parts = numStr.split(separator);
      const integerPart = parts[0];
      const decimalPart = parts[1];

      if (decimalPart.length === 3 && Number(integerPart) < 100) {
        // Treat as thousands separator
        numStr = integerPart + decimalPart;
      } else {
        // Treat as decimal separator
        numStr = integerPart + "." + decimalPart;
      }
    }
  }

  const n = Number(numStr);
  return Number.isFinite(n) ? n : null;
}

// Test cases
const testCasesKm = [
  { input: "16km", expected: 16 },
  { input: "48km", expected: 48 },
  { input: "34 km", expected: 34 },
  { input: "44,09 km", expected: 44.09 },
  { input: "29’99", expected: 29.99 },
  { input: "43  y do    con ella apagada ", expected: 43 },
  { input: "Primera parte 57 ( pinchazo y pa casa)", expected: 57 },
  { input: "32 segunda salida después de reparar el pinchazo en casa", expected: 32 },
  { input: "No data ", expected: null },
  { input: "-", expected: null },
  { input: ".", expected: null },
  { input: "26km gps 30km según la bicicleta", expected: 26 },
  { input: "41km (dato de la bici) 38,5 (dato gps)", expected: 41 }
];

const testCasesElev = [
  { input: "769m", expected: 769 },
  { input: "229 mt", expected: 229 },
  { input: "1.350m", expected: 1350 },
  { input: "1.250 m", expected: 1250 },
  { input: "1211,8", expected: 1211.8 },
  { input: "1028,4", expected: 1028.4 },
  { input: "890,1", expected: 890.1 },
  { input: "258  t", expected: 258 },
  { input: "800h ", expected: 800 },
  { input: "1288 h ", expected: 1288 },
  { input: "No data ", expected: null },
  { input: "-", expected: null }
];

console.log("=== TESTING DISTANCE PARSER ===");
let kmOk = true;
for (const tc of testCasesKm) {
  const res = parseDistance(tc.input);
  const ok = res === tc.expected;
  console.log(`Input: "${tc.input}" -> Got: ${res} (Expected: ${tc.expected}) - [${ok ? "OK" : "FAILED"}]`);
  if (!ok) kmOk = false;
}

console.log("\n=== TESTING ELEVATION PARSER ===");
let elevOk = true;
for (const tc of testCasesElev) {
  const res = parseElevation(tc.input);
  const ok = res === tc.expected;
  console.log(`Input: "${tc.input}" -> Got: ${res} (Expected: ${tc.expected}) - [${ok ? "OK" : "FAILED"}]`);
  if (!ok) elevOk = false;
}

if (kmOk && elevOk) {
  console.log("\nALL TESTS PASSED SUCCESSFULLY! 🎉");
} else {
  console.log("\nSOME TESTS FAILED! ❌");
}
