export interface BikeKmData {
  id: string;
  bikecode: string;
  km: number;
}

export interface CalculatedBikeAllocation {
  id: string;
  bikecode: string;
  km: number;
  allocatedAmount: number;
  costPerKm: number | null;
}

export interface InvoiceCalculationResult {
  totalInvoiceKm: number;
  bikesCalculated: CalculatedBikeAllocation[];
}

export function calculateProportionalInvoiceAllocation(
  amount: number,
  bikesKmData: BikeKmData[]
): InvoiceCalculationResult {
  const N = bikesKmData.length;
  const totalInvoiceKm = bikesKmData.reduce((sum, b) => sum + (b.km || 0), 0);

  const bikesCalculated = bikesKmData.map((b) => {
    let allocatedAmount = 0;
    let costPerKm: number | null = null;

    if (totalInvoiceKm > 0) {
      // Reparto proporcional en función de los kilómetros recorridos por cada bici
      const globalCostPerKm = amount / totalInvoiceKm;
      allocatedAmount = (b.km || 0) * globalCostPerKm;
      costPerKm = (b.km || 0) > 0 ? globalCostPerKm : null;
    } else {
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
