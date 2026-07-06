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
  elevation: number;
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

  // ✅ Obtener todas las asignaciones activas
  async getActiveAssignments() {
    const { data, error } = await supabase
      .from("bike_field_test")
      .select("bike_id, field_test_id, field_test(name)")
      .is("end_at", null);

    if (error) throw error;
    return (data as any[]) ?? [];
  }

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
    const dateStr = r.ride_date || r.completion_date || r.ride_date_txt || r.completion_date_txt;
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
    const bikeSums = new Map<string, { km: number; elevation: number }>();

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

      const assignmentElevationSum = matchingRides.reduce(
        (sum, r) => sum + Number(r.elevation_m || 0),
        0
      );

      const key = bikeCodeNorm;
      const existing = bikeSums.get(key) || { km: 0, elevation: 0 };
      bikeSums.set(key, {
        km: existing.km + assignmentSum,
        elevation: existing.elevation + assignmentElevationSum
      });
    });

    const rows: FieldTestKmRow[] = Array.from(bikeSums.entries()).map(([bikecode, val]) => ({
      bikecode,
      km: val.km,
      elevation: val.elevation
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
    const grouped = new Map<string, { bike_code: string; motor_code: string; battery_code: string; week: string; km: number; elevation: number }>();

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
        const elev = Number(r.elevation_m || 0);

        const key = `${bikeCodeNorm.toLowerCase()}|${motorSerial.toLowerCase()}|${batterySerial.toLowerCase()}|${weekStr}`;
        const existing = grouped.get(key);
        if (existing) {
          existing.km += dist;
          existing.elevation += elev;
        } else {
          grouped.set(key, {
            bike_code: bikeCodeNorm,
            motor_code: motorSerial,
            battery_code: batterySerial,
            week: weekStr,
            km: dist,
            elevation: elev
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

  async getBikeFeedback(fieldTestId: string, bikeCode: string): Promise<any[]> {
    // 1. Get the assignment period for this bike in this field test
    const { data: assignments, error: assignErr } = await supabase
      .from("bike_field_test")
      .select("*, bikes(*)")
      .eq("field_test_id", fieldTestId);

    if (assignErr) throw assignErr;
    if (!assignments || assignments.length === 0) return [];

    const bikeCodeNorm = normalizeBikeCode(bikeCode);
    if (!bikeCodeNorm) return [];

    const assignment = assignments.find((a: any) => {
      const bCode = a.bikes?.bikecode;
      return bCode && normalizeBikeCode(bCode)?.toLowerCase() === bikeCodeNorm.toLowerCase();
    });

    if (!assignment) return [];

    const start = new Date(assignment.start_at);
    const end = assignment.end_at ? new Date(assignment.end_at) : null;

    // 2. Fetch feedback for this bike using inner join to filter by bike_code_sanitized
    const { data: feedbacks, error: fbErr } = await supabase
      .from("test_ride_feedback")
      .select("*, test_ride_log!inner(*)")
      .eq("test_ride_log.bike_code_sanitized", bikeCodeNorm.toLowerCase());

    if (fbErr) throw fbErr;
    if (!feedbacks) return [];

    // 3. Filter by date range of the assignment and sort descending by date
    return feedbacks
      .filter((f: any) => {
        if (!f.test_ride_log) return false;
        const dateStr = f.test_ride_log.ride_date || 
                        f.test_ride_log.completion_date || 
                        f.test_ride_log.ride_date_txt || 
                        f.test_ride_log.completion_date_txt;
        if (!dateStr) return false;
        const rDate = new Date(dateStr);
        return rDate >= start && (!end || rDate <= end);
      })
      .sort((a: any, b: any) => {
        const dateA = new Date(a.test_ride_log.ride_date || a.test_ride_log.completion_date || a.test_ride_log.ride_date_txt || a.test_ride_log.completion_date_txt).getTime();
        const dateB = new Date(b.test_ride_log.ride_date || b.test_ride_log.completion_date || b.test_ride_log.ride_date_txt || b.test_ride_log.completion_date_txt).getTime();
        return dateB - dateA;
      });
  }

  /* ---------- ERROR SYSTEM ---------- */

  async getErrorTags() {
    const { data, error } = await supabase
      .from("error_tags")
      .select("*")
      .order("component", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createErrorTag(name: string, component: string): Promise<void> {
    const { error } = await supabase
      .from("error_tags")
      .insert({ name, component });

    if (error) throw error;
  }

  async getBikeErrors(fieldTestId: string, bikeId: string) {
    const { data, error } = await supabase
      .from("bike_errors")
      .select(`
        id,
        error_date,
        km_at_failure,
        description,
        motor_code,
        battery_code,
        error_tags(id, name, component)
      `)
      .eq("field_test_id", fieldTestId)
      .eq("bike_id", bikeId)
      .order("error_date", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getFieldTestErrors(fieldTestId: string) {
    const { data, error } = await supabase
      .from("bike_errors")
      .select(`
        id,
        error_date,
        km_at_failure,
        description,
        motor_code,
        battery_code,
        bikes(id, bikecode),
        error_tags(id, name, component)
      `)
      .eq("field_test_id", fieldTestId)
      .order("error_date", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async calculateKmInFieldTestUpToDate(
    fieldTestId: string,
    bikeCode: string,
    dateStr: string,
    componentType?: 'motor' | 'battery',
    componentSerial?: string
  ): Promise<number> {
    const targetDate = new Date(dateStr);
    const bikeCodeNorm = normalizeBikeCode(bikeCode);
    if (!bikeCodeNorm) return 0;

    // 1. Get the assignment for this bike in this field test
    const { data: assignments, error: assignErr } = await supabase
      .from("bike_field_test")
      .select("*, bikes(*)")
      .eq("field_test_id", fieldTestId);

    if (assignErr) throw assignErr;
    
    const assignment = (assignments || []).find((a: any) => {
      const bCode = a.bikes?.bikecode;
      return bCode && normalizeBikeCode(bCode)?.toLowerCase() === bikeCodeNorm.toLowerCase();
    });
    if (!assignment) return 0;

    const assignStart = new Date(assignment.start_at);
    const assignEnd = assignment.end_at ? new Date(assignment.end_at) : null;

    // 2. Fetch all rides
    const rides = await this.fetchAllRides();

    // 3. If component is specified, fetch its history to find when it was active
    let compStart: Date | null = null;
    let compEnd: Date | null = null;
    if (componentType && componentSerial) {
      const { data: histories } = await supabase
        .from("bike_component_history")
        .select("*")
        .eq("bike_id", assignment.bike_id)
        .eq("component_type", componentType)
        .eq("component_serial_code", componentSerial);

      // Find the history entry that covers the targetDate
      const matchingHist = (histories || []).find((h: any) => {
        const s = new Date(h.start_at);
        const e = h.end_at ? new Date(h.end_at) : null;
        return targetDate >= s && (!e || targetDate <= e);
      });

      if (matchingHist) {
        compStart = new Date(matchingHist.start_at);
        compEnd = matchingHist.end_at ? new Date(matchingHist.end_at) : null;
      }
    }

    // 4. Filter rides
    const matchingRides = rides.filter((r: any) => {
      const rNorm = normalizeBikeCode(r.bike_code);
      if (!rNorm || rNorm.toLowerCase() !== bikeCodeNorm.toLowerCase()) {
        return false;
      }

      const rDate = this.getRideDate(r);
      if (!rDate || rDate > targetDate) return false;

      // Must be within field test assignment
      if (rDate < assignStart || (assignEnd && rDate > assignEnd)) {
        return false;
      }

      // Must be within component history active period if specified
      if (compStart) {
        if (rDate < compStart || (compEnd && rDate > compEnd)) {
          return false;
        }
      }

      return true;
    });

    return matchingRides.reduce(
      (sum, r) => sum + this.correctDistance(Number(r.distance_km || 0)),
      0
    );
  }

  async calculateBikeKmUpToDate(bikeCode: string, dateStr: string): Promise<number> {
    const targetDate = new Date(dateStr);
    const bikeCodeNorm = normalizeBikeCode(bikeCode);
    if (!bikeCodeNorm) return 0;

    const rides = await this.fetchAllRides();
    const matchingRides = rides.filter((r: any) => {
      const rNorm = normalizeBikeCode(r.bike_code);
      if (!rNorm || rNorm.toLowerCase() !== bikeCodeNorm.toLowerCase()) {
        return false;
      }
      const rDate = this.getRideDate(r);
      return rDate && rDate <= targetDate;
    });

    return matchingRides.reduce(
      (sum, r) => sum + this.correctDistance(Number(r.distance_km || 0)),
      0
    );
  }

  async addBikeError(
    fieldTestId: string,
    bikeId: string,
    errorTagId: string,
    errorDate: string,
    desc: string
  ): Promise<void> {
    // 1. Fetch the bike code
    const { data: bike, error: bikeErr } = await supabase
      .from("bikes")
      .select("id, bikecode, motorcode, batterycode")
      .eq("id", bikeId)
      .single();

    if (bikeErr) throw bikeErr;
    if (!bike) throw new Error("Bike not found");

    // 2. Fetch the error tag to see if it is component-specific
    const { data: tag } = await supabase
      .from("error_tags")
      .select("component")
      .eq("id", errorTagId)
      .single();

    let componentType: 'motor' | 'battery' | undefined = undefined;
    let componentSerial: string | undefined = undefined;

    if (tag) {
      if (tag.component === 'motor') {
        componentType = 'motor';
        const { data: histories } = await supabase
          .from("bike_component_history")
          .select("component_serial_code, start_at, end_at")
          .eq("bike_id", bikeId)
          .eq("component_type", "motor");
        
        const activeHist = (histories || []).find((h: any) => {
          const s = new Date(h.start_at);
          const e = h.end_at ? new Date(h.end_at) : null;
          const d = new Date(errorDate);
          return d >= s && (!e || d <= e);
        });
        componentSerial = activeHist ? activeHist.component_serial_code : (bike.motorcode || undefined);
      } else if (tag.component === 'battery') {
        componentType = 'battery';
        const { data: histories } = await supabase
          .from("bike_component_history")
          .select("component_serial_code, start_at, end_at")
          .eq("bike_id", bikeId)
          .eq("component_type", "battery");
        
        const activeHist = (histories || []).find((h: any) => {
          const s = new Date(h.start_at);
          const e = h.end_at ? new Date(h.end_at) : null;
          const d = new Date(errorDate);
          return d >= s && (!e || d <= e);
        });
        componentSerial = activeHist ? activeHist.component_serial_code : (bike.batterycode || undefined);
      }
    }

    // Calculate km inside field test up to errorDate
    const kmAtFailure = await this.calculateKmInFieldTestUpToDate(
      fieldTestId,
      bike.bikecode,
      errorDate,
      componentType,
      componentSerial
    );

    // 3. Insert the new bike error
    const { error: insertErr } = await supabase
      .from("bike_errors")
      .insert({
        field_test_id: fieldTestId,
        bike_id: bikeId,
        error_tag_id: errorTagId,
        error_date: errorDate,
        km_at_failure: kmAtFailure,
        description: desc || null,
        motor_code: componentType === 'motor' ? componentSerial : null,
        battery_code: componentType === 'battery' ? componentSerial : null
      });

    if (insertErr) throw insertErr;
  }

  async findBikeForComponent(type: 'motor' | 'battery', serial: string, dateStr: string): Promise<{ id: string; bikecode: string } | null> {
    const targetDate = new Date(dateStr);
    const { data, error } = await supabase
      .from("bike_component_history")
      .select("bike_id, start_at, end_at, bikes:bike_id(id, bikecode)")
      .eq("component_type", type)
      .eq("component_serial_code", serial);

    if (error) {
      console.warn("Error finding bike for component:", error);
      return null;
    }
    if (!data) return null;

    const matching = data.find(h => {
      const start = new Date(h.start_at);
      const end = h.end_at ? new Date(h.end_at) : null;
      return targetDate >= start && (!end || targetDate <= end);
    });

    if (matching && matching.bikes) {
      return matching.bikes as any;
    }

    // Fallback: If not in component history, check if any active bike has it as default
    const { data: defaults, error: defaultErr } = await supabase
      .from("bikes")
      .select("id, bikecode")
      .eq(type === "motor" ? "motorcode" : "batterycode", serial)
      .limit(1);

    if (!defaultErr && defaults && defaults.length > 0) {
      return defaults[0];
    }

    return null;
  }

  async addGenericError(
    fieldTestId: string,
    targetType: 'bike' | 'motor' | 'battery',
    targetValue: string,
    errorTagId: string,
    errorDate: string,
    description: string
  ): Promise<void> {
    let bikeId: string | null = null;
    let motorCode: string | null = null;
    let batteryCode: string | null = null;

    if (targetType === 'bike') {
      bikeId = targetValue;
    } else if (targetType === 'motor') {
      motorCode = targetValue;
      const b = await this.findBikeForComponent('motor', motorCode, errorDate);
      if (b) bikeId = b.id;
    } else if (targetType === 'battery') {
      batteryCode = targetValue;
      const b = await this.findBikeForComponent('battery', batteryCode, errorDate);
      if (b) bikeId = b.id;
    }

    let kmAtFailure = 0;
    if (bikeId) {
      const { data: bike, error: bikeErr } = await supabase
        .from("bikes")
        .select("bikecode")
        .eq("id", bikeId)
        .single();
      if (!bikeErr && bike) {
        kmAtFailure = await this.calculateKmInFieldTestUpToDate(
          fieldTestId,
          bike.bikecode,
          errorDate,
          targetType !== 'bike' ? targetType : undefined,
          targetType !== 'bike' ? targetValue : undefined
        );
      }
    }

    const { error } = await supabase
      .from("bike_errors")
      .insert({
        field_test_id: fieldTestId,
        bike_id: bikeId,
        error_tag_id: errorTagId,
        error_date: errorDate,
        km_at_failure: kmAtFailure,
        description: description || null,
        motor_code: motorCode || null,
        battery_code: batteryCode || null
      });

    if (error) throw error;
  }

  async deleteBikeError(errorId: string): Promise<void> {
    const { error } = await supabase
      .from("bike_errors")
      .delete()
      .eq("id", errorId);

    if (error) throw error;
  }
}