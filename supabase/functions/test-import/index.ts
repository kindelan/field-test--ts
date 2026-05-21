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
  const m = String(v).replace(",", ".").match(/[\d.]+/);
  return m ? Number(m[0]) : null;
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
    const inserts = rows.map((r: any) => ({
      ride_date_txt: r["Ride date"] ?? null,
      completion_date_txt: r["Completion time"] ?? null,
      motor_type: r["Motor type"] ?? null,
      bike_code: r["Bike Code"] ?? r["Bike code2"] ?? null,
      distance_km: toNumber(
        r["Distance ridden"] ??
        r["Distance ridden / Distancia"]
      ),
      elevation_m: toNumber(
        r["elevation"] ??
        r["elevation / Desnivel positivo"]
      ),
    }));

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