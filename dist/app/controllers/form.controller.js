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
            return;
        }
        bikeSelect.innerHTML = '<option value="" disabled selected>Loading bikes...</option>';
        bikeSelect.disabled = true;
        updateMotorType();
        try {
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
        }
        catch (err) {
            console.error("Error loading bikes for field test:", err);
            bikeSelect.innerHTML = '<option value="" disabled selected>Error loading bikes</option>';
            bikeSelect.disabled = true;
        }
    });
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
        // Helper to get checked radio value
        function getRadioValue(name) {
            const el = document.querySelector(`input[name="${name}"]:checked`);
            return el ? el.value : null;
        }
        // Helper to get text/textarea value
        function getTextValue(id) {
            const el = document.getElementById(id);
            if (!el || el.disabled)
                return null;
            return el.value.trim();
        }
        const feedbackDto = {
            rider_name: getTextValue("rider-name") || "",
            rider_email: getTextValue("rider-email"),
            initial_battery: Number(getTextValue("initial-battery")) || null,
            final_battery: Number(getTextValue("final-battery")) || null,
            motor_startup: getRadioValue("motor-startup"),
            motor_stop: getRadioValue("motor-stop"),
            assistance: getRadioValue("assistance"),
            power_feeling: getTextValue("power-feeling"),
            motor_feel: getTextValue("motor-feel"),
            motor_error: getRadioValue("motor-error"),
            error_description: getTextValue("error-description"),
            comments: getTextValue("comments") || "Rider submitted review",
            use_app: getRadioValue("use-app"),
            app_experience: getTextValue("app-experience"),
            test_dynamic_mode: getRadioValue("test-dynamic-mode"),
            auto_mode_experience: getTextValue("auto-mode-experience"),
            flat_terrain_assistance: getRadioValue("flat-terrain-assistance"),
            flat_terrain_perception: getTextValue("flat-terrain-perception"),
            moderate_terrain_assistance: getRadioValue("moderate-terrain-assistance"),
            moderate_terrain_perception: getTextValue("moderate-terrain-perception"),
            steep_terrain_assistance: getRadioValue("steep-terrain-assistance"),
            steep_terrain_perception: getTextValue("steep-terrain-perception"),
            technical_terrain_assistance: getRadioValue("technical-terrain-assistance"),
            technical_terrain_perception: getTextValue("technical-terrain-perception"),
            suggested_improvements: getTextValue("suggested-improvements")
        };
        try {
            await service.saveRideWithFeedback(rideDto, feedbackDto);
            statusDiv.innerHTML = '<div class="alert alert-success">✅ Ride and review saved successfully!</div>';
            // Reset form but keep date as today
            form.reset();
            rideDateInput.value = today;
            resolvedMotorSpan.textContent = "—";
            bikeSelect.innerHTML = '<option value="" disabled selected>Select a Field Test first in Tab 1...</option>';
            bikeSelect.disabled = true;
            // Reset dynamic mode layout
            const wrapper = document.getElementById('dynamic-fields-wrapper');
            if (wrapper) {
                wrapper.classList.add('dynamic-disabled-field');
            }
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
