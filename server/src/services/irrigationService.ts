import weatherService from './weatherService.js';
import ApiError from '../utils/ApiError.js';

export interface IrrigationZoneInput {
  id?: string;
  name?: string;
  crop?: string;
  growthStage?: string;
  soilMoistureCurrent?: unknown;
  soilMoistureTarget?: unknown;
  soilType?: string;
  rootDepth?: unknown;
  areaAcres?: unknown;
  irrigationMethod?: string;
  lastIrrigated?: string;
}

export interface IrrigationWeatherContext {
  location: {
    latitude?: number;
    longitude?: number;
    timezone?: string;
  };
  current: {
    temperature?: number | null;
    humidity?: number | null;
    windSpeedKmH?: number | null;
    condition?: string;
    rainProbability?: number;
    rainfallExpectedMm?: number;
  };
  daily: Array<{
    maxTemp?: number | null;
    minTemp?: number | null;
    rainProbability?: number;
    rainfallMm?: number;
  }>;
}

export interface IrrigationPlanPayload {
  latitude?: unknown;
  longitude?: unknown;
  crop?: unknown;
  growthStage?: unknown;
  soilMoisture?: unknown;
  soilMoistureCurrent?: unknown;
  soilType?: unknown;
  areaAcres?: unknown;
  irrigationMethod?: unknown;
  zones?: IrrigationZoneInput[];
  weatherData?: IrrigationWeatherContext;
  /** When true and no zones/crop provided, use Patel Farm demo defaults. */
  allowDemoDefaults?: boolean;
}

/**
 * ============================================================================
 * AGRONOMIC CONSTANTS & REFERENCE CONFIGURATION
 * ============================================================================
 */

/**
 * Single Crop Coefficients (Kc) for Non-Stressed, Well-Managed Crops
 * Reference: FAO Irrigation and Drainage Paper No. 56 (FAO-56), Table 12
 * Conditions: Standard subhumid reference climate (RHmin ~ 45%, wind speed u2 ~ 2 m/s)
 *
 * Tabulated Values vs. Interpolated Stages:
 * - initial (Kc,ini): Direct from FAO-56 Table 12
 * - mid (Kc,mid): Direct from FAO-56 Table 12 (Peak vegetative/fruiting stage)
 * - end (Kc,end): Direct from FAO-56 Table 12 (Harvest/Maturity stage)
 * - dev_interpolated: Linear interpolation between Kc,ini and Kc,mid per FAO-56 Chapter 6
 */
export const CROP_COEFFICIENTS = Object.freeze({
  tomato: {
    initial: 0.60,          // FAO-56 Table 12 direct: Tomato (Fresh market) initial stage
    dev_interpolated: 0.85, // FAO-56 Chapter 6 linear stage interpolation (initial to mid)
    mid: 1.15,              // FAO-56 Table 12 direct: Tomato mid-season peak flowering/fruiting
    end: 0.80,              // FAO-56 Table 12 direct: Tomato late-season harvest (range 0.70 - 0.90)
    default: 0.95,
  },
  cotton: {
    initial: 0.35,          // FAO-56 Table 12 direct: Cotton initial stage (range 0.35 - 0.45)
    dev_interpolated: 0.75, // FAO-56 Chapter 6 linear stage interpolation (squaring/early vegetative)
    mid: 1.18,              // FAO-56 Table 12 direct: Cotton mid-season flowering/boll formation (range 1.15 - 1.20)
    end: 0.65,              // FAO-56 Table 12 direct: Cotton late-season harvest/defoliation (range 0.65 - 0.70)
    default: 0.85,
  },
  wheat: {
    initial: 0.40,          // FAO-56 Table 12 direct: Spring/Winter wheat initial under standard wetting
    dev_interpolated: 0.80, // FAO-56 Chapter 6 linear stage interpolation (tillering to jointing)
    mid: 1.15,              // FAO-56 Table 12 direct: Wheat mid-season heading/flowering
    end: 0.35,              // FAO-56 Table 12 direct: Wheat harvest/grain ripening (range 0.25 - 0.40)
    default: 0.85,
  },
  potato: {
    initial: 0.50,          // FAO-56 Table 12 direct: Potato initial stage
    dev_interpolated: 0.75, // FAO-56 Chapter 6 linear stage interpolation
    mid: 1.15,              // FAO-56 Table 12 direct: Potato tuber formation mid-season
    end: 0.75,              // FAO-56 Table 12 direct: Potato late-season ripening
    default: 0.90,
  },
  pepper: {
    // Bell pepper / sweet pepper — FAO-56 Table 12 "Peppers (bell)" / chili family
    initial: 0.60,
    dev_interpolated: 0.85,
    mid: 1.05,
    end: 0.90,
    default: 0.90,
  },
  default: {
    initial: 0.50,
    dev_interpolated: 0.80,
    mid: 1.05,
    end: 0.70,
    default: 0.85,
  },
});

