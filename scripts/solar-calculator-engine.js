const {
  getTariffs,
  getSolarPackages,
  getSubsidyRules,
  getFinanceConfig,
  getAssumptions,
  getStateEnergyConfig,
  getDistrictOverrides,
  getLocations,
} = require('../data/solar-config');

const INDIA_POST_API = 'https://api.postalpincode.in/pincode';

/**
 * Fetch PIN code postal details from India Post API with timeout.
 */
async function fetchPostalDetails(pinCode) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${INDIA_POST_API}/${pinCode}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = await res.json();
    const first = data?.[0];
    if (!first || first.Status !== 'Success' || !first.PostOffice || first.PostOffice.length === 0) {
      return null;
    }
    return first.PostOffice[0];
  } catch (_) {
    return null;
  }
}

/**
 * Resolve a PIN code to location, DISCOM & generation factor.
 */
async function resolvePinCode(pinCode) {
  const postal = await fetchPostalDetails(pinCode);

  if (postal) {
    const [districtOverrides, stateConfig] = await Promise.all([
      getDistrictOverrides(),
      getStateEnergyConfig(),
    ]);

    const override = districtOverrides.find(
      (d) =>
        d.district.toLowerCase() === postal.District.toLowerCase() &&
        d.state.toLowerCase() === postal.State.toLowerCase(),
    );
    if (override) {
      return {
        pinCode,
        city: postal.Name,
        district: postal.District,
        state: postal.State,
        discom: override.discom,
        generationFactor: override.generationFactor,
        source: 'district_override',
      };
    }

    const stateMatch = stateConfig.find(
      (s) => s.state.toLowerCase() === postal.State.toLowerCase(),
    );
    if (stateMatch) {
      return {
        pinCode,
        city: postal.Name,
        district: postal.District,
        state: postal.State,
        discom: stateMatch.discom,
        generationFactor: stateMatch.generationFactor,
        source: 'state_config',
      };
    }

    return null;
  }

  // Fallback to static PIN prefix table if postal API is down
  const fallbackLocations = await getLocations();
  const prefix3 = String(pinCode).slice(0, 3);
  const fallback = fallbackLocations.find((l) => l.pinPrefix === prefix3);
  if (!fallback) return null;

  return {
    pinCode,
    city: fallback.city,
    district: fallback.district,
    state: fallback.state,
    discom: fallback.discom,
    generationFactor: fallback.generationFactor,
    source: 'static_fallback',
  };
}

/**
 * Estimate monthly units from monthly bill using slab tariffs.
 */
function estimateUnitsFromBill(monthlyBill, slabs) {
  if (!slabs || slabs.length === 0 || monthlyBill <= 0) return 0;

  const sorted = [...slabs].sort((a, b) => a.slabMin - b.slabMin);
  const fixedCharge = sorted[0].fixedCharge || 0;
  const billForEnergy = Math.max(monthlyBill - fixedCharge, 0);

  let remainingBill = billForEnergy;
  let units = 0;

  for (const slab of sorted) {
    const slabMax = slab.slabMax ?? Infinity;
    const slabSize = slabMax - slab.slabMin;
    const slabCost = slabSize === Infinity ? Infinity : slabSize * slab.energyRate;

    if (remainingBill <= 0) break;

    if (remainingBill <= slabCost || slabCost === Infinity) {
      units += remainingBill / slab.energyRate;
      remainingBill = 0;
      break;
    } else {
      units += slabSize;
      remainingBill -= slabCost;
    }
  }

  return Math.max(units, 0);
}

/**
 * Compute blended energy rate per unit.
 */
function computeEffectiveRate(monthlyUnits, slabs) {
  if (!slabs || slabs.length === 0 || monthlyUnits <= 0) return 0;
  const sorted = [...slabs].sort((a, b) => a.slabMin - b.slabMin);

  let remainingUnits = monthlyUnits;
  let totalEnergyCost = 0;

  for (const slab of sorted) {
    if (remainingUnits <= 0) break;
    const slabMax = slab.slabMax ?? Infinity;
    const slabSize = slabMax - slab.slabMin;
    const unitsInSlab = Math.min(remainingUnits, slabSize);
    totalEnergyCost += unitsInSlab * slab.energyRate;
    remainingUnits -= unitsInSlab;
  }

  return totalEnergyCost / monthlyUnits;
}

/**
 * Select optimal solar package.
 */
function selectPackage(requiredKw, packages, requestedSize) {
  const sorted = [...packages].sort((a, b) => a.systemKw - b.systemKw);
  if (requestedSize && Number(requestedSize) > 0) {
    const exact = sorted.find((p) => p.systemKw === Number(requestedSize));
    if (exact) return exact;
  }
  const match = sorted.find((p) => p.systemKw >= requiredKw);
  return match ?? sorted[sorted.length - 1] ?? null;
}

/**
 * Compute PM Surya Ghar subsidy amount.
 */
