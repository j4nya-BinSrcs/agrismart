import {
  ActionItem,
  DiagnosisRecord,
  WeatherCondition,
  HourlyForecast,
  DailyForecast,
  IrrigationZone,
  SustainabilityMetric,
  AssistantMessage,
  AppNotification,
} from '../types';

// High-fidelity SVG illustration data URIs for realistic crop diagnosis testing
export const SAMPLE_LEAF_IMAGES = {
  tomatoEarlyBlight: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
      <defs>
        <radialGradient id="bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#E2E8F0" />
          <stop offset="100%" stop-color="#CBD5E1" />
        </radialGradient>
        <radialGradient id="spotGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#3E2723" />
          <stop offset="45%" stop-color="#5D4037" />
          <stop offset="70%" stop-color="#8D6E63" />
          <stop offset="90%" stop-color="#C5CAE9" stop-opacity="0" />
          <stop offset="100%" stop-color="#FFEB3B" stop-opacity="0.8" />
        </radialGradient>
      </defs>
      <rect width="600" height="600" fill="url(#bg)" rx="16"/>
      <!-- Stem -->
      <path d="M 300 560 Q 305 450 300 320 Q 295 200 302 80" stroke="#2E7D32" stroke-width="12" fill="none" stroke-linecap="round"/>
      <!-- Tomato Leaf Silhouette -->
      <path d="M 300 100 C 380 130 460 210 440 330 C 420 440 360 490 300 520 C 240 490 180 440 160 330 C 140 210 220 130 300 100 Z" fill="#2E7D32" stroke="#1B5E20" stroke-width="4"/>
      <!-- Veins -->
      <path d="M 300 200 Q 370 230 410 240 M 300 270 Q 380 290 425 320 M 300 350 Q 370 380 400 420" stroke="#4CAF50" stroke-width="4" fill="none"/>
      <path d="M 300 200 Q 230 230 190 240 M 300 270 Q 220 290 175 320 M 300 350 Q 230 380 200 420" stroke="#4CAF50" stroke-width="4" fill="none"/>
      <!-- Early Blight Concentric Spots (Alternaria Solani) -->
      <!-- Lesion 1 -->
      <circle cx="230" cy="260" r="38" fill="url(#spotGrad)"/>
      <circle cx="230" cy="260" r="28" fill="none" stroke="#27150C" stroke-width="3" stroke-dasharray="6,2"/>
      <circle cx="230" cy="260" r="16" fill="none" stroke="#27150C" stroke-width="2"/>
      <circle cx="230" cy="260" r="7" fill="#1B0000"/>
      <!-- Lesion 2 -->
      <circle cx="370" cy="330" r="44" fill="url(#spotGrad)"/>
      <circle cx="370" cy="330" r="32" fill="none" stroke="#27150C" stroke-width="3" stroke-dasharray="7,3"/>
      <circle cx="370" cy="330" r="18" fill="none" stroke="#27150C" stroke-width="2"/>
      <circle cx="370" cy="330" r="8" fill="#1B0000"/>
      <!-- Lesion 3 (Tip necrosis) -->
      <circle cx="280" cy="160" r="24" fill="url(#spotGrad)"/>
      <circle cx="280" cy="160" r="15" fill="none" stroke="#27150C" stroke-width="2"/>
      <circle cx="280" cy="160" r="6" fill="#1B0000"/>
      <!-- Diagnosis Target Box -->
      <rect x="180" y="210" width="100" height="100" fill="none" stroke="#EF4444" stroke-width="2" stroke-dasharray="4,4" rx="4"/>
      <rect x="315" y="275" width="110" height="110" fill="none" stroke="#EF4444" stroke-width="2" stroke-dasharray="4,4" rx="4"/>
    </svg>
  `)}`,

  healthyWheat: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
      <defs>
        <radialGradient id="wheatBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#F1F5F9" />
          <stop offset="100%" stop-color="#E2E8F0" />
        </radialGradient>
        <linearGradient id="leafGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#34D399" />
          <stop offset="50%" stop-color="#10B981" />
          <stop offset="100%" stop-color="#059669" />
        </linearGradient>
      </defs>
      <rect width="600" height="600" fill="url(#wheatBg)" rx="16"/>
      <!-- Wheat Blade -->
      <path d="M 120 520 Q 220 340 280 180 Q 320 80 340 40 Q 335 120 350 240 Q 370 420 390 530 Z" fill="url(#leafGreen)" stroke="#047857" stroke-width="3"/>
      <!-- Midrib line -->
      <path d="M 255 525 Q 310 300 340 40" stroke="#6EE7B7" stroke-width="3" fill="none"/>
      <!-- Parallel veins -->
      <path d="M 230 450 Q 280 270 330 110" stroke="#A7F3D0" stroke-width="1.5" fill="none"/>
      <path d="M 280 470 Q 330 290 350 140" stroke="#A7F3D0" stroke-width="1.5" fill="none"/>
      <!-- Healthy scan indicator -->
      <rect x="220" y="160" width="160" height="200" fill="none" stroke="#10B981" stroke-width="2" stroke-dasharray="6,4" rx="8"/>
      <text x="300" y="385" font-family="sans-serif" font-size="14" fill="#047857" text-anchor="middle" font-weight="bold">No Pathogen Detected (Pristine)</text>
    </svg>
  `)}`,

  cottonBlight: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
      <defs>
        <radialGradient id="cottonBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#F8FAFC" />
          <stop offset="100%" stop-color="#E2E8F0" />
        </radialGradient>
      </defs>
      <rect width="600" height="600" fill="url(#cottonBg)" rx="16"/>
      <!-- Cotton 3-Lobe Leaf -->
      <path d="M 300 520 Q 295 440 280 360 C 210 400 130 360 120 280 C 110 200 180 170 230 210 C 240 140 280 90 300 80 C 320 90 360 140 370 210 C 420 170 490 200 480 280 C 470 360 390 400 320 360 Q 305 440 300 520 Z" fill="#2E7D32" stroke="#1B5E20" stroke-width="4"/>
      <!-- Veins -->
      <path d="M 300 360 L 300 110 M 300 360 L 160 250 M 300 360 L 440 250" stroke="#66BB6A" stroke-width="4"/>
      <!-- Angular Leaf Spots (Xanthomonas) -->
      <polygon points="260,200 280,195 285,215 270,225 255,215" fill="#4E342E" stroke="#FFCA28" stroke-width="1.5"/>
      <polygon points="320,240 345,235 350,260 330,270 315,255" fill="#3E2723" stroke="#FFCA28" stroke-width="1.5"/>
      <polygon points="200,280 225,275 230,295 210,305 195,295" fill="#4E342E" stroke="#FFCA28" stroke-width="1.5"/>
      <polygon points="380,290 410,280 415,310 390,320 375,305" fill="#3E2723" stroke="#FFCA28" stroke-width="1.5"/>
      <rect x="240" y="180" width="130" height="110" fill="none" stroke="#F59E0B" stroke-width="2" stroke-dasharray="4,4" rx="4"/>
    </svg>
  `)}`,

  potatoLateBlight: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
      <rect width="600" height="600" fill="#E2E8F0" rx="16"/>
      <!-- Potato Oval Leaf -->
      <path d="M 300 120 C 420 160 450 320 410 440 C 370 510 330 530 300 540 C 270 530 230 510 190 440 C 150 320 180 160 300 120 Z" fill="#388E3C" stroke="#1B5E20" stroke-width="4"/>
      <path d="M 300 140 L 300 530" stroke="#81C784" stroke-width="4"/>
      <!-- Water-soaked dark necrotic blotch (Phytophthora) -->
      <path d="M 320 220 C 380 230 430 290 400 370 C 370 410 320 380 310 340 C 300 300 300 240 320 220 Z" fill="#212121" stroke="#CDDC39" stroke-width="4"/>
      <path d="M 210 280 C 260 290 270 340 240 380 C 210 400 180 370 180 330 C 180 300 190 280 210 280 Z" fill="#2E3A23" stroke="#CDDC39" stroke-width="3"/>
      <rect x="290" y="210" width="140" height="190" fill="none" stroke="#EF4444" stroke-width="2" stroke-dasharray="4,4" rx="4"/>
    </svg>
  `)}`
};

