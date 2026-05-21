import { BikesService } from "../services/bikes.service.js";
import { renderBikeList, renderBikeDetail, renderEditForm, renderBikeHistory, renderChangeComponentForm } from "./bikes.ui.js";
const service = new BikesService();
async function main() {
    /* =============================
       CONTENEDORES
    ============================= */
    const list = document.getElementById("bikes-list");
    const detail = document.getElementById("bike-detail");
    const form = document.getElementById("bike-form");
    const history = document.getElementById("bike-history");
    /* =============================
       CREAR BICI
    ============================= */
    const createBtn = document.getElementById("create-bike");
    const createInput = document.getElementById("new-bike-code");
    if (createBtn && createInput) {
        createBtn.onclick = async () => {
            const bikecode = createInput.value.trim();
            if (!bikecode) {
                alert("Introduce un código de bici");
                return;
            }
            try {
                await service.create({
                    bikecode,
                    bikecode_canon: bikecode.toLowerCase(),
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
                await refresh();
            }
            catch (e) {
                console.error(e);
                alert("Error creando bici");
            }
        };
    }
    /* =============================
       REFRESH
    ============================= */
    async function refresh(selectedId) {
        const bikes = await service.list();
        renderBikeList(bikes, list, showDetail);
        if (selectedId) {
            const b = bikes.find(x => x.id === selectedId);
            if (b)
                showDetail(b);
        }
    }
    /* =============================
       DETAIL
    ============================= */
    async function showDetail(bike) {
        renderBikeDetail(bike, detail, 
        /* -------------------------
           EDIT BICI (campos normales)
        ------------------------- */
        () => {
            renderEditForm(bike, form, async (changes) => {
                await service.update(bike.id, changes);
                await refresh(bike.id);
            });
        }, 
        /* -------------------------
           HISTÓRICO (timeline bueno)
        ------------------------- */
        async () => {
            const data = await service.getHistory(bike.id);
            renderBikeHistory(data, history);
        }, 
        /* -------------------------
           CAMBIO COMPONENTES
        ------------------------- */
        () => {
            /* ===== MOTOR ===== */
            renderChangeComponentForm(bike, form, "motor", async (data) => {
                await service.changeBikeComponent({
                    bikeId: bike.id,
                    componentType: "motor",
                    componentTypeCode: data.type,
                    componentSerialCode: data.code,
                    componentVersion: data.fw ?? null,
                    notes: data.notes ?? null
                });
                await refresh(bike.id);
            });
            /* ===== BATTERY ===== */
            renderChangeComponentForm(bike, form, "battery", async (data) => {
                await service.changeBikeComponent({
                    bikeId: bike.id,
                    componentType: "battery",
                    componentTypeCode: data.type,
                    componentSerialCode: data.code,
                    componentVersion: data.fw ?? null,
                    notes: data.notes ?? null
                });
                await refresh(bike.id);
            });
            /* ===== HMI ===== */
            renderChangeComponentForm(bike, form, "hmi", async (data) => {
                await service.changeBikeComponent({
                    bikeId: bike.id,
                    componentType: "hmi",
                    componentTypeCode: data.type,
                    componentSerialCode: data.code,
                    componentVersion: data.fw ?? null,
                    notes: data.notes ?? null
                });
                await refresh(bike.id);
            });
            /* ===== OTHER ===== */
            renderChangeComponentForm(bike, form, "other", async (data) => {
                await service.changeBikeComponent({
                    bikeId: bike.id,
                    componentType: "other",
                    componentTypeCode: data.type,
                    componentSerialCode: data.code,
                    componentVersion: data.fw ?? null,
                    notes: data.notes ?? null
                });
                await refresh(bike.id);
            });
        });
    }
    /* =============================
       INIT
    ============================= */
    await refresh();
}
main();