/**
 * Irrigation Method Application Efficiencies
 * Reference: FAO Water Management Efficiency Standards (Brouwer et al., FAO Training Manual No. 4)
 * Represents fraction of applied water entering root zone (0.0 - 1.0)
 */
export const IRRIGATION_EFFICIENCIES = Object.freeze({
  drip: 0.90,       // Micro/Drip localized irrigation (typical range: 85% - 95%)
  sprinkler: 0.75,  // Pressurized overhead sprinkler (typical range: 70% - 80%)
  pivot: 0.80,      // Center pivot systems (typical range: 75% - 85%)
  furrow: 0.60,     // Graded furrow surface irrigation (typical range: 55% - 65%)
  flood: 0.55,      // Basin/Border flood irrigation (typical range: 50% - 60%)
});

/**
 * Standard Soil Textural Hydraulic Reference Table
 * Reference: USDA-NRCS National Engineering Handbook, Part 652 (Irrigation Guide)
 * Unit: Volumetric water content percentage (% by volume)
 */
export const SOIL_CHARACTERISTICS = Object.freeze({
  'sandy loam': { fieldCapacity: 45, wiltingPoint: 15, targetDefault: 45, defaultRootDepthMm: 450 },
  'clay loam':  { fieldCapacity: 50, wiltingPoint: 22, targetDefault: 50, defaultRootDepthMm: 600 },
  'loam':       { fieldCapacity: 42, wiltingPoint: 18, targetDefault: 40, defaultRootDepthMm: 300 },
  'clay':       { fieldCapacity: 55, wiltingPoint: 28, targetDefault: 52, defaultRootDepthMm: 500 },
  'sand':       { fieldCapacity: 25, wiltingPoint: 8,  targetDefault: 22, defaultRootDepthMm: 300 },
  'default':    { fieldCapacity: 45, wiltingPoint: 18, targetDefault: 45, defaultRootDepthMm: 400 },
});

/**
 * Default Management Allowed Depletion (MAD) Assumption (p)
 *
 * Agronomic Documentation:
 * FAO-56 Chapter 6 states that the average soil water depletion fraction p (Management Allowed Depletion)
 * varies by crop and evaporative demand (typically ranging from 0.30 - 0.40 for sensitive shallow-rooted
 * vegetables to 0.60 - 0.70 for deep-rooted crops under low ET0).
 *
 * For this baseline engine, p = 0.50 is configured as a general working default assumption,
 * not as a universal crop-specific constant.
 */
export const DEFAULT_MANAGEMENT_ALLOWED_DEPLETION = 0.50;

/**
 * Physical Conversion Constant: Litres per Acre-Millimeter
 * 1 acre = 4,046.8564224 m²
 * 1 mm water depth = 0.001 m
 * Volume = 4,046.8564224 m² * 0.001 m = 4.046856 m³ = 4,046.856 Litres
 * Therefore: grossVolumeLitres = grossDepthMm * areaAcres * LITRES_PER_ACRE_MM
 */
export const LITRES_PER_ACRE_MM = 4046.856;

/**
 * ============================================================================
 * CORE AGRONOMIC CALCULATIONS
 * ============================================================================
 */

/**
 * Parses root depth string (e.g. "45 cm", "450 mm", or number) to millimeters (mm)
 * @param {string|number} input
 * @returns {number} Root depth in millimeters (mm)
 */
export const parseRootDepthMm = (input: unknown): number => {
  if (typeof input === 'number' && input > 0) {
    return input <= 10 ? input * 100 : (input <= 150 ? input * 10 : input);
  }
  if (typeof input === 'string') {
    const trimmed = input.trim().toLowerCase();
    const val = parseFloat(trimmed);
    if (!isNaN(val) && val > 0) {
      if (trimmed.includes('cm')) return val * 10;
      if (trimmed.includes('m') && !trimmed.includes('mm')) return val * 1000;
      if (trimmed.includes('mm')) return val;
      return val <= 150 ? val * 10 : val;
    }
  }
  return 400; // Default 400 mm (40 cm) active root zone
};

