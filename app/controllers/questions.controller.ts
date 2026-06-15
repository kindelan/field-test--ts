import { supabase } from "../dao/supabaseclient.js";
import { requireAuth } from "../utils/authGuard.js";

document.addEventListener("DOMContentLoaded", async () => {
  let session;
  try {
    session = await requireAuth();
  } catch (err) {
    return;
  }

  // 1. DOM Elements
  const form = document.getElementById("question-form") as HTMLFormElement;
  const editIdInput = document.getElementById("edit-id") as HTMLInputElement;
  const qFieldTest = document.getElementById("q-field-test") as HTMLSelectElement;
  const qSection = document.getElementById("q-section") as HTMLSelectElement;
  const qKey = document.getElementById("q-key") as HTMLInputElement;
  const qLabel = document.getElementById("q-label") as HTMLInputElement;
  const qType = document.getElementById("q-type") as HTMLSelectElement;
  const optionsWrapper = document.getElementById("options-wrapper") as HTMLDivElement;
  const qOptions = document.getElementById("q-options") as HTMLTextAreaElement;
  const qOrder = document.getElementById("q-order") as HTMLInputElement;
  const qRequired = document.getElementById("q-required") as HTMLInputElement;
  const qParentKey = document.getElementById("q-parent-key") as HTMLInputElement;
  const qParentVal = document.getElementById("q-parent-val") as HTMLInputElement;

  const formTitle = document.getElementById("form-title") as HTMLHeadingElement;
  const cancelEditBtn = document.getElementById("cancel-edit-btn") as HTMLButtonElement;
  const statusAlert = document.getElementById("status-alert") as HTMLDivElement;

  const filterFieldTest = document.getElementById("filter-field-test") as HTMLSelectElement;
  const tbody = document.getElementById("questions-tbody") as HTMLTableSectionElement;

  // Show/hide options textarea based on type
  qType.addEventListener("change", () => {
    if (qType.value === "radio") {
      optionsWrapper.style.display = "block";
      qOptions.required = true;
    } else {
      optionsWrapper.style.display = "none";
      qOptions.required = false;
      qOptions.value = "";
    }
  });

  // 2. Load Field Tests
  async function loadFieldTests() {
    try {
      const { data, error } = await supabase
        .from("field_test")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) throw error;

      if (data) {
        data.forEach(ft => {
          // Add to form select
          const optForm = document.createElement("option");
          optForm.value = ft.id;
          optForm.textContent = ft.name;
          qFieldTest.appendChild(optForm);

          // Add to filter select
          const optFilter = document.createElement("option");
          optFilter.value = ft.id;
          optFilter.textContent = ft.name;
          filterFieldTest.appendChild(optFilter);
        });
      }
    } catch (err: any) {
      showStatus("Error cargando tests: " + err.message, "error");
    }
  }

  // Helper to show alert status
  function showStatus(msg: string, type: "success" | "error" | "info") {
    statusAlert.className = `status-msg ${type}`;
    statusAlert.textContent = msg;
    statusAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // 3. Load & Render Questions Table
  async function loadQuestions() {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-secondary);">Cargando preguntas...</td></tr>';
    
    try {
      const filterVal = filterFieldTest.value;
      let query = supabase.from("review_questions").select("*");

      if (filterVal === "all") {
        // Fetch all questions
      } else if (filterVal === "") {
        // Fetch common only
        query = query.is("field_test_id", null);
      } else {
        // Fetch common or specific test
        query = query.or(`field_test_id.is.null,field_test_id.eq.${filterVal}`);
      }

      const { data, error } = await query.order("sort_order", { ascending: true });

      if (error) throw error;

      tbody.innerHTML = "";
      if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-secondary);">No se encontraron preguntas.</td></tr>';
        return;
      }

      data.forEach((q: any) => {
        const tr = document.createElement("tr");

        // Order
        const tdOrder = document.createElement("td");
        tdOrder.textContent = q.sort_order;
        tr.appendChild(tdOrder);

        // Section
        const tdSection = document.createElement("td");
        let sectionName = q.section;
        if (q.section === "telemetry") sectionName = "Telemetry";
        if (q.section === "motor_feel") sectionName = "Motor Feel";
        if (q.section === "terrain") sectionName = "Terrain / Auto";
        tdSection.textContent = sectionName;
        tr.appendChild(tdSection);

        // Key
        const tdKey = document.createElement("td");
        tdKey.innerHTML = `<code>${q.question_key}</code>`;
        tr.appendChild(tdKey);

        // Label
        const tdLabel = document.createElement("td");
        tdLabel.textContent = q.label;
        if (q.is_required) {
          tdLabel.innerHTML += ' <span style="color: var(--accent-red);">*</span>';
        }
        tr.appendChild(tdLabel);

        // Type
        const tdType = document.createElement("td");
        let badgeClass = "badge-cyan";
        if (q.input_type === "radio") badgeClass = "badge-amber";
        if (q.input_type === "textarea") badgeClass = "badge-purple";
        if (q.input_type === "number") badgeClass = "badge-green";
        tdType.innerHTML = `<span class="badge ${badgeClass}">${q.input_type}</span>`;
        tr.appendChild(tdType);

        // Parent (Conditional)
        const tdParent = document.createElement("td");
        if (q.parent_question_key) {
          tdParent.innerHTML = `<small>Si <code>${q.parent_question_key}</code> = "${q.parent_trigger_value}"</small>`;
        } else {
          tdParent.textContent = "—";
        }
        tr.appendChild(tdParent);

        // Field Test Assignment
        const tdFT = document.createElement("td");
        tdFT.textContent = q.field_test_id ? "Custom" : "Común";
        tr.appendChild(tdFT);

        // Actions
        const tdActions = document.createElement("td");
        tdActions.style.textAlign = "right";

        const editBtn = document.createElement("button");
        editBtn.textContent = "Editar";
        editBtn.style.padding = "4px 8px";
        editBtn.style.fontSize = "12px";
        editBtn.style.marginRight = "6px";
        editBtn.onclick = () => startEdit(q);

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Borrar";
        deleteBtn.className = "danger-action";
        deleteBtn.style.padding = "4px 8px";
        deleteBtn.style.fontSize = "12px";
        deleteBtn.onclick = () => deleteQuestion(q.id, q.label);

        tdActions.appendChild(editBtn);
        tdActions.appendChild(deleteBtn);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      });
    } catch (err: any) {
      showStatus("Error cargando preguntas: " + err.message, "error");
    }
  }

  // 4. Handle Edit mode
  function startEdit(q: any) {
    editIdInput.value = q.id;
    qFieldTest.value = q.field_test_id || "";
    qSection.value = q.section;
    qKey.value = q.question_key;
    qKey.disabled = true; // Don't let them change the key once created to avoid losing column alignments
    qLabel.value = q.label;
    qType.value = q.input_type;
    
    if (q.input_type === "radio") {
      optionsWrapper.style.display = "block";
      qOptions.required = true;
      qOptions.value = q.options ? JSON.stringify(q.options) : "";
    } else {
      optionsWrapper.style.display = "none";
      qOptions.required = false;
      qOptions.value = "";
    }

    qOrder.value = q.sort_order;
    qRequired.checked = q.is_required;
    qParentKey.value = q.parent_question_key || "";
    qParentVal.value = q.parent_trigger_value || "";

    formTitle.textContent = "Editar Pregunta";
    cancelEditBtn.style.display = "inline-flex";
  }

  function cancelEdit() {
    form.reset();
    editIdInput.value = "";
    qKey.disabled = false;
    optionsWrapper.style.display = "none";
    qOptions.required = false;
    formTitle.textContent = "Nueva Pregunta";
    cancelEditBtn.style.display = "none";
  }

  cancelEditBtn.addEventListener("click", cancelEdit);

  // 5. Handle Form Submit (Create / Update)
  form.onsubmit = async (e) => {
    e.preventDefault();
    showStatus("Guardando...", "info");

    const id = editIdInput.value;
    const isEdit = !!id;

    // Validate options JSON if radio
    let optionsJson = null;
    if (qType.value === "radio") {
      try {
        const parsed = JSON.parse(qOptions.value);
        if (!Array.isArray(parsed)) {
          throw new Error("El JSON debe ser un array de strings, ej: [\"Opción 1\", \"Opción 2\"]");
        }
        optionsJson = parsed;
      } catch (err: any) {
        showStatus("JSON de opciones inválido: " + err.message, "error");
        return;
      }
    }

    const payload: any = {
      field_test_id: qFieldTest.value || null,
      section: qSection.value,
      question_key: qKey.value.trim(),
      label: qLabel.value.trim(),
      input_type: qType.value,
      options: optionsJson,
      sort_order: parseInt(qOrder.value, 10),
      is_required: qRequired.checked,
      parent_question_key: qParentKey.value.trim() || null,
      parent_trigger_value: qParentVal.value.trim() || null,
      updated_at: new Date().toISOString()
    };

    try {
      if (isEdit) {
        const { error } = await supabase
          .from("review_questions")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
        showStatus("Pregunta actualizada con éxito", "success");
      } else {
        payload.created_at = new Date().toISOString();
        const { error } = await supabase
          .from("review_questions")
          .insert(payload);
        if (error) throw error;
        showStatus("Pregunta creada con éxito", "success");
      }

      cancelEdit();
      await loadQuestions();
    } catch (err: any) {
      showStatus("Error al guardar: " + err.message, "error");
    }
  };

  // 6. Delete question
  async function deleteQuestion(id: string, label: string) {
    if (!confirm(`¿Estás seguro de que quieres borrar la pregunta "${label}"?`)) return;

    showStatus("Eliminando...", "info");
    try {
      const { error } = await supabase
        .from("review_questions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      showStatus("Pregunta eliminada con éxito", "success");
      await loadQuestions();
    } catch (err: any) {
      showStatus("Error al eliminar: " + err.message, "error");
    }
  }

  // 7. Filters listener
  filterFieldTest.addEventListener("change", loadQuestions);

  // 8. Run Init
  await loadFieldTests();
  await loadQuestions();
});