export const INITIAL_DIAGNOSES: DiagnosisRecord[] = [
  {
    id: 'diag-tomato-01',
    crop: 'tomato',
    variety: 'Abhinav Hybrid',
    growthStage: 'Fruiting (Week 9)',
    diseaseName: 'Tomato Early Blight',
    pathogenName: 'Alternaria solani (Fungal Pathogen)',
    isHealthy: false,
    confidence: 91,
    severity: 'moderate',
    detectedAt: 'Today, 8:15 AM',
    imageUrl: SAMPLE_LEAF_IMAGES.tomatoEarlyBlight,
    fieldLocation: 'Field A (Plot 2)',
    shortExplanation: 'Fungal pathogen Alternaria solani detected with distinctive target-like concentric brown rings surrounded by a chlorotic yellow halo on lower foliage.',
    symptomsMatched: [
      'Concentric target-board ring patterns (3-12mm diameter) on mature leaves',
      'Narrow chlorotic (yellow) margin halo surrounding necrotic tissue',
      'Predominant lower-canopy distribution matching soil-splash transmission',
      'Leaf tip senescence and progressive curling along petiole'
    ],
    symptomsRuledOut: [
      'Septoria Leaf Spot: Ruled out due to absence of small speckling (<3mm) with distinct gray centers',
      'Bacterial Canker: Ruled out due to absence of bird’s-eye lesions on fruit and vascular browning',
      'Late Blight (Phytophthora): Ruled out due to lack of water-soaked grayish margins and white sporulation'
    ],
    treatmentProtocols: {
      organic: 'Bio-Fungicide: Trichoderma viride (10g/L) or Copper Hydroxide (2g/L) foliar spray. Apply directly to lower canopy.',
      conventional: 'Integrated: Mancozeb 75% WP (2.5g/L) or Chlorothalonil (2g/L). Alternate modes of action to prevent resistance.',
      dosage: 'Foliar application: 500 liters spray volume per acre with hollow cone nozzle at 2.5 bar.',
      applicationTiming: 'Execute pruning immediately before rain. Spray within 24h window once foliage dries Friday morning.'
    },
    precautions: [
      'Avoid overhead sprinkler irrigation; moisture on leaves accelerates spore germination.',
      'Sterilize pruning shears with 10% bleach between plants to stop fungal transfer.',
      'Ensure proper air circulation between vine rows by pruning suckers.'
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Prune infected lower foliage',
        description: 'Carefully clip off and bag all symptomatic lower leaves. Do not compost infected debris; bury or burn off-site.',
        timing: 'Immediate (Today before 11 AM)'
      },
      {
        step: 2,
        title: 'Apply targeted bio-fungicide',
        description: 'Spray Copper Hydroxide (2g/L) or Trichoderma viride. Target leaf undersides where fungal hyphae flourish.',
        timing: 'Tomorrow morning during dry spraying window'
      },
      {
        step: 3,
        title: 'Install dry straw ground mulch',
        description: 'Cover bare soil beneath plants with 5cm organic straw to prevent soil-borne spore splash during rain.',
        timing: 'Within 48 hours'
      }
    ],
    relatedInsights: {
      weatherRisk: 'Forecasted rainfall will splash spores if leaves remain untrimmed. Delay foliar spray until rain clears.',
      irrigationAdvice: 'Soil moisture is 31%. Delay scheduled irrigation for 24h to avoid creating humid microclimate.',
      sustainabilityImpact: 'Precision spot-pruning prevents blanket chemical spraying, saving approximately 45L of fungicide runoff.'
    }
  },
  {
    id: 'diag-potato-02',
    crop: 'potato',
    variety: 'Kufri Jyoti',
    growthStage: 'Tuber bulking',
    diseaseName: 'Healthy Foliage',
    pathogenName: 'No Pathogen Detected (Vigorous Canopy)',
    isHealthy: true,
    confidence: 97,
    severity: 'low',
    detectedAt: 'Yesterday, 4:30 PM',
    imageUrl: SAMPLE_LEAF_IMAGES.healthyWheat,
    fieldLocation: 'Field C (East)',
    shortExplanation: 'No fungal lesions, pest punctures, or nutrient deficiencies detected. Leaf chlorophyll density is uniform and optimal.',
    symptomsMatched: [
      'Uniform green pigment across leaflet surface',
      'Clean venation with no necrotic lesions or streaks',
      'Absence of late blight water-soaked lesions',
      'Firm upright leaf posture indicating healthy cellular turgor'
    ],
    symptomsRuledOut: [
      'Late Blight: Ruled out due to absence of water-soaked grayish margins',
      'Early Blight: Ruled out due to lack of concentric target spots',
      'Nutrient Deficiency: Ruled out due to absence of interveinal chlorosis'
    ],
    treatmentProtocols: {
      organic: 'Maintain natural biological soil amendments and vermicompost tea during root crown development.',
      conventional: 'No synthetic chemicals required. Prophylactic sprays strictly discouraged.',
      dosage: '0 kg chemical input required. Save farm expenditure.',
      applicationTiming: 'Routine field scouting every 3-4 days during active tillering.'
    },
    precautions: [
      'Continue current balanced nitrogen-potash fertilization schedule.',
      'Maintain regular scout walks twice a week during foggy mornings.'
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Maintain current cultural practices',
        description: 'Crop canopy development is right on track. No preventive fungicide needed at this stage.',
        timing: 'Ongoing'
      },
      {
        step: 2,
        title: 'Monitor tillering density',
        description: 'Verify tillers count per square meter to adjust secondary irrigation schedule.',
        timing: 'Next 3 days'
      }
    ],
    relatedInsights: {
      weatherRisk: 'Moderate morning dew expected. No late blight risk flagged for this field cluster.',
      irrigationAdvice: 'Soil moisture at 26% is approaching refill point. Let forecasted rain irrigate naturally.',
      sustainabilityImpact: 'Zero pesticide footprint maintained for Field C this cycle.'
    }
  },
  {
    id: 'diag-pepper-03',
    crop: 'pepper_bell',
    variety: 'California Wonder',
    growthStage: 'Fruit set',
    diseaseName: 'Bacterial Leaf Spot',
    pathogenName: 'Xanthomonas spp. (Bacterial)',
    isHealthy: false,
    confidence: 86,
    severity: 'moderate',
    detectedAt: '2 days ago',
    imageUrl: SAMPLE_LEAF_IMAGES.cottonBlight,
    fieldLocation: 'Field B (Block 1)',
    shortExplanation: 'Early bacterial lesions detected along secondary vein boundaries on pepper foliage.',
    symptomsMatched: [
      'Angular water-soaked spots strictly delimited by small leaf veins',
      'Lesions darkening from translucent yellow to reddish-brown',
      'Lower leaf surface bacterial exudate visible in humid conditions'
    ],
    symptomsRuledOut: [
      'Early Blight: Ruled out due to absence of concentric target rings',
      'Powdery Mildew: Ruled out due to lack of white mycelial patches',
      'Alternaria Leaf Spot: Ruled out because lesions are angular rather than circular',
      'Cercospora Leaf Spot: Ruled out due to absence of purple borders with white centers',
      'Target Spot: Ruled out due to lack of large concentric rings'
    ],
    treatmentProtocols: {
      organic: 'Copper Oxychloride 50 WP (2.5g/L) + Pseudomonas fluorescens biological spray.',
      conventional: 'Streptocycline (1g per 10L water) combined with Copper Oxychloride 50 WP (25g).',
      dosage: '450 liters solution per acre targeted at canopy foliage.',
      applicationTiming: 'Apply immediately post-rain once leaf surface is dry.'
    },
    precautions: [
      'Do not walk through wet pepper fields to prevent mechanical transmission.',
      'Improve furrow drainage to avoid standing water pockets.'
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Apply Streptocycline + Copper Oxychloride',
        description: 'Spray Streptocycline (1g in 10L water) combined with Copper Oxychloride (25g).',
        timing: 'Within 24 hours (post-rain dry spell)'
      },
      {
        step: 2,
        title: 'Scout adjacent squares',
        description: 'Inspect flowering squares for water-soaked black spots to prevent boll rot.',
        timing: 'In 3 days'
      }
    ],
    relatedInsights: {
      weatherRisk: 'Warm temperatures (28°C) and high humidity (68%) favor bacterial multiplication.',
      irrigationAdvice: 'Field B soil moisture is 48% (optimal). Suspend irrigation to prevent humidity spikes.',
      sustainabilityImpact: 'Spot-treating prevents field-wide spread, saving 30% chemical cost.'
    }
  }
];

