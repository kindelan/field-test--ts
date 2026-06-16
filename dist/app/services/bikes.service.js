import { supabase } from "../dao/supabaseclient.js";
/* =====================================================
   SERVICE
===================================================== */
export class BikesService {
    /* =============================
       LIST
    ============================= */
    async list() {
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
        if (error)
            throw error;
        return data;
    }
    /* =============================
       CREATE
    ============================= */
    async create(input) {
        const { data, error } = await supabase
            .from("bikes")
            .insert(input)
            .select("*")
            .single();
        if (error)
            throw error;
        return data;
    }
    /* =============================
       UPDATE SIMPLE
    ============================= */
    async update(id, changes) {
        const { data, error } = await supabase
            .from("bikes")
            .update(changes)
            .eq("id", id)
            .select("*")
            .single();
        if (error)
            throw error;
        return data;
    }
    /* =====================================================
       🔧 CAMBIO DE COMPONENTE (CORE)
    ===================================================== */
    async changeBikeComponent(input) {
        const changedAt = input.changedAt ?? new Date().toISOString();
        let movedFromBikeCode = null;
        /* -------------------------------------------------
           0️⃣ Buscar si el componente está activo en otra bici
        ------------------------------------------------- */
        if (input.componentSerialCode && input.componentSerialCode !== "—") {
            const { data: activeOnOther } = await supabase
                .from("bike_component_history")
                .select("id, bike_id")
                .eq("component_type", input.componentType)
                .eq("component_serial_code", input.componentSerialCode)
                .is("end_at", null)
                .neq("bike_id", input.bikeId)
                .maybeSingle();
            if (activeOnOther) {
                // Obtener el código de la bici anterior
                const { data: oldBike } = await supabase
                    .from("bikes")
                    .select("bikecode")
                    .eq("id", activeOnOther.bike_id)
                    .maybeSingle();
                if (oldBike) {
                    movedFromBikeCode = oldBike.bikecode;
                }
                // 1. Cerrar el período en la otra bici
                await supabase
                    .from("bike_component_history")
                    .update({ end_at: changedAt })
                    .eq("id", activeOnOther.id);
                // 2. Desvincular de la tabla bikes de la otra bici
                const oldBikeUpdate = {};
                if (input.componentType === "motor") {
                    oldBikeUpdate.motortype = null;
                    oldBikeUpdate.motorcode = null;
                    oldBikeUpdate.motorfirmware = null;
                }
                else if (input.componentType === "battery") {
                    oldBikeUpdate.batterytype = null;
                    oldBikeUpdate.batterycode = null;
                    oldBikeUpdate.batteryfirmware = null;
                }
                else if (input.componentType === "hmi") {
                    oldBikeUpdate.hmicode = null;
                    oldBikeUpdate.hmifirmware = null;
                }
                else if (input.componentType === "other") {
                    oldBikeUpdate.other = null;
                }
                if (Object.keys(oldBikeUpdate).length) {
                    await supabase
                        .from("bikes")
                        .update(oldBikeUpdate)
                        .eq("id", activeOnOther.bike_id);
                }
            }
        }
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
        if (closeErr)
            throw closeErr;
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
        if (insertErr)
            throw insertErr;
        /* -------------------------------------------------
           4️⃣ Update tabla bikes
        ------------------------------------------------- */
        const bikeUpdate = {};
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
            if (bikeErr)
                throw bikeErr;
        }
        return { movedFromBikeCode };
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
    async getHistory(bikeId) {
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
        if (error)
            throw error;
        return data;
    }
    /* =============================
       HISTÓRICO COMPONENTES (KM)
    ============================= */
    async getComponentHistory(bikeId) {
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
        if (error)
            throw error;
        return data;
    }
}
