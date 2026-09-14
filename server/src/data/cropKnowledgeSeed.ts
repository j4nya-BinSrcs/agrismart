import type { DiseaseInfo, SupportedCrop } from '../models/CropKnowledge.js';

export interface CropKnowledgeSeedEntry {
  crop: SupportedCrop;
  diseases: DiseaseInfo[];
}

const tomatoDiseases: DiseaseInfo[] = [
  {
    diseaseName: 'Healthy',
    pathogenName: 'None',
    isHealthy: true,
    symptoms: [
      {
        name: 'Uniform green foliage',
        description: 'Leaves show even colour with no necrotic spots, chlorotic halos, or wilting.',
        severity: 'low',
      },
      {
        name: 'Firm stems and fruit',
        description: 'Stems are turgid; fruit set is normal without soft rot or unusual lesions.',
        severity: 'low',
      },
    ],
    treatmentProtocols: {
      organic: 'Maintain preventive neem oil (3–5 ml/L) or Trichoderma-based biofungicide sprays during humid weeks.',
      conventional: 'No curative spray required. Keep a protectant copper or mancozeb schedule only if local disease pressure rises.',
      dosage: 'Preventive botanical spray: 3–5 ml/L; biofungicide per product label (typically 5–10 g/L).',
      applicationTiming: 'Early morning every 10–14 days during monsoon or high humidity; skip if rain is imminent.',
    },
    precautions: [
      'Use certified disease-free seed and resistant hybrids where available.',
      'Mulch beds (≈5 cm) to reduce soil splash onto lower leaves.',
      'Avoid overhead irrigation; prefer drip lines.',
      'Sanitize pruning tools between plants.',
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Continue routine scouting',
        description: 'Walk diagonally across the block and inspect 10–15 plants for early leaf spots or whitefly clusters.',
        timing: 'Twice weekly',
      },
      {
        step: 2,
        title: 'Maintain canopy airflow',
        description: 'Remove suckers and overcrowded lower leaves so foliage dries quickly after dew.',
        timing: 'Weekly during vegetative growth',
      },
      {
        step: 3,
        title: 'Record weather and irrigation',
        description: 'Log leaf-wetness hours and soil moisture so preventive sprays can be timed accurately.',
        timing: 'Ongoing',
      },
    ],
    relatedInsights: {
      weatherRisk: 'Healthy stands remain at risk when nights are cool and humid (>85% RH) with prolonged leaf wetness.',
      irrigationAdvice: 'Keep soil evenly moist with drip; avoid wetting foliage overnight.',
      sustainabilityImpact: 'Preventive cultural practices cut unnecessary fungicide use and protect beneficial insects.',
    },
  },
  {
    diseaseName: 'Early Blight',
    pathogenName: 'Alternaria solani',
    isHealthy: false,
    symptoms: [
      {
        name: 'Target-spot lesions',
        description: 'Concentric ring (bullseye) brown spots on older lower leaves, often with a yellow halo.',
        severity: 'moderate',
      },
      {
        name: 'Defoliation from base upward',
        description: 'Infected leaves yellow, dry, and drop, exposing fruit to sunscald.',
        severity: 'high',
      },
      {
        name: 'Stem and fruit lesions',
        description: 'Dark elongated stem cankers and leathery fruit spots near the stem end in severe cases.',
        severity: 'severe',
      },
    ],
    treatmentProtocols: {
      organic: 'Remove infected lower leaves; spray copper hydroxide or Bordeaux mixture, and apply Trichoderma harzianum as a soil drench.',
      conventional: 'Rotate protectant fungicides such as mancozeb or chlorothalonil with systemic options (e.g. azoxystrobin or difenoconazole) per local label.',
      dosage: 'Mancozeb 2–2.5 g/L or copper hydroxide per label (often 2–3 g/L); systemic partners at labeled rates only.',
      applicationTiming: 'At first lesions, then every 7–10 days while humidity stays high; spray early morning on dry foliage.',
    },
    precautions: [
      'Do not compost symptomatic debris; bag and dispose away from the field.',
      'Rotate tomato/potato out of the same bed for at least 2–3 years.',
      'Avoid nitrogen excess that creates dense, long-wet canopies.',
      'Observe pre-harvest intervals on all synthetic fungicides.',
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Sanitize the lower canopy',
        description: 'Prune and remove all leaves with target spots; disinfect shears between plants.',
        timing: 'Immediately',
      },
      {
        step: 2,
        title: 'Start protectant spray program',
        description: 'Apply an organic copper or labeled protectant fungicide covering both leaf surfaces.',
        timing: 'Within 24 hours',
      },
      {
        step: 3,
        title: 'Improve mulch and spacing',
        description: 'Refresh mulch and stake plants to reduce soil splash and speed drying.',
        timing: 'Within 3 days',
      },
      {
        step: 4,
        title: 'Monitor upward spread',
        description: 'Re-scout mid and upper canopy; escalate to KVK if lesions progress rapidly.',
        timing: 'Every 3–4 days for 2 weeks',
      },
    ],
    relatedInsights: {
      weatherRisk: 'Warm days (24–29°C) with frequent dew or light rain strongly favour Alternaria sporulation.',
      irrigationAdvice: 'Switch fully to drip; never water from overhead during an outbreak.',
      sustainabilityImpact: 'Targeted lower-leaf removal plus protectants reduces the need for repeated systemic sprays.',
    },
  },
  {
    diseaseName: 'Late Blight',
    pathogenName: 'Phytophthora infestans',
    isHealthy: false,
    symptoms: [
      {
        name: 'Water-soaked leaf lesions',
        description: 'Irregular, greasy olive-to-brown patches that expand rapidly from leaf margins or tips.',
        severity: 'high',
      },
      {
        name: 'White sporulation on undersides',
        description: 'Fuzzy white mycelium/sporangia on leaf undersides in cool, moist mornings.',
        severity: 'severe',
      },
      {
        name: 'Fruit and stem blight',
        description: 'Firm brown fruit lesions and dark stem streaks; plants can collapse within days.',
        severity: 'severe',
      },
    ],
    treatmentProtocols: {
      organic: 'Destroy heavily infected plants; apply copper-based protectants and improve ventilation. Bio-control options have limited curative effect once established.',
      conventional: 'Use labeled late-blight fungicides (e.g. metalaxyl + mancozeb, cymoxanil + mancozeb, or mandipropamid) in rotation; follow resistance-management guidelines.',
      dosage: 'Follow product label strictly (commonly 2–2.5 g/L for many WP formulations); do not exceed seasonal application caps.',
      applicationTiming: 'At first suspicion or blight-favourable forecast; repeat every 5–7 days in cool wet weather until pressure drops.',
    },
    precautions: [
      'Treat as a quarantine priority — late blight can destroy a crop in under a week.',
      'Remove and destroy volunteer tomatoes/potatoes nearby.',
      'Never save seed from blighted fruit.',
      'Wear PPE and respect PHI for systemic fungicides.',
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Confirm and isolate',
        description: 'Photograph lesions (including leaf undersides) and flag the hotspot; restrict traffic through that row.',
        timing: 'Immediately',
      },
      {
        step: 2,
        title: 'Rogue severely infected plants',
        description: 'Uproot collapsing plants, bag them, and remove from the farm; do not compost.',
        timing: 'Same day',
      },
      {
        step: 3,
        title: 'Apply labeled late-blight fungicide',
        description: 'Spray remaining plants thoroughly, especially leaf undersides, using a resistance-rotation partner.',
        timing: 'Within 12–24 hours',
      },
      {
        step: 4,
        title: 'Alert extension / KVK',
        description: 'Report outbreak for regional monitoring and verify product choice for local resistance patterns.',
        timing: 'Within 48 hours',
      },
    ],
    relatedInsights: {
      weatherRisk: 'Cool nights (10–20°C), fog, and leaf wetness >10 hours create classic late-blight epidemics.',
      irrigationAdvice: 'Stop overhead irrigation immediately; keep foliage dry and reduce evening irrigations.',
      sustainabilityImpact: 'Rapid rogueing and short, well-timed spray windows limit total chemical load versus prolonged epidemics.',
    },
  },
  {
    diseaseName: 'Bacterial Spot',
    pathogenName: 'Xanthomonas spp. (e.g. X. eavesicatoria / X. perforans)',
    isHealthy: false,
    symptoms: [
      {
        name: 'Small water-soaked leaf spots',
        description: 'Tiny dark lesions that become angular with yellow halos; centres may tear out giving a shot-hole look.',
        severity: 'moderate',
      },
      {
        name: 'Raised fruit scabs',
        description: 'Slightly raised, scabby spots on green fruit that reduce marketability.',
        severity: 'high',
      },
      {
        name: 'Stem streaking',
        description: 'Dark elongated lesions on petioles and stems under warm, wet conditions.',
        severity: 'moderate',
      },
    ],
    treatmentProtocols: {
      organic: 'Use certified clean seed; apply copper + mancozeb-equivalent protectant programs carefully, and biologicals such as Bacillus subtilis where labeled.',
      conventional: 'Copper bactericides tank-mixed with mancozeb (where permitted) at first symptoms; antibiotics are generally not recommended for field tomato.',
      dosage: 'Copper hydroxide typically 2–3 g/L per label; do not exceed copper seasonal limits to avoid phytotoxicity.',
      applicationTiming: 'Begin at transplant or first spots; reapply every 7 days during rainy periods.',
    },
    precautions: [
      'Bacteria spread on tools, hands, and splashing water — sanitize frequently.',
      'Avoid working the crop when leaves are wet.',
      'Do not save seed from spotted fruit.',
      'Rotate away from solanaceous crops for 2–3 years.',
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Stop overhead watering',
        description: 'Convert to drip and keep workers out of wet rows.',
        timing: 'Immediately',
      },
      {
        step: 2,
        title: 'Remove heavily spotted foliage',
        description: 'Prune worst leaves and dispose off-site; wash hands and tools afterward.',
        timing: 'Same day',
      },
      {
        step: 3,
        title: 'Start copper protectant program',
        description: 'Apply labeled copper (± mancozeb where legal) covering new growth.',
        timing: 'Within 24 hours',
      },
      {
        step: 4,
        title: 'Scout fruit for scabs',
        description: 'Grade and separate spotted fruit; adjust harvest timing if lesions expand.',
        timing: 'Every harvest cycle',
      },
    ],
    relatedInsights: {
      weatherRisk: 'Warm temperatures (25–30°C) with wind-driven rain splash accelerate bacterial spot epidemics.',
      irrigationAdvice: 'Drip only; never irrigate from above during outbreaks.',
      sustainabilityImpact: 'Sanitation and drip conversion reduce copper dependency over the season.',
    },
  },
  {
    diseaseName: 'Leaf Mold',
    pathogenName: 'Passalora fulva (syn. Cladosporium fulvum)',
    isHealthy: false,
    symptoms: [
      {
        name: 'Pale chlorotic upper-leaf patches',
        description: 'Diffuse yellow spots on the upper leaf surface, usually starting in the lower canopy.',
        severity: 'moderate',
      },
      {
        name: 'Olive-green fuzzy mold beneath',
        description: 'Velvety olive-to-brown sporulation covering the undersides of chlorotic areas.',
        severity: 'high',
      },
      {
        name: 'Leaf curling and drop',
        description: 'Severely affected leaves curl, brown, and abscise, reducing photosynthetic area.',
        severity: 'high',
      },
    ],
    treatmentProtocols: {
      organic: 'Increase greenhouse/polyhouse ventilation; remove infected leaves; apply sulfur or potassium bicarbonate sprays where labeled.',
      conventional: 'Use labeled fungicides effective on leaf mold (e.g. chlorothalonil, difenoconazole, or local alternatives) in rotation.',
      dosage: 'Follow product label (often 1–2 ml/L for ECs or 2 g/L for WPs); ensure underside coverage.',
      applicationTiming: 'At first chlorotic patches; repeat every 7–10 days while RH remains high indoors.',
    },
    precautions: [
      'Most severe in protected culture with poor airflow and RH >85%.',
      'Choose resistant cultivars (Cf genes) for greenhouse production.',
      'Avoid dense planting and excessive nitrogen.',
      'Remove plant debris between crop cycles.',
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Ventilate and dehumidify',
        description: 'Open side vents, run fans, and reduce night humidity in protected structures.',
        timing: 'Immediately',
      },
      {
        step: 2,
        title: 'Strip infected lower leaves',
        description: 'Remove molded leaves carefully into bags to limit spore release.',
        timing: 'Same day',
      },
      {
        step: 3,
        title: 'Apply underside-targeted spray',
        description: 'Spray fungicide or organic protectant with nozzles angled to hit leaf undersides.',
        timing: 'Within 24 hours',
      },
    ],
    relatedInsights: {
      weatherRisk: 'Prolonged high humidity in greenhouses, especially cool nights after warm days, drives Passalora epidemics.',
      irrigationAdvice: 'Water early in the day via drip so foliage and structure dry before nightfall.',
      sustainabilityImpact: 'Climate control (ventilation) often outperforms chemistry for leaf mold management.',
    },
  },
  {
    diseaseName: 'Tomato Yellow Leaf Curl Virus',
    pathogenName: 'Tomato yellow leaf curl virus (TYLCV), transmitted by Bemisia tabaci',
    isHealthy: false,
    symptoms: [
      {
        name: 'Upward leaf cupping and yellowing',
        description: 'Young leaves curl upward, become chlorotic, and appear thickened or leathery.',
        severity: 'high',
      },
      {
        name: 'Stunted plant architecture',
        description: 'Internodes shorten; plants remain bushy and dwarfed if infected early.',
        severity: 'severe',
      },
      {
        name: 'Flower drop and poor fruit set',
        description: 'Severe reduction in flowers and fruit; remaining fruit may be small.',
        severity: 'severe',
      },
    ],
    treatmentProtocols: {
      organic: 'No curative spray exists. Use reflective mulches, insect-proof netting, remove infected plants, and release/encourage whitefly natural enemies.',
      conventional: 'Manage the whitefly vector with labeled insecticides in rotation (e.g. spiromesifen, cyantraniliprole, or local IRAC-rotated options); install virus-resistant hybrids.',
      dosage: 'Insecticide rates strictly per label; rotate IRAC modes of action every application window.',
      applicationTiming: 'Begin vector management at nursery stage; rogue symptomatic plants as soon as curl appears.',
    },
    precautions: [
      'TYLCV is not cured by fungicides — do not waste fungicide sprays on virus symptoms.',
      'Control weeds that harbour whiteflies near the field.',
      'Use virus-free transplants from screened nurseries.',
      'Destroy infected plants promptly to reduce inoculum.',
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Rogue symptomatic plants',
        description: 'Uproot curled, stunted plants and bury or bag them away from the block.',
        timing: 'Immediately',
      },
      {
        step: 2,
        title: 'Suppress whitefly populations',
        description: 'Deploy yellow sticky traps and apply an IRAC-rotated insecticide or oils/soaps where appropriate.',
        timing: 'Within 24 hours',
      },
      {
        step: 3,
        title: 'Protect new plantings',
        description: 'Use insect-proof nursery nets and TYLCV-resistant varieties for the next cycle.',
        timing: 'Before next transplant',
      },
    ],
    relatedInsights: {
      weatherRisk: 'Hot, dry spells favour Bemisia tabaci flights and rapid TYLCV spread.',
      irrigationAdvice: 'Balanced drip irrigation reduces plant stress that worsens virus expression; avoid water stress.',
      sustainabilityImpact: 'Resistant varieties and screened nurseries cut insecticide dependence versus reactive spraying.',
    },
  },
  {
    diseaseName: 'Septoria Leaf Spot',
    pathogenName: 'Septoria lycopersici',
    isHealthy: false,
    symptoms: [
      {
        name: 'Numerous small circular spots',
        description: 'Many 2–3 mm spots with dark borders and tan centres on lower leaves.',
        severity: 'moderate',
      },
      {
        name: 'Black pycnidia in lesion centres',
        description: 'Tiny black fruiting bodies visible in the pale centre of mature spots (hand lens).',
        severity: 'moderate',
      },
      {
        name: 'Progressive defoliation',
        description: 'Spots coalesce; leaves yellow and drop from the bottom of the plant upward.',
        severity: 'high',
      },
    ],
    treatmentProtocols: {
      organic: 'Remove infected leaves; apply copper fungicides or biofungicides; mulch heavily to block splash dispersal.',
      conventional: 'Protectant fungicides such as chlorothalonil or mancozeb at early infection; rotate chemistries.',
      dosage: 'Mancozeb or chlorothalonil typically 2–2.5 g/L per label instructions.',
      applicationTiming: 'At first spots on lower leaves; continue every 7–10 days in wet weather.',
    },
    precautions: [
      'Septoria rarely attacks fruit — focus on foliage protection.',
      'Stake and prune to keep leaves off wet soil.',
      'Rotate out of tomato for 3 years where feasible.',
      'Eliminate solanaceous weeds that host the pathogen.',
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Strip spotted lower leaves',
        description: 'Remove and bag leaves showing tan-centred spots with dark borders.',
        timing: 'Immediately',
      },
      {
        step: 2,
        title: 'Mulch and stake',
        description: 'Add organic mulch and ensure plants are off the soil to stop rain splash.',
        timing: 'Within 48 hours',
      },
      {
        step: 3,
        title: 'Apply protectant fungicide',
        description: 'Spray copper or labeled protectant with good lower-canopy coverage.',
        timing: 'Within 24–48 hours',
      },
    ],
    relatedInsights: {
      weatherRisk: 'Moderate temperatures with frequent rain splash from soil drive Septoria epidemics.',
      irrigationAdvice: 'Use drip irrigation only; keep lower canopy as dry as practical.',
      sustainabilityImpact: 'Mulching and sanitation often reduce spray frequency needed later in the season.',
    },
  },
];