/**
 * Resolves Kc and distinguishes direct FAO-56 Table 12 values from stage interpolations
 * @param {string} cropName
 * @param {string} growthStage
 * @returns {{ kc: number, kcSource: string, stageCategory: string }}
 */
export const resolveCropCoefficient = (cropName = '', growthStage = ''): { kc: number; kcSource: string; stageCategory: string } => {
  const cropKey = cropName.toLowerCase().trim();
  const stageLower = growthStage.toLowerCase().trim();

  let cropTable = CROP_COEFFICIENTS.default;
  if (cropKey.includes('tomato')) cropTable = CROP_COEFFICIENTS.tomato;
  else if (cropKey.includes('cotton')) cropTable = CROP_COEFFICIENTS.cotton;
  else if (cropKey.includes('wheat')) cropTable = CROP_COEFFICIENTS.wheat;
  else if (cropKey.includes('potato')) cropTable = CROP_COEFFICIENTS.potato;
  else if (cropKey.includes('pepper') || cropKey.includes('bell')) cropTable = CROP_COEFFICIENTS.pepper;

  // Mid-season peak (fruiting / boll formation / flowering) -> FAO-56 Table 12 direct
  if (stageLower.includes('fruit') || stageLower.includes('boll') || stageLower.includes('grain') || stageLower.includes('flower')) {
    return {
      kc: cropTable.mid,
      kcSource: 'FAO-56 Table 12 (Direct Tabulated Mid-Season)',
      stageCategory: 'mid_season',
    };
  }

  // Late-season maturity / harvest -> FAO-56 Table 12 direct
  if (stageLower.includes('matur') || stageLower.includes('harvest') || stageLower.includes('ripen')) {
    return {
      kc: cropTable.end,
      kcSource: 'FAO-56 Table 12 (Direct Tabulated End-Season)',
      stageCategory: 'end_season',
    };
  }

  // Initial / seedling stage -> FAO-56 Table 12 direct
  if (stageLower.includes('init') || stageLower.includes('seedling') || stageLower.includes('crown')) {
    return {
      kc: cropTable.initial,
      kcSource: 'FAO-56 Table 12 (Direct Tabulated Initial)',
      stageCategory: 'initial_stage',
    };
  }

  // Crop development stage -> FAO-56 Chapter 6 Linear Stage Interpolation
  if (stageLower.includes('tiller') || stageLower.includes('vegetat') || stageLower.includes('joint') || stageLower.includes('squar') || stageLower.includes('tuber')) {
    return {
      kc: cropTable.dev_interpolated,
      kcSource: 'FAO-56 Chapter 6 (Linear Stage Interpolation)',
      stageCategory: 'crop_development',
    };
  }

  return {
    kc: cropTable.default,
    kcSource: 'FAO-56 General Average Approximation',
    stageCategory: 'default',
  };
};

/**
 * Calculates Reference Evapotranspiration (ET0) using FAO-56 Hargreaves-Samani method
 *
 * Formula (FAO-56 Eq. 52):
 *   ET0 = 0.0023 * (Tmean + 17.8) * sqrt(Tmax - Tmin) * Ra_mm
 *
 * Variable Definitions & Units:
 *   - Tmax, Tmin, Tmean: Temperatures in degrees Celsius (°C)
 *   - deltaT: max(0.5, Tmax - Tmin) in degrees Celsius (°C)
 *   - Latitude (phi): Decimal degrees converted to radians (rad)
 *   - Day of Year (J): Integer between 1 and 365
 *   - Solar Declination (delta): Radians (rad) - FAO-56 Eq. 24
 *   - Relative Earth-Sun Distance (d_r): Dimensionless - FAO-56 Eq. 23
 *   - Sunset Hour Angle (omega_s): Radians (rad) - FAO-56 Eq. 25
 *   - Solar Constant (G_sc): 0.0820 MJ m^-2 min^-1
 *   - Extraterrestrial Solar Radiation (Ra): Calculated in MJ m^-2 day^-1 (FAO-56 Eq. 21)
 *   - Ra_mm: Converted to equivalent evaporation in mm/day (Ra * 0.408)
 *   - Output ET0: Reference crop evapotranspiration in millimeters per day (mm/day)
 *
 * @param {number} maxTemp - Maximum daily temperature (°C)
 * @param {number} minTemp - Minimum daily temperature (°C)
 * @param {number} currentTemp - Current temperature (°C fallback)
 * @param {number} latitude - Decimal latitude (degrees)
 * @returns {number} ET0 in mm/day
 */