function computeSubsidy(systemKw, customerType, rules) {
  if (customerType === 'commercial') return 0;
  const applicable = rules.find(
    (r) => r.customerType === customerType && systemKw >= r.minKw && systemKw <= r.maxKw,
  );
  if (!applicable) return 0;

  const raw = systemKw * applicable.ratePerKw;
  return Math.min(raw, applicable.maximumSubsidy);
}

/**
 * Compute loan monthly EMI.
 */
function calculateEMI(principal, annualInterestRatePercent, tenureMonths) {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  const r = annualInterestRatePercent / 12 / 100;
  if (r === 0) return principal / tenureMonths;
  const factor = Math.pow(1 + r, tenureMonths);
  return (principal * r * factor) / (factor - 1);
}

/**
 * Build 25-Year cumulative savings projection.
 */
function buildYearlyProjection(params) {
  const {
    firstYearGenerationKwh,
    firstYearBlendedRate,
    degradationRate,
    tariffGrowthRate,
    projectLifeYears,
  } = params;

  const rows = [];
  let cumulative = 0;

  for (let n = 1; n <= projectLifeYears; n++) {
    const generation = firstYearGenerationKwh * Math.pow(1 - degradationRate, n - 1);
    const tariff = firstYearBlendedRate * Math.pow(1 + tariffGrowthRate, n - 1);
    const savings = generation * tariff;
    cumulative += savings;
    rows.push({
      year: n,
      generationKwh: Math.round(generation),
      tariffPerUnit: Math.round(tariff * 100) / 100,
      annualSavings: Math.round(savings),
      cumulativeSavings: Math.round(cumulative),
    });
  }

  return rows;
}

/**
 * Compute payback period in years.
 */
function computePaybackYears(netInvestment, yearlyRows) {
  if (netInvestment <= 0) return 0;
  let cumulative = 0;
  for (let i = 0; i < yearlyRows.length; i++) {
    const prevCumulative = cumulative;
    cumulative += yearlyRows[i].annualSavings;
    if (cumulative >= netInvestment) {
      const yearStart = i;
      const neededThisYear = netInvestment - prevCumulative;
      const fraction = yearlyRows[i].annualSavings > 0 ? neededThisYear / yearlyRows[i].annualSavings : 1;
      return yearStart + fraction;
    }
  }
  return yearlyRows.length;
}

/**
 * Main solar estimate entry point.
 */
