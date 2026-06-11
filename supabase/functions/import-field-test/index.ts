// @ts-nocheck
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // ✅ CORREGIDO: authorization bien escrito
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
};


function parseDistance(v: any): number | null {
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  if (s === "") return null;

  // Extract first numeric sequence
  const match = s.match(/[\d.,'’‘`´]+/);
  if (!match) return null;

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
  return Number.isFinite(n) ? n : null;
}

function parseElevation(v: any): number | null {
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  if (s === "") return null;

  // Extract first numeric sequence
  const match = s.match(/[\d.,'’‘`´]+/);
  if (!match) return null;

  let numStr = match[0].replace(/[’'‘`´]/g, ".");

  if (numStr.includes(",") && numStr.includes(".")) {
    if (numStr.lastIndexOf(",") > numStr.lastIndexOf(".")) {
      numStr = numStr.replace(/\./g, "").replace(",", ".");
    } else {
      numStr = numStr.replace(/,/g, "");
    }
  } else {
    const hasComma = numStr.includes(",");
    const hasDot = numStr.includes(".");
    const separator = hasComma ? "," : ".";
    const separatorCount = (numStr.match(new RegExp("\\" + separator, "g")) || []).length;

    if (separatorCount > 1) {
      numStr = numStr.replace(new RegExp("\\" + separator, "g"), "");
    } else if (separatorCount === 1) {
      const parts = numStr.split(separator);
      const integerPart = parts[0];
      const decimalPart = parts[1];

      if (decimalPart.length === 3 && Number(integerPart) < 100) {
        numStr = integerPart + decimalPart;
      } else {
        numStr = integerPart + "." + decimalPart;
      }
    }
  }

  const n = Number(numStr);
  return Number.isFinite(n) ? n : null;
}

function normalizeCompletionDate(raw: any): string | null {
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

function getVal(row: any, ...keys: string[]): any {
  if (!row) return null;
  const normalizedRow: Record<string, any> = {};
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

/* =========================================================
   SANITIZER (LOCAL, SIMPLE, SIN FILTRAR)
========================================================= */
function pad2(n: string): string {
  const clean = String(parseInt(n, 10));
  return clean.padStart(2, "0");
}

function sanitizeBikeCode(raw: string | null): string | null {
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

function normalizeBikeCode(raw: string | null): string | null {
  const s = sanitizeBikeCode(raw);
  if (!s) return null;

  const prob = s.match(/\bPROB\s*(\d{1,3})\b/);
  if (prob) return `Prob_${pad2(prob[1])}`;

  const onlyNum = s.match(/^0*(\d{1,3})$/);
  if (onlyNum) return `Prob_${pad2(onlyNum[1])}`;

  const x20 = s.match(/^X\s*20\s*(\d{1,2})?$/);
  if (x20) return x20[1] ? `X20_${pad2(x20[1])}` : "X20";

  const x30 = s.match(/^X\s*30\s*(\d{1,2})?$/);
  if (x30) return x30[1] ? `X30_${pad2(x30[1])}` : "X30";

  const familyNum = s.match(/^(XS|PF|PB)\s*(\d{1,3})$/);
  if (familyNum) {
    return `${familyNum[1]}_${pad2(familyNum[2])}`;
  }

  return s.replace(/\s+/g, "_");
}

serve(async (req) => {
  // ✅ CORS preflight CORRECTO
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const rows = await req.json();

    const { count: before } = await supabase
      .from("test_ride_log")
      .select("*", { count: "exact", head: true });

    const inserts = rows.map((r: any) => {
      const bike_code_raw = getVal(r, "Bike Code", "Bike code2", "Bike");

      const bike_code_sanitized =
        normalizeBikeCode(bike_code_raw) ?? bike_code_raw;

      const completion_date_txt = normalizeCompletionDate(
        getVal(r, "Completion time", "Completion date", "Date")
      ) ?? null;

      const ride_date_raw = getVal(r, "Ride date", "Date", "Ride_date");
      const ride_date_txt = (ride_date_raw !== null && String(ride_date_raw).trim() !== "")
        ? String(ride_date_raw).trim()
        : completion_date_txt;

      const motor_type = getVal(r, "Motor type", "Motor");

      const distance_km = parseDistance(
        getVal(
          r,
          "Distance ridden / Distancia",
          "Distance ridden/Distancia",
          "Distance ridden",
          "Distance (km)",
          "Distancia (km)",
          "Distance",
          "Distancia"
        )
      );

      const elevation_m = parseElevation(
        getVal(
          r,
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
        )
      );

      return {
        ride_date_txt,
        completion_date_txt,
        motor_type,
        bike_code: bike_code_sanitized,
        bike_code_sanitized,
        distance_km,
        elevation_m,
      };
    });

    const { error } = await supabase
      .from("test_ride_log")
      .upsert(inserts, {
        onConflict: "completion_date_txt,motor_type,bike_code",
        ignoreDuplicates: true,
      });

    if (error) {
      return new Response(JSON.stringify(error), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const { count: after } = await supabase
      .from("test_ride_log")
      .select("*", { count: "exact", head: true });

    return new Response(
      JSON.stringify({
        ok: true,
        attempted: inserts.length,
        inserted: (after ?? 0) - (before ?? 0),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: corsHeaders }
    );
  }
});