export const TODAY_ACTIONS: ActionItem[] = [
  {
    id: 'act-1',
    title: 'Delay Irrigation on Field A & Field C',
    category: 'irrigation',
    priority: 'urgent',
    actionText: 'Postpone scheduled irrigation cycle. High rain probability with expected precipitation within 24h.',
    reason: 'Running pumps today would over-saturate roots and waste water.',
    cropAffected: 'Tomato & Wheat',
    completed: false,
    timeframe: 'Action by 10:00 AM',
    actionRoute: 'irrigation'
  },
  {
    id: 'act-2',
    title: 'Prune Early Blight Infected Leaves in Field A',
    category: 'crop_protection',
    priority: 'urgent',
    actionText: 'Clip off lower diseased tomato leaves before expected rain to prevent rain-splash spore dispersion.',
    reason: 'Alternaria solani spores splash to healthy upper leaves during rain showers if left unpruned.',
    cropAffected: 'Tomato (Plot 2)',
    completed: false,
    timeframe: 'Complete before rain (Target 11:30 AM)',
    actionRoute: 'diagnose'
  },
  {
    id: 'act-3',
    title: 'Hold Chemical Sprays until Dry Window Opens',
    category: 'weather',
    priority: 'recommended',
    actionText: 'Weather forecast indicates poor spray adhesion window today due to impending rainfall.',
    reason: 'Spraying bio-fungicides today risks chemical wash-off and non-target environmental runoff.',
    cropAffected: 'Cotton & Tomato',
    completed: false,
    timeframe: 'Next 36 hours',
    actionRoute: 'weather'
  },
  {
    id: 'act-4',
    title: 'Inspect Soil Moisture Sensor C-2 in Field C',
    category: 'field_work',
    priority: 'informational',
    actionText: 'Routine verification: Sensor C-2 reading 26% root-zone moisture.',
    reason: 'Confirm sensor calibration before the rainy spell begins.',
    cropAffected: 'Wheat (Crown Root)',
    completed: true,
    timeframe: 'Completed at 7:30 AM',
    actionRoute: 'irrigation'
  }
];

