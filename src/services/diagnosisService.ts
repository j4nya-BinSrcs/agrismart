import { DiagnosisRecord, DiagnosisAnalysisRequest } from '../types';
import { INITIAL_DIAGNOSES, SAMPLE_LEAF_IMAGES } from '../data/mockData';
import { getStoredItem, setStoredItem } from '../utils/storage';

const DIAGNOSES_STORAGE_KEY = 'diagnoses_history';

export const diagnosisService = {
  async getDiagnosisHistory(): Promise<DiagnosisRecord[]> {
    return getStoredItem<DiagnosisRecord[]>(DIAGNOSES_STORAGE_KEY, INITIAL_DIAGNOSES);
  },

  async getDiagnosisById(id: string): Promise<DiagnosisRecord | null> {
    const list = await this.getDiagnosisHistory();
    return list.find((d) => d.id === id) || null;
  },

  async saveDiagnosis(record: DiagnosisRecord): Promise<DiagnosisRecord[]> {
    const current = await this.getDiagnosisHistory();
    const updated = [record, ...current.filter((d) => d.id !== record.id)];
    setStoredItem(DIAGNOSES_STORAGE_KEY, updated);
    return updated;
  },

  /**
   * Mock analytical inference pipeline ready for real Phase 6 API / Gemini integration.
   */
  async analyzeCrop(
    request: DiagnosisAnalysisRequest,
    onProgress?: (step: string) => void
  ): Promise<DiagnosisRecord> {
    onProgress?.('Calibrating color balance & leaf morphology...');
    await new Promise((resolve) => setTimeout(resolve, 350));

    onProgress?.('Scanning concentric lesion rings & pathogen markers...');
    await new Promise((resolve) => setTimeout(resolve, 400));

    onProgress?.('Cross-referencing Anand microclimate & rainfall forecast...');
    await new Promise((resolve) => setTimeout(resolve, 350));

    const isHealthyWheat = request.crop === 'Wheat' && request.imageUrl === SAMPLE_LEAF_IMAGES.healthyWheat;
    const isCotton = request.crop === 'Cotton' || request.imageUrl === SAMPLE_LEAF_IMAGES.cottonBlight;
    const isPotato = request.crop === 'Potato' || request.imageUrl === SAMPLE_LEAF_IMAGES.potatoLateBlight;

    if (isHealthyWheat) {
      return {
        id: `diag-wheat-${Date.now()}`,
        crop: 'Wheat',
        variety: request.variety || 'GW-496',
        growthStage: request.growthStage || 'Tillering stage',
        diseaseName: 'Healthy Foliage',
        pathogenName: 'No Pathogen Detected (Vigorous Canopy)',
        isHealthy: true,
        confidence: 97,
        severity: 'low',
        detectedAt: 'Just now',
        imageUrl: request.imageUrl,
        fieldLocation: request.fieldLocation || 'Field C (East)',
        shortExplanation: 'No fungal lesions, pest punctures, or nutrient deficiencies detected. Leaf chlorophyll density is uniform and optimal.',
        symptomsMatched: [
          'Uniform green pigment index (SPAD ~44.2) across blade length',
          'Clean parallel leaf venation with no necrotic lesions or streaks',
          'Absence of rust pustules (Puccinia striiformis or P. triticina)',
          'Firm upright leaf posture indicating healthy cellular turgor'
        ],
        symptomsRuledOut: [
          'Yellow Stripe Rust: Ruled out due to absence of linear chlorotic stripes',
          'Powdery Mildew: Ruled out due to lack of white superficial mycelial patches'
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
          weatherRisk: 'Moderate morning dew expected. No rust risk detected in Anand district cluster.',
          irrigationAdvice: 'Soil moisture at 26% is approaching refill point. Let forecasted rain irrigate naturally.',
          sustainabilityImpact: 'Zero pesticide footprint maintained for Field C this cycle.'
        }
      };
    }

    if (isCotton) {
      return {
        id: `diag-cotton-${Date.now()}`,
        crop: 'Cotton',
        variety: request.variety || 'Bt Cotton Hybrid',
        growthStage: request.growthStage || 'Squaring Stage',
        diseaseName: 'Bacterial Blight (Angular Leaf Spot)',
        pathogenName: 'Xanthomonas citri pv. malvacearum (Bacterial)',
        isHealthy: false,
        confidence: 86,
        severity: 'moderate',
        detectedAt: 'Just now',
        imageUrl: request.imageUrl,
        fieldLocation: request.fieldLocation || 'Field B (Block 1)',
        shortExplanation: 'Angular water-soaked lesions detected along small leaf vein boundaries. Bacterial pathogen Xanthomonas confirmed.',
        symptomsMatched: [
          'Angular water-soaked spots strictly delimited by small leaf veins',
          'Lesions darkening from translucent yellow to reddish-brown',
          'Lower leaf surface bacterial exudate visible in humid conditions'
        ],
        symptomsRuledOut: [
          'Alternaria Leaf Spot: Ruled out because lesions are angular rather than circular',
          'Target Spot: Ruled out due to lack of large concentric rings'
        ],
        treatmentProtocols: {
          organic: 'Copper Oxychloride 50 WP (2.5g/L) + Pseudomonas fluorescens biological spray.',
          conventional: 'Streptocycline (1g per 10L water) combined with Copper Oxychloride 50 WP (25g).',
          dosage: '450 liters solution per acre targeted at canopy foliage.',
          applicationTiming: 'Apply immediately post-rain once leaf surface is dry.'
        },
        precautions: [
          'Do not walk through wet cotton rows to prevent bacterial transmission.',
          'Ensure furrow drainage to avoid standing water.'
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
      };
    }

    if (isPotato) {
      return {
        id: `diag-potato-${Date.now()}`,
        crop: 'Potato',
        variety: request.variety || 'Kufri Jyoti',
        growthStage: request.growthStage || 'Tuber Initiation',
        diseaseName: 'Potato Late Blight',
        pathogenName: 'Phytophthora infestans (Oomycete)',
        isHealthy: false,
        confidence: 93,
        severity: 'high',
        detectedAt: 'Just now',
        imageUrl: request.imageUrl,
        fieldLocation: request.fieldLocation || 'Field D (Trial)',
        shortExplanation: 'Rapidly spreading dark water-soaked necrotic lesions on leaf margins with chlorotic borders caused by Phytophthora infestans.',
        symptomsMatched: [
          'Water-soaked necrotic dark brown margins',
          'Pale yellow border halo separating necrotic lesion from green leaf tissue',
          'High vulnerability to rapid sporulation in humid environments'
        ],
        symptomsRuledOut: [
          'Early Blight: Ruled out due to absence of concentric target rings'
        ],
        treatmentProtocols: {
          organic: 'Bordeaux mixture 1% or Copper Hydroxide (2.5g/L).',
          conventional: 'Cymoxanil + Mancozeb (2g/L) or Metalaxyl-M + Mancozeb (2.5g/L).',
          dosage: '500 liters spray volume per acre with fine mist nozzle.',
          applicationTiming: 'Execute targeted spray within 12 hours before rainfall expands lesion borders.'
        },
        precautions: [
          'Destroy infected haulms immediately if disease advances to stems.',
          'Avoid overhead sprinkler irrigation completely.'
        ],
        recommendedActions: [
          {
            step: 1,
            title: 'Emergency foliar fungicide application',
            description: 'Apply systemic Oomycete-targeted fungicide before approaching rainfall event.',
            timing: 'Immediate'
          },
          {
            step: 2,
            title: 'Hill soil over potato ridges',
            description: 'Ensure tubers are covered with at least 8cm soil to prevent spore washdown.',
            timing: 'Tomorrow morning'
          }
        ],
        relatedInsights: {
          weatherRisk: 'Impending 82% rain creates high spore germination risk for Phytophthora.',
          irrigationAdvice: 'Completely stop supplemental irrigation.',
          sustainabilityImpact: 'Targeted early intervention prevents losing entire tuber yield.'
        }
      };
    }

    // Default: Tomato Early Blight
    return {
      id: `diag-tomato-${Date.now()}`,
      crop: request.crop || 'Tomato',
      variety: request.variety || 'Abhinav Hybrid',
      growthStage: request.growthStage || 'Fruiting (Week 9)',
      diseaseName: 'Tomato Early Blight',
      pathogenName: 'Alternaria solani (Fungal Pathogen)',
      isHealthy: false,
      confidence: 91,
      severity: 'moderate',
      detectedAt: 'Just now',
      imageUrl: request.imageUrl,
      fieldLocation: request.fieldLocation || 'Field A (Plot 2)',
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
        weatherRisk: 'Rain forecasted (82%) will splash spores if leaves remain untrimmed. Delay foliar spray until rain clears.',
        irrigationAdvice: 'Soil moisture is 31%. Delay scheduled irrigation for 24h to avoid creating humid microclimate.',
        sustainabilityImpact: 'Precision spot-pruning prevents blanket chemical spraying, saving approximately 45L of fungicide runoff.'
      }
    };
  }
};