async function calculateSolarEstimate(input) {
  const warnings = [];

  // 1. PIN & Location
  let location = null;
  if (input.pinCode && String(input.pinCode).length === 6) {
    location = await resolvePinCode(String(input.pinCode));
  }

  // Fallback to Nashik if PIN resolution fails or is not supplied
  if (!location) {
    location = {
      pinCode: input.pinCode || '422001',
      city: 'Nashik',
      district: 'Nashik',
      state: 'Maharashtra',
      discom: 'MSEDCL',
      generationFactor: 1460,
      source: 'default_fallback',
    };
  }

  const [allTariffs, allPackages, subsidyRules, financeConfig, assumptions] = await Promise.all([
    getTariffs(),
    getSolarPackages(),
    getSubsidyRules(),
    getFinanceConfig(),
    getAssumptions(),
  ]);

  const applicableTariffs = allTariffs.filter(
    (t) => t.discom === location.discom && t.customerType === (input.customerType || 'residential'),
  );

  // Fallback to MSEDCL tariffs if DISCOM specific tariff isn't found
  const activeTariffs = applicableTariffs.length > 0 ? applicableTariffs : allTariffs.filter((t) => t.customerType === (input.customerType || 'residential'));

  // 2. Consumption
  let monthlyUnitsEstimated = 0;
  let isEstimatedFromBill = false;

  if (input.billMode === 'units' || input.monthlyUnits) {
    monthlyUnitsEstimated = Number(input.monthlyUnits || input.units || 0);
    isEstimatedFromBill = false;
  } else {
    const bill = Number(input.monthlyBill || input.bill || input.electricityBill || 0);
    monthlyUnitsEstimated = estimateUnitsFromBill(bill, activeTariffs);
    isEstimatedFromBill = true;
  }

  if (monthlyUnitsEstimated <= 0) {
    monthlyUnitsEstimated = 300; // sensible default
  }

  const annualUnits = monthlyUnitsEstimated * 12;
  const effectiveRatePerUnit = computeEffectiveRate(monthlyUnitsEstimated, activeTariffs) || 7.5;

  // 3. Required capacity & package
  const requiredKwRaw = annualUnits / location.generationFactor;
  const selectedPackage = selectPackage(requiredKwRaw, allPackages, input.systemSize || input.selectedSystemSize);

  const recommendedKw = selectedPackage.systemKw;
  const annualGenerationKwh = recommendedKw * location.generationFactor;
  const monthlyGenerationKwh = annualGenerationKwh / 12;

  // 4. Roof area check
  let roofAreaSufficient = null;
  const roofAreaInput = Number(input.roofArea || input.availableRoofArea || input.plotSize || 0);
  if (!input.roofAreaUnknown && roofAreaInput > 0) {
    roofAreaSufficient = roofAreaInput >= selectedPackage.estimatedRoofAreaSqft;
    if (!roofAreaSufficient) {
      warnings.push(
        'Your electricity usage suggests a larger solar system, but your available roof area may limit the installation size. A site survey is recommended.',
      );
    }
  }

  // 5. Savings
  const selfConsumedShare = assumptions.selfConsumptionRatio;
  const exportedShare = 1 - selfConsumedShare;
  const blendedRate =
    effectiveRatePerUnit * selfConsumedShare + effectiveRatePerUnit * assumptions.exportRateMultiplier * exportedShare;

  const annualSavings = annualGenerationKwh * blendedRate;
  const monthlySavings = annualSavings / 12;

  // 6. Cost & Subsidy
  const grossCost = selectedPackage.basePrice + selectedPackage.installationCost + selectedPackage.structureCost;
  const subsidyAmount = computeSubsidy(recommendedKw, input.customerType || 'residential', subsidyRules);
  const netInvestment = Math.max(grossCost - subsidyAmount, 0);

  // 7. EMI
  const tenure = Number(input.loanTenureMonths) || 36;
  const emiMonthly = calculateEMI(netInvestment, financeConfig.interestRateAnnual, tenure);

  // 8. 25-Year Projection & Payback
  const yearlyProjection = buildYearlyProjection({
    firstYearGenerationKwh: annualGenerationKwh,
    firstYearBlendedRate: blendedRate,
    degradationRate: assumptions.annualDegradationRate,
    tariffGrowthRate: assumptions.annualTariffGrowthRate,
    projectLifeYears: assumptions.projectLifeYears,
  });

  const paybackYears = computePaybackYears(netInvestment, yearlyProjection);
  const twentyFiveYearSavings = yearlyProjection[yearlyProjection.length - 1]?.cumulativeSavings ?? 0;

  // 9. Environmental
  const co2AvoidedTonnesAnnual = (annualGenerationKwh * assumptions.gridEmissionFactorKgPerKwh) / 1000;
  const lifetimeGenerationKwh = yearlyProjection.reduce((sum, r) => sum + r.generationKwh, 0);
  const co2AvoidedTonnesLifetime = (lifetimeGenerationKwh * assumptions.gridEmissionFactorKgPerKwh) / 1000;
  const equivalentTrees = Math.round((co2AvoidedTonnesAnnual * 1000) / assumptions.treesEquivalentKgPerTree);
  const equivalentVehicleKm = Math.round((co2AvoidedTonnesAnnual * 1000) / 0.12);

  return {
    location: {
      city: location.city,
      district: location.district,
      state: location.state,
      discom: location.discom,
      generationFactor: location.generationFactor,
    },
    electricity: {
      monthlyUnitsEstimated: Math.round(monthlyUnitsEstimated),
      annualUnits: Math.round(annualUnits),
      isEstimatedFromBill,
      effectiveRatePerUnit: Math.round(effectiveRatePerUnit * 100) / 100,
    },
    solar: {
      recommendedKw,
      requiredKwRaw: Math.round(requiredKwRaw * 100) / 100,
      panelCount: selectedPackage.panelCount,
      panelWattage: selectedPackage.panelWattage,
      estimatedRoofAreaSqft: selectedPackage.estimatedRoofAreaSqft,
      roofAreaSufficient,
      annualGenerationKwh: Math.round(annualGenerationKwh),
      monthlyGenerationKwh: Math.round(monthlyGenerationKwh),
      selectedPackage,
    },
    financial: {
      systemCost: selectedPackage.basePrice,
      installationCost: selectedPackage.installationCost,
      structureCost: selectedPackage.structureCost,
      grossCost: Math.round(grossCost),
      subsidyAmount: Math.round(subsidyAmount),
      netInvestment: Math.round(netInvestment),
      monthlySavings: Math.round(monthlySavings),
      annualSavings: Math.round(annualSavings),
      emiMonthly: Math.round(emiMonthly),
      loanTenureMonths: tenure,
      paybackYears: Math.round(paybackYears * 10) / 10,
      twentyFiveYearSavings: Math.round(twentyFiveYearSavings),
      yearlyProjection,
    },
    environmental: {
      co2AvoidedTonnesAnnual: Math.round(co2AvoidedTonnesAnnual * 10) / 10,
      co2AvoidedTonnesLifetime: Math.round(co2AvoidedTonnesLifetime * 10) / 10,
      equivalentTrees,
      equivalentVehicleKm,
    },
    warnings,
  };
}

module.exports = {
  resolvePinCode,
  calculateSolarEstimate,
};
