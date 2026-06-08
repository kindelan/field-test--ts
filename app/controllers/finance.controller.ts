import { requireAuth } from "../utils/authGuard.js";
import { FinanceService } from "../services/finance.service.js";
import { BikesService } from "../services/bikes.service.js";

document.addEventListener("DOMContentLoaded", async () => {
  let session;
  try {
    session = await requireAuth(true);
  } catch (err) {
    return; // Redirección ya ejecutada por authGuard
  }

  const financeService = new FinanceService();
  const bikesService = new BikesService();

  // Elementos del DOM
  const subtabListBtn = document.getElementById("subtab-list-btn") as HTMLButtonElement;
  const subtabBikeBtn = document.getElementById("subtab-bike-btn") as HTMLButtonElement;
  const viewGeneral = document.getElementById("view-general") as HTMLDivElement;
  const viewBikeAnalysis = document.getElementById("view-bike-analysis") as HTMLDivElement;

  const alertContainerGen = document.getElementById("alert-container-gen") as HTMLDivElement;
  const alertContainerBike = document.getElementById("alert-container-bike") as HTMLDivElement;

  // Formulario de Factura
  const invoiceForm = document.getElementById("invoice-form") as HTMLFormElement;
  const inputNumber = document.getElementById("invoice-number") as HTMLInputElement;
  const inputProvider = document.getElementById("invoice-provider") as HTMLInputElement;
  const inputAmount = document.getElementById("invoice-amount") as HTMLInputElement;
  const inputStartDate = document.getElementById("invoice-start-date") as HTMLInputElement;
  const inputEndDate = document.getElementById("invoice-end-date") as HTMLInputElement;
  const bikeCheckboxesContainer = document.getElementById("bike-checkboxes") as HTMLDivElement;
  const inputFile = document.getElementById("invoice-file") as HTMLInputElement;
  const fileNameDisplay = document.getElementById("file-name-display") as HTMLDivElement;

  // Tablas y Controles de Análisis
  const invoicesTableBody = document.querySelector("#invoices-table tbody") as HTMLTableSectionElement;
  const selectAnalysisBike = document.getElementById("select-analysis-bike") as HTMLSelectElement;
  const bikeSummarySection = document.getElementById("bike-summary-section") as HTMLDivElement;
  
  const kpiTotalCost = document.getElementById("kpi-total-cost") as HTMLSpanElement;
  const kpiTotalKm = document.getElementById("kpi-total-km") as HTMLSpanElement;
  const kpiAvgCostKm = document.getElementById("kpi-avg-cost-km") as HTMLSpanElement;
  const bikeInvoicesTableBody = document.querySelector("#bike-invoices-table tbody") as HTMLTableSectionElement;

  let allBikes: any[] = [];

  // Restringir controles para no-administradores
  if (!session.capabilities.canEdit) {
    const registerPanel = document.getElementById("panel-register-invoice");
    if (registerPanel) {
      registerPanel.style.display = "none";
    }
    const container = document.querySelector(".app-container");
    if (container) {
      container.classList.add("full-width");
    }
    const actionHeader = document.querySelector(".admin-action-header") as HTMLElement;
    if (actionHeader) {
      actionHeader.style.display = "none";
    }
  }

  // 1. GESTIÓN DE TABS
  subtabListBtn.addEventListener("click", () => {
    subtabListBtn.classList.add("active");
    subtabBikeBtn.classList.remove("active");
    viewGeneral.style.display = "block";
    viewBikeAnalysis.style.display = "none";
  });

  subtabBikeBtn.addEventListener("click", () => {
    subtabBikeBtn.classList.add("active");
    subtabListBtn.classList.remove("active");
    viewGeneral.style.display = "none";
    viewBikeAnalysis.style.display = "block";
  });

  // Mostrar el nombre del archivo seleccionado
  inputFile.addEventListener("change", () => {
    if (inputFile.files && inputFile.files.length > 0) {
      fileNameDisplay.textContent = `📄 ${inputFile.files[0].name}`;
    } else {
      fileNameDisplay.textContent = "Ningún archivo seleccionado";
    }
  });

  // 2. CARGAR BICICLETAS
  async function loadBikes() {
    try {
      allBikes = await bikesService.list();

      // Rellenar checkboxes del formulario
      bikeCheckboxesContainer.innerHTML = "";
      allBikes.forEach(bike => {
        const label = document.createElement("label");
        label.className = "bike-checkbox-item";
        
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = "assigned-bikes";
        checkbox.value = bike.id;
        
        const span = document.createElement("span");
        span.textContent = bike.bikecode;

        label.appendChild(checkbox);
        label.appendChild(span);
        bikeCheckboxesContainer.appendChild(label);
      });

      // Rellenar dropdown de análisis
      selectAnalysisBike.innerHTML = '<option value="" disabled selected>Seleccione una bicicleta...</option>';
      allBikes.forEach(bike => {
        const option = document.createElement("option");
        option.value = bike.id;
        option.setAttribute("data-code", bike.bikecode);
        option.textContent = bike.bikecode;
        selectAnalysisBike.appendChild(option);
      });
    } catch (err) {
      console.error("Error cargando bicicletas:", err);
      alertContainerGen.innerHTML = '<div class="alert alert-error">Error cargando bicicletas del sistema.</div>';
    }
  }

  // 3. CARGAR LISTADO DE FACTURAS
  async function loadInvoicesList() {
    try {
      invoicesTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">Cargando facturas y telemetría...</td></tr>';
      
      const invoices = await financeService.listInvoicesWithCalculations();
      invoicesTableBody.innerHTML = "";

      if (invoices.length === 0) {
        invoicesTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No hay facturas registradas.</td></tr>';
        return;
      }

      invoices.forEach(inv => {
        const tr = document.createElement("tr");

        // Factura
        const tdNumber = document.createElement("td");
        tdNumber.innerHTML = `<strong>${inv.invoice_number}</strong>`;
        tr.appendChild(tdNumber);

        // Proveedor
        const tdProvider = document.createElement("td");
        tdProvider.textContent = inv.provider;
        tr.appendChild(tdProvider);

        // Importe
        const tdAmount = document.createElement("td");
        tdAmount.textContent = `${Number(inv.amount).toFixed(2)} €`;
        tr.appendChild(tdAmount);

        // Periodo
        const tdPeriod = document.createElement("td");
        const start = new Date(inv.start_date).toLocaleDateString();
        const end = new Date(inv.end_date).toLocaleDateString();
        tdPeriod.textContent = `${start} - ${end}`;
        tr.appendChild(tdPeriod);

        // Asignación / Costo por Km
        const tdAlloc = document.createElement("td");
        if (!inv.bikesCalculated || inv.bikesCalculated.length === 0) {
          tdAlloc.innerHTML = '<span style="color: var(--text-secondary); font-style: italic;">Sin asignación</span>';
        } else {
          tdAlloc.innerHTML = inv.bikesCalculated.map((b: any) => {
            const costText = b.costPerKm !== null ? `<strong>${Number(b.costPerKm).toFixed(2)} €/km</strong>` : '<span style="color: var(--accent-red);">Sin km en periodo</span>';
            return `<div style="margin-bottom: 4px;">• <strong>${b.bikecode}</strong>: ${Number(b.allocatedAmount).toFixed(2)} € | ${Number(b.km).toFixed(1)} km | ${costText}</div>`;
          }).join("");
        }
        tr.appendChild(tdAlloc);

        // Documento
        const tdDoc = document.createElement("td");
        if (inv.file_url) {
          const a = document.createElement("a");
          a.className = "doc-link";
          a.textContent = "📄 Ver Factura";
          a.onclick = () => {
            const win = window.open();
            if (win) {
              const fileContent = inv.file_url;
              const title = inv.file_name || "Documento";
              win.document.write(`
                <html>
                  <head>
                    <title>${title}</title>
                    <style>body { margin: 0; background: #0b0f19; display: flex; justify-content: center; align-items: center; min-height: 100vh; }</style>
                  </head>
                  <body>
                    ${fileContent.startsWith("data:application/pdf")
                      ? `<embed src="${fileContent}" type="application/pdf" width="100%" height="100%"/>`
                      : `<img src="${fileContent}" style="max-width:100%; max-height:100%; object-fit:contain;"/>`}
                  </body>
                </html>
              `);
              win.document.close();
            }
          };
          tdDoc.appendChild(a);
        } else {
          tdDoc.innerHTML = '<span style="color: var(--text-secondary); font-style: italic;">Sin adjunto</span>';
        }
        tr.appendChild(tdDoc);

        // Acciones (Eliminar)
        if (session.capabilities.canEdit) {
          const tdActions = document.createElement("td");
          const btnDel = document.createElement("button");
          btnDel.className = "btn-secondary";
          btnDel.style.color = "var(--accent-red)";
          btnDel.style.borderColor = "rgba(239, 68, 68, 0.2)";
          btnDel.style.padding = "6px 12px";
          btnDel.style.fontSize = "12px";
          btnDel.textContent = "Eliminar";
          
          btnDel.addEventListener("click", async () => {
            if (confirm(`¿Estás seguro de eliminar la factura ${inv.invoice_number}?`)) {
              try {
                await financeService.deleteInvoice(inv.id);
                alertContainerGen.innerHTML = '<div class="alert alert-success">✅ Factura eliminada correctamente.</div>';
                loadInvoicesList();
              } catch (err: any) {
                console.error(err);
                alertContainerGen.innerHTML = `<div class="alert alert-error">❌ Error al eliminar: ${err.message || err}</div>`;
              }
            }
          });
          tdActions.appendChild(btnDel);
          tr.appendChild(tdActions);
        }

        invoicesTableBody.appendChild(tr);
      });
    } catch (err: any) {
      console.error(err);
      invoicesTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--accent-red);">Error cargando facturas: ${err.message || err}</td></tr>`;
    }
  }

  // Helper para leer archivos como Base64
  function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  // 4. GUARDAR FACTURA
  invoiceForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    alertContainerGen.innerHTML = "";

    const checkedBoxes = document.querySelectorAll('input[name="assigned-bikes"]:checked');
    const selectedBikeIds = Array.from(checkedBoxes).map((cb: any) => cb.value);

    if (selectedBikeIds.length === 0) {
      alertContainerGen.innerHTML = '<div class="alert alert-error">Debe seleccionar al menos una bicicleta para esta factura.</div>';
      return;
    }

    try {
      const file = inputFile.files && inputFile.files[0] ? inputFile.files[0] : null;
      let base64Url: string | null = null;
      let nameOfFile: string | null = null;

      if (file) {
        base64Url = await readFileAsBase64(file);
        nameOfFile = file.name;
      }

      const input = {
        invoice_number: inputNumber.value.trim(),
        provider: inputProvider.value.trim(),
        amount: Number(inputAmount.value),
        start_date: inputStartDate.value,
        end_date: inputEndDate.value,
        file_name: nameOfFile,
        file_url: base64Url
      };

      await financeService.createInvoice(input, selectedBikeIds);

      alertContainerGen.innerHTML = '<div class="alert alert-success">✅ Factura guardada correctamente.</div>';
      invoiceForm.reset();
      fileNameDisplay.textContent = "Ningún archivo seleccionado";
      loadInvoicesList();
    } catch (err: any) {
      console.error(err);
      alertContainerGen.innerHTML = `<div class="alert alert-error">❌ Error al guardar la factura: ${err.message || err}</div>`;
    }
  });

  // 5. ANÁLISIS POR BICICLETA
  selectAnalysisBike.addEventListener("change", async () => {
    alertContainerBike.innerHTML = "";
    const selectedOption = selectAnalysisBike.options[selectAnalysisBike.selectedIndex];
    const bikeId = selectAnalysisBike.value;
    const bikeCode = selectedOption.getAttribute("data-code");

    if (!bikeId || !bikeCode) {
      bikeSummarySection.style.display = "none";
      return;
    }

    try {
      bikeInvoicesTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">Analizando facturas y telemetría...</td></tr>';
      bikeSummarySection.style.display = "block";

      const summary = await financeService.getBikeFinanceSummary(bikeId, bikeCode);

      // KPIs
      kpiTotalCost.textContent = `${Number(summary.totalAllocatedAmount).toFixed(2)} €`;
      kpiTotalKm.textContent = `${Number(summary.totalKm).toFixed(1)} km`;
      
      if (summary.avgCostPerKm !== null) {
        kpiAvgCostKm.textContent = `${Number(summary.avgCostPerKm).toFixed(2)} €/km`;
      } else {
        kpiAvgCostKm.textContent = "—";
      }

      // Detalle de la tabla
      bikeInvoicesTableBody.innerHTML = "";
      if (summary.invoices.length === 0) {
        bikeInvoicesTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No hay facturas asignadas a esta bicicleta.</td></tr>';
        return;
      }

      summary.invoices.forEach((inv: any) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td><strong>${inv.invoice_number}</strong></td>
          <td>${inv.provider}</td>
          <td>${Number(inv.amount).toFixed(2)} €</td>
          <td><span class="badge badge-primary">${Number(inv.allocatedAmount).toFixed(2)} €</span></td>
          <td>${new Date(inv.start_date).toLocaleDateString()} - ${new Date(inv.end_date).toLocaleDateString()}</td>
          <td>${Number(inv.km).toFixed(1)} km</td>
          <td>${inv.costPerKm !== null ? `<strong>${Number(inv.costPerKm).toFixed(2)} €/km</strong>` : '<span style="color: var(--accent-red);">Sin km en periodo</span>'}</td>
        `;

        bikeInvoicesTableBody.appendChild(tr);
      });
    } catch (err: any) {
      console.error(err);
      alertContainerBike.innerHTML = `<div class="alert alert-error">❌ Error al generar análisis: ${err.message || err}</div>`;
      bikeInvoicesTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--accent-red);">Error: ${err.message || err}</td></tr>`;
    }
  });

  // Carga Inicial
  await loadBikes();
  await loadInvoicesList();
});