const potatoDiseases: DiseaseInfo[] = [
  {
    diseaseName: 'Healthy',
    pathogenName: 'None',
    isHealthy: true,
    symptoms: [
      {
        name: 'Vigorous green canopy',
        description: 'Uniform leaflets without water-soaked margins, target spots, or premature yellowing.',
        severity: 'low',
      },
      {
        name: 'Clean seed-tuber skins',
        description: 'Harvested or stored tubers show firm flesh without black sclerotia or vascular browning.',
        severity: 'low',
      },
    ],
    treatmentProtocols: {
      organic: 'Plant certified seed; hill well; use Trichoderma seed treatments and preventive copper only under blight forecasts.',
      conventional: 'No curative action needed. Keep a protectant blight schedule ready if regional late-blight warnings issue.',
      dosage: 'Seed treatment and foliar protectants strictly per product labels when preventive use is justified.',
      applicationTiming: 'Preventive foliar sprays only during cool wet forecasts; otherwise cultural management alone.',
    },
    precautions: [
      'Always plant certified disease-free seed tubers.',
      'Destroy volunteers and cull piles that harbour blight.',
      'Hill soil to cover developing tubers and reduce greening/infection.',
      'Clean equipment between fields.',
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Scout canopy edges',
        description: 'Inspect field margins and low spots first for early blight-type lesions after rain.',
        timing: 'Twice weekly in humid weather',
      },
      {
        step: 2,
        title: 'Verify seed source records',
        description: 'Confirm lot certification and note any black scurf history before next planting.',
        timing: 'Pre-planting / ongoing records',
      },
      {
        step: 3,
        title: 'Manage irrigation to canopy closure',
        description: 'Avoid prolonged leaf wetness once rows close; prefer morning irrigation.',
        timing: 'Throughout bulking',
      },
    ],
    relatedInsights: {
      weatherRisk: 'Cool humid spells after canopy closure are the highest risk window for foliar blights.',
      irrigationAdvice: 'Maintain even soil moisture for tuber bulking without overnight wet foliage.',
      sustainabilityImpact: 'Certified seed and sanitation prevent most losses without routine systemic fungicides.',
    },
  },
  {
    diseaseName: 'Early Blight',
    pathogenName: 'Alternaria solani',
    isHealthy: false,
    symptoms: [
      {
        name: 'Target board leaf spots',
        description: 'Dark concentric rings on older leaflets, often starting after flowering.',
        severity: 'moderate',
      },
      {
        name: 'Premature defoliation',
        description: 'Leaves dry from the base of the canopy, reducing tuber bulking.',
        severity: 'high',
      },
      {
        name: 'Tuber surface lesions',
        description: 'Dark, slightly sunken tuber spots that can enlarge in storage.',
        severity: 'moderate',
      },
    ],
    treatmentProtocols: {
      organic: 'Remove severely blighted haulms at season end; apply copper protectants and maintain balanced fertility.',
      conventional: 'Protectant fungicides (mancozeb, chlorothalonil) rotated with strobilurins or triazoles labeled for potato early blight.',
      dosage: 'Common protectant rates ≈2–2.5 g/L; systemic partners per label and resistance guidelines.',
      applicationTiming: 'Begin at first lesions or row closure in high-risk weather; interval 7–10 days.',
    },
    precautions: [
      'Do not confuse with late blight — early blight lesions are drier with concentric rings.',
      'Avoid excessive nitrogen late in the season.',
      'Allow skins to set before harvest to reduce tuber infection.',
      'Rotate out of solanaceous crops.',
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Confirm lesion type',
        description: 'Check for concentric rings vs greasy late-blight patches before choosing chemistry.',
        timing: 'Immediately',
      },
      {
        step: 2,
        title: 'Apply protectant cover spray',
        description: 'Spray labeled early-blight fungicide with full canopy coverage.',
        timing: 'Within 24 hours',
      },
      {
        step: 3,
        title: 'Plan desiccation timing',
        description: 'Schedule haulm kill so skins mature before digging if disease pressure is high.',
        timing: 'Pre-harvest window',
      },
    ],
    relatedInsights: {
      weatherRisk: 'Warm periods with intermittent rain after canopy closure favour Alternaria on potato.',
      irrigationAdvice: 'Avoid frequent light irrigations that keep leaves wet; irrigate deeply and less often.',
      sustainabilityImpact: 'Correct diagnosis prevents unnecessary late-blight systemic sprays.',
    },
  },
  {
    diseaseName: 'Late Blight',
    pathogenName: 'Phytophthora infestans',
    isHealthy: false,
    symptoms: [
      {
        name: 'Greasy leaflet lesions',
        description: 'Water-soaked dark patches that expand quickly, often from leaf tips or margins.',
        severity: 'severe',
      },
      {
        name: 'White fringe on lesion edges',
        description: 'Sporangia visible as a pale ring on lesion undersides in moist air.',
        severity: 'severe',
      },
      {
        name: 'Tuber blight',
        description: 'Reddish-brown granular rot beneath the skin; soft secondary rot in storage.',
        severity: 'severe',
      },
    ],
    treatmentProtocols: {
      organic: 'Destroy cull piles; rogue hotspots; copper protectants offer limited prevention only — act before infection waves.',
      conventional: 'Deploy late-blight specific fungicides (e.g. metalaxyl mixtures, cyazofamid, mandipropamid, fluopicolide) in resistance-smart rotations.',
      dosage: 'Strictly per national/label recommendations; respect maximum applications per MoA group.',
      applicationTiming: 'On blight warnings or first lesions every 5–7 days in cool wet weather; protect new growth.',
    },
    precautions: [
      'Late blight can devastate both foliage and stored tubers — treat urgently.',
      'Kill infected haulms before digging to protect tubers.',
      'Do not store blighted tubers with healthy stock.',
      'Report outbreaks to local plant protection / KVK networks.',
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Isolate the hotspot',
        description: 'Flag affected rows, restrict machinery movement, and photograph lesions for confirmation.',
        timing: 'Immediately',
      },
      {
        step: 2,
        title: 'Apply late-blight fungicide',
        description: 'Spray a labeled curative/protectant product with thorough coverage including undersides.',
        timing: 'Within 12 hours if weather allows',
      },
      {
        step: 3,
        title: 'Protect tubers before harvest',
        description: 'Desiccate haulms and delay digging until skins are set and foliage is dead.',
        timing: 'Before harvest',
      },
      {
        step: 4,
        title: 'Grade storage carefully',
        description: 'Cull soft or discoloured tubers; store only sound stock in cool, ventilated conditions.',
        timing: 'At harvest and into storage',
      },
    ],
    relatedInsights: {
      weatherRisk: 'Nights 10–20°C with fog or long leaf wetness are classic Phytophthora infestans conditions.',
      irrigationAdvice: 'Cease overhead irrigation; keep soil moisture adequate for tubers without wetting canopy.',
      sustainabilityImpact: 'Forecast-based sprays and haulm destruction cut storage losses and waste.',
    },
  },
  {
    diseaseName: 'Black Scurf / Rhizoctonia',
    pathogenName: 'Rhizoctonia solani',
    isHealthy: false,
    symptoms: [
      {
        name: 'Black sclerotia on tubers',
        description: 'Irregular black “dirt that won’t wash off” resting bodies on tuber skins.',
        severity: 'moderate',
      },
      {
        name: 'Stem cankers on sprouts',
        description: 'Reddish-brown sunken lesions on underground stems; delayed or missing emergence.',
        severity: 'high',
      },
      {
        name: 'Malformed tubers',
        description: 'Cracking, misshapen tubers, and aerial tubers when stolons are girdled.',
        severity: 'high',
      },
    ],
    treatmentProtocols: {
      organic: 'Use certified clean seed; treat seed with Trichoderma; improve drainage; widen rotations with cereals.',
      conventional: 'Apply labeled seed-tuber fungicides (e.g. flutolanil, penflufen, or local Rhizoctonia products) and in-furrow treatments where registered.',
      dosage: 'Seed treatment slurry or dust rates per product label based on tuber weight.',
      applicationTiming: 'Treat seed just before planting; avoid planting into cold, wet soils that slow emergence.',
    },
    precautions: [
      'Black scurf is mainly a quality defect but can reduce stands when stem canker is severe.',
      'Do not plant heavily scurfed seed without treatment.',
      'Avoid deep planting in cold soils.',
      'Long rotations reduce soil inoculum.',
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Grade seed tubers',
        description: 'Discard or treat lots with heavy black sclerotia before cutting/planting.',
        timing: 'Pre-planting',
      },
      {
        step: 2,
        title: 'Apply seed treatment',
        description: 'Use labeled Rhizoctonia seed fungicide or approved biocontrol coating.',
        timing: 'At planting preparation',
      },
      {
        step: 3,
        title: 'Plant into warmer soil',
        description: 'Wait for soil temperatures that support rapid emergence (≥8–10°C ideally).',
        timing: 'Planting window',
      },
    ],
    relatedInsights: {
      weatherRisk: 'Cool, wet planting conditions prolong sprout exposure to Rhizoctonia in soil.',
      irrigationAdvice: 'Avoid waterlogging at planting; ensure ridges drain freely.',
      sustainabilityImpact: 'Clean seed and rotation reduce reliance on chemical seed treatments over time.',
    },
  },
  {
    diseaseName: 'Bacterial Wilt',
    pathogenName: 'Ralstonia solanacearum',
    isHealthy: false,
    symptoms: [
      {
        name: 'Sudden wilting in heat',
        description: 'Plants wilt during hot periods even when soil moisture is adequate; may recover temporarily at night early on.',
        severity: 'severe',
      },
      {
        name: 'Vascular browning',
        description: 'Cut stem base shows brown vascular ring; milky bacterial ooze may stream in water.',
        severity: 'severe',
      },
      {
        name: 'Tuber eyes weeping',
        description: 'Grey-brown vascular discoloration in tubers; sticky ooze from eyes in advanced cases.',
        severity: 'severe',
      },
    ],
    treatmentProtocols: {
      organic: 'No reliable field cure. Rogue wilted plants with root ball; solarize beds; use resistant varieties and long rotations with non-hosts.',
      conventional: 'Chemical cures are ineffective in open field. Focus on exclusion, resistant cultivars, and sanitation; some regions use soil treatments only under regulation.',
      dosage: 'Not applicable for curative bactericides in typical field potato — invest in clean seed and resistant genetics.',
      applicationTiming: 'Act at first wilt patches; implement rotation before the next solanaceous crop.',
    },
    precautions: [
      'Ralstonia spreads in soil, water, tools, and infected seed — quarantine the patch.',
      'Do not irrigate downstream from wilted areas with shared channels if avoidable.',
      'Never save seed from wilt-affected fields.',
      'Wash and disinfect boots and implements.',
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Confirm with stem streaming test',
        description: 'Place a cut stem in clear water; look for milky bacterial streaming from the vascular tissue.',
        timing: 'Immediately',
      },
      {
        step: 2,
        title: 'Rogue and remove root balls',
        description: 'Dig out wilted plants including soil around roots; dispose off-site.',
        timing: 'Same day',
      },
      {
        step: 3,
        title: 'Quarantine the zone',
        description: 'Mark the area, clean tools, and avoid moving soil to clean fields.',
        timing: 'Ongoing until rotation',
      },
      {
        step: 4,
        title: 'Plan non-host rotation',
        description: 'Shift to cereals or other non-solanaceous crops for several seasons; choose wilt-resistant potato next cycle.',
        timing: 'Before next planting',
      },
    ],
    relatedInsights: {
      weatherRisk: 'Warm soils (>25°C) and high soil moisture favour Ralstonia survival and infection.',
      irrigationAdvice: 'Improve drainage; avoid furrow water that runs through wilt foci into healthy areas.',
      sustainabilityImpact: 'Exclusion and rotation prevent multi-year chemical and yield losses across solanaceous crops.',
    },
  },
  {
    diseaseName: 'Potato Virus Y',
    pathogenName: 'Potato virus Y (PVY), aphid-transmitted',
    isHealthy: false,
    symptoms: [
      {
        name: 'Mosaic and leaf mottling',
        description: 'Light and dark green mosaic on leaves; severity varies by strain and cultivar.',
        severity: 'moderate',
      },
      {
        name: 'Leaf drop streak / necrosis',
        description: 'Some strains cause necrotic streaks on leaves and stems (PVYᴺ variants).',
        severity: 'high',
      },
      {
        name: 'Yield and quality loss',
        description: 'Reduced tuber size; some strains cause tuber necrotic ringspot in storage.',
        severity: 'high',
      },
    ],
    treatmentProtocols: {
      organic: 'Plant certified virus-tested seed; control aphids with oils/soaps; remove volunteers and infected plants early.',
      conventional: 'No viricide cures plants. Use certified seed, mineral oil programs, and labeled aphicides in rotation to slow spread.',
      dosage: 'Mineral oil and insecticide rates per label; time for aphid flight peaks.',
      applicationTiming: 'Protect from emergence through early bulking when aphids colonize; rogue symptomatic plants weekly.',
    },
    precautions: [
      'PVY is not controlled by fungicides.',
      'Cutting knives spread sap-transmissible virus — disinfect between seed lots.',
      'Keep seed plots isolated from ware crops when possible.',
      'Control solanaceous weeds that harbour PVY.',
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Rogue mosaic plants',
        description: 'Remove plants with clear mosaic or necrosis and destroy them away from the field.',
        timing: 'As soon as symptoms appear',
      },
      {
        step: 2,
        title: 'Suppress aphid vectors',
        description: 'Monitor with yellow traps; apply oils or rotated aphicides during flights.',
        timing: 'During colonization peaks',
      },
      {
        step: 3,
        title: 'Secure certified seed next season',
        description: 'Do not save tubers from symptomatic fields for seed.',
        timing: 'Before next planting',
      },
    ],
    relatedInsights: {
      weatherRisk: 'Mild weather that favours aphid flights increases PVY spread within the crop.',
      irrigationAdvice: 'Avoid plant stress that intensifies mosaic expression; keep moisture even.',
      sustainabilityImpact: 'Certified seed programs are the most sustainable long-term PVY control.',
    },
  },
];

