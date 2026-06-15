import { RideLogService } from "../services/rideLog.service.js";
import { requireAuth } from "../utils/authGuard.js";
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await requireAuth(false);
    }
    catch (err) {
        return;
    }
    const service = new RideLogService();
    const form = document.getElementById("rider-review-form");
    const bikeSelect = document.getElementById("bike-code");
    const fieldTestSelect = document.getElementById("field-test");
    const rideDateInput = document.getElementById("ride-date");
    const resolvedMotorSpan = document.getElementById("resolved-motor-type");
    const statusDiv = document.getElementById("form-status");
    const dynamicTelemetry = document.getElementById("dynamic-telemetry-fields");
    const dynamicMotor = document.getElementById("dynamic-motor-fields");
    const dynamicTerrain = document.getElementById("dynamic-terrain-fields");
    // Set today's date as default in date input
    const today = new Date().toISOString().split("T")[0];
    rideDateInput.value = today;
    // Populate field tests
    try {
        const fieldTests = await service.getFieldTests();
        fieldTestSelect.innerHTML = '<option value="" disabled selected>Select a field test...</option>';
        fieldTests.forEach((ft) => {
            const opt = document.createElement("option");
            opt.value = ft.id;
            opt.textContent = ft.name;
            fieldTestSelect.appendChild(opt);
        });
    }
    catch (err) {
        console.error("Error loading field tests:", err);
        statusDiv.innerHTML = '<div class="alert alert-error">Error loading field tests.</div>';
    }
    // Field Test dropdown change listener
    fieldTestSelect.addEventListener("change", async () => {
        const fieldTestId = fieldTestSelect.value;
        if (!fieldTestId) {
            bikeSelect.innerHTML = '<option value="" disabled selected>Select a Field Test first in Tab 1...</option>';
            bikeSelect.disabled = true;
            updateMotorType();
            clearDynamicFields();
            return;
        }
        bikeSelect.innerHTML = '<option value="" disabled selected>Loading bikes...</option>';
        bikeSelect.disabled = true;
        updateMotorType();
        try {
            // 1. Load bikes
            const bikes = await service.getBikesByFieldTest(fieldTestId);
            bikeSelect.innerHTML = '';
            if (bikes.length === 0) {
                const opt = document.createElement("option");
                opt.value = "";
                opt.disabled = true;
                opt.selected = true;
                opt.textContent = "No active bikes in this field test";
                bikeSelect.appendChild(opt);
                bikeSelect.disabled = true;
            }
            else {
                const defaultOpt = document.createElement("option");
                defaultOpt.value = "";
                defaultOpt.disabled = true;
                defaultOpt.selected = true;
                defaultOpt.textContent = "Select a bike...";
                bikeSelect.appendChild(defaultOpt);
                bikes.forEach((b) => {
                    const opt = document.createElement("option");
                    opt.value = b.bikecode;
                    opt.setAttribute("data-id", b.id);
                    opt.textContent = b.bikecode;
                    bikeSelect.appendChild(opt);
                });
                bikeSelect.disabled = false;
            }
            // 2. Load dynamic questions
            await loadDynamicQuestions(fieldTestId);
        }
        catch (err) {
            console.error("Error loading bikes or questions for field test:", err);
            bikeSelect.innerHTML = '<option value="" disabled selected>Error loading data</option>';
            bikeSelect.disabled = true;
        }
    });
    // Helper to clear dynamic fields
    function clearDynamicFields() {
        dynamicTelemetry.innerHTML = "";
        dynamicMotor.innerHTML = "";
        dynamicTerrain.innerHTML = "";
    }
    // Fetch and render dynamic questions
    async function loadDynamicQuestions(fieldTestId) {
        clearDynamicFields();
        try {
            const questions = await service.getReviewQuestions(fieldTestId);
            questions.forEach((q) => {
                // Group container
                const group = document.createElement("div");
                group.className = `form-group ${q.is_required ? "required" : ""} ${q.input_type === "textarea" || q.parent_question_key ? "full-width" : ""}`;
                group.setAttribute("data-key", q.question_key);
                if (q.parent_question_key) {
                    group.setAttribute("data-parent", q.parent_question_key);
                    group.setAttribute("data-trigger", q.parent_trigger_value || "");
                    group.style.display = "none";
                }
                // Label
                const label = document.createElement("label");
                label.textContent = q.label;
                if (q.is_required) {
                    const span = document.createElement("span");
                    span.className = "required";
                    span.textContent = " *";
                    label.appendChild(span);
                }
                group.appendChild(label);
                // Input based on type
                if (q.input_type === "text") {
                    const input = document.createElement("input");
                    input.type = "text";
                    input.id = `dyn-${q.question_key}`;
                    input.placeholder = "Enter details...";
                    input.required = q.is_required;
                    group.appendChild(input);
                }
                else if (q.input_type === "number") {
                    const input = document.createElement("input");
                    input.type = "number";
                    input.id = `dyn-${q.question_key}`;
                    input.placeholder = "E.g. 100";
                    input.required = q.is_required;
                    group.appendChild(input);
                }
                else if (q.input_type === "textarea") {
                    const textarea = document.createElement("textarea");
                    textarea.id = `dyn-${q.question_key}`;
                    textarea.placeholder = "Details...";
                    textarea.required = q.is_required;
                    group.appendChild(textarea);
                }
                else if (q.input_type === "radio") {
                    const radioGroup = document.createElement("div");
                    radioGroup.className = "radio-card-group";
                    let opts = ["Yes", "No"];
                    if (q.options) {
                        opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options);
                    }
                    opts.forEach((opt, idx) => {
                        const card = document.createElement("div");
                        card.className = "radio-card";
                        const radio = document.createElement("input");
                        radio.type = "radio";
                        radio.id = `opt-${q.question_key}-${opt.replace(/\s+/g, "")}`;
                        radio.name = `dyn-${q.question_key}`;
                        radio.value = opt;
                        radio.required = q.is_required;
                        if (q.is_required && idx === 0) {
                            radio.checked = true;
                        }
                        const cardLabel = document.createElement("label");
                        cardLabel.className = "radio-card-label";
                        cardLabel.setAttribute("for", radio.id);
                        cardLabel.textContent = opt;
                        card.appendChild(radio);
                        card.appendChild(cardLabel);
                        radioGroup.appendChild(card);
                    });
                    group.appendChild(radioGroup);
                }
                // Attach event listener for conditional displays
                group.addEventListener("change", updateConditionals);
                // Append to appropriate container
                if (q.section === "telemetry") {
                    dynamicTelemetry.appendChild(group);
                }
                else if (q.section === "motor_feel") {
                    dynamicMotor.appendChild(group);
                }
                else if (q.section === "terrain") {
                    dynamicTerrain.appendChild(group);
                }
            });
            // Run once at start to hide/show dependencies
            updateConditionals();
        }
        catch (err) {
            console.error("Error rendering dynamic fields:", err);
        }
    }
    // Update dynamic conditional logic
    function updateConditionals() {
        const groups = document.querySelectorAll("div[data-key]");
        // Create a map of current values for all keys
        const values = {};
        groups.forEach((g) => {
            const key = g.getAttribute("data-key");
            const textInput = g.querySelector("input[type='text'], input[type='number'], textarea");
            if (textInput) {
                values[key] = textInput.value || null;
            }
            else {
                const checkedRadio = g.querySelector("input[type='radio']:checked");
                values[key] = checkedRadio ? checkedRadio.value : null;
            }
        });
        // Evaluate visibility based on dependencies
        groups.forEach((el) => {
            const g = el;
            const parentKey = g.getAttribute("data-parent");
            if (parentKey) {
                const triggerValue = g.getAttribute("data-trigger");
                const parentCurrentValue = values[parentKey];
                const isVisible = parentCurrentValue !== null && parentCurrentValue === triggerValue;
                const inputs = g.querySelectorAll("input, textarea");
                if (isVisible) {
                    g.style.display = "block";
                    g.style.opacity = "1";
                    g.style.pointerEvents = "auto";
                    inputs.forEach((input) => {
                        input.disabled = false;
                        // Restore required if group is required
                        if (g.classList.contains("required")) {
                            input.required = true;
                        }
                    });
                }
                else {
                    g.style.display = "none";
                    g.style.opacity = "0.35";
                    g.style.pointerEvents = "none";
                    inputs.forEach((input) => {
                        input.disabled = true;
                        input.required = false;
                        // Clear input value
                        if (input.type === "radio") {
                            input.checked = false;
                        }
                        else {
                            input.value = "";
                        }
                    });
                }
            }
        });
    }
    // Helper to get selected option data
    function getSelectedBikeOption() {
        const opt = bikeSelect.options[bikeSelect.selectedIndex];
        if (!opt || !opt.value)
            return null;
        return {
            id: opt.getAttribute("data-id"),
            code: opt.value
        };
    }
    // Dynamic motor resolution listener
    async function updateMotorType() {
        const bike = getSelectedBikeOption();
        const dateVal = rideDateInput.value;
        if (!bike || !dateVal) {
            resolvedMotorSpan.textContent = "—";
            return;
        }
        resolvedMotorSpan.textContent = "Searching...";
        try {
            const now = new Date();
            const rideDate = new Date(`${dateVal}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
            const motorType = await service.resolveMotorType(bike.id, bike.code, rideDate);
            resolvedMotorSpan.textContent = motorType || "Not assigned (Fallback to bike specs)";
        }
        catch (err) {
            console.error(err);
            resolvedMotorSpan.textContent = "Error resolving";
        }
    }
    bikeSelect.addEventListener("change", updateMotorType);
    rideDateInput.addEventListener("change", updateMotorType);
    // Form submit handler
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        statusDiv.innerHTML = '<div class="alert alert-info">Saving ride review...</div>';
        const bike = getSelectedBikeOption();
        if (!bike) {
            statusDiv.innerHTML = '<div class="alert alert-error">Please select a bike.</div>';
            return;
        }
        const dateVal = rideDateInput.value; // e.g. "2026-05-28"
        const dateParts = dateVal.split("-");
        const year = dateParts[0];
        const month = String(parseInt(dateParts[1], 10)); // e.g. "5"
        const day = String(parseInt(dateParts[2], 10)); // e.g. "28"
        const rideDateTxt = `${month}/${day}/${year}`;
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const completionDateTxt = `${month}/${day}/${year} ${timeStr}:00`;
        const distanceKm = Number(document.getElementById("distance-km").value);
        const elevationM = Number(document.getElementById("elevation-m").value) || null;
        const rideDto = {
            ride_date_txt: rideDateTxt,
            completion_date_txt: completionDateTxt,
            bike_code: bike.code,
            distance_km: distanceKm,
            elevation_m: elevationM
        };
        // Gather dynamic answers
        const answers = {};
        const groups = document.querySelectorAll("div[data-key]");
        groups.forEach((g) => {
            const key = g.getAttribute("data-key");
            const textInput = g.querySelector("input[type='text'], input[type='number'], textarea");
            if (textInput) {
                if (!textInput.disabled) {
                    const value = textInput.value.trim();
                    answers[key] = textInput.type === "number" ? (value ? Number(value) : null) : (value || null);
                }
            }
            else {
                const checkedRadio = g.querySelector("input[type='radio']:checked");
                const firstRadio = g.querySelector("input[type='radio']");
                if (firstRadio && !firstRadio.disabled) {
                    answers[key] = checkedRadio ? checkedRadio.value : null;
                }
            }
        });
        // Populate DTO with rider static info and answers dictionary
        const feedbackDto = {
            rider_name: document.getElementById("rider-name").value.trim(),
            rider_email: document.getElementById("rider-email").value.trim() || null,
            answers: answers
        };
        // Map keys to specific columns for backward compatibility in database / old reports
        const oldKeys = [
            "initial_battery", "final_battery", "motor_startup", "motor_stop",
            "assistance", "power_feeling", "motor_feel", "motor_error",
            "error_description", "comments", "use_app", "app_experience",
            "test_dynamic_mode", "auto_mode_experience", "flat_terrain_assistance",
            "flat_terrain_perception", "moderate_terrain_assistance",
            "moderate_terrain_perception", "steep_terrain_assistance",
            "steep_terrain_perception", "technical_terrain_assistance",
            "technical_terrain_perception", "suggested_improvements"
        ];
        oldKeys.forEach((k) => {
            if (answers[k] !== undefined) {
                if (k === "initial_battery" || k === "final_battery") {
                    feedbackDto[k] = answers[k] !== null ? Number(answers[k]) : null;
                }
                else {
                    feedbackDto[k] = answers[k];
                }
            }
        });
        try {
            await service.saveRideWithFeedback(rideDto, feedbackDto);
            statusDiv.innerHTML = '<div class="alert alert-success">✅ Ride and review saved successfully!</div>';
            // Reset form but keep date as today
            form.reset();
            rideDateInput.value = today;
            resolvedMotorSpan.textContent = "—";
            bikeSelect.innerHTML = '<option value="" disabled selected>Select a Field Test first in Tab 1...</option>';
            bikeSelect.disabled = true;
            clearDynamicFields();
            // Switch back to Tab 1 (Personal Data)
            const tab1Btn = document.querySelector('.tab-btn[data-target="tab-personal"]');
            if (tab1Btn) {
                tab1Btn.click();
            }
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
        catch (err) {
            console.error(err);
            statusDiv.innerHTML = `<div class="alert alert-error">❌ Error saving: ${err.message || err}</div>`;
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    });
});