export const CURRENT_WEATHER: WeatherCondition = {
  temperature: 30,
  feelsLike: 34,
  condition: 'Overcast (Precipitation Expected)',
  rainProbability: 80,
  humidity: 67,
  windSpeedKmH: 13,
  uvIndex: 6,
  rainfallExpectedMm: 10.7,
  forecastSummary: 'Precipitation expected within the next 24 hours across Anand agricultural zone.',
  agriculturalAdvice: 'Rain likely within 24 hours. Delay irrigation today. Avoid foliar chemical sprays until rain passes.'
};

export const HOURLY_FORECASTS: HourlyForecast[] = [
  { time: '08:00 AM', temp: 28, rainProbability: 80, condition: 'Overcast', spraySuitability: 'unfavorable', sprayNote: 'High humidity, precipitation approaching' },
  { time: '11:00 AM', temp: 30, rainProbability: 61, condition: 'Overcast', spraySuitability: 'caution', sprayNote: 'Cloud buildup; shower chance' },
  { time: '02:00 PM', temp: 33, rainProbability: 20, condition: 'Overcast', spraySuitability: 'caution', sprayNote: 'Monitor cloud cover' },
  { time: '05:00 PM', temp: 30, rainProbability: 25, condition: 'Moderate Drizzle', spraySuitability: 'unfavorable', sprayNote: 'Drizzle active' },
  { time: '08:00 PM', temp: 26, rainProbability: 59, condition: 'Light Drizzle', spraySuitability: 'unfavorable', sprayNote: 'Night runoff; pumps should stay off' },
  { time: '11:00 PM', temp: 25, rainProbability: 69, condition: 'Light Rain Showers', spraySuitability: 'unfavorable', sprayNote: 'Showers active' },
  { time: '06:00 AM', temp: 28, rainProbability: 41, condition: 'Clearing skies', spraySuitability: 'caution', sprayNote: 'High morning moisture' }
];

