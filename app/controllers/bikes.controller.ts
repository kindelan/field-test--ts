import { BikesService } from "../services/bikes.service.js";
import {
  renderBikeList,
  renderBikeDetail,
  renderEditForm,
  renderBikeHistory,
  renderChangeComponentForm
} from "./bikes.ui.js";

const service = new BikesService();

async function main() {
  /* =============================
     CONTENEDORES
  ============================= */
  const list = document.getElementById("bikes-list")!;
  const detail = document.getElementById("bike-detail")!;
  const form = document.getElementById("bike-form")!;
  const history = document.getElementById("bike-history")!;
  const placeholder = document.getElementById("placeholder-view")!;

  let currentSelectedId: string | null = null;

  /* =============================
     SELECCIÓN DE BICI
  ============================= */
  const onSelectBike = (b: any) => {
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
     ACTUALIZAR RESALTADO DE LISTA
  ============================= */
  async function refreshListHighlight() {
    const bikes = await service.list();
    renderBikeList(bikes, list, onSelectBike, currentSelectedId);
  }

  /* =============================
     REFRESH GENERAL
  ============================= */
  async function refresh(selectedId?: string) {
    if (selectedId !== undefined) {
      currentSelectedId = selectedId;
    }
    const bikes = await service.list();
    
    renderBikeList(bikes, list, onSelectBike, currentSelectedId);

    if (currentSelectedId) {
      const b = bikes.find(x => x.id === currentSelectedId);
      if (b) {
        showDetail(b);
      } else {
        closeAll();
      }
    } else {
      closeAll();
    }
  }

  /* =============================
     MOSTRAR DETALLES
  ============================= */
  async function showDetail(bike: any) {
    placeholder.style.display = "none";
    detail.style.display = "block";

    renderBikeDetail(
      bike,
      detail,
      {
        onEditMeta: () => {
          form.style.display = "block";
          renderEditForm(bike, form, async (changes) => {
            await service.update(bike.id, changes);
            await refresh(bike.id);
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
            await service.changeBikeComponent({
              bikeId: bike.id,
              componentType: componentType,
              componentTypeCode: data.type,
              componentSerialCode: data.code,
              componentVersion: data.fw !== undefined && data.fw !== null ? data.fw : null,
              notes: data.notes !== undefined && data.notes !== null ? data.notes : null
            });
            await refresh(bike.id);
          }, () => {
            form.innerHTML = "";
            form.style.display = "none";
          });
          form.scrollIntoView({ behavior: "smooth" });
        },
        
        onClose: () => {
          closeAll();
        }
      }
    );
  }

  /* =============================
     CREAR BICI
  ============================= */
  const createBtn = document.getElementById("create-bike") as HTMLButtonElement;
  const createInput = document.getElementById("new-bike-code") as HTMLInputElement;

  if (createBtn && createInput) {
    createBtn.onclick = async () => {
      const bikecode = createInput.value.trim();

      if (!bikecode) {
        alert("Introduce un código de bici");
        return;
      }

      try {
        const newBike = await service.create({
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
        await refresh(newBike.id);

      } catch (e) {
        console.error(e);
        alert("Error creando bici");
      }
    };
  }

  /* =============================
     INIT
  ============================= */
  await refresh();
}

main();
