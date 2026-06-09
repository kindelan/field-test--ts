import { supabase } from "../dao/supabaseclient.js";
import { normalizeBikeCode } from "../utils/sanitizeBikeCode.js";
export class FinanceService {
    correctDistance(dist) {
        if (dist >= 100) {
            const numDigits = String(Math.floor(dist)).length;
            if (numDigits > 2) {
                return dist / 100;
            }
            return dist / 10;
        }
        return dist;
    }
    async getBikeKmInPeriod(bikeCode, startDate, endDate) {
        const bikeCodeNorm = normalizeBikeCode(bikeCode);
        if (!bikeCodeNorm)
            return 0;
        const { data: rides, error } = await supabase
            .from("test_ride_log")
            .select("distance_km, ride_date, completion_date")
            .ilike("bike_code_sanitized", bikeCodeNorm.toLowerCase());
        if (error)
            throw error;
        if (!rides)
            return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        const filtered = rides.filter((r) => {
            const dateStr = r.ride_date || r.completion_date;
            if (!dateStr)
                return false;
            const rDate = new Date(dateStr);
            return rDate >= start && rDate <= end;
        });
        return filtered.reduce((sum, r) => sum + this.correctDistance(Number(r.distance_km || 0)), 0);
    }
    async listInvoices() {
        const { data, error } = await supabase
            .from("invoices")
            .select(`
        *,
        field_test (
          id,
          name
        ),
        invoice_bikes (
          bike_id,
          bikes (
            id,
            bikecode
          )
        )
      `)
            .order("created_at", { ascending: false });
        if (error)
            throw error;
        return data || [];
    }
    async createInvoice(invoice, bikeIds, file) {
        let fileUrl = null;
        if (file) {
            const fileExt = file.name.split('.').pop();
            const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from("invoices")
                .upload(uniqueFileName, file);
            if (uploadError)
                throw uploadError;
            const { data: urlData } = supabase.storage
                .from("invoices")
                .getPublicUrl(uniqueFileName);
            fileUrl = urlData.publicUrl;
        }
        const invoiceData = {
            ...invoice,
            file_url: fileUrl
        };
        const { data, error } = await supabase
            .from("invoices")
            .insert(invoiceData)
            .select()
            .single();
        if (error)
            throw error;
        if (bikeIds.length > 0) {
            const relations = bikeIds.map(bikeId => ({
                invoice_id: data.id,
                bike_id: bikeId
            }));
            const { error: relError } = await supabase
                .from("invoice_bikes")
                .insert(relations);
            if (relError)
                throw relError;
        }
        return data;
    }
    async deleteInvoice(id) {
        // 1. Obtener la factura para ver si tiene un archivo en Storage
        const { data: invoice, error: getError } = await supabase
            .from("invoices")
            .select("file_url")
            .eq("id", id)
            .maybeSingle();
        if (!getError && invoice && invoice.file_url) {
            try {
                const parts = invoice.file_url.split("/");
                const storageFileName = parts[parts.length - 1];
                if (storageFileName) {
                    await supabase.storage
                        .from("invoices")
                        .remove([storageFileName]);
                }
            }
            catch (err) {
                console.error("Error al borrar el archivo del storage:", err);
            }
        }
        // 2. Eliminar el registro de la base de datos
        const { error } = await supabase
            .from("invoices")
            .delete()
            .eq("id", id);
        if (error)
            throw error;
    }
    async getInvoiceDetails(invoice) {
        const amount = Number(invoice.amount || 0);
        const bikes = (invoice.invoice_bikes || []).map((ib) => ib.bikes).filter(Boolean);
        const N = bikes.length;
        const allocatedAmount = N > 0 ? amount / N : amount;
        const bikesCalculated = await Promise.all(bikes.map(async (bike) => {
            const km = await this.getBikeKmInPeriod(bike.bikecode, invoice.start_date, invoice.end_date);
            const costPerKm = km > 0 ? allocatedAmount / km : null;
            return {
                id: bike.id,
                bikecode: bike.bikecode,
                km,
                allocatedAmount,
                costPerKm
            };
        }));
        return {
            ...invoice,
            bikesCalculated
        };
    }
    async listInvoicesWithCalculations() {
        const invoices = await this.listInvoices();
        return Promise.all(invoices.map(inv => this.getInvoiceDetails(inv)));
    }
    async getBikeFinanceSummary(bikeId, bikeCode) {
        const { data: relations, error } = await supabase
            .from("invoice_bikes")
            .select(`
        invoice_id,
        invoices (
          *
        )
      `)
            .eq("bike_id", bikeId);
        if (error)
            throw error;
        if (!relations || relations.length === 0) {
            return {
                bikeId,
                bikeCode,
                totalAllocatedAmount: 0,
                totalKm: 0,
                avgCostPerKm: null,
                invoices: []
            };
        }
        const invoices = relations.map((r) => r.invoices).filter(Boolean);
        let totalAllocatedAmount = 0;
        let totalKm = 0;
        const invoiceDetails = await Promise.all(invoices.map(async (inv) => {
            const { count, error: countError } = await supabase
                .from("invoice_bikes")
                .select("bike_id", { count: "exact", head: true })
                .eq("invoice_id", inv.id);
            if (countError)
                throw countError;
            const N = count || 1;
            const amount = Number(inv.amount || 0);
            const allocatedAmount = amount / N;
            const km = await this.getBikeKmInPeriod(bikeCode, inv.start_date, inv.end_date);
            const costPerKm = km > 0 ? allocatedAmount / km : null;
            totalAllocatedAmount += allocatedAmount;
            totalKm += km;
            return {
                id: inv.id,
                invoice_number: inv.invoice_number,
                provider: inv.provider,
                amount: inv.amount,
                start_date: inv.start_date,
                end_date: inv.end_date,
                allocatedAmount,
                km,
                costPerKm
            };
        }));
        const avgCostPerKm = totalKm > 0 ? totalAllocatedAmount / totalKm : null;
        return {
            bikeId,
            bikeCode,
            totalAllocatedAmount,
            totalKm,
            avgCostPerKm,
            invoices: invoiceDetails
        };
    }
    async getFieldTestFinanceSummary(fieldTestId) {
        // 1. Obtener todas las facturas asociadas a este Field Test
        const { data: invoices, error } = await supabase
            .from("invoices")
            .select(`
        *,
        invoice_bikes (
          bike_id,
          bikes (
            id,
            bikecode
          )
        )
      `)
            .eq("field_test_id", fieldTestId)
            .order("created_at", { ascending: false });
        if (error)
            throw error;
        if (!invoices || invoices.length === 0) {
            return {
                fieldTestId,
                totalAmount: 0,
                totalKm: 0,
                avgCostPerKm: null,
                invoices: []
            };
        }
        // 2. Calcular los detalles de cada factura
        let totalAmount = 0;
        let totalKm = 0;
        const invoiceDetails = await Promise.all(invoices.map(async (inv) => {
            const details = await this.getInvoiceDetails(inv);
            const amount = Number(inv.amount || 0);
            totalAmount += amount;
            // Sumar los kilómetros de todas las bicicletas asociadas a esta factura en su periodo
            const invKm = (details.bikesCalculated || []).reduce((sum, b) => sum + Number(b.km || 0), 0);
            totalKm += invKm;
            return {
                id: inv.id,
                invoice_number: inv.invoice_number,
                provider: inv.provider,
                amount: inv.amount,
                start_date: inv.start_date,
                end_date: inv.end_date,
                km: invKm,
                bikesCalculated: details.bikesCalculated
            };
        }));
        const avgCostPerKm = totalKm > 0 ? totalAmount / totalKm : null;
        return {
            fieldTestId,
            totalAmount,
            totalKm,
            avgCostPerKm,
            invoices: invoiceDetails
        };
    }
}
