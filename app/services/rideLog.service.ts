import { supabase } from "../dao/supabaseclient.js";
import { RideLogDAO } from "../dao/rideLog.dao.js";
import type { CreateRideLogDTO, CreateRideFeedbackDTO } from "../dto/index.js";

export class RideLogService {
  private rideLogDao = new RideLogDAO();

  async getFieldTests(): Promise<{ id: string; name: string }[]> {
    const { data, error } = await supabase
      .from("field_test")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }
    return data || [];
  }

  async getBikesByFieldTest(fieldTestId: string): Promise<{ id: string; bikecode: string; motortype: string | null }[]> {
    const { data, error } = await supabase
      .from("bike_field_test")
      .select("bikes(id, bikecode, motortype)")
      .eq("field_test_id", fieldTestId)
      .is("end_at", null);

    if (error) {
      throw error;
    }

    // Extract bikes, filter null values, and sort by bikecode
    return (data || [])
      .map((item: any) => item.bikes)
      .filter(Boolean)
      .sort((a: any, b: any) => a.bikecode.localeCompare(b.bikecode));
  }

  async getActiveBikes(): Promise<{ id: string; bikecode: string; motortype: string | null }[]> {
    const { data, error } = await supabase
      .from("bikes")
      .select("id, bikecode, motortype")
      .order("bikecode", { ascending: true });

    if (error) {
      throw error;
    }
    return data || [];
  }

  async resolveMotorType(bikeId: string, bikeCode: string, rideDate: Date): Promise<string | null> {
    // 1. Fetch motor component history for this bike
    const { data: history, error: histError } = await supabase
      .from("bike_component_history")
      .select("component_type_code, start_at, end_at")
      .eq("bike_id", bikeId)
      .eq("component_type", "motor");

    if (histError) {
      console.error("Error fetching motor history:", histError);
    }

    if (history && history.length > 0) {
      // Sort history descending by start_at to prioritize newer components
      const sortedHistory = [...history].sort(
        (a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime()
      );

      const activeMotor = sortedHistory.find((h) => {
        const s = new Date(h.start_at);
        const e = h.end_at ? new Date(h.end_at) : null;
        return rideDate >= s && (!e || rideDate <= e);
      });

      if (activeMotor && activeMotor.component_type_code) {
        return activeMotor.component_type_code;
      }
    }

    // 2. Fallback: fetch current motortype from bikes table
    const { data: bike, error: bikeError } = await supabase
      .from("bikes")
      .select("motortype")
      .eq("id", bikeId)
      .maybeSingle();

    if (bikeError) {
      console.error("Error fetching bike fallback motortype:", bikeError);
    }

    return bike ? bike.motortype : null;
  }

  async saveRideWithFeedback(
    rideDto: Omit<CreateRideLogDTO, "motor_type">,
    feedbackDto: Omit<CreateRideFeedbackDTO, "ride_id">
  ): Promise<void> {
    // 1. Business Validation
    if (!rideDto.bike_code || !rideDto.ride_date_txt || !rideDto.completion_date_txt) {
      throw new Error("Missing required ride logging fields.");
    }
    if (rideDto.distance_km <= 0) {
      throw new Error("Distance must be greater than zero.");
    }
    if (!feedbackDto.rider_name) {
      throw new Error("Rider name is required.");
    }

    // 2. Fetch the bike details to get its ID
    const { data: bike, error: bikeError } = await supabase
      .from("bikes")
      .select("id, bikecode, motortype")
      .ilike("bikecode", rideDto.bike_code.trim())
      .maybeSingle();

    if (bikeError) throw bikeError;
    if (!bike) {
      throw new Error(`Bike with code '${rideDto.bike_code}' not found.`);
    }

    // 3. Resolve the active motor type dynamically for the ride date
    const rideDate = new Date(rideDto.completion_date_txt);
    const resolvedMotorType = await this.resolveMotorType(bike.id, bike.bikecode, rideDate);

    // 4. Construct complete DTOs
    const fullRideDto: CreateRideLogDTO = {
      ...rideDto,
      motor_type: resolvedMotorType
    };

    // 5. Database operations (isolated inside DAO)
    const rideId = await this.rideLogDao.insertRideLog(fullRideDto);
    await this.rideLogDao.insertFeedback(rideId, feedbackDto);
  }

  async getReviewQuestions(fieldTestId?: string): Promise<any[]> {
    let query = supabase
      .from("review_questions")
      .select("*")
      .order("sort_order", { ascending: true });

    if (fieldTestId) {
      query = query.or(`field_test_ids.is.null,field_test_ids.cs.{${fieldTestId}}`);
    } else {
      query = query.is("field_test_ids", null);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }
    return data || [];
  }
}