export const DAILY_FORECASTS: DailyForecast[] = [
  {
    day: 'Today',
    date: 'Sep 12',
    maxTemp: 33,
    minTemp: 25,
    condition: 'Thunderstorm / Showers',
    rainProbability: 80,
    rainfallMm: 10.7,
    farmAdvisory: 'Delay irrigation. Prune infected leaves early. Keep tractors off wet clay rows.'
  },
  {
    day: 'Tomorrow',
    date: 'Sep 11',
    maxTemp: 29,
    minTemp: 22,
    condition: 'Passing Showers',
    rainProbability: 45,
    rainfallMm: 4.2,
    farmAdvisory: 'Inspect field runoff drainage. Hold supplementary irrigation.'
  },
  {
    day: 'Friday',
    date: 'Sep 12',
    maxTemp: 31,
    minTemp: 23,
    condition: 'Mostly Sunny',
    rainProbability: 15,
    rainfallMm: 0.0,
    farmAdvisory: 'Optimal window for protective fungicide spraying and scouting.'
  },
  {
    day: 'Saturday',
    date: 'Sep 13',
    maxTemp: 32,
    minTemp: 24,
    condition: 'Partly Cloudy',
    rainProbability: 20,
    rainfallMm: 0.0,
    farmAdvisory: 'Good field workability. Re-evaluate soil moisture sensor logs.'
  },
  {
    day: 'Sunday',
    date: 'Sep 14',
    maxTemp: 33,
    minTemp: 24,
    condition: 'Sunny & Dry',
    rainProbability: 10,
    rainfallMm: 0.0,
    farmAdvisory: 'Standard drip irrigation schedule can resume if moisture drops <35%.'
  }
];

