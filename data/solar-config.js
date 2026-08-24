// ============================================================================
// CENTRAL CONFIGURATION / DATA LAYER FOR SOLAR CALCULATOR
// ============================================================================

const STATE_ENERGY_CONFIG = [
  { id: 'st-mh', state: 'Maharashtra', discom: 'MSEDCL', generationFactor: 1450, active: true },
  { id: 'st-gj', state: 'Gujarat', discom: 'Torrent Power / UGVCL', generationFactor: 1520, active: true },
  { id: 'st-ka', state: 'Karnataka', discom: 'BESCOM', generationFactor: 1470, active: true },
  { id: 'st-dl', state: 'Delhi', discom: 'BSES / Tata Power Delhi', generationFactor: 1400, active: true },
  { id: 'st-tg', state: 'Telangana', discom: 'TSSPDCL', generationFactor: 1500, active: true },
  { id: 'st-tn', state: 'Tamil Nadu', discom: 'TANGEDCO', generationFactor: 1460, active: true },
  { id: 'st-wb', state: 'West Bengal', discom: 'WBSEDCL', generationFactor: 1350, active: true },
  { id: 'st-rj', state: 'Rajasthan', discom: 'JVVNL / AVVNL / JDVVNL', generationFactor: 1580, active: true },
  { id: 'st-up', state: 'Uttar Pradesh', discom: 'UPPCL', generationFactor: 1470, active: true },
  { id: 'st-mp', state: 'Madhya Pradesh', discom: 'MPPKVVCL / MPMKVVCL / MPPoWERCL', generationFactor: 1530, active: true },
  { id: 'st-pb', state: 'Punjab', discom: 'PSPCL', generationFactor: 1420, active: true },
  { id: 'st-hr', state: 'Haryana', discom: 'DHBVN / UHBVN', generationFactor: 1450, active: true },
  { id: 'st-br', state: 'Bihar', discom: 'NBPDCL / SBPDCL', generationFactor: 1400, active: true },
  { id: 'st-or', state: 'Odisha', discom: 'TPCODL / TPWODL / TPNODL / TPSODL', generationFactor: 1440, active: true },
  { id: 'st-kl', state: 'Kerala', discom: 'KSEB', generationFactor: 1330, active: true },
  { id: 'st-as', state: 'Assam', discom: 'APDCL', generationFactor: 1280, active: true },
  { id: 'st-jh', state: 'Jharkhand', discom: 'JBVNL', generationFactor: 1420, active: true },
  { id: 'st-ct', state: 'Chhattisgarh', discom: 'CSPDCL', generationFactor: 1490, active: true },
  { id: 'st-uk', state: 'Uttarakhand', discom: 'UPCL', generationFactor: 1400, active: true },
  { id: 'st-hp', state: 'Himachal Pradesh', discom: 'HPSEBL', generationFactor: 1440, active: true },
  { id: 'st-jk', state: 'Jammu and Kashmir', discom: 'JKPDD', generationFactor: 1350, active: true },
  { id: 'st-go', state: 'Goa', discom: 'Goa Electricity Department', generationFactor: 1400, active: true },
  { id: 'st-tr', state: 'Tripura', discom: 'TSECL', generationFactor: 1300, active: true },
  { id: 'st-ml', state: 'Meghalaya', discom: 'MePDCL', generationFactor: 1250, active: true },
  { id: 'st-mn', state: 'Manipur', discom: 'MSPDCL', generationFactor: 1280, active: true },
  { id: 'st-mz', state: 'Mizoram', discom: 'P&E Department Mizoram', generationFactor: 1300, active: true },
  { id: 'st-nl', state: 'Nagaland', discom: 'Dept. of Power Nagaland', generationFactor: 1300, active: true },
  { id: 'st-sk', state: 'Sikkim', discom: 'Energy & Power Dept. Sikkim', generationFactor: 1350, active: true },
  { id: 'st-ar', state: 'Arunachal Pradesh', discom: 'Dept. of Power Arunachal Pradesh', generationFactor: 1350, active: true },
  { id: 'st-ap', state: 'Andhra Pradesh', discom: 'APSPDCL / APEPDCL', generationFactor: 1510, active: true },
  { id: 'st-py', state: 'Puducherry', discom: 'Puducherry Electricity Dept.', generationFactor: 1460, active: true },
  { id: 'st-ch', state: 'Chandigarh', discom: 'Chandigarh Electricity Dept.', generationFactor: 1420, active: true },
  { id: 'st-an', state: 'Andaman and Nicobar Islands', discom: 'Electricity Dept. A&N', generationFactor: 1450, active: true },
  { id: 'st-dn', state: 'Dadra and Nagar Haveli and Daman and Diu', discom: 'DNH Power Distribution', generationFactor: 1500, active: true },
  { id: 'st-la', state: 'Ladakh', discom: 'Ladakh Power Development Dept.', generationFactor: 1550, active: true },
];

