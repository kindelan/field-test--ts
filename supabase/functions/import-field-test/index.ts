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

/* =========================================================
   SANITIZER (LOCAL, SIMPLE, SIN FILTRAR)
========================================================= */
function pad2(n: string): string {
  return n.padStart(2, "0");
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
      const bike_code_raw =
        r["Bike Code"] ?? r["Bike code2"] ?? null;

      const bike_code_sanitized =
        normalizeBikeCode(bike_code_raw) ?? bike_code_raw;

      return {
        ride_date_txt: r["Ride date"] ?? null,
        completion_date_txt: r["Completion time"] ?? null,
        motor_type: r["Motor type"] ?? null,
        bike_code: bike_code_raw,
        bike_code_sanitized,
        distance_km: toNumber(
          r["Distance ridden"] ??
          r["Distance ridden / Distancia"]
        ),
        elevation_m: toNumber(
          r["elevation"] ??
          r["elevation / Desnivel positivo"]
        ),
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