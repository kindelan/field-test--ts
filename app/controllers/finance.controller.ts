import { requireAuth } from "../utils/authGuard.js";
import { showToast } from "../utils/toast.js";
import { FinanceService } from "../services/finance.service.js";
import { BikesService } from "../services/bikes.service.js";
import { FieldTestService } from "../services/fieldTest.service.js";

document.addEventListener("DOMContentLoaded", async () => {
  let session;
  try {
    session = await requireAuth(true);
  } catch (err) {
    return; // Redirección ya ejecutada por authGuard
  }

  const financeService = new FinanceService();
  const bikesService = new BikesService();
  const fieldTestService = new FieldTestService();

  // Elementos del DOM
  const subtabListBtn = document.getElementById("subtab-list-btn") as HTMLButtonElement;
  const subtabBikeBtn = document.getElementById("subtab-bike-btn") as HTMLButtonElement;
  const subtabFtBtn = document.getElementById("subtab-ft-btn") as HTMLButtonElement;
  
  const viewGeneral = document.getElementById("view-general") as HTMLDivElement;
  const viewBikeAnalysis = document.getElementById("view-bike-analysis") as HTMLDivElement;
  const viewFtAnalysis = document.getElementById("view-ft-analysis") as HTMLDivElement;

  const alertContainerGen = document.getElementById("alert-container-gen") as HTMLDivElement;
  const alertContainerBike = document.getElementById("alert-container-bike") as HTMLDivElement;
  const alertContainerFt = document.getElementById("alert-container-ft") as HTMLDivElement;

  // Formulario de Factura
  const invoiceForm = document.getElementById("invoice-form") as HTMLFormElement;
  const selectInvoiceFt = document.getElementById("invoice-field-test") as HTMLSelectElement;
  const bikeCheckboxesContainer = document.getElementById("bike-checkboxes") as HTMLDivElement;
  const inputNumber = document.getElementById("invoice-number") as HTMLInputElement;
  const inputProvider = document.getElementById("invoice-provider") as HTMLInputElement;
  const inputStartDate = document.getElementById("invoice-start-date") as HTMLInputElement;
  const inputEndDate = document.getElementById("invoice-end-date") as HTMLInputElement;
  const inputAmount = document.getElementById("invoice-amount") as HTMLInputElement;
  const inputFile = document.getElementById("invoice-file") as HTMLInputElement;
  const fileNameDisplay = document.getElementById("file-name-display") as HTMLDivElement;
  
  // Toggles de Panel de Registro y Cancelación
  const btnShowRegister = document.getElementById("btn-show-register-invoice") as HTMLButtonElement;
  const btnCancelInvoice = document.getElementById("btn-cancel-invoice") as HTMLButtonElement;
  const registerPanel = document.getElementById("panel-register-invoice") as HTMLDivElement;

  // Tablas y Controles de Análisis
  const invoicesTableBody = document.querySelector("#invoices-table tbody") as HTMLTableSectionElement;
  const selectAnalysisBike = document.getElementById("select-analysis-bike") as HTMLSelectElement;
  const bikeSummarySection = document.getElementById("bike-summary-section") as HTMLDivElement;
  
  const kpiTotalCost = document.getElementById("kpi-total-cost") as HTMLSpanElement;
  const kpiTotalKm = document.getElementById("kpi-total-km") as HTMLSpanElement;
  const kpiAvgCostKm = document.getElementById("kpi-avg-cost-km") as HTMLSpanElement;
  const bikeInvoicesTableBody = document.querySelector("#bike-invoices-table tbody") as HTMLTableSectionElement;

  const selectAnalysisFt = document.getElementById("select-analysis-ft") as HTMLSelectElement;
  const ftSummarySection = document.getElementById("ft-summary-section") as HTMLDivElement;
  const kpiFtTotalCost = document.getElementById("kpi-ft-total-cost") as HTMLSpanElement;
  const kpiFtTotalKm = document.getElementById("kpi-ft-total-km") as HTMLSpanElement;
  const kpiFtAvgCostKm = document.getElementById("kpi-ft-avg-cost-km") as HTMLSpanElement;
  const ftInvoicesTableBody = document.querySelector("#ft-invoices-table tbody") as HTMLTableSectionElement;

  // DOM Filter & Sort Controls
  const filterInvSearchInput = document.getElementById("filter-inv-search") as HTMLInputElement;
  const filterInvFtSelect = document.getElementById("filter-inv-ft") as HTMLSelectElement;
  const filterBikeInvSearchInput = document.getElementById("filter-bike-inv-search") as HTMLInputElement;
  const filterFtInvSearchInput = document.getElementById("filter-ft-inv-search") as HTMLInputElement;

  let allBikes: any[] = [];

  // Table Data & Sorting State
  let rawInvoices: any[] = [];
  let filterInvSearch = "";
  let filterInvFt = "";
  let invSortKey = "period";
  let invSortOrder: "asc" | "desc" = "desc";

  let rawBikeInvoices: any[] = [];
  let filterBikeSearch = "";
  let bikeSortKey = "period";
  let bikeSortOrder: "asc" | "desc" = "desc";

  let rawFtInvoices: any[] = [];
  let filterFtSearch = "";
  let ftSortKey = "period";
  let ftSortOrder: "asc" | "desc" = "desc";

  // Restringir controles para no-administradores
  if (!session.capabilities.canEditData) {
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
  } else {
    // Si es administrador, mostrar botón de registro y ocultar panel inicialmente
    if (btnShowRegister) {
      btnShowRegister.style.display = "inline-flex";
    }
    if (registerPanel) {
      registerPanel.style.display = "none";
    }
    const container = document.querySelector(".app-container");
    if (container) {
      container.classList.add("full-width");
    }
  }

  // Helper de Ordenación
  function updateSortHeaderIcons(tableId: string, activeSortKey: string, activeOrder: "asc" | "desc") {
    const headers = document.querySelectorAll(`#${tableId} th.sortable`);
    headers.forEach((th: Element) => {
      const key = th.getAttribute("data-sort");
      const iconSpan = th.querySelector(".sort-icon");
      if (key === activeSortKey) {
        th.classList.add("active");
        if (iconSpan) iconSpan.textContent = activeOrder === "asc" ? "▲" : "▼";
      } else {
        th.classList.remove("active");
        if (iconSpan) iconSpan.textContent = "⇅";
      }
    });
  }

  function sortInvoicesArray(list: any[], key: string, order: "asc" | "desc") {
    const factor = order === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (key === "number") {
        valA = (a.invoice_number || "").toLowerCase();
        valB = (b.invoice_number || "").toLowerCase();
      } else if (key === "field_test") {
        valA = (a.field_test?.name || "").toLowerCase();
        valB = (b.field_test?.name || "").toLowerCase();
      } else if (key === "provider") {
        valA = (a.provider || "").toLowerCase();
        valB = (b.provider || "").toLowerCase();
      } else if (key === "amount") {
        valA = Number(a.amount || 0);
        valB = Number(b.amount || 0);
      } else if (key === "allocatedAmount") {
        valA = Number(a.allocatedAmount || 0);
        valB = Number(b.allocatedAmount || 0);
      } else if (key === "period") {
        valA = new Date(a.start_date || 0).getTime();
        valB = new Date(b.start_date || 0).getTime();
      } else if (key === "km") {
        valA = Number(a.totalInvoiceKm || a.km || 0);
        valB = Number(b.totalInvoiceKm || b.km || 0);
      } else if (key === "costPerKm") {
        valA = a.costPerKm !== null ? Number(a.costPerKm) : -1;
        valB = b.costPerKm !== null ? Number(b.costPerKm) : -1;
      } else {
        return 0;
      }

      if (valA < valB) return -1 * factor;
      if (valA > valB) return 1 * factor;
      return 0;
    });
  }

  // 1. GESTIÓN DE TABS
  subtabListBtn.addEventListener("click", () => {
    subtabListBtn.classList.add("active");
    subtabBikeBtn.classList.remove("active");
    subtabFtBtn.classList.remove("active");
    viewGeneral.style.display = "block";
    viewBikeAnalysis.style.display = "none";
    viewFtAnalysis.style.display = "none";
  });

  subtabBikeBtn.addEventListener("click", () => {
    subtabBikeBtn.classList.add("active");
    subtabListBtn.classList.remove("active");
    subtabFtBtn.classList.remove("active");
    viewGeneral.style.display = "none";
    viewBikeAnalysis.style.display = "block";
    viewFtAnalysis.style.display = "none";
  });

  subtabFtBtn.addEventListener("click", () => {
    subtabFtBtn.classList.add("active");
    subtabListBtn.classList.remove("active");
    subtabBikeBtn.classList.remove("active");
    viewGeneral.style.display = "none";
    viewBikeAnalysis.style.display = "none";
    viewFtAnalysis.style.display = "block";
  });

  // Mostrar el nombre del archivo seleccionado
  inputFile.addEventListener("change", () => {
    if (inputFile.files && inputFile.files.length > 0) {
      fileNameDisplay.textContent = `📄 ${inputFile.files[0].name}`;
    } else {
      fileNameDisplay.textContent = "Ningún archivo seleccionado";
    }
  });

  // Acciones de Toggle para Registro y Cancelación
  if (btnShowRegister && registerPanel) {
    btnShowRegister.addEventListener("click", () => {
      const isHidden = registerPanel.style.display === "none";
      const container = document.querySelector(".app-container");
      if (isHidden) {
        registerPanel.style.display = "block";
        if (container) {
          container.classList.remove("full-width");
        }
        btnShowRegister.textContent = "Cerrar Panel";
      } else {
        registerPanel.style.display = "none";
        if (container) {
          container.classList.add("full-width");
        }
        btnShowRegister.textContent = "Registrar Factura";
      }
    });
  }

  if (btnCancelInvoice && registerPanel) {
    btnCancelInvoice.addEventListener("click", () => {
      registerPanel.style.display = "none";
      const container = document.querySelector(".app-container");
      if (container) {
        container.classList.add("full-width");
      }
      if (btnShowRegister) {
        btnShowRegister.textContent = "Registrar Factura";
      }
      invoiceForm.reset();
      fileNameDisplay.textContent = "Ningún archivo seleccionado";
      bikeCheckboxesContainer.innerHTML = '<span style="font-size:12px; color:var(--text-secondary);">Selecciona un Field Test primero...</span>';
    });
  }

  // 2. CARGAR FIELD TESTS Y BICICLETAS
  async function loadFieldTests() {
    try {
      const fieldTests = await fieldTestService.listFiltered("all");
      
      // Rellenar dropdown de facturación
      selectInvoiceFt.innerHTML = '<option value="" disabled selected>Seleccione un Field Test...</option>';
      fieldTests.forEach(ft => {
        const option = document.createElement("option");
        option.value = ft.id;
        option.textContent = ft.name;
        selectInvoiceFt.appendChild(option);
      });

      // Rellenar dropdown de filtro general
      if (filterInvFtSelect) {
        filterInvFtSelect.innerHTML = '<option value="">Todos los Field Tests</option>';
        fieldTests.forEach(ft => {
          const option = document.createElement("option");
          option.value = ft.id;
          option.textContent = ft.name;
          filterInvFtSelect.appendChild(option);
        });
      }

      // Rellenar dropdown de análisis
      selectAnalysisFt.innerHTML = '<option value="" disabled selected>Seleccione un Field Test...</option>';
      fieldTests.forEach(ft => {
        const option = document.createElement("option");
        option.value = ft.id;
        option.textContent = ft.name;
        selectAnalysisFt.appendChild(option);
      });
    } catch (err) {
      console.error("Error cargando Field Tests:", err);
      alertContainerGen.innerHTML = '<div class="alert alert-error">Error cargando los Field Tests del sistema.</div>';
    }
  }

  // Filtrado dinámico de bicicletas basado en el Field Test seleccionado
  selectInvoiceFt.addEventListener("change", async () => {
    const ftId = selectInvoiceFt.value;
    if (!ftId) return;

    bikeCheckboxesContainer.innerHTML = '<span style="font-size:12px; color:var(--text-secondary);">Cargando bicicletas del Field Test...</span>';

    try {
      const assignments = await fieldTestService.getBikesAssigned(ftId);
      bikeCheckboxesContainer.innerHTML = "";

      if (assignments.length === 0) {
        bikeCheckboxesContainer.innerHTML = '<span style="font-size:12px; color:var(--text-secondary);">No hay bicicletas activas en este Field Test.</span>';
        return;
      }

      assignments.forEach((a: any) => {
        const bike = a.bikes;
        if (!bike) return;

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
    } catch (err) {
      console.error("Error cargando bicicletas asignadas:", err);
      bikeCheckboxesContainer.innerHTML = '<span style="font-size:12px; color:var(--accent-red);">Error al cargar bicicletas.</span>';
    }
  });

  async function loadBikes() {
    try {
      allBikes = await bikesService.list();

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

  // RENDERIZADO Y FILTRADO DE TABLA GENERAL
  function renderInvoicesTable() {
    invoicesTableBody.innerHTML = "";

    const searchLow = filterInvSearch.toLowerCase();

    let filtered = rawInvoices.filter(inv => {
      const matchesSearch = !searchLow ||
        (inv.invoice_number || "").toLowerCase().includes(searchLow) ||
        (inv.provider || "").toLowerCase().includes(searchLow);

      const matchesFt = !filterInvFt || inv.field_test_id === filterInvFt;

      return matchesSearch && matchesFt;
    });

    filtered = sortInvoicesArray(filtered, invSortKey, invSortOrder);
    updateSortHeaderIcons("invoices-table", invSortKey, invSortOrder);

    if (filtered.length === 0) {
      invoicesTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-secondary);">No hay facturas que coincidan con los filtros.</td></tr>';
      return;
    }

    filtered.forEach(inv => {
      const tr = document.createElement("tr");

      // Factura
      const tdNumber = document.createElement("td");
      tdNumber.innerHTML = `<strong>${inv.invoice_number}</strong>`;
      tr.appendChild(tdNumber);

      // Field Test
      const tdFieldTest = document.createElement("td");
      if (inv.field_test) {
        tdFieldTest.innerHTML = `<span class="badge badge-secondary">${inv.field_test.name}</span>`;
      } else {
        tdFieldTest.innerHTML = '<span style="color: var(--text-secondary); font-style: italic;">Sin test</span>';
      }
      tr.appendChild(tdFieldTest);

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

      // Asignación / Costo por Km (REPARTO PROPORCIONAL)
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
          const fileContent = inv.file_url;
          if (fileContent.startsWith("data:")) {
            const win = window.open();
            if (win) {
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
          } else {
            window.open(fileContent, '_blank');
          }
        };
        tdDoc.appendChild(a);
      } else {
        tdDoc.innerHTML = '<span style="color: var(--text-secondary); font-style: italic;">Sin adjunto</span>';
      }
      tr.appendChild(tdDoc);

      // Acciones (Eliminar)
      if (session.capabilities.canEditData) {
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
              showToast("Factura eliminada correctamente", "success");
              alertContainerGen.innerHTML = '<div class="alert alert-success">✅ Factura eliminada correctamente.</div>';
              loadInvoicesList();
            } catch (err: any) {
              console.error(err);
              showToast("Error al eliminar la factura: " + (err.message || err), "error");
              alertContainerGen.innerHTML = `<div class="alert alert-error">❌ Error al eliminar: ${err.message || err}</div>`;
            }
          }
        });
        tdActions.appendChild(btnDel);
        tr.appendChild(tdActions);
      }

      invoicesTableBody.appendChild(tr);
    });
  }

  // Eventos de Filtro e Header Sorting - Vista General
  if (filterInvSearchInput) {
    filterInvSearchInput.addEventListener("input", () => {
      filterInvSearch = filterInvSearchInput.value.trim();
      renderInvoicesTable();
    });
  }

  if (filterInvFtSelect) {
    filterInvFtSelect.addEventListener("change", () => {
      filterInvFt = filterInvFtSelect.value;
      renderInvoicesTable();
    });
  }

  document.querySelectorAll("#invoices-table th.sortable").forEach((th: Element) => {
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-sort");
      if (!key) return;
      if (invSortKey === key) {
        invSortOrder = invSortOrder === "asc" ? "desc" : "asc";
      } else {
        invSortKey = key;
        invSortOrder = "asc";
      }
      renderInvoicesTable();
    });
  });

  // 3. CARGAR LISTADO DE FACTURAS
  async function loadInvoicesList() {
    try {
      invoicesTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-secondary);">Cargando facturas y telemetría...</td></tr>';
      
      rawInvoices = await financeService.listInvoicesWithCalculations();
      renderInvoicesTable();
    } catch (err: any) {
      console.error(err);
      invoicesTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--accent-red);">Error cargando facturas: ${err.message || err}</td></tr>`;
    }
  }

  // 4. GUARDAR FACTURA
  invoiceForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    alertContainerGen.innerHTML = "";

    const selectedFtId = selectInvoiceFt.value;
    if (!selectedFtId) {
      alertContainerGen.innerHTML = '<div class="alert alert-error">Debe seleccionar un Field Test.</div>';
      return;
    }

    const checkedBoxes = document.querySelectorAll('input[name="assigned-bikes"]:checked');
    const selectedBikeIds = Array.from(checkedBoxes).map((cb: any) => cb.value);

    if (selectedBikeIds.length === 0) {
      alertContainerGen.innerHTML = '<div class="alert alert-error">Debe seleccionar al menos una bicicleta para esta factura.</div>';
      return;
    }

    try {
      const file = inputFile.files && inputFile.files[0] ? inputFile.files[0] : null;

      const input = {
        invoice_number: inputNumber.value.trim(),
        provider: inputProvider.value.trim(),
        amount: Number(inputAmount.value),
        start_date: inputStartDate.value,
        end_date: inputEndDate.value,
        file_name: file ? file.name : null,
        field_test_id: selectedFtId
      };

      await financeService.createInvoice(input, selectedBikeIds, file);

      showToast("Factura guardada correctamente", "success");
      alertContainerGen.innerHTML = '<div class="alert alert-success">✅ Factura guardada correctamente.</div>';
      invoiceForm.reset();
      fileNameDisplay.textContent = "Ningún archivo seleccionado";
      bikeCheckboxesContainer.innerHTML = '<span style="font-size:12px; color:var(--text-secondary);">Selecciona un Field Test primero...</span>';
      
      // Cerrar panel de registro
      if (registerPanel) {
        registerPanel.style.display = "none";
      }
      const container = document.querySelector(".app-container");
      if (container) {
        container.classList.add("full-width");
      }
      if (btnShowRegister) {
        btnShowRegister.textContent = "Registrar Factura";
      }

      loadInvoicesList();
    } catch (err: any) {
      console.error(err);
      alertContainerGen.innerHTML = `<div class="alert alert-error">❌ Error al guardar la factura: ${err.message || err}</div>`;
    }
  });

  // RENDERIZADO Y FILTRADO DE TABLA POR BICICLETA
  function renderBikeInvoicesTable() {
    bikeInvoicesTableBody.innerHTML = "";

    const searchLow = filterBikeSearch.toLowerCase();
    let filtered = rawBikeInvoices.filter(inv => {
      return !searchLow ||
        (inv.invoice_number || "").toLowerCase().includes(searchLow) ||
        (inv.provider || "").toLowerCase().includes(searchLow);
    });

    filtered = sortInvoicesArray(filtered, bikeSortKey, bikeSortOrder);
    updateSortHeaderIcons("bike-invoices-table", bikeSortKey, bikeSortOrder);

    if (filtered.length === 0) {
      bikeInvoicesTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No hay facturas que coincidan con la búsqueda.</td></tr>';
      return;
    }

    filtered.forEach((inv: any) => {
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
  }

  if (filterBikeInvSearchInput) {
    filterBikeInvSearchInput.addEventListener("input", () => {
      filterBikeSearch = filterBikeInvSearchInput.value.trim();
      renderBikeInvoicesTable();
    });
  }

  document.querySelectorAll("#bike-invoices-table th.sortable").forEach((th: Element) => {
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-sort");
      if (!key) return;
      if (bikeSortKey === key) {
        bikeSortOrder = bikeSortOrder === "asc" ? "desc" : "asc";
      } else {
        bikeSortKey = key;
        bikeSortOrder = "asc";
      }
      renderBikeInvoicesTable();
    });
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

      rawBikeInvoices = summary.invoices || [];
      renderBikeInvoicesTable();
    } catch (err: any) {
      console.error(err);
      alertContainerBike.innerHTML = `<div class="alert alert-error">❌ Error al generar análisis: ${err.message || err}</div>`;
      bikeInvoicesTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--accent-red);">Error: ${err.message || err}</td></tr>`;
    }
  });

  // RENDERIZADO Y FILTRADO DE TABLA POR FIELD TEST
  function renderFtInvoicesTable() {
    ftInvoicesTableBody.innerHTML = "";

    const searchLow = filterFtSearch.toLowerCase();
    let filtered = rawFtInvoices.filter(inv => {
      return !searchLow ||
        (inv.invoice_number || "").toLowerCase().includes(searchLow) ||
        (inv.provider || "").toLowerCase().includes(searchLow);
    });

    filtered = sortInvoicesArray(filtered, ftSortKey, ftSortOrder);
    updateSortHeaderIcons("ft-invoices-table", ftSortKey, ftSortOrder);

    if (filtered.length === 0) {
      ftInvoicesTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No hay facturas que coincidan con la búsqueda.</td></tr>';
      return;
    }

    filtered.forEach((inv: any) => {
      const tr = document.createElement("tr");

      const breakdownText = (inv.bikesCalculated || []).map((b: any) => {
        const costText = b.costPerKm !== null ? `<strong>${Number(b.costPerKm).toFixed(2)} €/km</strong>` : '<span style="color: var(--accent-red);">Sin km</span>';
        return `<div style="margin-bottom: 4px;">• <strong>${b.bikecode}</strong>: ${Number(b.allocatedAmount).toFixed(2)} € | ${Number(b.km).toFixed(1)} km | ${costText}</div>`;
      }).join("");

      tr.innerHTML = `
        <td><strong>${inv.invoice_number}</strong></td>
        <td>${inv.provider}</td>
        <td>${Number(inv.amount).toFixed(2)} €</td>
        <td>${new Date(inv.start_date).toLocaleDateString()} - ${new Date(inv.end_date).toLocaleDateString()}</td>
        <td>${breakdownText || '<span style="color: var(--text-secondary); font-style: italic;">Sin desglose</span>'}</td>
        <td><strong>${Number(inv.km).toFixed(1)} km</strong></td>
      `;

      ftInvoicesTableBody.appendChild(tr);
    });
  }

  if (filterFtInvSearchInput) {
    filterFtInvSearchInput.addEventListener("input", () => {
      filterFtSearch = filterFtInvSearchInput.value.trim();
      renderFtInvoicesTable();
    });
  }

  document.querySelectorAll("#ft-invoices-table th.sortable").forEach((th: Element) => {
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-sort");
      if (!key) return;
      if (ftSortKey === key) {
        ftSortOrder = ftSortOrder === "asc" ? "desc" : "asc";
      } else {
        ftSortKey = key;
        ftSortOrder = "asc";
      }
      renderFtInvoicesTable();
    });
  });

  // 6. ANÁLISIS POR FIELD TEST
  selectAnalysisFt.addEventListener("change", async () => {
    alertContainerFt.innerHTML = "";
    const ftId = selectAnalysisFt.value;

    if (!ftId) {
      ftSummarySection.style.display = "none";
      return;
    }

    try {
      ftInvoicesTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">Analizando facturas y telemetría...</td></tr>';
      ftSummarySection.style.display = "block";

      const summary = await financeService.getFieldTestFinanceSummary(ftId);

      // KPIs
      kpiFtTotalCost.textContent = `${Number(summary.totalAmount).toFixed(2)} €`;
      kpiFtTotalKm.textContent = `${Number(summary.totalKm).toFixed(1)} km`;
      
      if (summary.avgCostPerKm !== null) {
        kpiFtAvgCostKm.textContent = `${Number(summary.avgCostPerKm).toFixed(2)} €/km`;
      } else {
        kpiFtAvgCostKm.textContent = "—";
      }

      rawFtInvoices = summary.invoices || [];
      renderFtInvoicesTable();
    } catch (err: any) {
      console.error(err);
      alertContainerFt.innerHTML = `<div class="alert alert-error">❌ Error al generar análisis: ${err.message || err}</div>`;
      ftInvoicesTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--accent-red);">Error: ${err.message || err}</td></tr>`;
    }
  });

  // Carga Inicial
  await loadFieldTests();
  await loadBikes();
  await loadInvoicesList();
});