const DISTRICT_OVERRIDES = [
  { id: 'do-nashik', district: 'Nashik', state: 'Maharashtra', discom: 'MSEDCL', generationFactor: 1460, active: true },
  { id: 'do-mumbai', district: 'Mumbai', state: 'Maharashtra', discom: 'BEST / Adani Electricity', generationFactor: 1380, active: true },
  { id: 'do-mumbai-suburban', district: 'Mumbai Suburban', state: 'Maharashtra', discom: 'Adani Electricity', generationFactor: 1380, active: true },
  { id: 'do-pune', district: 'Pune', state: 'Maharashtra', discom: 'MSEDCL', generationFactor: 1450, active: true },
  { id: 'do-blr-urban', district: 'Bengaluru Urban', state: 'Karnataka', discom: 'BESCOM', generationFactor: 1470, active: true },
  { id: 'do-chennai', district: 'Chennai', state: 'Tamil Nadu', discom: 'TANGEDCO', generationFactor: 1460, active: true },
  { id: 'do-hyderabad', district: 'Hyderabad', state: 'Telangana', discom: 'TSSPDCL', generationFactor: 1500, active: true },
  { id: 'do-kolkata', district: 'Kolkata', state: 'West Bengal', discom: 'CESC', generationFactor: 1350, active: true },
  { id: 'do-ahmedabad', district: 'Ahmedabad', state: 'Gujarat', discom: 'Torrent Power', generationFactor: 1520, active: true },
  { id: 'do-surat', district: 'Surat', state: 'Gujarat', discom: 'Torrent Power', generationFactor: 1530, active: true },
  { id: 'do-jaipur', district: 'Jaipur', state: 'Rajasthan', discom: 'JVVNL', generationFactor: 1580, active: true },
  { id: 'do-noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh', discom: 'Paschimanchal Vidyut Vitran Nigam (PVVNL)', generationFactor: 1470, active: true },
  { id: 'do-gurugram', district: 'Gurugram', state: 'Haryana', discom: 'DHBVN', generationFactor: 1450, active: true },
];

