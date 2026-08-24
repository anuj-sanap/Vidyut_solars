let currentCalculationData = null;
let savingsChartInstance = null;

function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function formatNumber(val) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Number(val || 0));
}

function formatKwh(kwh) {
  const num = Number(kwh || 0);
  if (num >= 10000) {
    return `${(num / 1000).toFixed(1)}k kWh`;
  }
  return `${formatNumber(num)} kWh`;
}

// ----------------------------------------------------------------------------
// PIN Lookup with Live Debounce Feedback
// ----------------------------------------------------------------------------
let pinDebounceTimer = null;

function setupPinLookup() {
  const pinInput = document.querySelector('#calc-pin');
  const pinStatus = document.querySelector('#pinStatus');
  if (!pinInput || !pinStatus) return;

  pinInput.addEventListener('input', () => {
    const cleanPin = pinInput.value.replace(/\D/g, '').slice(0, 6);
    pinInput.value = cleanPin;

    if (pinDebounceTimer) clearTimeout(pinDebounceTimer);

    if (cleanPin.length === 6) {
      pinStatus.className = 'mt-1.5 min-h-[20px] text-xs text-muted-foreground flex items-center gap-1';
      pinStatus.innerHTML = '⏳ Looking up location data...';

      pinDebounceTimer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/calculator/pincode?code=${cleanPin}`);
          const data = await res.json();
          if (res.ok && data.success && data.location) {
            const loc = data.location;
            pinStatus.className = 'mt-1.5 min-h-[20px] text-xs font-medium text-emerald-700 flex items-center gap-1';
            pinStatus.innerHTML = `✓ ${loc.city}, ${loc.state} — ${loc.discom}`;
          } else {
            pinStatus.className = 'mt-1.5 min-h-[20px] text-xs text-amber-600';
            pinStatus.textContent = "We couldn't confirm this PIN code's location — estimate will use regional defaults.";
          }
        } catch (_) {
          pinStatus.className = 'mt-1.5 min-h-[20px] text-xs text-amber-600';
          pinStatus.textContent = 'Using regional fallback energy data for calculation.';
        }
      }, 400);
    } else {
      pinStatus.innerHTML = '';
    }
  });
}

// ----------------------------------------------------------------------------
// Customer Type & Bill Mode Toggles
// ----------------------------------------------------------------------------
function setupFormToggles() {
  const btnRes = document.querySelector('#btnCustomerRes');
  const btnCom = document.querySelector('#btnCustomerCom');
  const inputCustomerType = document.querySelector('#calc-customer-type');

  if (btnRes && btnCom && inputCustomerType) {
    btnRes.addEventListener('click', () => {
      inputCustomerType.value = 'residential';
      btnRes.className = 'rounded-md py-2 text-center transition bg-card text-primary shadow-sm';
      btnCom.className = 'rounded-md py-2 text-center transition text-muted-foreground hover:text-foreground';
    });

    btnCom.addEventListener('click', () => {
      inputCustomerType.value = 'commercial';
      btnCom.className = 'rounded-md py-2 text-center transition bg-card text-primary shadow-sm';
      btnRes.className = 'rounded-md py-2 text-center transition text-muted-foreground hover:text-foreground';
    });
  }

  const btnToggleMode = document.querySelector('#btnToggleBillMode');
  const inputBillMode = document.querySelector('#calc-bill-mode');
  const lblBillOrUnits = document.querySelector('#lblBillOrUnits');
  const inputBillUnits = document.querySelector('#calc-bill-units');
  const billPrefix = document.querySelector('#billPrefix');
  const unitsSuffix = document.querySelector('#unitsSuffix');
  const billNote = document.querySelector('#billNote');

  if (btnToggleMode && inputBillMode && lblBillOrUnits && inputBillUnits) {
    btnToggleMode.addEventListener('click', () => {
      const isBill = inputBillMode.value === 'bill';
      if (isBill) {
        inputBillMode.value = 'units';
        lblBillOrUnits.textContent = 'Monthly Electricity Consumption (kWh)';
        btnToggleMode.textContent = 'Use monthly bill (₹) instead';
        inputBillUnits.placeholder = '350';
        inputBillUnits.name = 'monthlyUnits';
        billPrefix.classList.add('hidden');
        unitsSuffix.classList.remove('hidden');
        billNote.textContent = 'Units will be used directly to calculate your optimal system size.';
      } else {
        inputBillMode.value = 'bill';
        lblBillOrUnits.textContent = 'Average Monthly Electricity Bill (₹)';
        btnToggleMode.textContent = 'Use kWh units instead';
        inputBillUnits.placeholder = '4000';
        inputBillUnits.name = 'monthlyBill';
        billPrefix.classList.remove('hidden');
        unitsSuffix.classList.add('hidden');
        billNote.textContent = 'Units consumed will be estimated based on regional DISCOM slab tariffs.';
      }
    });
  }

  const chkRoofUnknown = document.querySelector('#chkRoofUnknown');
  const inputRoof = document.querySelector('#calc-roof');
  if (chkRoofUnknown && inputRoof) {
    chkRoofUnknown.addEventListener('change', () => {
      if (chkRoofUnknown.checked) {
        inputRoof.value = '';
        inputRoof.disabled = true;
      } else {
        inputRoof.disabled = false;
      }
    });
  }
}

// ----------------------------------------------------------------------------
// Render 25-Year Cumulative Savings Area Chart with Chart.js
// ----------------------------------------------------------------------------
function renderSavingsChart(yearlyProjection) {
  const canvas = document.querySelector('#savingsChartCanvas');
  if (!canvas || !yearlyProjection || !window.Chart) return;

  const ctx = canvas.getContext('2d');
  if (savingsChartInstance) {
    savingsChartInstance.destroy();
  }

  const labels = yearlyProjection.map((r) => `Y${r.year}`);
  const dataPoints = yearlyProjection.map((r) => r.cumulativeSavings);

  const gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
  gradient.addColorStop(1, 'rgba(16, 185, 129, 0.02)');

  savingsChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Cumulative Savings',
          data: dataPoints,
          borderColor: '#059669',
          borderWidth: 2.5,
          backgroundColor: gradient,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#059669',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0F172A',
          titleFont: { family: 'Manrope', size: 12, weight: 'bold' },
          bodyFont: { family: 'Manrope', size: 13 },
          padding: 10,
          displayColors: false,
          callbacks: {
            label: (ctx) => `Cumulative Savings: ${formatINR(ctx.parsed.y)}`,
            title: (items) => `Year ${items[0].label.replace('Y', '')}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Manrope', size: 11 }, color: '#64748B', maxRotation: 0 },
        },
        y: {
          border: { dash: [4, 4] },
          grid: { color: '#E2E8F0' },
          ticks: {
            font: { family: 'Manrope', size: 11 },
            color: '#64748B',
            callback: (v) => `₹${Math.round(v / 100000)}L`,
          },
        },
      },
    },
  });
}

