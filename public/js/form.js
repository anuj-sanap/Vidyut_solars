async function handleLeadFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const statusBox = form.querySelector(".form-status");
  const submitBtn = form.querySelector("button[type='submit']");
  const nameInput = form.querySelector("input[name='name']");
  const phoneInput = form.querySelector("input[name='phone']");
  const locationInput = form.querySelector("input[name='location']");
  const plotSizeInput = form.querySelector("input[name='plotSize']");
  const formData = new FormData(form);

  if (statusBox) statusBox.textContent = "";

  const name = String(nameInput?.value || "").trim();
  const phone = String(phoneInput?.value || "").replace(/\D/g, "");
  const location = String(locationInput?.value || "").trim();
  const plotSize = Number(plotSizeInput?.value || 0);

  if (!name || !location || !phone || !plotSize) {
    if (statusBox) {
      statusBox.textContent = "Please fill all required fields before submitting.";
      statusBox.className = "form-status mt-3 text-sm text-red-600";
    }
    return;
  }

  if (!/^\d{10}$/.test(phone)) {
    if (statusBox) {
      statusBox.textContent = "Please enter a valid 10-digit phone number.";
      statusBox.className = "form-status mt-3 text-sm text-red-600";
    }
    return;
  }

  if (plotSize < 100) {
    if (statusBox) {
      statusBox.textContent = "Plot size should be at least 100 sq ft.";
      statusBox.className = "form-status mt-3 text-sm text-red-600";
    }
    return;
  }

  formData.set("name", name);
  formData.set("phone", phone);
  formData.set("location", location);
  formData.set("plotSize", String(plotSize));

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    const response = await fetch("/api/leads", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Unable to submit now.");

    form.reset();
    if (statusBox) {
      statusBox.textContent = `${data.message} Our team will contact you shortly.`;
      statusBox.className = "form-status mt-3 text-sm text-emerald-700";
    }
  } catch (error) {
    if (statusBox) {
      statusBox.textContent = error.message || "Submission failed. Please try again.";
      statusBox.className = "form-status mt-3 text-sm text-red-600";
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Get Free Quote";
  }
}

function prefillLeadFormsFromStorage() {
  try {
    const raw = localStorage.getItem("solarCalculatorResult");
    if (!raw) return;
    const saved = JSON.parse(raw);

    document.querySelectorAll(".lead-form").forEach((form) => {
      const plotSize = form.querySelector("input[name='plotSize']");
      const electricityBill = form.querySelector("input[name='electricityBill']");
      if (plotSize && !plotSize.value && saved.plotSize) {
        plotSize.value = saved.plotSize;
      }
      if (electricityBill && !electricityBill.value && saved.bill) {
        electricityBill.value = saved.bill;
      }
    });
  } catch (_) {
    // Ignore malformed localStorage data
  }
}

document.addEventListener("DOMContentLoaded", () => {
  prefillLeadFormsFromStorage();
  document.querySelectorAll(".lead-form").forEach((form) => {
    form.addEventListener("submit", handleLeadFormSubmit);
  });
});