export const calculateET0 = (
  maxTemp: number,
  minTemp: number,
  currentTemp?: number,
  latitude = 22.56
): number => {
  const tMax = typeof maxTemp === 'number' && !isNaN(maxTemp) ? maxTemp : (currentTemp ?? 30);
  const tMin = typeof minTemp === 'number' && !isNaN(minTemp) ? minTemp : (tMax - 8);
  const tMean = (tMax + tMin) / 2;

  // Temperature range with non-negative guard: deltaT >= 0.5 °C
  const deltaT = Math.max(0.5, tMax - tMin);

  // 1. Latitude in radians (rad)
  const latRad = (latitude * Math.PI) / 180;

  // 2. Day of Year J (1..365)
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diffTime = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.max(1, Math.min(365, Math.floor(diffTime / (1000 * 60 * 60 * 24))));

  // 3. Solar Declination delta (rad) - FAO-56 Eq. 24
  const solarDeclination = 0.409 * Math.sin(((2 * Math.PI) / 365) * dayOfYear - 1.39);

  // 4. Relative distance Earth-Sun d_r - FAO-56 Eq. 23
  const relativeDistance = 1 + 0.033 * Math.cos(((2 * Math.PI) / 365) * dayOfYear);

  // 5. Sunset Hour Angle omega_s (rad) - FAO-56 Eq. 25
  const tanProduct = -Math.tan(latRad) * Math.tan(solarDeclination);
  const clampedTanProduct = Math.max(-1.0, Math.min(1.0, tanProduct));
  const sunsetHourAngle = Math.acos(clampedTanProduct);

  // 6. Extraterrestrial Radiation Ra (MJ m^-2 day^-1) - FAO-56 Eq. 21
  const solarConstant = 0.0820; // MJ m^-2 min^-1
  const raMJ =
    ((24 * 60) / Math.PI) *
    solarConstant *
    relativeDistance *
    (sunsetHourAngle * Math.sin(latRad) * Math.sin(solarDeclination) +
      Math.cos(latRad) * Math.cos(solarDeclination) * Math.sin(sunsetHourAngle));

  // 7. Convert Ra from MJ m^-2 day^-1 to equivalent water depth in mm/day (multiply by 0.408)
  const raMmDay = Math.max(5.0, Math.min(22.0, raMJ * 0.408));

  // 8. Compute Hargreaves-Samani ET0 (mm/day) - FAO-56 Eq. 52
  const et0 = 0.0023 * (tMean + 17.8) * Math.sqrt(deltaT) * raMmDay;

  // Clamped realistic range: 1.0 .. 12.0 mm/day
  return Math.max(1.0, Math.min(12.0, Math.round(et0 * 100) / 100));
};

/**
 * Calculates Effective Precipitation using a Linear Probability-Discount Heuristic
 *
 * Methodology & Assumptions:
 *   - Weighted precipitation: P_weighted = P_forecast * (Rain_Probability / 100) (mm)
 *   - Initial abstraction threshold: 1.5 mm subtracted for initial surface depression storage
 *   - Runoff and canopy interception loss factor: 20% discount (0.80 multiplier)
 *   - Formula: Peff = max(0, P_weighted * 0.80 - 1.5 mm)
 *   - Classification: Configured agronomic heuristic for daily scheduling; not the empirical monthly USDA-SCS table.
 *
 * @param {number} forecastRainMm - Total forecasted rainfall (mm)
 * @param {number} rainProbability - Forecast rain probability (0..100 %)
 * @returns {number} Estimated effective rainfall (mm)
 */
export const calculateEffectiveRainfallHeuristic = (forecastRainMm: number, rainProbability: number): number => {
  const p = Number(forecastRainMm) || 0;
  const prob = Number(rainProbability) || 0;

  if (p < 3.0 || prob < 35) {
    return 0;
  }

  const pWeighted = p * (prob / 100);
  if (pWeighted < 3.0) {
    return 0;
  }

  const pEff = Math.max(0, pWeighted * 0.80 - 1.5);
  return Math.round(pEff * 10) / 10;
};