export const IRRIGATION_ZONES: IrrigationZone[] = [
  {
    id: 'zone-1',
    name: 'Field A (Plot 2) — Tomato',
    crop: 'tomato',
    growthStage: 'Fruiting (Week 9)',
    soilMoistureCurrent: 31,
    soilMoistureTarget: 45,
    status: 'delay_recommended',
    rainProbability: 80,
    soilType: 'Sandy Loam',
    rootDepth: '45 cm',
    lastIrrigated: '3 days ago',
    recommendation: 'Delay irrigation today. Natural rainfall is forecasted. Running drip today causes waterlogging and fungal spread.',
    waterSavedLitres: 1850
  },
  {
    id: 'zone-2',
    name: 'Field B (Block 1) — Potato',
    crop: 'potato',
    growthStage: 'Tuber bulking',
    soilMoistureCurrent: 48,
    soilMoistureTarget: 50,
    status: 'optimal',
    rainProbability: 80,
    soilType: 'Clay Loam',
    rootDepth: '60 cm',
    lastIrrigated: 'Yesterday',
    recommendation: 'Optimal soil moisture for this growth stage based on weather-linked estimate. Confirm with field check or IoT.',
    waterSavedLitres: 0
  },
  {
    id: 'zone-3',
    name: 'Field C (East) — Pepper Bell',
    crop: 'pepper_bell',
    growthStage: 'Fruit set',
    soilMoistureCurrent: 26,
    soilMoistureTarget: 40,
    status: 'needs_irrigation',
    rainProbability: 80,
    soilType: 'Loam',
    rootDepth: '30 cm',
    lastIrrigated: '5 days ago',
    recommendation: 'Root zone moisture is below target. Prefer waiting for forecasted rain unless plants show wilting.',
    waterSavedLitres: 920
  },
];

