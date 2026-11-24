/**
 * Normalizes malformed distance values imported without decimal separators
 * (e.g., 150 -> 15.0 km, 2345 -> 23.45 km) while leaving normal values (< 100 km) untouched.
 */
export function correctDistance(dist) {
    if (!Number.isFinite(dist))
        return 0;
    if (dist >= 100) {
        const numDigits = String(Math.floor(dist)).length;
        if (numDigits > 2) {
            return dist / Math.pow(10, numDigits - 2);
        }
    }
    return dist;
}
