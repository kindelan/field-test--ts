import { supabase } from "./supabaseclient.js";
import type { CreateRideLogDTO, CreateRideFeedbackDTO } from "../dto/index.js";

export class RideLogDAO {
  async insertRideLog(dto: CreateRideLogDTO): Promise<string> {
    const { data, error } = await supabase
      .from("test_ride_log")
      .insert({
        ride_date_txt: dto.ride_date_txt,
        completion_date_txt: dto.completion_date_txt,
        bike_code: dto.bike_code,
        bike_code_sanitized: dto.bike_code.toLowerCase().replace(/\s+/g, ""),
        distance_km: dto.distance_km,
        elevation_m: dto.elevation_m ?? null,
        motor_type: dto.motor_type ?? null
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }
    if (!data) {
      throw new Error("Failed to insert ride log, no data returned.");
    }
    return data.id;
  }

  async insertFeedback(rideId: string, dto: CreateRideFeedbackDTO): Promise<void> {
    const { error } = await supabase
      .from("test_ride_feedback")
      .insert({
        ride_id: rideId,
        rider_name: dto.rider_name,
        rider_email: dto.rider_email ?? null,
        initial_battery: dto.initial_battery ?? null,
        final_battery: dto.final_battery ?? null,
        motor_startup: dto.motor_startup ?? null,
        motor_stop: dto.motor_stop ?? null,
        assistance: dto.assistance ?? null,
        power_feeling: dto.power_feeling ?? null,
        motor_feel: dto.motor_feel ?? null,
        motor_error: dto.motor_error ?? null,
        error_description: dto.error_description ?? null,
        comments: dto.comments ?? null,
        use_app: dto.use_app ?? null,
        app_experience: dto.app_experience ?? null,
        test_dynamic_mode: dto.test_dynamic_mode ?? null,
        auto_mode_experience: dto.auto_mode_experience ?? null,
        flat_terrain_assistance: dto.flat_terrain_assistance ?? null,
        flat_terrain_perception: dto.flat_terrain_perception ?? null,
        moderate_terrain_assistance: dto.moderate_terrain_assistance ?? null,
        moderate_terrain_perception: dto.moderate_terrain_perception ?? null,
        steep_terrain_assistance: dto.steep_terrain_assistance ?? null,
        steep_terrain_perception: dto.steep_terrain_perception ?? null,
        technical_terrain_assistance: dto.technical_terrain_assistance ?? null,
        technical_terrain_perception: dto.technical_terrain_perception ?? null,
        suggested_improvements: dto.suggested_improvements ?? null
      });

    if (error) {
      throw error;
    }
  }
}