// ----------------------------------------------------------------------------
// Render Calculation Results UI
// ----------------------------------------------------------------------------
function updateCalculatorResultsUI(output) {
  currentCalculationData = output;

  const placeholder = document.querySelector('#calcPlaceholder');
  const resultsContainer = document.querySelector('#calcResults');

  if (placeholder) placeholder.classList.add('hidden');
  if (resultsContainer) resultsContainer.classList.remove('hidden');

  const { location, solar, financial, environmental, warnings, electricity } = output;

  // Hero Card
  document.querySelector('#resLocationLabel').textContent = `${location.city}, ${location.state} • ${location.discom}`;
  document.querySelector('#resKwNumber').textContent = solar.recommendedKw;
  document.querySelector('#resPanelInfo').textContent = `${solar.panelCount} × ${solar.panelWattage}W solar panels`;
  document.querySelector('#resConsumptionInfo').textContent = `${electricity.isEstimatedFromBill ? 'Estimated' : 'Reported'} Consumption: ${electricity.monthlyUnitsEstimated} units/month`;

  // Warnings
  const warningBox = document.querySelector('#resWarningBox');
  const warningText = document.querySelector('#resWarningText');
  if (warnings && warnings.length > 0) {
    warningText.textContent = warnings[0];
    warningBox.classList.remove('hidden');
  } else {
    warningBox.classList.add('hidden');
  }

  // Quick Stats
  document.querySelector('#statRoofArea').textContent = `~${solar.estimatedRoofAreaSqft} sq.ft`;
  document.querySelector('#statAnnualGen').textContent = formatKwh(solar.annualGenerationKwh);
  document.querySelector('#statAnnualSavings').textContent = formatINR(financial.annualSavings);
  document.querySelector('#statMonthlySavings').textContent = formatINR(financial.monthlySavings);

  // Investment Snapshot
  document.querySelector('#resGrossCost').textContent = formatINR(financial.grossCost);
  document.querySelector('#resSubsidy').textContent = financial.subsidyAmount > 0 ? `-${formatINR(financial.subsidyAmount)}` : '₹0';
  document.querySelector('#resNetInvestment').textContent = formatINR(financial.netInvestment);
  document.querySelector('#resPayback').textContent = `${financial.paybackYears} years`;

  // 25-Year Savings Chart
  document.querySelector('#chartTotalSavings').textContent = formatINR(financial.twentyFiveYearSavings);
  renderSavingsChart(financial.yearlyProjection);

  // Environmental Impact
  document.querySelector('#envCo2').textContent = `${environmental.co2AvoidedTonnesAnnual} tonnes/year`;
  document.querySelector('#envTrees').textContent = `${formatNumber(environmental.equivalentTrees)} trees`;
  document.querySelector('#envKm').textContent = `${formatNumber(environmental.equivalentVehicleKm)} km`;

  // WhatsApp Share Button
  const waBtn = document.querySelector('#btnWhatsappShare');
  if (waBtn) {
    const msg = [
      'Hi Vidyut PowerTech, I used your solar calculator.',
      `Location: ${location.city}, ${location.state} (${location.pinCode || ''})`,
      `Recommended System: ${solar.recommendedKw} kW`,
      `Annual Savings: ${formatINR(financial.annualSavings)}`,
      `Net Investment: ${formatINR(financial.netInvestment)}`,
      `Payback: ${financial.paybackYears} years`,
    ].join('\n');
    waBtn.href = `https://wa.me/917558200928?text=${encodeURIComponent(msg)}`;
  }
}