/**
 * Evaluates Irrigation Need for a Single Zone
 *
 * Governing Formulas:
 *   1. Crop Evapotranspiration:
 *        ETc = ET0 * Kc (mm/day)
 *   2. Soil Moisture Deficit Depth:
 *        Deficit_Depth_mm = ((Target% - Current%) / 100) * RootDepth_mm * DEFAULT_MANAGEMENT_ALLOWED_DEPLETION (0.50)
 *   3. Net Water Requirement:
 *        I_net = max(0, Deficit_Depth_mm + ETc - Peff) (mm)
 *   4. Gross Application Depth:
 *        I_gross = I_net / Irrigation_Efficiency (mm)
 *   5. Gross Application Volume:
 *        grossVolumeLitres = I_gross * Area_Acres * LITRES_PER_ACRE_MM (4046.856) (L)
 *        (Note: Efficiency is applied ONCE in step 4 to obtain I_gross; volume is grossDepth * area * constant)
 *   6. Estimated Avoided Irrigation Volume (Counterfactual when rain causes delay):
 *        plannedGrossMm = max(ETc, Deficit_Depth_mm) / Irrigation_Efficiency
 *        avoidedLitres = plannedGrossMm * Area_Acres * LITRES_PER_ACRE_MM
 *
 * @param {object} zoneInput - Zone parameter object
 * @param {object} weatherData - Live weather forecast object
 * @param {number} et0 - Reference ET0 in mm/day
 * @returns {object} Evaluated zone decision object
 */
