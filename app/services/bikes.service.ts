import { supabase } from "../dao/supabaseclient.js";
import type { BikeDTO } from "../dto/index.js";

/* =====================================================
   TIPOS
===================================================== */

export type CreateBikeInput = Omit<
  BikeDTO,
  "id" |
  "created_at" |
  "updated_at" |
  "field_test_id"
>;


export interface BikeHistoryRow {
  event_type: string;
  changed_at: string;
  changed_by: string | null;
  changes: Record<string, { old: any; new: any }>;
  snapshot: any;
}


export interface ChangeBikeComponentInput {
  bikeId: string;

  componentType: "motor" | "battery" | "hmi" | "other";

  componentTypeCode: string;
  componentSerialCode: string;
  componentVersion?: string | null;

  notes?: string | null;   // ✅ comentario
  changedAt?: string;
}

/* =====================================================
   SERVICE
===================================================== */

export class BikesService {

  /* =============================
     LIST
  ============================= */
  async list(): Promise<BikeDTO[]> {
    const { data, error } = await supabase
      .from("bikes")
      .select(`
        id,
        bikecode,
        bikecode_canon,
        motortype,
        motorcode,
        motorfirmware,
        batterytype,
        batterycode,
        batteryfirmware,
        hmicode,
        hmifirmware,
        other,
        location,
        scope,
        target,
        comments,
        created_at,
        updated_at
      `)
      .order("bikecode");

    if (error) throw error;
    return data as BikeDTO[];
  }


  /* =============================
     CREATE
  ============================= */
  async create(input: CreateBikeInput): Promise<BikeDTO> {
    const { data, error } = await supabase
      .from("bikes")
      .insert(input)
      .select("*")
      .single();

    if (error) throw error;

    return data as BikeDTO;
  }


  /* =============================
     UPDATE SIMPLE
  ============================= */
  async update(
    id: string,
    changes: Partial<CreateBikeInput>
  ): Promise<BikeDTO> {
    const { data, error } = await supabase
      .from("bikes")
      .update(changes)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return data as BikeDTO;
  }


  /* =====================================================
     🔧 CAMBIO DE COMPONENTE (CORE)
  ===================================================== */
  async changeBikeComponent(
    input: ChangeBikeComponentInput
  ): Promise<void> {

    const changedAt = input.changedAt ?? new Date().toISOString();

    /* -------------------------------------------------
       1️⃣ Leer componente actual
    ------------------------------------------------- */
    const { data: current } = await supabase
      .from("bike_component_history")
      .select(`
        component_type_code,
        component_serial_code,
        component_version
      `)
      .eq("bike_id", input.bikeId)
      .eq("component_type", input.componentType)
      .is("end_at", null)
      .maybeSingle();


    /* -------------------------------------------------
       2️⃣ Cerrar componente actual
    ------------------------------------------------- */
    const { error: closeErr } = await supabase
      .from("bike_component_history")
      .update({ end_at: changedAt })
      .eq("bike_id", input.bikeId)
      .eq("component_type", input.componentType)
      .is("end_at", null);

    if (closeErr) throw closeErr;


    /* -------------------------------------------------
       3️⃣ Insertar nuevo componente
    ------------------------------------------------- */
    const { error: insertErr } = await supabase
      .from("bike_component_history")
      .insert({
        bike_id: input.bikeId,
        component_type: input.componentType,
        component_type_code: input.componentTypeCode,
        component_serial_code: input.componentSerialCode,
        component_version: input.componentVersion ?? null,
        start_at: changedAt,
        notes: input.notes ?? null
      });

    if (insertErr) throw insertErr;


    /* -------------------------------------------------
       4️⃣ Update tabla bikes
    ------------------------------------------------- */
    const bikeUpdate: Record<string, any> = {};

    if (input.componentType === "motor") {
      bikeUpdate.motortype = input.componentTypeCode;
      bikeUpdate.motorcode = input.componentSerialCode;
      bikeUpdate.motorfirmware = input.componentVersion ?? null;
    }

    if (input.componentType === "battery") {
      bikeUpdate.batterytype = input.componentTypeCode;
      bikeUpdate.batterycode = input.componentSerialCode;
      bikeUpdate.batteryfirmware = input.componentVersion ?? null;
    }

    if (input.componentType === "hmi") {
      bikeUpdate.hmicode = input.componentSerialCode;
      bikeUpdate.hmifirmware = input.componentVersion ?? null;
    }

    if (input.componentType === "other") {
      bikeUpdate.other = `${input.componentTypeCode}/${input.componentSerialCode}`;
    }

    if (Object.keys(bikeUpdate).length) {
      const { error: bikeErr } = await supabase
        .from("bikes")
        .update(bikeUpdate)
        .eq("id", input.bikeId);

      if (bikeErr) throw bikeErr;
    }


    /* -------------------------------------------------
       5️⃣ Guardar histórico (timeline)
       NOTA: Se comenta este bloque porque la tabla 'bike_history_changes' no existe en el esquema de Supabase.
       En su lugar, existe la vista 'v_bike_history_changes' que lee de la tabla 'bike_history'.
       El histórico se registra automáticamente mediante triggers en la base de datos cuando se actualiza la tabla 'bikes' en el Paso 4.
    ------------------------------------------------- */
    /*
    const oldValue = current
      ? `${current.component_type_code || ""}/${current.component_serial_code || ""}/${current.component_version || ""}`
      : null;

    const newValue = `${input.componentTypeCode}/${input.componentSerialCode}/${input.componentVersion || ""}`;

    const { error: historyErr } = await supabase
      .from("bike_history_changes")
      .insert({
        bike_id: input.bikeId,
        event_type: "component_change",
        field: input.componentType,
        old_value: oldValue,
        new_value: newValue,
        changed_at: changedAt,
        changed_by: null,
        notes: input.notes ?? null
      });

    if (historyErr) throw historyErr;
    */
  }


  /* =============================
     HISTÓRICO (timeline)
  ============================= */
async getHistory(bikeId: string): Promise<BikeHistoryRow[]> {
  const { data, error } = await supabase
    .from("bike_history")
    .select(`
      event_type,
      changed_at,
      changed_by,
      changes,
      snapshot
    `)
    .eq("bike_id", bikeId)
    .order("changed_at", { ascending: false });

  if (error) throw error;

  return data as BikeHistoryRow[];
}



  /* =============================
     HISTÓRICO COMPONENTES (KM)
  ============================= */
  async getComponentHistory(bikeId: string) {
    const { data, error } = await supabase
      .from("bike_component_history")
      .select(`
        component_type,
        component_type_code,
        component_serial_code,
        component_version,
        start_at,
        end_at,
        notes
      `)
      .eq("bike_id", bikeId)
      .order("start_at", { ascending: false });

    if (error) throw error;

    return data;
  }
}
