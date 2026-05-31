import { supabase } from "../dao/supabaseclient.js";
import { normalizeBikeCode } from "../utils/sanitizeBikeCode.js";
/* ========= SERVICE ========= */
export class FieldTestService {
    /* ---------- FIELD TESTS ---------- */
    async listFiltered(filter) {
        let q = supabase
            .from("field_test")
            .select("id, name, status")
            .order("created_at", { ascending: false });
        if (filter !== "all") {
            q = q.eq("status", filter);
        }
        const { data, error } = await q;
        if (error)
            throw error;
        return data ?? [];
    }
    async create(name) {
        const { error } = await supabase
            .from("field_test")
            .insert({
            name,
            start_date: new Date().toISOString(),
            status: "active"
        });
        if (error)
            throw error;
    }
    async updateStatus(id, status) {
        if (status === "finished") {
            const { error } = await supabase
                .from("field_test")
                .update({
                status,
                end_date: new Date().toISOString()
            })
                .eq("id", id);
            if (error)
                throw error;
            return;
        }
        const { error } = await supabase
            .from("field_test")
            .update({ status })
            .eq("id", id);
        if (error)
            throw error;
    }
    async delete(id) {
        const { error } = await supabase
            .from("field_test")
            .delete()
            .eq("id", id);
        if (error)
            throw error;
    }
    /* ---------- BIKES ---------- */
    // ✅ Obtener todas las asignaciones activas
    async getActiveAssignments() {
        const { data, error } = await supabase
            .from("bike_field_test")
            .select("bike_id, field_test_id, field_test(name)")
            .is("end_at", null);
        if (error)
            throw error;
        return data ?? [];
    }
    // ✅ SOLO bicis activas en ese field test
    async getBikesAssigned(fieldTestId) {
        const { data, error } = await supabase
            .from("bike_field_test")
            .select("bikes(id, bikecode, motortype, motorcode)")
            .eq("field_test_id", fieldTestId)
            .is("end_at", null);
        if (error)
            throw error;
        return data ?? [];
    }
    // ✅ TODAS las bicis (la lógica se hace en controller)
    async getAllBikes() {
        const { data, error } = await supabase
            .from("bikes")
            .select("*")
            .order("bikecode");
        if (error)
            throw error;
        return data ?? [];
    }
    // ⚠️ Mantenido por compatibilidad (ya no usar)
    async getBikesAvailable() {
        return this.getAllBikes();
    }
    async assignBike(bikeId, fieldTestId) {
        const { error } = await supabase
            .from("bike_field_test")
            .insert({
            bike_id: bikeId,
            field_test_id: fieldTestId,
            start_at: new Date().toISOString()
        });
        if (error)
            throw error;
    }
    async unassignBike(bikeId) {
        const { error } = await supabase
            .from("bike_field_test")
            .update({
            end_at: new Date().toISOString()
        })
            .eq("bike_id", bikeId)
            .is("end_at", null);
        if (error)
            throw error;
    }
    /* ---------- KM ---------- */
    async fetchAllRides() {
        let all = [];
        let start = 0;
        while (true) {
            const { data, error } = await supabase
                .from("test_ride_log")
                .select("*")
                .range(start, start + 999);
            if (error)
                throw error;
            if (!data || data.length === 0)
                break;
            all = all.concat(data);
            if (data.length < 1000)
                break;
            start += 1000;
        }
        return all;
    }
    getRideDate(r) {
        const dateStr = r.ride_date || r.completion_date;
        return dateStr ? new Date(dateStr) : null;
    }
    correctDistance(dist) {
        if (dist >= 100) {
            const numDigits = String(Math.floor(dist)).length;
            if (numDigits > 2) {
                return dist / Math.pow(10, numDigits - 2);
            }
        }
        return dist;
    }
    getMondayOfWeek(d) {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        const year = monday.getFullYear();
        const month = String(monday.getMonth() + 1).padStart(2, "0");
        const date = String(monday.getDate()).padStart(2, "0");
        return `${year}-${month}-${date}`;
    }
    async getFieldTestKmTotal(fieldTestId) {
        const summary = await this.getAssignedBikesKmSummary(fieldTestId);
        return summary.totalKm;
    }
    async getAssignedBikesKmSummary(fieldTestId) {
        const { data: assignments, error: assignErr } = await supabase
            .from("bike_field_test")
            .select("*, bikes(*)")
            .eq("field_test_id", fieldTestId);
        if (assignErr)
            throw assignErr;
        if (!assignments || assignments.length === 0) {
            return { totalKm: 0, rows: [] };
        }
        const rides = await this.fetchAllRides();
        const bikeSums = new Map();
        assignments.forEach((a) => {
            const bike = a.bikes;
            if (!bike)
                return;
            const bikeCodeNorm = normalizeBikeCode(bike.bikecode);
            if (!bikeCodeNorm)
                return;
            const start = new Date(a.start_at);
            const end = a.end_at ? new Date(a.end_at) : null;
            const matchingRides = rides.filter((r) => {
                const rNorm = normalizeBikeCode(r.bike_code);
                if (!rNorm || rNorm.toLowerCase() !== bikeCodeNorm.toLowerCase()) {
                    return false;
                }
                const rDate = this.getRideDate(r);
                if (!rDate)
                    return false;
                return rDate >= start && (!end || rDate <= end);
            });
            const assignmentSum = matchingRides.reduce((sum, r) => sum + this.correctDistance(Number(r.distance_km || 0)), 0);
            const key = bikeCodeNorm;
            bikeSums.set(key, (bikeSums.get(key) || 0) + assignmentSum);
        });
        const rows = Array.from(bikeSums.entries()).map(([bikecode, km]) => ({
            bikecode,
            km
        }));
        const totalKm = rows.reduce((acc, r) => acc + r.km, 0);
        return { totalKm, rows };
    }
    async getFieldTestWeeklyKmByMotor(fieldTestId) {
        const { data: assignments, error: assignErr } = await supabase
            .from("bike_field_test")
            .select("*, bikes(*)")
            .eq("field_test_id", fieldTestId);
        if (assignErr)
            throw assignErr;
        if (!assignments || assignments.length === 0) {
            return [];
        }
        const bikeIds = assignments.map((a) => a.bikes?.id).filter(Boolean);
        const { data: histories, error: histErr } = await supabase
            .from("bike_component_history")
            .select("*")
            .in("bike_id", bikeIds)
            .in("component_type", ["motor", "battery"]);
        if (histErr)
            throw histErr;
        const historyList = histories ?? [];
        const rides = await this.fetchAllRides();
        const grouped = new Map();
        assignments.forEach((a) => {
            const bike = a.bikes;
            if (!bike)
                return;
            const bikeCodeNorm = normalizeBikeCode(bike.bikecode);
            if (!bikeCodeNorm)
                return;
            const start = new Date(a.start_at);
            const end = a.end_at ? new Date(a.end_at) : null;
            const matchingRides = rides.filter((r) => {
                const rNorm = normalizeBikeCode(r.bike_code);
                if (!rNorm || rNorm.toLowerCase() !== bikeCodeNorm.toLowerCase()) {
                    return false;
                }
                const rDate = this.getRideDate(r);
                if (!rDate)
                    return false;
                return rDate >= start && (!end || rDate <= end);
            });
            const bikeHist = historyList.filter((h) => h.bike_id === bike.id);
            matchingRides.forEach((r) => {
                const rDate = this.getRideDate(r);
                const weekStr = this.getMondayOfWeek(rDate);
                // Find active motor history record for this bike at this ride date
                const activeMotorHist = bikeHist.find((h) => {
                    if (h.component_type !== "motor")
                        return false;
                    const s = new Date(h.start_at);
                    const e = h.end_at ? new Date(h.end_at) : null;
                    return rDate >= s && (!e || rDate <= e);
                });
                const motorSerial = activeMotorHist ? activeMotorHist.component_serial_code : (bike.motorcode || "—");
                // Find active battery history record for this bike at this ride date
                const activeBatteryHist = bikeHist.find((h) => {
                    if (h.component_type !== "battery")
                        return false;
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
                }
                else {
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
    async getBikeHistory(bikeId) {
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
        if (error)
            throw error;
        return data ?? [];
    }
    async getBikeFeedback(fieldTestId, bikeCode) {
        // 1. Get the assignment period for this bike in this field test
        const { data: assignments, error: assignErr } = await supabase
            .from("bike_field_test")
            .select("*, bikes(*)")
            .eq("field_test_id", fieldTestId);
        if (assignErr)
            throw assignErr;
        if (!assignments || assignments.length === 0)
            return [];
        const bikeCodeNorm = normalizeBikeCode(bikeCode);
        if (!bikeCodeNorm)
            return [];
        const assignment = assignments.find((a) => {
            const bCode = a.bikes?.bikecode;
            return bCode && normalizeBikeCode(bCode)?.toLowerCase() === bikeCodeNorm.toLowerCase();
        });
        if (!assignment)
            return [];
        const start = new Date(assignment.start_at);
        const end = assignment.end_at ? new Date(assignment.end_at) : null;
        // 2. Fetch feedback for this bike using inner join to filter by bike_code_sanitized
        const { data: feedbacks, error: fbErr } = await supabase
            .from("test_ride_feedback")
            .select("*, test_ride_log!inner(*)")
            .eq("test_ride_log.bike_code_sanitized", bikeCodeNorm.toLowerCase());
        if (fbErr)
            throw fbErr;
        if (!feedbacks)
            return [];
        // 3. Filter by date range of the assignment and sort descending by date
        return feedbacks
            .filter((f) => {
            if (!f.test_ride_log)
                return false;
            const dateStr = f.test_ride_log.ride_date || f.test_ride_log.completion_date;
            if (!dateStr)
                return false;
            const rDate = new Date(dateStr);
            return rDate >= start && (!end || rDate <= end);
        })
            .sort((a, b) => {
            const dateA = new Date(a.test_ride_log.ride_date || a.test_ride_log.completion_date).getTime();
            const dateB = new Date(b.test_ride_log.ride_date || b.test_ride_log.completion_date).getTime();
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
        if (error)
            throw error;
        return data || [];
    }
    async createErrorTag(name, component) {
        const { error } = await supabase
            .from("error_tags")
            .insert({ name, component });
        if (error)
            throw error;
    }
    async getBikeErrors(fieldTestId, bikeId) {
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
        if (error)
            throw error;
        return data || [];
    }
    async getFieldTestErrors(fieldTestId) {
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
        if (error)
            throw error;
        return data || [];
    }
    async calculateBikeKmUpToDate(bikeCode, dateStr) {
        const targetDate = new Date(dateStr);
        const bikeCodeNorm = normalizeBikeCode(bikeCode);
        if (!bikeCodeNorm)
            return 0;
        const rides = await this.fetchAllRides();
        const matchingRides = rides.filter((r) => {
            const rNorm = normalizeBikeCode(r.bike_code);
            if (!rNorm || rNorm.toLowerCase() !== bikeCodeNorm.toLowerCase()) {
                return false;
            }
            const rDate = this.getRideDate(r);
            return rDate && rDate <= targetDate;
        });
        return matchingRides.reduce((sum, r) => sum + this.correctDistance(Number(r.distance_km || 0)), 0);
    }
    async addBikeError(fieldTestId, bikeId, errorTagId, errorDate, desc) {
        // 1. Fetch the bike code
        const { data: bike, error: bikeErr } = await supabase
            .from("bikes")
            .select("bikecode")
            .eq("id", bikeId)
            .single();
        if (bikeErr)
            throw bikeErr;
        if (!bike)
            throw new Error("Bike not found");
        // 2. Calculate accumulated KM up to errorDate
        const kmAtFailure = await this.calculateBikeKmUpToDate(bike.bikecode, errorDate);
        // 3. Insert the new bike error
        const { error: insertErr } = await supabase
            .from("bike_errors")
            .insert({
            field_test_id: fieldTestId,
            bike_id: bikeId,
            error_tag_id: errorTagId,
            error_date: errorDate,
            km_at_failure: kmAtFailure,
            description: desc || null
        });
        if (insertErr)
            throw insertErr;
    }
    async findBikeForComponent(type, serial, dateStr) {
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
        if (!data)
            return null;
        const matching = data.find(h => {
            const start = new Date(h.start_at);
            const end = h.end_at ? new Date(h.end_at) : null;
            return targetDate >= start && (!end || targetDate <= end);
        });
        if (matching && matching.bikes) {
            return matching.bikes;
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
    async addGenericError(fieldTestId, targetType, targetValue, errorTagId, errorDate, description) {
        let bikeId = null;
        let motorCode = null;
        let batteryCode = null;
        if (targetType === 'bike') {
            bikeId = targetValue;
        }
        else if (targetType === 'motor') {
            motorCode = targetValue;
            const b = await this.findBikeForComponent('motor', motorCode, errorDate);
            if (b)
                bikeId = b.id;
        }
        else if (targetType === 'battery') {
            batteryCode = targetValue;
            const b = await this.findBikeForComponent('battery', batteryCode, errorDate);
            if (b)
                bikeId = b.id;
        }
        let kmAtFailure = 0;
        if (bikeId) {
            const { data: bike, error: bikeErr } = await supabase
                .from("bikes")
                .select("bikecode")
                .eq("id", bikeId)
                .single();
            if (!bikeErr && bike) {
                kmAtFailure = await this.calculateBikeKmUpToDate(bike.bikecode, errorDate);
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
        if (error)
            throw error;
    }
    async deleteBikeError(errorId) {
        const { error } = await supabase
            .from("bike_errors")
            .delete()
            .eq("id", errorId);
        if (error)
            throw error;
    }
}