export const evaluateZone = (
  zoneInput: IrrigationZoneInput,
  weatherData: IrrigationWeatherContext,
  et0: number
) => {
  const {
    id = `zone-${Math.random().toString(36).substring(2, 6)}`,
    name = 'Crop Field',
    crop = 'General Crop',
    growthStage = 'Active Growth',
    soilMoistureCurrent,
    soilMoistureTarget = 45,
    soilType = 'Sandy Loam',
    rootDepth = '45 cm',
    areaAcres = 1.0,
    irrigationMethod = 'drip',
    lastIrrigated = '2 days ago',
  } = zoneInput;

  // 1. Validation
  const moistureCurrent = Number(soilMoistureCurrent);
  if (isNaN(moistureCurrent) || moistureCurrent < 0 || moistureCurrent > 100) {
    throw ApiError.badRequest(
      `Invalid soil moisture for '${name}': '${soilMoistureCurrent}'. Must be a percentage between 0 and 100.`
    );
  }

  const acres = Number(areaAcres);
  if (isNaN(acres) || acres <= 0 || acres > 10000) {
    throw ApiError.badRequest(
      `Invalid areaAcres for '${name}': '${areaAcres}'. Must be a positive number.`
    );
  }

  const methodKey = (irrigationMethod || 'drip').toLowerCase().trim();
  const efficiency =
    IRRIGATION_EFFICIENCIES[methodKey as keyof typeof IRRIGATION_EFFICIENCIES] ||
    IRRIGATION_EFFICIENCIES.drip;
  const rootDepthMm = parseRootDepthMm(rootDepth);

  // 2. Crop Coefficient & Crop Evapotranspiration (ETc)
  const { kc, kcSource, stageCategory } = resolveCropCoefficient(crop, growthStage);
  const etcDailyMm = Math.round(et0 * kc * 100) / 100;

  // 3. Weather inputs
  const currentRainProb = weatherData.current?.rainProbability ?? weatherData.daily?.[0]?.rainProbability ?? 0;
  const forecastRainMm = weatherData.daily?.[0]?.rainfallMm ?? weatherData.current?.rainfallExpectedMm ?? 0;
  const effectiveRainMm = calculateEffectiveRainfallHeuristic(forecastRainMm, currentRainProb);

  // 4. Soil Moisture Deficit Calculation
  const targetMoisture = Number(soilMoistureTarget) || 45;
  const moistureDeficitPct = Math.max(0, targetMoisture - moistureCurrent);

  // Soil deficit depth (mm) = (Deficit% / 100) * RootDepth_mm * MAD (0.50)
  const soilDeficitDepthMm = (moistureDeficitPct / 100) * rootDepthMm * DEFAULT_MANAGEMENT_ALLOWED_DEPLETION;

  const factors = [];
  let status = 'optimal';
  let recommendation = '';
  let recommendedWaterMm = 0;
  let recommendedIrrigationLitres = 0;
  let rainDelayHours = 0;
  let estimatedAvoidedIrrigationLitres = 0;

  // Case A: Significant Natural Precipitation Forecasted -> Delay Recommended
  if (effectiveRainMm >= etcDailyMm * 0.70 || (currentRainProb >= 60 && forecastRainMm >= 6.0)) {
    status = 'delay_recommended';
    rainDelayHours = forecastRainMm >= 15.0 ? 48 : 24;
    recommendation = `Delay scheduled irrigation by ${rainDelayHours}h. Imminent rainfall (${currentRainProb}% probability, ${forecastRainMm} mm) will substitute root zone water demand (ETc ~${etcDailyMm} mm/day).`;

    // Counterfactual: The gross irrigation depth that would have been applied in this cycle
    const plannedNetDepthMm = Math.max(etcDailyMm, soilDeficitDepthMm);
    const plannedGrossDepthMm = plannedNetDepthMm / efficiency;

    recommendedWaterMm = 0;
    recommendedIrrigationLitres = 0;

    // Direct conversion: grossDepth * acres * LITRES_PER_ACRE_MM (no double division)
    estimatedAvoidedIrrigationLitres = Math.round(plannedGrossDepthMm * acres * LITRES_PER_ACRE_MM);

    factors.push(`Precipitation forecast: ${forecastRainMm} mm with ${currentRainProb}% confidence.`);
    factors.push(`Effective rain heuristic (${effectiveRainMm} mm) offsets daily ETc demand (${etcDailyMm} mm/day).`);
    factors.push(`Postponing irrigation prevents root zone hypoxia and nutrient leaching in ${soilType}.`);
  }
  // Case B: Moisture within Optimal Target Range
  else if (moistureCurrent >= targetMoisture - 2.0) {
    status = 'optimal';
    recommendation = `Soil moisture (${moistureCurrent}%) is within optimal target range (${targetMoisture}%). Root zone storage in ${soilType} is sufficient for current growth stage.`;
    recommendedWaterMm = 0;
    recommendedIrrigationLitres = 0;
    estimatedAvoidedIrrigationLitres = 0;

    factors.push(`Soil moisture (${moistureCurrent}%) meets agronomic target (${targetMoisture}%).`);
    factors.push(`Daily evapotranspiration (ETc ${etcDailyMm} mm) is buffered within soil water storage.`);
  }
  // Case C: Moisture Deficit & Insufficient Rain -> Irrigation Needed
  else {
    status = 'needs_irrigation';

    // Net water need (mm)
    const netWaterNeedMm = Math.max(1.0, soilDeficitDepthMm + etcDailyMm - effectiveRainMm);

    // Gross application depth accounting for efficiency
    const grossDepthMm = netWaterNeedMm / efficiency;
    recommendedWaterMm = Math.round(grossDepthMm * 10) / 10;

    // Gross volume: grossDepthMm * acres * LITRES_PER_ACRE_MM (exact single efficiency application)
    recommendedIrrigationLitres = Math.round(recommendedWaterMm * acres * LITRES_PER_ACRE_MM);
    estimatedAvoidedIrrigationLitres = 0;

    recommendation = `Apply ${recommendedWaterMm} mm (${recommendedIrrigationLitres.toLocaleString()} L) via ${methodKey} irrigation. Current soil moisture (${moistureCurrent}%) is below target (${targetMoisture}%).`;

    factors.push(`Soil moisture deficit: ${moistureDeficitPct}% below target (net root deficit ~${soilDeficitDepthMm.toFixed(1)} mm).`);
    factors.push(`Daily crop evapotranspiration (ETc): ${etcDailyMm} mm/day (Kc: ${kc}).`);
    factors.push(`Dry weather window: ${currentRainProb}% rain probability (${forecastRainMm} mm forecast).`);
  }

  return {
    id,
    name,
    crop,
    growthStage,
    soilMoistureCurrent: moistureCurrent,
    soilMoistureTarget: targetMoisture,
    status,
    rainProbability: currentRainProb,
    soilType,
    rootDepth,
    lastIrrigated,
    recommendation,
    // Primary calculated water requirement
    recommendedWaterMm,
    recommendedIrrigationLitres,
    // Avoided irrigation metric with clear counterfactual baseline documentation
    estimatedAvoidedIrrigationLitres,
    waterSavedLitres: estimatedAvoidedIrrigationLitres, // Backward-compatibility alias
    calculationDetails: {
      cropCoefficientKc: kc,
      kcSource,
      stageCategory,
      dailyWaterDemandEtcMm: etcDailyMm,
      referenceEt0Mm: et0,
      rootDepthMm,
      soilMoistureDeficitPct: moistureDeficitPct,
      soilDeficitDepthMm: Math.round(soilDeficitDepthMm * 10) / 10,
      effectiveRainHeuristicMm: effectiveRainMm,
      forecastRainMm,
      rainProbability: currentRainProb,
      recommendedGrossDepthMm: recommendedWaterMm,
      recommendedGrossVolumeLitres: recommendedIrrigationLitres,
      rainDelayHours,
      estimatedAvoidedIrrigationLitres,
      irrigationEfficiency: efficiency,
      managementAllowedDepletionAssumptionP: DEFAULT_MANAGEMENT_ALLOWED_DEPLETION,
      factors,
    },
  };
};

