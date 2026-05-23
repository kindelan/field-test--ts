import { supabase } from "../dao/supabaseclient.js";
import { normalizeBikeCode } from "../utils/sanitizeBikeCode.js";

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
      .select("bikes(id, bikecode, motortype, motorcode)")
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

  private async fetchAllRides(): Promise<any[]> {
    let all: any[] = [];
    let start = 0;
    while (true) {
      const { data, error } = await supabase
        .from("test_ride_log")
        .select("*")
        .range(start, start + 999);

      if (error) throw error;
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < 1000) break;
      start += 1000;
    }
    return all;
  }

  private getRideDate(r: any): Date | null {
    const dateStr = r.ride_date || r.completion_date;
    return dateStr ? new Date(dateStr) : null;
  }

  private correctDistance(dist: number): number {
    if (dist >= 100) {
      const numDigits = String(Math.floor(dist)).length;
      if (numDigits > 2) {
        return dist / Math.pow(10, numDigits - 2);
      }
    }
    return dist;
  }

  private getMondayOfWeek(d: Date): string {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, "0");
    const date = String(monday.getDate()).padStart(2, "0");
    return `${year}-${month}-${date}`;
  }

  async getFieldTestKmTotal(fieldTestId: string): Promise<number> {
    const summary = await this.getAssignedBikesKmSummary(fieldTestId);
    return summary.totalKm;
  }

  async getAssignedBikesKmSummary(fieldTestId: string): Promise<{
    totalKm: number;
    rows: FieldTestKmRow[];
  }> {
    const { data: assignments, error: assignErr } = await supabase
      .from("bike_field_test")
      .select("*, bikes(*)")
      .eq("field_test_id", fieldTestId);

    if (assignErr) throw assignErr;
    if (!assignments || assignments.length === 0) {
      return { totalKm: 0, rows: [] };
    }

    const rides = await this.fetchAllRides();
    const bikeSums = new Map<string, number>();

    assignments.forEach((a: any) => {
      const bike = a.bikes;
      if (!bike) return;

      const bikeCodeNorm = normalizeBikeCode(bike.bikecode);
      if (!bikeCodeNorm) return;

      const start = new Date(a.start_at);
      const end = a.end_at ? new Date(a.end_at) : null;

      const matchingRides = rides.filter((r: any) => {
        const rNorm = normalizeBikeCode(r.bike_code);
        if (!rNorm || rNorm.toLowerCase() !== bikeCodeNorm.toLowerCase()) {
          return false;
        }

        const rDate = this.getRideDate(r);
        if (!rDate) return false;

        return rDate >= start && (!end || rDate <= end);
      });

      const assignmentSum = matchingRides.reduce(
        (sum, r) => sum + this.correctDistance(Number(r.distance_km || 0)),
        0
      );

      const key = bikeCodeNorm;
      bikeSums.set(key, (bikeSums.get(key) || 0) + assignmentSum);
    });

    const rows: FieldTestKmRow[] = Array.from(bikeSums.entries()).map(([bikecode, km]) => ({
      bikecode,
      km
    }));

    const totalKm = rows.reduce((acc, r) => acc + r.km, 0);

    return { totalKm, rows };
  }

  async getFieldTestWeeklyKmByMotor(fieldTestId: string) {
    const { data: assignments, error: assignErr } = await supabase
      .from("bike_field_test")
      .select("*, bikes(*)")
      .eq("field_test_id", fieldTestId);

    if (assignErr) throw assignErr;
    if (!assignments || assignments.length === 0) {
      return [];
    }

    const bikeIds = assignments.map((a: any) => a.bikes?.id).filter(Boolean);
    const { data: histories, error: histErr } = await supabase
      .from("bike_component_history")
      .select("*")
      .in("bike_id", bikeIds)
      .in("component_type", ["motor", "battery"]);

    if (histErr) throw histErr;
    const historyList = histories ?? [];

    const rides = await this.fetchAllRides();
    const grouped = new Map<string, { bike_code: string; motor_code: string; battery_code: string; week: string; km: number }>();

    assignments.forEach((a: any) => {
      const bike = a.bikes;
      if (!bike) return;

      const bikeCodeNorm = normalizeBikeCode(bike.bikecode);
      if (!bikeCodeNorm) return;

      const start = new Date(a.start_at);
      const end = a.end_at ? new Date(a.end_at) : null;

      const matchingRides = rides.filter((r: any) => {
        const rNorm = normalizeBikeCode(r.bike_code);
        if (!rNorm || rNorm.toLowerCase() !== bikeCodeNorm.toLowerCase()) {
          return false;
        }

        const rDate = this.getRideDate(r);
        if (!rDate) return false;

        return rDate >= start && (!end || rDate <= end);
      });

      const bikeHist = historyList.filter((h: any) => h.bike_id === bike.id);

      matchingRides.forEach((r: any) => {
        const rDate = this.getRideDate(r)!;
        const weekStr = this.getMondayOfWeek(rDate);

        // Find active motor history record for this bike at this ride date
        const activeMotorHist = bikeHist.find((h: any) => {
          if (h.component_type !== "motor") return false;
          const s = new Date(h.start_at);
          const e = h.end_at ? new Date(h.end_at) : null;
          return rDate >= s && (!e || rDate <= e);
        });
        const motorSerial = activeMotorHist ? activeMotorHist.component_serial_code : (bike.motorcode || "—");

        // Find active battery history record for this bike at this ride date
        const activeBatteryHist = bikeHist.find((h: any) => {
          if (h.component_type !== "battery") return false;
          const s = new Date(h.start_at);
          const e = h.end_at ? new Date(h.end_at) : null;
          return rDate >= s && (!e || rDate <= e);
        });
        const batterySerial = activeBatteryHist ? activeBatteryHist.component_serial_code : (bike.batterycode || "—");

        const dist = this.correctDistance(Number(r.distance_km || 0));

        const key = `${bikeCodeNorm.toLowerCase()}|${motorSerial.toLowerCase()}|${batterySerial.toLowerCase()}|${weekStr}`;
        const existing = grouped.get(key);
        if (existing) {
          existing.km += dist;
        } else {
          grouped.set(key, {
            bike_code: bikeCodeNorm,
            motor_code: motorSerial,
            battery_code: batterySerial,
            week: weekStr,
            km: dist
          });
        }
      });
    });

    return Array.from(grouped.values());
  }

  async getBikeHistory(bikeId: string) {
  const { data, error } = await supabase
    .from("bike_component_history")
    .select(`
      component_type,
      component_serial_code,
      component_version,
      start_at,
      end_at,
      notes
    `)
    .eq("bike_id", bikeId)
    .order("start_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

}