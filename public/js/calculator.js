function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function updateResultUI(data) {
  const resultCard = document.querySelector("#calcResults");
  const status = document.querySelector("#calcFormStatus");

  const plan = data.plan || data;
  const monthlyGeneration = Number(plan.monthlyGeneration || data.monthlyGeneration || 0);
  const monthlySaving = Number(plan.monthlySaving || data.monthlySaving || 0);
  const annualSaving = Number(plan.annualSaving || data.annualSaving || 0);

  document.querySelector("#resultSystemSize").textContent = `${plan.systemSize} kW`;
  document.querySelector("#resultMonthlyGeneration").textContent = `${formatNumber(monthlyGeneration)} kWh / month`;
  document.querySelector("#resultEstimatedConsumption").textContent = `${formatNumber(data.estimatedConsumption || data.estimatedConsumptionUnits || 0)} kWh / month`;
  document.querySelector("#resultRequiredCapacity").textContent = `${formatNumber(data.requiredCapacity || data.capacityDemand || plan.systemSize || 0)} kW`;
  document.querySelector("#resultRoofRequirement").textContent = `${formatNumber(plan.roofRequirement || 0)} sq.ft`;
  document.querySelector("#resultAvailableRoofArea").textContent = `${formatNumber(data.availableRoofArea || data.plotSize || 0)} sq.ft`;
  document.querySelector("#resultMaximumFit").textContent = `${formatNumber(data.maxRoofSystem || plan.systemSize || 0)} kW`;
  document.querySelector("#resultCost").textContent = `${formatCurrency(plan.cost || data.cost || 0)}`;
  document.querySelector("#resultSavings").textContent = `${formatCurrency(monthlySaving)} / month`;
  document.querySelector("#resultAnnualSaving").textContent = `${formatCurrency(annualSaving)} / year`;
  document.querySelector("#resultPanels").textContent = plan.panels || "-";
  document.querySelector("#resultInverter").textContent = plan.inverter || "-";
  document.querySelector("#resultPayback").textContent = plan.payback || "-";
  document.querySelector("#resultCo2Reduction").textContent = plan.co2Reduction || "-";

  const badge = document.querySelector("#recommendedBadge");
  badge.textContent = `Recommended: ${plan.systemSize} kW plan`;

  const waBtn = document.querySelector("#whatsappWithResults");
  const msg = [
    "Hi Vidyut PowerTech, I used your calculator.",
    `Available Roof Area: ${data.availableRoofArea || data.plotSize || ""} sq.ft`,
    `Monthly Bill: Rs ${data.monthlyBill || data.bill || ""}`,
    `Recommended System: ${plan.systemSize} kW`,
    `Monthly Generation: ${formatNumber(monthlyGeneration)} kWh`,
    `Roof Requirement: ${formatNumber(plan.roofRequirement)} sq.ft`,
    `Estimate Cost: ${formatCurrency(plan.cost || 0)}`,
    `Monthly Saving: ${formatCurrency(monthlySaving)}`,
    `Annual Saving: ${formatCurrency(annualSaving)}`,
    `Payback: ${plan.payback || "-"}`,
    `CO₂ Reduction: ${plan.co2Reduction || "-"}`,
  ].join("\n");

  waBtn.href = `https://wa.me/917558200928?text=${encodeURIComponent(msg)}`;
  document.dispatchEvent(new CustomEvent("solar-plan-updated", { detail: data }));

  resultCard.classList.remove("hidden");
  if (status) status.textContent = "";
}

function persistResult(data) {
  localStorage.setItem("solarCalculatorResult", JSON.stringify(data));
}

function restoreInputs() {
  try {
    const raw = localStorage.getItem("solarCalculatorResult");
    if (!raw) return;
    const saved = JSON.parse(raw);
    const form = document.querySelector("#solarCalculatorForm");
    if (!form) return;
    form.availableRoofArea.value = saved.availableRoofArea || saved.plotSize || "";
    form.monthlyBill.value = saved.monthlyBill || saved.bill || "";
    form.systemSize.value = saved.selectedSystemSize || saved.selectedSystem || "";
    updateResultUI(saved);
  } catch (_) {
    // no-op
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!window.VidyutAuth?.requireLogin()) return;

  const form = document.querySelector("#solarCalculatorForm");
  const status = document.querySelector("#calcFormStatus");
  if (!form) return;

  restoreInputs();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button[type='submit']");
    const roofArea = Number(form.availableRoofArea.value);
    const bill = Number(form.monthlyBill.value);
    const selectedSystemSize = Number(form.systemSize.value);

    if (!roofArea || !bill || roofArea < 70 || bill < 450) {
      if (status) status.textContent = "Please enter valid values (available roof area >= 70 sq ft and monthly bill >= Rs 450).";
      return;
    }

    button.disabled = true;
    button.textContent = "Calculating...";

    try {
      const res = await window.VidyutAuth.authFetch("/api/calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availableRoofArea: roofArea,
          monthlyBill: bill,
          systemSize: selectedSystemSize || "",
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload.message || "Unable to calculate right now.");
      }

      persistResult(payload.result);
      updateResultUI(payload.result);
    } catch (error) {
      if (status) status.textContent = error.message || "Unable to calculate right now.";
      if (error.message === "Please login to continue.") {
        window.VidyutAuth.redirectToLogin();
      }
    } finally {
      button.disabled = false;
      button.textContent = "Calculate";
    }
  });
});
