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
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

function toNumber(v: any): number | null {
  if (v === null || v === undefined) return null;

  let s = String(v).trim();

  // Quitar texto y unidades (km, m, espacios, etc.)
  s = s.replace(/[^\d.,]/g, "");

  // Caso con coma y punto
  if (s.includes(",") && s.includes(".")) {
    // Europeo: 1.234,56
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // USA: 1,234.56
      s = s.replace(/,/g, "");
    }
  } else {
    // Solo coma → decimal europeo
    s = s.replace(",", ".");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
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

serve(async (req) => {
  // ✅ CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const rows = await req.json();

    // ✅ CONTAR ANTES
    const { count: before } = await supabase
      .from("test_ride_log")
      .select("*", { count: "exact", head: true });

    // ✅ PREPARAR INSERTS
    const inserts = rows.map((r: any) => {
      const bike_code_raw = getVal(r, "Bike Code", "Bike code2", "Bike");
      const completion_date_txt = normalizeCompletionDate(
        getVal(r, "Completion time", "Completion date", "Date")
      ) ?? null;

      const ride_date_raw = getVal(r, "Ride date", "Date", "Ride_date");
      const ride_date_txt = (ride_date_raw !== null && String(ride_date_raw).trim() !== "")
        ? String(ride_date_raw).trim()
        : completion_date_txt;

      const motor_type = getVal(r, "Motor type", "Motor");

      const distance_km = toNumber(
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

      const elevation_m = toNumber(
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
        bike_code: bike_code_raw,
        distance_km,
        elevation_m,
      };
    });

    // ✅ UPSERT ROBUSTO (DEDUPLICA)
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

    // ✅ CONTAR DESPUÉS
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