import { BikesService } from "../services/bikes.service.js";
import { renderBikeList, renderBikeDetail, renderEditForm, renderBikeHistory, renderChangeComponentForm } from "./bikes.ui.js";
import { normalizeBikeCode } from "../utils/sanitizeBikeCode.js";
import { requireAuth } from "../utils/authGuard.js";
import { showToast } from "../utils/toast.js";
const service = new BikesService();
async function main() {
    let session;
    try {
        session = await requireAuth();
    }
    catch (err) {
        return;
    }
    /* =============================
       CONTENEDORES
    ============================= */
    const list = document.getElementById("bikes-list");
    const detail = document.getElementById("bike-detail");
    const form = document.getElementById("bike-form");
    const history = document.getElementById("bike-history");
    const placeholder = document.getElementById("placeholder-view");
    let allBikes = [];
    let currentSelectedId = null;
    /* =============================
       SELECCIÓN DE BICI
    ============================= */
    const onSelectBike = (b) => {
        // Limpiar otros paneles dinámicos al cambiar de bicicleta
        form.innerHTML = "";
        form.style.display = "none";
        history.innerHTML = "";
        history.style.display = "none";
        currentSelectedId = b.id;
        showDetail(b);
        refreshListHighlight();
    };
    /* =============================
       CERRAR TODO
    ============================= */
    function closeAll() {
        currentSelectedId = null;
        detail.innerHTML = "";
        detail.style.display = "none";
        form.innerHTML = "";
        form.style.display = "none";
        history.innerHTML = "";
        history.style.display = "none";
        placeholder.style.display = "block";
        refreshListHighlight();
    }
    /* =============================
       RENDERIZADO FILTRADO DE LISTA
    ============================= */
    function renderFilteredList() {
        const searchCode = document.getElementById("search-bike-code")?.value.toLowerCase() || "";
        const searchMotor = document.getElementById("search-motor-type")?.value.toLowerCase() || "";
        const filtered = allBikes.filter(b => {
            const normBike = normalizeBikeCode(b.bikecode || "")?.toLowerCase() || "";
            const normSearch = normalizeBikeCode(searchCode)?.toLowerCase() || "";
            const matchesCode = normBike.includes(normSearch) || (b.bikecode || "").toLowerCase().includes(searchCode);
            const matchesMotor = (b.motortype || "").toLowerCase().includes(searchMotor);
            return matchesCode && matchesMotor;
        });
        renderBikeList(filtered, list, onSelectBike, currentSelectedId);
    }
    /* =============================
       ACTUALIZAR RESALTADO DE LISTA
    ============================= */
    async function refreshListHighlight() {
        allBikes = await service.list();
        renderFilteredList();
    }
    /* =============================
       REFRESH GENERAL
    ============================= */
    async function refresh(selectedId) {
        if (selectedId !== undefined) {
            currentSelectedId = selectedId;
        }
        allBikes = await service.list();
        renderFilteredList();
        if (currentSelectedId) {
            const b = allBikes.find(x => x.id === currentSelectedId);
            if (b) {
                showDetail(b);
            }
            else {
                closeAll();
            }
        }
        else {
            closeAll();
        }
    }
    /* =============================
       MOSTRAR DETALLES
    ============================= */
    async function showDetail(bike) {
        placeholder.style.display = "none";
        detail.style.display = "block";
        renderBikeDetail(bike, detail, {
            onEditMeta: () => {
                form.style.display = "block";
                renderEditForm(bike, form, async (changes) => {
                    try {
                        await service.update(bike.id, changes);
                        showToast("Datos de la bicicleta actualizados con éxito", "success");
                        await refresh(bike.id);
                    }
                    catch (err) {
                        console.error(err);
                        showToast("Error al actualizar metadatos: " + (err.message || err), "error");
                    }
                }, () => {
                    form.innerHTML = "";
                    form.style.display = "none";
                });
                // Scroll suave al formulario en móviles
                form.scrollIntoView({ behavior: "smooth" });
            },
            onShowHistory: async () => {
                history.style.display = "block";
                const data = await service.getHistory(bike.id);
                renderBikeHistory(data, history, () => {
                    history.innerHTML = "";
                    history.style.display = "none";
                });
                history.scrollIntoView({ behavior: "smooth" });
            },
            onChangeComponent: (componentType) => {
                form.style.display = "block";
                renderChangeComponentForm(bike, form, componentType, async (data) => {
                    try {
                        await service.changeBikeComponent({
                            bikeId: bike.id,
                            componentType: componentType,
                            componentTypeCode: data.type,
                            componentSerialCode: data.code,
                            componentVersion: data.fw !== undefined && data.fw !== null ? data.fw : null,
                            notes: data.notes !== undefined && data.notes !== null ? data.notes : null
                        });
                        showToast(`Componente ${componentType} cambiado con éxito`, "success");
                        await refresh(bike.id);
                    }
                    catch (err) {
                        console.error(err);
                        showToast("Error al cambiar componente: " + (err.message || err), "error");
                    }
                }, () => {
                    form.innerHTML = "";
                    form.style.display = "none";
                });
                form.scrollIntoView({ behavior: "smooth" });
            },
            onClose: () => {
                closeAll();
            }
        }, session.capabilities.canEditData);
    }
    /* =============================
       CREAR BICI
    ============================= */
    const createBtn = document.getElementById("create-bike");
    const createInput = document.getElementById("new-bike-code");
    if (createBtn && createInput) {
        if (!session.capabilities.canEditData) {
            const creatorPanel = document.querySelector(".creator-panel");
            if (creatorPanel) {
                creatorPanel.style.display = "none";
            }
        }
        createBtn.onclick = async () => {
            const bikecode = createInput.value.trim();
            if (!bikecode) {
                alert("Introduce un código de bici");
                return;
            }
            try {
                const norm = normalizeBikeCode(bikecode);
                const newBike = await service.create({
                    bikecode,
                    bikecode_canon: norm ? norm.toLowerCase() : bikecode.toLowerCase(),
                    location: null,
                    scope: null,
                    target: null,
                    comments: null,
                    motortype: null,
                    motorcode: null,
                    motorfirmware: null,
                    batterytype: null,
                    batterycode: null,
                    batteryfirmware: null,
                    hmicode: null,
                    hmifirmware: null,
                    other: null
                });
                createInput.value = "";
                showToast("Bicicleta creada con éxito: " + newBike.bikecode, "success");
                await refresh(newBike.id);
            }
            catch (e) {
                console.error(e);
                showToast("Error creando bici: " + (e.message || e), "error");
            }
        };
    }
    /* =============================
       BUSCADOR / FILTROS
    ============================= */
    const searchCodeInput = document.getElementById("search-bike-code");
    const searchMotorInput = document.getElementById("search-motor-type");
    if (searchCodeInput) {
        searchCodeInput.addEventListener("input", renderFilteredList);
    }
    if (searchMotorInput) {
        searchMotorInput.addEventListener("input", renderFilteredList);
    }
    /* =============================
       INIT
    ============================= */
    await refresh();
}
main();