const LOCATIONS = [
  { id: 'loc-422', pinPrefix: '422', city: 'Nashik', district: 'Nashik', state: 'Maharashtra', discom: 'MSEDCL', generationFactor: 1460, active: true },
  { id: 'loc-411', pinPrefix: '411', city: 'Pune', district: 'Pune', state: 'Maharashtra', discom: 'MSEDCL', generationFactor: 1450, active: true },
  { id: 'loc-400', pinPrefix: '400', city: 'Mumbai', district: 'Mumbai', state: 'Maharashtra', discom: 'BEST / Adani Electricity', generationFactor: 1380, active: true },
  { id: 'loc-380', pinPrefix: '380', city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', discom: 'Torrent Power', generationFactor: 1520, active: true },
  { id: 'loc-560', pinPrefix: '560', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', discom: 'BESCOM', generationFactor: 1470, active: true },
  { id: 'loc-110', pinPrefix: '110', city: 'New Delhi', district: 'New Delhi', state: 'Delhi', discom: 'BSES / Tata Power Delhi', generationFactor: 1400, active: true },
  { id: 'loc-500', pinPrefix: '500', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', discom: 'TSSPDCL', generationFactor: 1500, active: true },
  { id: 'loc-600', pinPrefix: '600', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', discom: 'TANGEDCO', generationFactor: 1460, active: true },
  { id: 'loc-700', pinPrefix: '700', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal', discom: 'CESC', generationFactor: 1350, active: true },
  { id: 'loc-302', pinPrefix: '302', city: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', discom: 'JVVNL', generationFactor: 1580, active: true },
];

const TARIFFS = [
  // MSEDCL - Residential
  { id: 't-msedcl-res-1', discom: 'MSEDCL', customerType: 'residential', slabMin: 0, slabMax: 100, energyRate: 4.71, fixedCharge: 120, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-msedcl-res-2', discom: 'MSEDCL', customerType: 'residential', slabMin: 101, slabMax: 300, energyRate: 7.65, fixedCharge: 150, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-msedcl-res-3', discom: 'MSEDCL', customerType: 'residential', slabMin: 301, slabMax: null, energyRate: 10.49, fixedCharge: 200, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  // MSEDCL - Commercial
  { id: 't-msedcl-com-1', discom: 'MSEDCL', customerType: 'commercial', slabMin: 0, slabMax: 200, energyRate: 9.8, fixedCharge: 350, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-msedcl-com-2', discom: 'MSEDCL', customerType: 'commercial', slabMin: 201, slabMax: null, energyRate: 12.4, fixedCharge: 450, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  // BEST / Adani - Residential
  { id: 't-best-res-1', discom: 'BEST / Adani Electricity', customerType: 'residential', slabMin: 0, slabMax: 100, energyRate: 4.4, fixedCharge: 110, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-best-res-2', discom: 'BEST / Adani Electricity', customerType: 'residential', slabMin: 101, slabMax: 300, energyRate: 7.2, fixedCharge: 140, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-best-res-3', discom: 'BEST / Adani Electricity', customerType: 'residential', slabMin: 301, slabMax: null, energyRate: 9.9, fixedCharge: 190, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-best-com-1', discom: 'BEST / Adani Electricity', customerType: 'commercial', slabMin: 0, slabMax: null, energyRate: 11.5, fixedCharge: 400, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  // Torrent Power - Ahmedabad
  { id: 't-torrent-res-1', discom: 'Torrent Power', customerType: 'residential', slabMin: 0, slabMax: 200, energyRate: 4.0, fixedCharge: 100, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-torrent-res-2', discom: 'Torrent Power', customerType: 'residential', slabMin: 201, slabMax: null, energyRate: 6.8, fixedCharge: 130, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-torrent-com-1', discom: 'Torrent Power', customerType: 'commercial', slabMin: 0, slabMax: null, energyRate: 9.2, fixedCharge: 350, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  // BESCOM - Bengaluru
  { id: 't-bescom-res-1', discom: 'BESCOM', customerType: 'residential', slabMin: 0, slabMax: 100, energyRate: 5.1, fixedCharge: 120, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-bescom-res-2', discom: 'BESCOM', customerType: 'residential', slabMin: 101, slabMax: 300, energyRate: 7.4, fixedCharge: 150, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-bescom-res-3', discom: 'BESCOM', customerType: 'residential', slabMin: 301, slabMax: null, energyRate: 8.9, fixedCharge: 190, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-bescom-com-1', discom: 'BESCOM', customerType: 'commercial', slabMin: 0, slabMax: null, energyRate: 10.8, fixedCharge: 400, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  // BSES / Tata Power Delhi
  { id: 't-bses-res-1', discom: 'BSES / Tata Power Delhi', customerType: 'residential', slabMin: 0, slabMax: 200, energyRate: 3.9, fixedCharge: 100, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-bses-res-2', discom: 'BSES / Tata Power Delhi', customerType: 'residential', slabMin: 201, slabMax: 400, energyRate: 6.6, fixedCharge: 140, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-bses-res-3', discom: 'BSES / Tata Power Delhi', customerType: 'residential', slabMin: 401, slabMax: null, energyRate: 7.9, fixedCharge: 190, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-bses-com-1', discom: 'BSES / Tata Power Delhi', customerType: 'commercial', slabMin: 0, slabMax: null, energyRate: 9.5, fixedCharge: 350, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  // TSSPDCL - Hyderabad
  { id: 't-tsspdcl-res-1', discom: 'TSSPDCL', customerType: 'residential', slabMin: 0, slabMax: 200, energyRate: 4.5, fixedCharge: 100, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-tsspdcl-res-2', discom: 'TSSPDCL', customerType: 'residential', slabMin: 201, slabMax: null, energyRate: 7.5, fixedCharge: 150, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-tsspdcl-com-1', discom: 'TSSPDCL', customerType: 'commercial', slabMin: 0, slabMax: null, energyRate: 9.9, fixedCharge: 380, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  // TANGEDCO - Chennai
  { id: 't-tangedco-res-1', discom: 'TANGEDCO', customerType: 'residential', slabMin: 0, slabMax: 200, energyRate: 3.5, fixedCharge: 90, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-tangedco-res-2', discom: 'TANGEDCO', customerType: 'residential', slabMin: 201, slabMax: null, energyRate: 6.9, fixedCharge: 130, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-tangedco-com-1', discom: 'TANGEDCO', customerType: 'commercial', slabMin: 0, slabMax: null, energyRate: 9.0, fixedCharge: 340, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  // CESC - Kolkata
  { id: 't-cesc-res-1', discom: 'CESC', customerType: 'residential', slabMin: 0, slabMax: 150, energyRate: 6.5, fixedCharge: 130, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-cesc-res-2', discom: 'CESC', customerType: 'residential', slabMin: 151, slabMax: null, energyRate: 8.7, fixedCharge: 170, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-cesc-com-1', discom: 'CESC', customerType: 'commercial', slabMin: 0, slabMax: null, energyRate: 10.9, fixedCharge: 380, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  // JVVNL - Jaipur
  { id: 't-jvvnl-res-1', discom: 'JVVNL', customerType: 'residential', slabMin: 0, slabMax: 200, energyRate: 5.95, fixedCharge: 110, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-jvvnl-res-2', discom: 'JVVNL', customerType: 'residential', slabMin: 201, slabMax: null, energyRate: 7.35, fixedCharge: 150, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
  { id: 't-jvvnl-com-1', discom: 'JVVNL', customerType: 'commercial', slabMin: 0, slabMax: null, energyRate: 9.6, fixedCharge: 360, effectiveFrom: '2025-04-01', effectiveTo: null, active: true },
];

const SOLAR_PACKAGES = [
  { id: 'pkg-1kw', systemKw: 1, panelWattage: 550, panelCount: 2, inverterCapacityKw: 1, estimatedRoofAreaSqft: 80, basePrice: 80000, installationCost: 0, structureCost: 0, warrantyYears: 10, active: true },
  { id: 'pkg-2kw', systemKw: 2, panelWattage: 550, panelCount: 4, inverterCapacityKw: 2, estimatedRoofAreaSqft: 160, basePrice: 150000, installationCost: 0, structureCost: 0, warrantyYears: 10, active: true },
  { id: 'pkg-3kw', systemKw: 3, panelWattage: 550, panelCount: 6, inverterCapacityKw: 3, estimatedRoofAreaSqft: 240, basePrice: 220000, installationCost: 0, structureCost: 0, warrantyYears: 10, active: true },
  { id: 'pkg-4kw', systemKw: 4, panelWattage: 550, panelCount: 8, inverterCapacityKw: 4, estimatedRoofAreaSqft: 320, basePrice: 250000, installationCost: 0, structureCost: 0, warrantyYears: 10, active: true },
  { id: 'pkg-5kw', systemKw: 5, panelWattage: 550, panelCount: 10, inverterCapacityKw: 5, estimatedRoofAreaSqft: 400, basePrice: 290000, installationCost: 0, structureCost: 0, warrantyYears: 10, active: true },
  { id: 'pkg-6kw', systemKw: 6, panelWattage: 550, panelCount: 11, inverterCapacityKw: 6, estimatedRoofAreaSqft: 480, basePrice: 330000, installationCost: 0, structureCost: 0, warrantyYears: 10, active: true },
  { id: 'pkg-7kw', systemKw: 7, panelWattage: 550, panelCount: 13, inverterCapacityKw: 7, estimatedRoofAreaSqft: 560, basePrice: 370000, installationCost: 0, structureCost: 0, warrantyYears: 10, active: true },
  { id: 'pkg-8kw', systemKw: 8, panelWattage: 550, panelCount: 15, inverterCapacityKw: 8, estimatedRoofAreaSqft: 640, basePrice: 410000, installationCost: 0, structureCost: 0, warrantyYears: 10, active: true },
  { id: 'pkg-9kw', systemKw: 9, panelWattage: 550, panelCount: 17, inverterCapacityKw: 9, estimatedRoofAreaSqft: 720, basePrice: 450000, installationCost: 0, structureCost: 0, warrantyYears: 10, active: true },
  { id: 'pkg-10kw', systemKw: 10, panelWattage: 550, panelCount: 19, inverterCapacityKw: 10, estimatedRoofAreaSqft: 800, basePrice: 490000, installationCost: 0, structureCost: 0, warrantyYears: 10, active: true },
  { id: 'pkg-11kw', systemKw: 11, panelWattage: 550, panelCount: 20, inverterCapacityKw: 11, estimatedRoofAreaSqft: 880, basePrice: 530000, installationCost: 0, structureCost: 0, warrantyYears: 10, active: true },
  { id: 'pkg-12kw', systemKw: 12, panelWattage: 550, panelCount: 22, inverterCapacityKw: 12, estimatedRoofAreaSqft: 960, basePrice: 570000, installationCost: 0, structureCost: 0, warrantyYears: 10, active: true },
  { id: 'pkg-13kw', systemKw: 13, panelWattage: 550, panelCount: 24, inverterCapacityKw: 13, estimatedRoofAreaSqft: 1040, basePrice: 610000, installationCost: 0, structureCost: 0, warrantyYears: 10, active: true },
  { id: 'pkg-14kw', systemKw: 14, panelWattage: 550, panelCount: 26, inverterCapacityKw: 14, estimatedRoofAreaSqft: 1120, basePrice: 650000, installationCost: 0, structureCost: 0, warrantyYears: 10, active: true },
  { id: 'pkg-15kw', systemKw: 15, panelWattage: 550, panelCount: 28, inverterCapacityKw: 15, estimatedRoofAreaSqft: 1200, basePrice: 690000, installationCost: 0, structureCost: 0, warrantyYears: 10, active: true },
  { id: 'pkg-16kw', systemKw: 16, panelWattage: 550, panelCount: 30, inverterCapacityKw: 16, estimatedRoofAreaSqft: 1280, basePrice: 730000, installationCost: 0, structureCost: 0, warrantyYears: 10, active: true },
  { id: 'pkg-17kw', systemKw: 17, panelWattage: 550, panelCount: 31, inverterCapacityKw: 17, estimatedRoofAreaSqft: 1360, basePrice: 770000, installationCost: 0, structureCost: 0, warrantyYears: 10, active: true },
  { id: 'pkg-18kw', systemKw: 18, panelWattage: 550, panelCount: 33, inverterCapacityKw: 18, estimatedRoofAreaSqft: 1440, basePrice: 810000, installationCost: 0, structureCost: 0, warrantyYears: 10, active: true },
  { id: 'pkg-19kw', systemKw: 19, panelWattage: 550, panelCount: 35, inverterCapacityKw: 19, estimatedRoofAreaSqft: 1520, basePrice: 850000, installationCost: 0, structureCost: 0, warrantyYears: 10, active: true },
  { id: 'pkg-20kw', systemKw: 20, panelWattage: 550, panelCount: 37, inverterCapacityKw: 20, estimatedRoofAreaSqft: 1600, basePrice: 890000, installationCost: 0, structureCost: 0, warrantyYears: 10, active: true },
];

const SUBSIDY_RULES = [
  { id: 'sub-res-1', customerType: 'residential', minKw: 0, maxKw: 1, subsidyAmount: 30000, effectiveFrom: '2024-02-01', effectiveTo: null, active: true },
  { id: 'sub-res-2', customerType: 'residential', minKw: 1.01, maxKw: 2, subsidyAmount: 60000, effectiveFrom: '2024-02-01', effectiveTo: null, active: true },
  { id: 'sub-res-3', customerType: 'residential', minKw: 2.01, maxKw: 999, subsidyAmount: 78000, effectiveFrom: '2024-02-01', effectiveTo: null, active: true },
];

const FINANCE_CONFIG = {
  interestRateAnnual: 10.5,
  minTenureMonths: 12,
  maxTenureMonths: 60,
  availableTenures: [12, 24, 36, 48, 60],
};

const CALCULATOR_ASSUMPTIONS = {
  dailyGenerationPerKw: 4,
  electricityTariffPerKwh: 8,
  annualDegradationRate: 0.007,
  annualTariffGrowthRate: 0.03,
  projectLifeYears: 25,
  gridEmissionFactorKgPerKwh: 0.7,
  treesEquivalentKgPerTree: 21,
  selfConsumptionRatio: 0.7,
  exportRateMultiplier: 0.55,
  roundTripEfficiency: 0.9,
};

async function getLocations() {
  return LOCATIONS.filter((l) => l.active);
}

async function getStateEnergyConfig() {
  return STATE_ENERGY_CONFIG.filter((s) => s.active);
}

async function getDistrictOverrides() {
  return DISTRICT_OVERRIDES.filter((d) => d.active);
}

async function getTariffs() {
  return TARIFFS.filter((t) => t.active);
}

async function getSolarPackages() {
  return SOLAR_PACKAGES.filter((p) => p.active).sort((a, b) => a.systemKw - b.systemKw);
}

async function getSubsidyRules() {
  return SUBSIDY_RULES.filter((s) => s.active);
}

async function getFinanceConfig() {
  return FINANCE_CONFIG;
}

async function getAssumptions() {
  return CALCULATOR_ASSUMPTIONS;
}

module.exports = {
  STATE_ENERGY_CONFIG,
  DISTRICT_OVERRIDES,
  LOCATIONS,
  TARIFFS,
  SOLAR_PACKAGES,
  SUBSIDY_RULES,
  FINANCE_CONFIG,
  CALCULATOR_ASSUMPTIONS,
  getLocations,
  getStateEnergyConfig,
  getDistrictOverrides,
  getTariffs,
  getSolarPackages,
  getSubsidyRules,
  getFinanceConfig,
  getAssumptions,
};