// ----------------------------------------------------------------------------
// Form Submission & Calculation Request
// ----------------------------------------------------------------------------
function setupFormSubmission() {
  const form = document.querySelector('#solarCalculatorForm');
  const status = document.querySelector('#calcFormStatus');
  const btnCalculate = document.querySelector('#btnCalculate');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const pinCode = document.querySelector('#calc-pin')?.value.trim() || '';
    const customerType = document.querySelector('#calc-customer-type')?.value || 'residential';
    const billMode = document.querySelector('#calc-bill-mode')?.value || 'bill';
    const billUnitsVal = Number(document.querySelector('#calc-bill-units')?.value || 0);
    const roofAreaVal = Number(document.querySelector('#calc-roof')?.value || 0);
    const roofUnknown = document.querySelector('#chkRoofUnknown')?.checked || false;
    const systemSizeVal = document.querySelector('#calc-system-size')?.value || '';

    if (!pinCode || pinCode.length !== 6) {
      if (status) status.textContent = 'Please enter a valid 6-digit PIN code.';
      return;
    }

    if (!billUnitsVal || billUnitsVal <= 0) {
      if (status) status.textContent = `Please enter your ${billMode === 'bill' ? 'monthly electricity bill' : 'monthly consumption'}.`;
      return;
    }

    if (status) status.textContent = '';
    btnCalculate.disabled = true;
    btnCalculate.textContent = 'Analyzing electricity & solar data...';

    const payload = {
      pinCode,
      customerType,
      billMode,
      monthlyBill: billMode === 'bill' ? billUnitsVal : undefined,
      monthlyUnits: billMode === 'units' ? billUnitsVal : undefined,
      roofArea: roofUnknown ? undefined : roofAreaVal,
      roofAreaUnknown: roofUnknown,
      systemSize: systemSizeVal,
    };

    try {
      const res = await fetch('/api/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Calculation failed. Please check your inputs.');
      }

      updateCalculatorResultsUI(data.data || data.result);
      localStorage.setItem('solarCalculatorResult', JSON.stringify(payload));
    } catch (err) {
      if (status) status.textContent = err.message || 'Unable to calculate right now. Please try again.';
    } finally {
      btnCalculate.disabled = false;
      btnCalculate.textContent = 'Calculate My Solar Savings';
    }
  });
}

// ----------------------------------------------------------------------------
// Lead Quote Modal
// ----------------------------------------------------------------------------
function setupLeadModal() {
  const modal = document.querySelector('#leadModal');
  const btnOpen = document.querySelector('#btnOpenLeadModal');
  const btnClose = document.querySelector('#btnCloseLeadModal');
  const form = document.querySelector('#leadQuoteForm');
  const modalStatus = document.querySelector('#leadModalStatus');

  if (!modal) return;

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      modal.classList.remove('hidden');
    });
  }

  if (btnClose) {
    btnClose.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.querySelector('#modal-name')?.value.trim();
      const phone = document.querySelector('#modal-phone')?.value.trim();
      const email = document.querySelector('#modal-email')?.value.trim();
      const contactMethod = document.querySelector('input[name="modalContactMethod"]:checked')?.value || 'whatsapp';
      const pinCode = document.querySelector('#calc-pin')?.value.trim() || '';

      if (!name || name.length < 2) {
        if (modalStatus) {
          modalStatus.className = 'text-xs text-center text-destructive mt-2';
          modalStatus.textContent = 'Please enter your full name.';
        }
        return;
      }

      if (!phone || phone.length < 10) {
        if (modalStatus) {
          modalStatus.className = 'text-xs text-center text-destructive mt-2';
          modalStatus.textContent = 'Please enter a valid 10-digit phone number.';
        }
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting Quote Request...';
      }

      try {
        const res = await fetch('/api/calculator/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            phone,
            email,
            pinCode,
            preferredContactMethod: contactMethod,
            calculation: currentCalculationData,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to submit quote request.');
        }

        if (modalStatus) {
          modalStatus.className = 'text-xs text-center text-emerald-700 font-semibold mt-2';
          modalStatus.textContent = '✓ Quote request received! A solar expert will contact you shortly.';
        }

        setTimeout(() => {
          modal.classList.add('hidden');
          form.reset();
          if (modalStatus) modalStatus.textContent = '';
        }, 2200);
      } catch (err) {
        if (modalStatus) {
          modalStatus.className = 'text-xs text-center text-destructive mt-2';
          modalStatus.textContent = err.message || 'Unable to submit request right now.';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Quote Request';
        }
      }
    });
  }
}

// ----------------------------------------------------------------------------
// Initialization
// ----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  setupPinLookup();
  setupFormToggles();
  setupFormSubmission();
  setupLeadModal();
});
