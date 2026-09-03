export function calculateProportionalInvoiceAllocation(amount, bikesKmData) {
    const N = bikesKmData.length;
    const totalInvoiceKm = bikesKmData.reduce((sum, b) => sum + (b.km || 0), 0);
    const bikesCalculated = bikesKmData.map((b) => {
        let allocatedAmount = 0;
        let costPerKm = null;
        if (totalInvoiceKm > 0) {
            // Reparto proporcional en función de los kilómetros recorridos por cada bici
            const globalCostPerKm = amount / totalInvoiceKm;
            allocatedAmount = (b.km || 0) * globalCostPerKm;
            costPerKm = (b.km || 0) > 0 ? globalCostPerKm : null;
        }
        else {
            // Si no hay kilómetros acumulados en el periodo, se divide a partes iguales
            allocatedAmount = N > 0 ? amount / N : amount;
            costPerKm = null;
        }
        return {
            id: b.id,
            bikecode: b.bikecode,
            km: b.km || 0,
            allocatedAmount,
            costPerKm
        };
    });
    return {
        totalInvoiceKm,
        bikesCalculated
    };
}