const pepperBellDiseases: DiseaseInfo[] = [
  {
    diseaseName: 'Healthy',
    pathogenName: 'None',
    isHealthy: true,
    symptoms: [
      {
        name: 'Dark green glossy leaves',
        description: 'Foliage without water-soaked spots, powdery films, or interveinal mosaics.',
        severity: 'low',
      },
      {
        name: 'Uniform fruit set',
        description: 'Fruits sizing normally without sunken anthracnose lesions or blossom-end collapse.',
        severity: 'low',
      },
    ],
    treatmentProtocols: {
      organic: 'Preventive neem or biofungicide sprays in humid weather; maintain calcium nutrition to limit blossom-end issues.',
      conventional: 'No disease spray required while healthy; keep copper protectant available if bacterial spot risk rises.',
      dosage: 'Preventive botanicals 3–5 ml/L when used; copper per label only under disease pressure.',
      applicationTiming: 'Scout twice weekly; spray preventively only ahead of prolonged wet forecasts.',
    },
    precautions: [
      'Start from disease-free transplants.',
      'Use drip irrigation and mulch to limit splash.',
      'Rotate away from peppers/tomatoes for 2–3 years when possible.',
      'Avoid working plants when wet.',
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Routine leaf and fruit scouting',
        description: 'Check both leaf surfaces and developing fruit for early bacterial or fungal spots.',
        timing: 'Twice weekly',
      },
      {
        step: 2,
        title: 'Maintain drip and mulch',
        description: 'Keep emitters functioning and mulch continuous to reduce soil splash.',
        timing: 'Ongoing',
      },
      {
        step: 3,
        title: 'Monitor calcium and irrigation balance',
        description: 'Prevent blossom-end rot with steady moisture and adequate calcium supply.',
        timing: 'During fruit sizing',
      },
    ],
    relatedInsights: {
      weatherRisk: 'Warm humid nights raise risk for bacterial spot and Phytophthora if drainage is poor.',
      irrigationAdvice: 'Even drip moisture; avoid waterlogging which predisposes Phytophthora blight.',
      sustainabilityImpact: 'Cultural prevention preserves marketable fruit with minimal bactericide use.',
    },
  },
  {
    diseaseName: 'Bacterial Spot',
    pathogenName: 'Xanthomonas spp. (e.g. X. euvesicatoria)',
    isHealthy: false,
    symptoms: [
      {
        name: 'Water-soaked leaf lesions',
        description: 'Small greasy spots that turn brown with yellow halos; leaves may tatter.',
        severity: 'moderate',
      },
      {
        name: 'Raised fruit spots',
        description: 'Corky, raised lesions on fruit that crack and invite secondary rots.',
        severity: 'high',
      },
      {
        name: 'Defoliation in wet weather',
        description: 'Heavy spotting leads to leaf drop and sunscalded fruit.',
        severity: 'high',
      },
    ],
    treatmentProtocols: {
      organic: 'Hot-water or bleach seed treatment before sowing; copper sprays; Bacillus-based biologicals where labeled.',
      conventional: 'Copper bactericides ± mancozeb (where permitted) on a tight schedule during rainy periods.',
      dosage: 'Copper formulations typically 2–3 g/L; do not exceed labeled copper load per season.',
      applicationTiming: 'From transplant through fruit set every 5–7 days while rain continues.',
    },
    precautions: [
      'Seedborne pathogen — buy tested seed or treat farm-saved seed.',
      'Sanitize stakes, clips, and harvest totes.',
      'Do not harvest or prune when foliage is wet.',
      'Resistant varieties reduce spray dependence.',
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Eliminate splash irrigation',
        description: 'Convert to drip and pause field work until leaves dry.',
        timing: 'Immediately',
      },
      {
        step: 2,
        title: 'Begin copper program',
        description: 'Apply labeled copper protectant with thorough coverage of new growth.',
        timing: 'Within 24 hours',
      },
      {
        step: 3,
        title: 'Remove badly spotted plants',
        description: 'Rogue hopeless plants from dense spots to slow bacterial spread.',
        timing: 'Within 2–3 days',
      },
    ],
    relatedInsights: {
      weatherRisk: 'Wind-driven rain at 25–30°C spreads Xanthomonas rapidly through pepper canopies.',
      irrigationAdvice: 'Drip only; keep relative humidity down with wider spacing if possible.',
      sustainabilityImpact: 'Clean seed and drip conversion reduce seasonal copper applications.',
    },
  },
  {
    diseaseName: 'Anthracnose',
    pathogenName: 'Colletotrichum spp.',
    isHealthy: false,
    symptoms: [
      {
        name: 'Sunken fruit lesions',
        description: 'Circular, sunken spots on ripening fruit with dark centres and concentric rings.',
        severity: 'high',
      },
      {
        name: 'Salmon-coloured spore masses',
        description: 'Pinkish-orange spore matrices appear on lesion centres in wet weather.',
        severity: 'high',
      },
      {
        name: 'Latent postharvest rot',
        description: 'Infections started in field expand rapidly after harvest in warm storage.',
        severity: 'severe',
      },
    ],
    treatmentProtocols: {
      organic: 'Remove infected fruit; apply biologicals or copper; improve airflow; harvest promptly at maturity.',
      conventional: 'Rotate labeled fungicides (e.g. azoxystrobin, chlorothalonil, or local anthracnose products) from fruit set onward under pressure.',
      dosage: 'Follow label rates (often 0.5–1 ml/L for strobilurin ECs or 2 g/L for protectant WPs).',
      applicationTiming: 'Protective sprays from early fruit development; shorten intervals in rainy harvest periods.',
    },
    precautions: [
      'Do not leave rotting fruit on the ground — they sporulate heavily.',
      'Cool fruit quickly after harvest.',
      'Rotate out of peppers for 2–3 years.',
      'Avoid overhead irrigation during ripening.',
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Strip infected fruit',
        description: 'Pick and destroy all fruit with sunken lesions; clean fallen fruit from beds.',
        timing: 'Immediately / each harvest',
      },
      {
        step: 2,
        title: 'Protect remaining fruit',
        description: 'Apply labeled fungicide with good fruit coverage before the next rain.',
        timing: 'Within 24 hours',
      },
      {
        step: 3,
        title: 'Adjust harvest and cooling',
        description: 'Harvest more frequently and pre-cool to slow latent anthracnose in storage.',
        timing: 'Ongoing through harvest',
      },
    ],
    relatedInsights: {
      weatherRisk: 'Warm wet weather during fruit ripening is peak anthracnose risk.',
      irrigationAdvice: 'Keep water off fruit surfaces; use drip under mulch.',
      sustainabilityImpact: 'Sanitation of dropped fruit often cuts the need for late-season sprays.',
    },
  },
  {
    diseaseName: 'Phytophthora Blight',
    pathogenName: 'Phytophthora capsici',
    isHealthy: false,
    symptoms: [
      {
        name: 'Crown and stem wilt',
        description: 'Sudden plant wilt with dark, water-soaked lesions at the soil line or lower stem.',
        severity: 'severe',
      },
      {
        name: 'Fruit soft rot',
        description: 'Greasy, rapidly expanding fruit rot often starting where fruit touches wet soil or splash.',
        severity: 'severe',
      },
      {
        name: 'Root rot patches',
        description: 'Circular field patches of dead plants in poorly drained areas after heavy rain.',
        severity: 'severe',
      },
    ],
    treatmentProtocols: {
      organic: 'Raise beds, improve drainage, use resistant rootstocks/varieties where available; remove infected plants; limited biofungicide benefit once wilted.',
      conventional: 'Preventive fungicides with oomycete activity (e.g. mefenoxam, dimethomorph, cyazofamid, oxathiapiprolin) as labeled for Phytophthora on pepper.',
      dosage: 'Strictly per label; rotate FRAC groups to slow resistance in Phytophthora capsici.',
      applicationTiming: 'Begin protectively before rainy forecasts in known-infested fields; soil-directed and foliar per product.',
    },
    precautions: [
      'P. capsici thrives in standing water — drainage is non-negotiable.',
      'Do not move soil from blight patches on equipment.',
      'Avoid planting peppers after cucurbits in infested ground without long rotation.',
      'Discard fruit from blighted plants; do not compost.',
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Improve drainage immediately',
        description: 'Open furrows, raise affected beds, and stop irrigation that floods crowns.',
        timing: 'Immediately',
      },
      {
        step: 2,
        title: 'Rogue wilted plants',
        description: 'Remove dead/wilting plants and adjacent fruit resting on wet soil.',
        timing: 'Same day',
      },
      {
        step: 3,
        title: 'Apply labeled oomycete fungicide',
        description: 'Treat remaining stand with a Phytophthora-active product in rotation-smart sequence.',
        timing: 'Within 24 hours if weather allows',
      },
      {
        step: 4,
        title: 'Plan long rotation',
        description: 'Keep solanaceous and cucurbit hosts out of the block for multiple seasons.',
        timing: 'Next crop cycles',
      },
    ],
    relatedInsights: {
      weatherRisk: 'Heavy rain and warm soils create explosive Phytophthora capsici outbreaks in low spots.',
      irrigationAdvice: 'Never allow standing water at the crown; prefer drip on raised, well-drained beds.',
      sustainabilityImpact: 'Raised beds and drainage prevent repeated high-intensity fungicide programs.',
    },
  },
  {
    diseaseName: 'Powdery Mildew',
    pathogenName: 'Leveillula taurica (and related powdery mildew fungi)',
    isHealthy: false,
    symptoms: [
      {
        name: 'Chlorotic angular leaf patches',
        description: 'Yellow angular areas on upper leaf surfaces while powdery growth may be sparse at first.',
        severity: 'moderate',
      },
      {
        name: 'Powdery undersides',
        description: 'White to gray fungal growth on leaf undersides; leaves may dry and drop.',
        severity: 'high',
      },
      {
        name: 'Reduced fruit quality',
        description: 'Sunscald and smaller fruit follow canopy thinning from mildew.',
        severity: 'moderate',
      },
    ],
    treatmentProtocols: {
      organic: 'Apply sulfur, potassium bicarbonate, or milk-based/biofungicide sprays; improve airflow and avoid dense canopies.',
      conventional: 'Use labeled mildewcides (e.g. myclobutanil, trifloxystrobin, or local PM products) in rotation with protectants.',
      dosage: 'Sulfur and synthetic rates per label; avoid sulfur in extreme heat to prevent burn.',
      applicationTiming: 'At first chlorotic patches; reapply every 7–10 days while dry days and moderate humidity persist.',
    },
    precautions: [
      'Unlike many fungi, powdery mildew can thrive without free water on leaves.',
      'Do not apply sulfur within close intervals of oil sprays (phytotoxicity risk).',
      'Choose tolerant cultivars for hot, arid production zones.',
      'Remove severely mildewed lower leaves.',
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Confirm underside colonization',
        description: 'Inspect leaf undersides for white mycelium beneath yellow angular spots.',
        timing: 'Immediately',
      },
      {
        step: 2,
        title: 'Apply mildew spray',
        description: 'Treat with sulfur or labeled mildewcide ensuring underside coverage.',
        timing: 'Within 24 hours',
      },
      {
        step: 3,
        title: 'Open the canopy',
        description: 'Prune dense interiors and widen spacing next planting to reduce RH in the canopy.',
        timing: 'Within a few days / next cycle',
      },
    ],
    relatedInsights: {
      weatherRisk: 'Warm days with high humidity but dry leaf surfaces favour Leveillula on pepper.',
      irrigationAdvice: 'Drip irrigation is fine; focus on canopy airflow rather than withholding water.',
      sustainabilityImpact: 'Early sulfur/biocontrol windows often avoid harder chemistry later.',
    },
  },
  {
    diseaseName: 'Cucumber Mosaic Virus',
    pathogenName: 'Cucumber mosaic virus (CMV), aphid-transmitted',
    isHealthy: false,
    symptoms: [
      {
        name: 'Mosaic leaf pattern',
        description: 'Irregular light/dark green mosaic, leaf distortion, and sometimes shoestring-like narrowing.',
        severity: 'moderate',
      },
      {
        name: 'Stunting',
        description: 'Infected plants remain smaller with shortened internodes when infected young.',
        severity: 'high',
      },
      {
        name: 'Fruit mottling',
        description: 'Ringspots or mottled colour on fruit reducing market grade.',
        severity: 'high',
      },
    ],
    treatmentProtocols: {
      organic: 'No cure. Rogue infected plants; control aphids with oils/soaps; eliminate weed hosts; use reflective mulches.',
      conventional: 'Manage aphids with rotated labeled insecticides; plant tolerant varieties; maintain weed-free borders.',
      dosage: 'Aphicide and oil rates per label during vector flights.',
      applicationTiming: 'Protect transplants from day one; rogue mosaic plants as soon as identified.',
    },
    precautions: [
      'CMV is not treated with fungicides.',
      'Many weeds (chickweed, etc.) harbour CMV near fields.',
      'Aphids transmit CMV non-persistently — oils can reduce acquisition/transmission.',
      'Do not take cuttings from symptomatic plants.',
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Rogue mosaic plants',
        description: 'Remove and destroy plants with clear mosaic or shoestring leaves.',
        timing: 'Immediately',
      },
      {
        step: 2,
        title: 'Reduce aphid pressure',
        description: 'Deploy sticky traps, reflective mulch, and oils/aphicides as appropriate.',
        timing: 'Within 24–48 hours',
      },
      {
        step: 3,
        title: 'Clean field borders',
        description: 'Remove broadleaf weeds that serve as CMV reservoirs around the block.',
        timing: 'Within 1 week',
      },
    ],
    relatedInsights: {
      weatherRisk: 'Mild weather supporting aphid flights increases CMV movement into pepper.',
      irrigationAdvice: 'Avoid drought stress that worsens symptom expression; keep drip schedules steady.',
      sustainabilityImpact: 'Border weed control and reflective mulch reduce insecticide need for CMV management.',
    },
  },
];

export const cropKnowledgeSeed: CropKnowledgeSeedEntry[] = [
  { crop: 'tomato', diseases: tomatoDiseases },
  { crop: 'potato', diseases: potatoDiseases },
  { crop: 'pepper_bell', diseases: pepperBellDiseases },
];

export default cropKnowledgeSeed;
