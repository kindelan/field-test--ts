function pad2(n: string): string {
  const clean = String(parseInt(n, 10));
  return clean.padStart(2, "0");
}

export function sanitizeBikeCode(raw: string | null): string | null {
  if (!raw) return null;

  let s = String(raw)
    .toUpperCase()
    .trim();

  // Quitar paréntesis
  s = s.replace(/\(.*?\)/g, "");

  // Quitar texto irrelevante
  s = s.replace(
    /\b(COLOR|NEGRO|NEGRA|BLANCO|BLANCA|PLATA|DIGITAL|PROC|PRO|BICI|CON|SUSPENSION|DELANTERA|LLEVAR|EN|VEZ|DE|LA)\b/g,
    ""
  );

  // Normalizar separadores
  s = s.replace(/[_\-\.]+/g, " ");
  s = s.replace(/\s+/g, " ").trim();

  return s || null;
}

export function normalizeBikeCode(raw: string | null): string | null {
  const s = sanitizeBikeCode(raw);
  if (!s) return null;

  /* =========================
     1️⃣ PROB en cualquier sitio
  ========================= */
  const probAnywhere = s.match(/\bPROB\s*(\d{1,3})\b/);
  if (probAnywhere) {
    return `Prob_${pad2(probAnywhere[1])}`;
  }

  /* =========================
     2️⃣ Solo número
  ========================= */
  const onlyNum = s.match(/^0*(\d{1,3})$/);
  if (onlyNum) {
    return `Prob_${pad2(onlyNum[1])}`;
  }

  /* =========================
     3️⃣ X20
  ========================= */
  const x20 = s.match(/^X\s*20\s*(\d{1,2})?$/);
  if (x20) {
    return x20[1]
      ? `X20_${pad2(x20[1])}`
      : "X20";
  }

  /* =========================
     4️⃣ X30
  ========================= */
  const x30 = s.match(/^X\s*30\s*(\d{1,2})?$/);
  if (x30) {
    return x30[1]
      ? `X30_${pad2(x30[1])}`
      : "X30";
  }

  /* =========================
     5️⃣ XS / PF / PB
  ========================= */
  const familyNum = s.match(/^(XS|PF|PB)\s*(\d{1,3})$/);
  if (familyNum) {
    return `${familyNum[1]}_${pad2(familyNum[2])}`;
  }

  /* =========================
     6️⃣ Fallback limpio
  ========================= */
  return s.replace(/\s+/g, "_");
}