export const SUSTAINABILITY_DATA: SustainabilityMetric = {
  overallScore: 84,
  waterEfficiencyScore: 92,
  chemicalReductionScore: 78,
  soilHealthScore: 81,
  waterSavedMonthLitres: 14200,
  carbonOffsetKg: 48.2,
  runoffPreventedKg: 4.8,
  improvements: [
    {
      id: 'imp-1',
      title: 'Expand straw mulching to Field B potato furrows',
      impact: 'Reduces soil evaporation by 22% and lowers weed germination.',
      potentialPoints: 4,
      category: 'Water & Soil Conservation'
    },
    {
      id: 'imp-2',
      title: 'Adopt Trichoderma biological agent over synthetic spray',
      impact: 'Decreases chemical input footprint by an additional 12%.',
      potentialPoints: 3,
      category: 'Chemical Reduction'
    },
    {
      id: 'imp-3',
      title: 'Solar pump timer integration with weather forecast',
      impact: 'Eliminates unnecessary electric grid draw on cloudy/rainy days.',
      potentialPoints: 5,
      category: 'Energy & Carbon'
    }
  ]
};

export const SUSTAINABILITY_METRICS = SUSTAINABILITY_DATA;

export const INITIAL_CHAT_MESSAGES: AssistantMessage[] = [
  {
    id: 'msg-1',
    sender: 'assistant',
    timestamp: '8:30 AM',
    text: 'Good morning, Patel Farm. I have reviewed your current farm conditions: Field A has a Moderate Early Blight detection, and there is a high rain forecast within 24 hours. How can I assist your field operations today?',
    contextTag: 'Patel Farm • Anand, Gujarat',
    actionSuggestions: [
      'What should I do about Tomato Early Blight?',
      'Can I irrigate Field A today?',
      'Explain this disease in simple Gujarati or Hindi',
      'What should I check tomorrow morning?'
    ]
  }
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Tomato — Early Blight detected',
    desc: 'Alternaria solani confirmed on Field A (Plot 2) with 91% confidence. Leaf pruning recommended prior to rainfall.',
    time: '2 minutes ago',
    status: 'urgent',
    statusLabel: 'Critical',
    actionScreen: 'diagnosis-result',
    actionLabel: 'View Diagnosis Advisory',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'Precipitation Alert for Anand',
    desc: 'Precipitation expected in Anand district. High spray wash-off risk.',
    time: '1 hour ago',
    status: 'warning',
    statusLabel: 'Weather Alert',
    actionScreen: 'weather',
    actionLabel: 'Check Weather Timeline',
    read: false,
  },
  {
    id: 'notif-3',
    title: 'Irrigation recommendation updated',
    desc: 'Irrigation delay advised for Field A & Field C. Natural rain will replenish soil root zone without pump power.',
    time: 'Today',
    status: 'delay',
    statusLabel: 'Water Advisory',
    actionScreen: 'irrigation',
    actionLabel: 'View Soil Telemetry',
    read: false,
  },
  {
    id: 'notif-4',
    title: 'Water savings milestone: 14,200 L saved',
    desc: 'Weather-integrated delay logic saved 14,200 Liters of ground pump water this month.',
    time: 'Yesterday',
    status: 'healthy',
    statusLabel: 'Savings',
    actionScreen: 'sustainability',
    actionLabel: 'View Impact Scorecard',
    read: true,
  },
];

