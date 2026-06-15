export interface CreateRideLogDTO {
  ride_date_txt: string;
  completion_date_txt: string;
  bike_code: string;
  distance_km: number;
  elevation_m?: number | null;
  motor_type?: string | null;
}

export interface CreateRideFeedbackDTO {
  rider_name: string;
  rider_email?: string | null;
  initial_battery?: number | null;
  final_battery?: number | null;
  motor_startup?: string | null;
  motor_stop?: string | null;
  assistance?: string | null;
  power_feeling?: string | null;
  motor_feel?: string | null;
  motor_error?: string | null;
  error_description?: string | null;
  comments?: string | null;
  use_app?: string | null;
  app_experience?: string | null;
  test_dynamic_mode?: string | null;
  auto_mode_experience?: string | null;
  flat_terrain_assistance?: string | null;
  flat_terrain_perception?: string | null;
  moderate_terrain_assistance?: string | null;
  moderate_terrain_perception?: string | null;
  steep_terrain_assistance?: string | null;
  steep_terrain_perception?: string | null;
  technical_terrain_assistance?: string | null;
  technical_terrain_perception?: string | null;
  suggested_improvements?: string | null;
  answers?: Record<string, any> | null;
}
