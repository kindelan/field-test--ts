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

function getVal(row: any, ...keys: string[]): any {
  if (!row) return null;
  const normalizedRow: Record<string, any> = {};
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
    const { data: rides80, error } = await supabase
      .from("test_ride_log")
      .select("*")
      .ilike("bike_code", "%80%");
    return new Response(
      JSON.stringify({ ok: true, rides80, error }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: corsHeaders }
    );
  }
});