import { FieldTestService } from "../../services/fieldTest.service.js";
import { normalizeBikeCode } from "../../utils/sanitizeBikeCode.js";
export const context = {
    service: new FieldTestService(),
    selectedFTId: null,
    selectedFTName: null,
    userSession: null,
    // Centralized coordinator functions to prevent circular dependencies
    loadFieldTests: async () => { },
    loadKmSummary: async () => { },
    loadBikes: async () => { }
};
export { normalizeBikeCode };
export function formatWeekYear(dateStr) {
    const d = new Date(dateStr);
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `W${week} / ${date.getUTCFullYear()}`;
}
export function getColor(i) {
    const colors = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];
    return colors[i % colors.length];
}
