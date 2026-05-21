import { supabase } from "../dao/supabaseclient.js";

/* ========= TYPES ========= */

export type FieldTestStatus =
  | "planned"
  | "active"
  | "paused"
  | "finished";

export interface FieldTestKmRow {
  bikecode: string;
  km: number;
}

/* ========= SERVICE ========= */

export class FieldTestService {

  /* ---------- FIELD TESTS ---------- */

  async listFiltered(filter: "all" | FieldTestStatus) {
    let q = supabase
      .from("field_test")
      .select("id, name, status")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      q = q.eq("status", filter);
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  async create(name: string): Promise<void> {
    const { error } = await supabase
      .from("field_test")
      .insert({
        name,
        start_date: new Date().toISOString(),
        status: "active"
      });

    if (error) throw error;
  }

  async updateStatus(id: string, status: FieldTestStatus): Promise<void> {
    if (status === "finished") {
      const { error } = await supabase
        .from("field_test")
        .update({
          status,
          end_date: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from("field_test")
      .update({ status })
      .eq("id", id);

    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("field_test")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  /* ---------- BIKES ---------- */

  // ✅ SOLO bicis activas en ese field test
  async getBikesAssigned(fieldTestId: string) {
    const { data, error } = await supabase
      .from("bike_field_test")
      .select("bikes(id, bikecode, motortype)")
      .eq("field_test_id", fieldTestId)
      .is("end_at", null);

    if (error) throw error;
    return data ?? [];
  }

  // ✅ TODAS las bicis (la lógica se hace en controller)
  async getAllBikes() {
    const { data, error } = await supabase
      .from("bikes")
      .select("*")
      .order("bikecode");

    if (error) throw error;
    return data ?? [];
  }

  // ⚠️ Mantenido por compatibilidad (ya no usar)
  async getBikesAvailable() {
    return this.getAllBikes();
  }

  async assignBike(bikeId: string, fieldTestId: string): Promise<void> {
    const { error } = await supabase
      .from("bike_field_test")
      .insert({
        bike_id: bikeId,
        field_test_id: fieldTestId,
        start_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  async unassignBike(bikeId: string): Promise<void> {
    const { error } = await supabase
      .from("bike_field_test")
      .update({
        end_at: new Date().toISOString()
      })
      .eq("bike_id", bikeId)
      .is("end_at", null);

    if (error) throw error;
  }

  /* ---------- KM ---------- */

  async getFieldTestKmTotal(fieldTestId: string): Promise<number> {
    const { data, error } = await supabase.rpc(
      "field_test_total_km",
      { p_field_test_id: fieldTestId }
    );

    if (error) throw error;
    return data ?? 0;
  }

  async getAssignedBikesKmSummary(fieldTestId: string): Promise<{
    totalKm: number;
    rows: FieldTestKmRow[];
  }> {
    const { data, error } = await supabase.rpc(
      "field_test_km_by_bike",
      { p_field_test_id: fieldTestId }
    );

    if (error) throw error;

    const rows: FieldTestKmRow[] = (data ?? []).map((r: any) => ({
      bikecode: r.bikecode,
      km: r.km
    }));

    const totalKm = rows.reduce((acc, r) => acc + r.km, 0);

    return { totalKm, rows };
  }

  async getFieldTestWeeklyKmByMotor(fieldTestId: string) {
    const { data, error } = await supabase.rpc(
      "field_test_motor_weekly_km",
      { p_field_test_id: fieldTestId }
    );

    if (error) throw error;
    return data ?? [];
  }

  async getBikeHistory(bikeId: string) {
  const { data, error } = await supabase
    .from("bike_component_history")
    .select(`
      component_type,
      component_serial_code,
      component_version,
      start_at,
      end_at
    `)
    .eq("bike_id", bikeId)
    .order("start_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

}