export const irrigationService = {
  /**
   * Generates explainable smart irrigation plan
   */
  async generatePlan(payload: IrrigationPlanPayload = {}) {
    const {
      latitude,
      longitude,
      crop,
      growthStage,
      soilMoisture,
      soilMoistureCurrent,
      soilType,
      areaAcres,
      irrigationMethod,
      zones,
      allowDemoDefaults = false,
    } = payload;

    // 1. Fetch live weather context through backend weather service (or use supplied context for scenario simulations/tests)
    const weatherData: IrrigationWeatherContext =
      payload.weatherData ?? (await weatherService.getForecast(latitude, longitude));

    const latResolved = weatherData.location?.latitude ?? 22.53;
    const currentTemp = weatherData.current?.temperature ?? 30;
    const maxTemp = weatherData.daily?.[0]?.maxTemp ?? 32;
    const minTemp = weatherData.daily?.[0]?.minTemp ?? 24;

    // 2. Compute reference ET0 (mm/day) using FAO-56 Hargreaves-Samani method
    const et0 = calculateET0(maxTemp, minTemp, currentTemp, latResolved);

    // 3. Resolve Zones to evaluate
    let zonesToProcess: IrrigationZoneInput[] = [];
    let isDemoDefault = false;

    if (Array.isArray(zones) && zones.length > 0) {
      zonesToProcess = zones;
    } else if (crop) {
      // Single crop direct evaluation
      zonesToProcess = [
        {
          id: 'zone-single',
          name: `${String(crop)} Field`,
          crop: String(crop),
          growthStage: String(growthStage || 'Active Growth'),
          soilMoistureCurrent: soilMoisture ?? soilMoistureCurrent ?? 30,
          soilMoistureTarget: 45,
          soilType: String(soilType || 'Sandy Loam'),
          areaAcres: areaAcres || 1.0,
          irrigationMethod: String(irrigationMethod || 'drip'),
        },
      ];
    } else if (allowDemoDefaults) {
      // Demo workspace only — Patel Farm benchmark zones
      isDemoDefault = true;
      zonesToProcess = [
        {
          id: 'zone-1',
          name: 'Field A (Plot 2) — Tomato',
          crop: 'Tomato (Abhinav Hybrid)',
          growthStage: 'Fruiting (Week 9)',
          soilMoistureCurrent: 31,
          soilMoistureTarget: 45,
          soilType: 'Sandy Loam',
          rootDepth: '45 cm',
          areaAcres: 6.0,
          irrigationMethod: 'drip',
          lastIrrigated: '3 days ago',
        },
        {
          id: 'zone-2',
          name: 'Field B (Block 1) — Potato',
          crop: 'Potato',
          growthStage: 'Tuber bulking',
          soilMoistureCurrent: 48,
          soilMoistureTarget: 50,
          soilType: 'Clay Loam',
          rootDepth: '60 cm',
          areaAcres: 8.0,
          irrigationMethod: 'drip',
          lastIrrigated: 'Yesterday',
        },
        {
          id: 'zone-3',
          name: 'Field C (East) — Pepper Bell',
          crop: 'Pepper Bell',
          growthStage: 'Fruit set',
          soilMoistureCurrent: 26,
          soilMoistureTarget: 40,
          soilType: 'Loam',
          rootDepth: '30 cm',
          areaAcres: 4.5,
          irrigationMethod: 'drip',
          lastIrrigated: '5 days ago',
        },
      ];
    } else {
      // Real accounts with no fields: return weather context only, no fabricated zones
      zonesToProcess = [];
    }

    // 4. Evaluate each zone
    const evaluatedZones = zonesToProcess.map((z) => evaluateZone(z, weatherData, et0));

    // 5. Aggregate metrics
    const totalRecommendedLitres = evaluatedZones.reduce(
      (acc, z) => acc + (z.recommendedIrrigationLitres || 0),
      0
    );
    const totalAvoidedLitres = evaluatedZones.reduce(
      (acc, z) => acc + (z.estimatedAvoidedIrrigationLitres || 0),
      0
    );
    const delayZones = evaluatedZones.filter((z) => z.status === 'delay_recommended');
    const needsIrrigationZones = evaluatedZones.filter((z) => z.status === 'needs_irrigation');

    const rainMm = weatherData.daily?.[0]?.rainfallMm ?? weatherData.current?.rainfallExpectedMm ?? 0;
    const rainProb = weatherData.current?.rainProbability ?? weatherData.daily?.[0]?.rainProbability ?? 0;

    let overallRecommendation = '';
    let decisionReason = '';

    if (zonesToProcess.length === 0) {
      overallRecommendation = 'Add fields in Farm Management to generate zone irrigation plans.';
      decisionReason = `Weather is available (rain ${rainProb}%, ~${rainMm} mm). Irrigation volumes require your field crop and area data.`;
    } else if (delayZones.length > 0) {
      const zoneNames = delayZones.map((z) => z.name.split('—')[0].trim()).join(' & ');
      overallRecommendation = `Delay scheduled irrigation across ${zoneNames}.`;
      decisionReason = `Forecasted rainfall (${rainProb}% probability, ${rainMm} mm) will naturally replenish the root zone. Postponing pump cycles avoids waterlogging and excess pumping costs.`;
    } else if (needsIrrigationZones.length > 0) {
      overallRecommendation = `Irrigation recommended for ${needsIrrigationZones.length} field zone(s) (total ${totalRecommendedLitres.toLocaleString()} L).`;
      decisionReason = `Soil moisture is below crop target threshold with low precipitation forecasted (${rainProb}% probability).`;
    } else {
      overallRecommendation = 'All field plots are currently in optimal moisture condition.';
      decisionReason = `Soil moisture levels are balanced with current evapotranspiration rate (ET0: ${et0} mm/day).`;
    }

    return {
      overallRecommendation,
      totalRecommendedIrrigationLitres: totalRecommendedLitres,
      totalEstimatedAvoidedIrrigationLitres: totalAvoidedLitres,
      totalSavedLitres: totalAvoidedLitres, // Backward-compatibility alias
      forecastedRainMm: rainMm,
      rainProbability: rainProb,
      decisionReason,
      et0MmDay: et0,
      weatherContext: {
        temperature: weatherData.current.temperature,
        humidity: weatherData.current.humidity,
        windSpeedKmH: weatherData.current.windSpeedKmH,
        condition: weatherData.current.condition,
        rainProbability: rainProb,
        rainfallExpectedMm: rainMm,
        location: weatherData.location
          ? `${(weatherData.location.latitude ?? 0).toFixed(2)}, ${(weatherData.location.longitude ?? 0).toFixed(2)} (${weatherData.location.timezone || 'Asia/Kolkata'})`
          : '22.53, 72.91 (Asia/Kolkata)',
      },
      zones: evaluatedZones,
      isDemoDefault,
      modelMetadata: {
        evapotranspirationMethod: 'FAO-56 Hargreaves-Samani Solar Radiation Model (Eq. 52)',
        cropCoefficientsSource: 'FAO-56 Irrigation and Drainage Paper No. 56 (Table 12 tabulated points & Chapter 6 stage interpolation)',
        effectiveRainfallMethod: 'Linear Forecast Probability-Discount Heuristic (P_eff = max(0, P_weighted * 0.80 - 1.5mm))',
        managementAllowedDepletionAssumptionP: DEFAULT_MANAGEMENT_ALLOWED_DEPLETION,
        isEstimate: true,
        disclaimer:
          'All irrigation depths and avoided water volumes are model estimates calculated using live Open-Meteo forecasts and FAO-56 reference equations. These figures are advisory and should be corroborated with in-situ field sensor measurements.',
        avoidedWaterBaselineAssumption:
          'Counterfactual estimated gross application (max(ETc, SoilDeficit) / Efficiency) that would have been applied during this cycle in the absence of precipitation.',
      },
    };
  },
};

export default irrigationService;
