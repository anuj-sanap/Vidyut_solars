const FIXED_PLANS = [
  {
    systemSize: 10,
    unitsLabel: "1000-1,100",
    unitsRange: [1000, 1100],
    billLabel: "10,000-11,000",
    billRange: [10000, 11000],
    jagaLabel: "500-600 sq.ft",
    jagaRange: [500, 600],
    costLabel: "6,60,000",
    monthlySavingLabel: "9,900-10,900",
  },
  {
    systemSize: 9,
    unitsLabel: "900-1,000",
    unitsRange: [900, 1000],
    billLabel: "9,000-10,000",
    billRange: [9000, 10000],
    jagaLabel: "500-600 sq.ft",
    jagaRange: [500, 600],
    costLabel: "6,00,000",
    monthlySavingLabel: "8,900-9,900",
  },
  {
    systemSize: 8,
    unitsLabel: "800-900",
    unitsRange: [800, 900],
    billLabel: "8,000-9,000",
    billRange: [8000, 9000],
    jagaLabel: "450-500 sq.ft",
    jagaRange: [450, 500],
    costLabel: "5,40,000",
    monthlySavingLabel: "7,900-8,900",
  },
  {
    systemSize: 7,
    unitsLabel: "700-800",
    unitsRange: [700, 800],
    billLabel: "7,000-8,000",
    billRange: [7000, 8000],
    jagaLabel: "400-450 sq.ft",
    jagaRange: [400, 450],
    costLabel: "4,60,000",
    monthlySavingLabel: "6,900-7,900",
  },
  {
    systemSize: 6,
    unitsLabel: "600-700",
    unitsRange: [600, 700],
    billLabel: "6,000-7,000",
    billRange: [6000, 7000],
    jagaLabel: "350-400 sq.ft",
    jagaRange: [350, 400],
    costLabel: "4,00,000",
    monthlySavingLabel: "5,900-6,900",
  },
  {
    systemSize: 5,
    unitsLabel: "500-600",
    unitsRange: [500, 600],
    billLabel: "5,000-6,000",
    billRange: [5000, 6000],
    jagaLabel: "300-350 sq.ft",
    jagaRange: [300, 350],
    costLabel: "3,40,000",
    monthlySavingLabel: "4,900-6,900",
  },
  {
    systemSize: 4,
    unitsLabel: "400-560",
    unitsRange: [400, 560],
    billLabel: "3,500-4,500",
    billRange: [3500, 4500],
    jagaLabel: "200-250 sq.ft",
    jagaRange: [200, 250],
    costLabel: "2,80,000",
    monthlySavingLabel: "3,400-3,400",
  },
  {
    systemSize: 3,
    unitsLabel: "300-420",
    unitsRange: [300, 420],
    billLabel: "2,000-3,000",
    billRange: [2000, 3000],
    jagaLabel: "150-200 sq.ft",
    jagaRange: [150, 200],
    costLabel: "2,20,000",
    monthlySavingLabel: "1,900-2,900",
  },
  {
    systemSize: 2,
    unitsLabel: "240-280",
    unitsRange: [240, 280],
    billLabel: "1,200-1,800",
    billRange: [1200, 1800],
    jagaLabel: "100-130 sq.ft",
    jagaRange: [100, 130],
    costLabel: "1,40,000",
    monthlySavingLabel: "1,000-1,700",
  },
  {
    systemSize: 1,
    unitsLabel: "100-120",
    unitsRange: [100, 120],
    billLabel: "450-600",
    billRange: [450, 600],
    jagaLabel: "70-100 sq.ft",
    jagaRange: [70, 100],
    costLabel: "70,000",
    monthlySavingLabel: "600-900",
  },
];

function midpoint([min, max]) {
  return (min + max) / 2;
}

function valueDistance(value, [min, max]) {
  if (value < min) return min - value;
  if (value > max) return value - max;
  return 0;
}

function findBestPlan(plotSize, bill) {
  let bestPlan = FIXED_PLANS[0];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const plan of FIXED_PLANS) {
    const billDistance = valueDistance(bill, plan.billRange);
    const jagaDistance = valueDistance(plotSize, plan.jagaRange);
    const score =
      billDistance * 2 +
      jagaDistance +
      Math.abs(bill - midpoint(plan.billRange)) * 0.05 +
      Math.abs(plotSize - midpoint(plan.jagaRange)) * 0.05;

    if (score < bestScore) {
      bestScore = score;
      bestPlan = plan;
    }
  }

  return bestPlan;
}

function findPlanBySystemSize(systemSize) {
  return FIXED_PLANS.find((plan) => plan.systemSize === systemSize) || null;
}

function updateResultUI(data) {
  const resultCard = document.querySelector("#calcResults");
  const status = document.querySelector("#calcFormStatus");
  document.querySelector("#resultSystemSize").textContent = `${data.systemSize} kW`;
  document.querySelector("#resultMonthlyUnits").textContent = data.unitsLabel;
  document.querySelector("#resultBillWithoutSolar").textContent = `Rs ${data.billLabel}`;
  document.querySelector("#resultJaga").textContent = data.jagaLabel;
  document.querySelector("#resultCost").textContent = `Rs ${data.costLabel}`;
  document.querySelector("#resultSavings").textContent = `Rs ${data.monthlySavingLabel} / month`;

  const badge = document.querySelector("#recommendedBadge");
  badge.textContent = data.systemSize >= 5 ? "Recommended: High Saving Plan" : "Recommended: Starter Solar Plan";

  const waBtn = document.querySelector("#whatsappWithResults");
  const msg = [
    "Hi Vidyut Solar, I used your calculator.",
    `Plot Size: ${data.plotSize} sq.ft`,
    `Monthly Bill: Rs ${data.bill}`,
    `Recommended System: ${data.systemSize} kW`,
    `Monthly Units: ${data.unitsLabel}`,
    `Bill Without Solar: Rs ${data.billLabel}`,
    `Jaga: ${data.jagaLabel}`,
    `Estimate Cost: Rs ${data.costLabel}`,
    `Monthly Saving: Rs ${data.monthlySavingLabel}`,
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
    form.plotSize.value = saved.plotSize || "";
    form.bill.value = saved.bill || "";
    form.systemSize.value = saved.selectedSystemSize || "";
    updateResultUI(saved);
  } catch (_) {
    // no-op
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#solarCalculatorForm");
  const status = document.querySelector("#calcFormStatus");
  if (!form) return;

  restoreInputs();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const plotSize = Number(form.plotSize.value);
    const bill = Number(form.bill.value);
    const selectedSystemSize = Number(form.systemSize.value);

    if (!plotSize || !bill || plotSize < 70 || bill < 450) {
      if (status) status.textContent = "Please enter valid values (plot size >= 70 sq ft and bill >= Rs 450).";
      return;
    }

    const selectedPlan = selectedSystemSize ? findPlanBySystemSize(selectedSystemSize) : null;
    const matchedPlan = selectedPlan || findBestPlan(plotSize, bill);
    const data = {
      plotSize,
      bill,
      selectedSystemSize: selectedPlan ? selectedSystemSize : "",
      ...matchedPlan,
    };

    persistResult(data);
    updateResultUI(data);
  });
});
