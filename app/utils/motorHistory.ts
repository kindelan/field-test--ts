import { normalizeBikeCode } from "./sanitizeBikeCode.js";

export interface MotorPeriod {
  bikecode: string;
  start: Date;
  end: Date | null;
  bikeId?: string;
  typeCode?: string;
  version?: string;
  notes?: string;
}

/**
 * Checks whether a ride (based on bike code and date) belongs to a motor's active periods.
 */
export function isRideInMotorPeriods(
  rideBikeCode: string,
  rideDate: Date,
  periods: MotorPeriod[]
): boolean {
  const rBike = normalizeBikeCode(rideBikeCode)?.toLowerCase();
  if (!rBike) return false;

  return periods.some(p => {
    const pBike = normalizeBikeCode(p.bikecode)?.toLowerCase();
    if (pBike !== rBike) return false;
    return rideDate >= p.start && (!p.end || rideDate <= p.end);
  });
}

/**
 * Checks whether an error (based on bike ID and date) belongs to a motor's active periods.
 */
export function isErrorInMotorPeriods(
  errorBikeId: string | null | undefined,
  errorDate: Date,
  periods: MotorPeriod[]
): boolean {
  if (!errorBikeId) return false;

  return periods.some(p => {
    if (!p.bikeId || p.bikeId !== errorBikeId) return false;
    return errorDate >= p.start && (!p.end || errorDate <= p.end);
  });
}
