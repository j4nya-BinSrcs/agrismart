import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Info,
  Sliders,
  Check,
} from 'lucide-react';
import { DiagnosisRecord, ScreenType } from '../../types';
import { SAMPLE_LEAF_IMAGES } from '../../data/mockData';
import { useToast } from '../../context/ToastContext';

interface DiagnoseScreenProps {
  onDiagnosisComplete: (result: DiagnosisRecord) => void;
  onNavigate: (screen: ScreenType) => void;
}

export const DiagnoseScreen: React.FC<DiagnoseScreenProps> = ({
  onDiagnosisComplete,
  onNavigate,
}) => {
  const { showToast } = useToast();
  // Input states
  const [selectedImage, setSelectedImage] = useState<string>(SAMPLE_LEAF_IMAGES.tomatoEarlyBlight);
  const [imageName, setImageName] = useState<string>('tomato_leaf_sample.jpg');
  const [selectedCrop, setSelectedCrop] = useState<string>('Tomato');
  const [variety, setVariety] = useState<string>('Abhinav Hybrid');
  const [growthStage, setGrowthStage] = useState<string>('Fruiting (Week 9)');
  const [fieldLocation, setFieldLocation] = useState<string>('Field A (Plot 2)');
  const [soilMoistureContext, setSoilMoistureContext] = useState<string>('31% (Current sensor reading)');
  
  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');

  // Camera modal state
  const [isCameraActive, setIsCameraActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-configured leaf presets for rapid testing
  const presets = [
    {
      label: 'Tomato Early Blight',
      crop: 'Tomato',
      variety: 'Abhinav Hybrid',
      growthStage: 'Fruiting (Week 9)',
      image: SAMPLE_LEAF_IMAGES.tomatoEarlyBlight,
      expected: 'Early Blight (91% Confidence)',
      field: 'Field A (Plot 2)'
    },
    {
      label: 'Healthy Wheat Leaf',
      crop: 'Wheat',
      variety: 'GW-496',
      growthStage: 'Tillering Stage',
      image: SAMPLE_LEAF_IMAGES.healthyWheat,
      expected: 'Healthy Foliage (97% Confidence)',
      field: 'Field C (East)'
    },
    {
      label: 'Cotton Angular Blight',
      crop: 'Cotton',
      variety: 'Bt Cotton Hybrid',
      growthStage: 'Squaring Stage',
      image: SAMPLE_LEAF_IMAGES.cottonBlight,
      expected: 'Bacterial Blight (86% Confidence)',
      field: 'Field B (Block 1)'
    },
    {
      label: 'Potato Late Blight',
      crop: 'Potato',
      variety: 'Kufri Jyoti',
      growthStage: 'Tuber Initiation',
      image: SAMPLE_LEAF_IMAGES.potatoLateBlight,
      expected: 'Late Blight (93% Confidence)',
      field: 'Field D (Trial)'
    },
  ];

  const handleSelectPreset = (p: typeof presets[0]) => {
    setSelectedImage(p.image);
    setImageName(`${p.crop.toLowerCase()}_sample.jpg`);
    setSelectedCrop(p.crop);
    setVariety(p.variety);
    setGrowthStage(p.growthStage);
    setFieldLocation(p.field);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Unsupported format. Please upload JPG or PNG.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSelectedImage(event.target.result as string);
          setImageName(file.name);
          showToast(`Loaded ${file.name} for diagnostic scanning.`, 'info');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Unsupported format. Please upload JPG or PNG.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSelectedImage(event.target.result as string);
          setImageName(file.name);
          showToast(`Loaded ${file.name} for diagnostic scanning.`, 'info');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const runAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisStep('Calibrating color balance & leaf morphology...');

    setTimeout(() => {
      setAnalysisStep('Scanning concentric lesion rings & pathogen markers...');
    }, 800);

    setTimeout(() => {
      setAnalysisStep('Cross-referencing Anand microclimate & rainfall forecast...');
    }, 1600);

    setTimeout(() => {
      // Determine result based on image/crop selected
      const isHealthy = selectedCrop === 'Wheat' && selectedImage === SAMPLE_LEAF_IMAGES.healthyWheat;
      const isCotton = selectedCrop === 'Cotton';
      const isPotato = selectedCrop === 'Potato';

      let diseaseName = 'Tomato Early Blight';
      let pathogenName = 'Alternaria solani (Fungal Pathogen)';
      let confidence = 91;
      let severity: 'low' | 'moderate' | 'high' | 'severe' = 'moderate';
      let shortExplanation = 'Fungal pathogen Alternaria solani detected with characteristic concentric dark brown rings with chlorotic yellow halo on lower foliage.';
      let symptomsMatched = [
        'Concentric target-board ring patterns (3-12mm diameter) on mature leaves',
        'Narrow chlorotic (yellow) margin halo surrounding necrotic tissue',
        'Predominant lower-canopy distribution matching soil-splash transmission'
      ];
      let symptomsRuledOut = [
        'Septoria Leaf Spot: Ruled out due to absence of small speckling (<3mm) with distinct gray centers',
        'Bacterial Canker: Ruled out due to absence of bird’s-eye lesions on fruit and vascular browning'
      ];
      let treatmentProtocols = {
        organic: 'Trichoderma viride (10g/L) or Copper Hydroxide (2g/L) foliar spray targeting lower canopy.',
        conventional: 'Mancozeb 75% WP (2.5g/L) or Chlorothalonil (2g/L). Alternate modes of action to prevent resistance.',
        dosage: '500 liters spray volume per acre with hollow cone nozzle at 2.5 bar.',
        applicationTiming: 'Execute pruning immediately before rain. Spray within 24h window once foliage dries Friday morning.'
      };

      let precautions = [
        'Avoid overhead sprinkler irrigation; moisture on leaves accelerates spore germination.',
        'Sterilize pruning shears with 10% bleach between plants to stop fungal transfer.',
        'Ensure proper air circulation between vine rows by pruning suckers.'
      ];
      let actions = [
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
      ];

      if (isHealthy) {
        diseaseName = 'Healthy Foliage';
        pathogenName = 'No Pathogen Detected (Vigorous Canopy)';
        confidence = 97;
        severity = 'low';
        shortExplanation = 'Leaf chlorophyll density is uniform. No fungal spots, bacterial lesions, or insect puncture wounds detected.';
        symptomsMatched = [
          'Uniform green pigment index (SPAD ~44.2) across blade length',
          'Clean parallel leaf venation with no necrotic lesions or streaks',
          'Absence of rust pustules'
        ];
        symptomsRuledOut = [
          'Yellow Stripe Rust: Ruled out due to absence of linear chlorotic stripes',
          'Powdery Mildew: Ruled out due to lack of white superficial mycelial patches'
        ];
        treatmentProtocols = {
          organic: 'Maintain natural biological soil amendments and vermicompost tea during root crown development.',
          conventional: 'No synthetic chemicals required. Prophylactic sprays strictly discouraged.',
          dosage: '0 kg chemical input required. Save farm expenditure.',
          applicationTiming: 'Routine field scouting every 3-4 days during active tillering.'
        };
        precautions = [
          'Maintain balanced soil nutrition.',
          'Scout twice weekly during early morning.'
        ];
        actions = [
          {
            step: 1,
            title: 'Maintain current cultural practices',
            description: 'Canopy is vigorous. No fungicide required.',
            timing: 'Ongoing'
          },
          {
            step: 2,
            title: 'Verify tillering count',
            description: 'Assess tiller density to calibrate secondary nitrogen top-dressing.',
            timing: 'In 3 days'
          }
        ];
      } else if (isCotton) {
        diseaseName = 'Bacterial Blight (Angular Leaf Spot)';
        pathogenName = 'Xanthomonas citri pv. malvacearum (Bacterial)';
        confidence = 86;
        severity = 'moderate';
        shortExplanation = 'Water-soaked angular lesions bound by leaf veins caused by Xanthomonas citri pv. malvacearum.';
        symptomsMatched = [
          'Angular water-soaked spots strictly delimited by small leaf veins',
          'Lesions darkening from translucent yellow to reddish-brown'
        ];
        symptomsRuledOut = [
          'Alternaria Leaf Spot: Ruled out because lesions are angular rather than circular',
          'Cercospora Leaf Spot: Ruled out due to absence of purple borders'
        ];
        treatmentProtocols = {
          organic: 'Copper Oxychloride 50 WP (2.5g/L) + Pseudomonas fluorescens biological spray.',
          conventional: 'Streptocycline (1g per 10L water) combined with Copper Oxychloride 50 WP (25g).',
          dosage: '450 liters solution per acre targeted at canopy foliage.',
          applicationTiming: 'Apply immediately post-rain once leaf surface is dry.'
        };
        precautions = [
          'Avoid field transit when foliage is damp.',
          'Ensure furrows are free of standing water.'
        ];
        actions = [
          {
            step: 1,
            title: 'Apply Copper Oxychloride + Streptocycline',
            description: 'Dissolve 25g Copper Oxychloride + 1g Streptocycline in 10L water.',
            timing: 'Post-rain dry window'
          },
          {
            step: 2,
            title: 'Scout adjacent squares',
            description: 'Check for black lesions on bolls and bracts.',
            timing: 'In 48 hours'
          }
        ];
      } else if (isPotato) {
        diseaseName = 'Potato Late Blight';
        pathogenName = 'Phytophthora infestans (Oomycete)';
        confidence = 93;
        severity = 'severe';
        shortExplanation = 'Phytophthora infestans water-soaked necrotic patches with pale chlorotic border, spreading rapidly in cool humid air.';
        symptomsMatched = [
          'Irregular water-soaked lesions enlarging rapidly at leaf tips',
          'Delicate white fungal-like growth visible on leaf undersides in high humidity'
        ];
        symptomsRuledOut = [
          'Early Blight: Ruled out due to lack of concentric target rings and fast leaf collapse',
          'Blackleg: Ruled out due to absence of stem base blackening'
        ];
        treatmentProtocols = {
          organic: 'Bordeaux Mixture (1%) or Copper Hydroxide (2.5g/L). Preventative coverage is vital.',
          conventional: 'Cymoxanil 8% + Mancozeb 64% (Curzate M8 at 2.5g/L) or Metalaxyl.',
          dosage: '500 liters/acre high-pressure foliar application.',
          applicationTiming: 'Urgent immediate intervention before moisture persists >10 hours.'
        };
        precautions = [
          'Halt overhead irrigation immediately.',
          'Destroy severely blighted stalks away from field.'
        ];
        actions = [
          {
            step: 1,
            title: 'Apply Cymoxanil + Mancozeb',
            description: 'Systemic foliar spray to halt mycelial penetration.',
            timing: 'Immediate'
          },
          {
            step: 2,
            title: 'Ridge up soil over tubers',
            description: 'Cover exposed tubers with 5cm soil to prevent spore wash-down.',
            timing: 'Within 24 hours'
          }
        ];
      }

      const newRecord: DiagnosisRecord = {
        id: `diag-${Date.now()}`,
        crop: selectedCrop,
        variety,
        growthStage,
        diseaseName,
        pathogenName,
        isHealthy,
        confidence,
        severity,
        detectedAt: 'Just now',
        imageUrl: selectedImage,
        fieldLocation,
        shortExplanation,
        symptomsMatched,
        symptomsRuledOut,
        treatmentProtocols,
        precautions,
        recommendedActions: actions,
        relatedInsights: {
          weatherRisk: '82% Rain forecast within 24 hours. Spores will spread through splash if leaves are not pruned before rain.',
          irrigationAdvice: 'Soil moisture is 31%. Delay irrigation to avoid leaf humidity spike.',
          sustainabilityImpact: 'Spot pruning saves approximately 40L of broad-spectrum chemical runoff.'
        }
      };

      setIsAnalyzing(false);
      onDiagnosisComplete(newRecord);
      onNavigate('diagnosis-result');
    }, 2400);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      {/* Title & Introduction */}
      <div className="pb-2 border-b border-slate-200/80">
        <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">
          Crop Disease Diagnosis
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Upload or capture a leaf photo to identify symptoms, verify confidence, and receive weather-aware treatment actions.
        </p>
      </div>

      {/* Main Diagnosis Work area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Uploader & Preview (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-medium uppercase tracking-wider text-slate-400 text-[11px]">
                Leaf Sample
              </span>
              <span className="text-slate-400 text-[11px]">
                JPG, PNG, WEBP (Up to 10MB)
              </span>
            </div>

            {/* Dropzone & Preview Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative rounded-lg border border-dashed transition-colors overflow-hidden flex flex-col items-center justify-center min-h-[300px] p-4 ${
                isDragging
                  ? 'border-emerald-600 bg-emerald-50/40'
                  : selectedImage
                  ? 'border-slate-200 bg-slate-50/50'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'
              }`}
            >
              {selectedImage ? (
                <div className="w-full flex flex-col items-center">
                  <div className="relative max-h-[280px] w-full flex items-center justify-center rounded overflow-hidden">
                    <img
                      src={selectedImage}
                      alt="Crop leaf preview"
                      className="max-h-[260px] w-auto object-contain rounded"
                    />

                    <div className="absolute top-2 left-2 bg-white/95 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-medium text-slate-800 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                      <span>Ready for Analysis</span>
                    </div>

                    <div className="absolute top-2 right-2 bg-slate-900/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                      {imageName}
                    </div>
                  </div>

                  {/* Replace / Remove Bar */}
                  <div className="w-full mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
                    <div className="text-slate-500 flex items-center gap-1 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                      <span>Optimal contrast & focus</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="font-medium text-slate-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Replace Photo</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6">
                  <div className="w-10 h-10 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-2.5">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-semibold text-slate-900">
                    Upload a leaf photo
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Drag and drop your crop photo, choose from device, or select a reference sample below.
                  </p>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Action Bar Below Image */}
            <div className="grid grid-cols-2 gap-2.5 mt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-800 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Upload File</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCameraActive(!isCameraActive)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-800 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-slate-500" />
                <span>{isCameraActive ? 'Close Camera' : 'Camera Capture'}</span>
              </button>
            </div>

            {/* Camera Viewfinder Simulator */}
            {isCameraActive && (
              <div className="mt-3 p-3 rounded-lg border border-slate-300 bg-slate-900 text-white">
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live Viewfinder
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCameraActive(false)}
                    className="text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="relative h-48 bg-slate-800 rounded overflow-hidden border border-slate-700 flex items-center justify-center">
                  <img
                    src={selectedImage}
                    alt="Camera feed"
                    className="h-full w-full object-cover opacity-90"
                  />
                  <div className="absolute inset-6 border border-white/30 rounded pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] text-white/80 font-medium bg-slate-900/70 px-2 py-0.5 rounded">
                      Center leaf in frame
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCameraActive(false);
                      setImageName(`field_capture_${Date.now().toString().slice(-4)}.jpg`);
                    }}
                    className="px-4 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium cursor-pointer flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Capture Photo</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Presets Gallery */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Reference Samples
              </span>
              <span className="text-[11px] text-slate-400">
                Select to test model
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {presets.map((p) => {
                const isCurrent = selectedImage === p.image;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`p-1.5 rounded-md border text-left transition-colors cursor-pointer flex flex-col items-center ${
                      isCurrent
                        ? 'border-emerald-800 bg-emerald-50/50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="w-full h-14 rounded bg-slate-100 overflow-hidden mb-1 border border-slate-200">
                      <img
                        src={p.image}
                        alt={p.label}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="w-full text-center">
                      <div className="text-xs font-medium text-slate-900 truncate">
                        {p.crop}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {p.label.split(' ')[1] || p.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Crop Context & Analysis Action (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-slate-100">
              <Sliders className="w-3.5 h-3.5 text-slate-600" />
              <h3 className="text-xs font-semibold text-slate-900">Crop Parameters</h3>
            </div>

            <div className="space-y-3">
              {/* Crop Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Crop Type
                </label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-md p-2 text-slate-900 focus:outline-none focus:border-slate-400"
                >
                  <option value="Tomato">Tomato (Solanum lycopersicum)</option>
                  <option value="Wheat">Wheat (Triticum aestivum)</option>
                  <option value="Cotton">Cotton (Gossypium hirsutum)</option>
                  <option value="Potato">Potato (Solanum tuberosum)</option>
                  <option value="Rice">Rice (Oryza sativa)</option>
                  <option value="Maize">Maize / Corn (Zea mays)</option>
                </select>
              </div>

              {/* Crop Variety */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Cultivar / Variety
                </label>
                <input
                  type="text"
                  value={variety}
                  onChange={(e) => setVariety(e.target.value)}
                  placeholder="e.g. Abhinav Hybrid"
                  className="w-full text-xs bg-white border border-slate-200 rounded-md p-2 text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>

              {/* Growth Stage */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Growth Stage
                </label>
                <select
                  value={growthStage}
                  onChange={(e) => setGrowthStage(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-md p-2 text-slate-900 focus:outline-none focus:border-slate-400"
                >
                  <option value="Seedling / Emergence">Seedling / Emergence</option>
                  <option value="Vegetative stage">Vegetative stage</option>
                  <option value="Flowering / Squaring">Flowering / Squaring</option>
                  <option value="Fruiting (Week 9)">Fruiting / Pod filling</option>
                  <option value="Maturity / Harvest">Maturity / Harvest</option>
                </select>
              </div>

              {/* Field Location */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Field Location
                </label>
                <select
                  value={fieldLocation}
                  onChange={(e) => setFieldLocation(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-md p-2 text-slate-900 focus:outline-none focus:border-slate-400"
                >
                  <option value="Field A (Plot 2)">Field A (Plot 2) — 6.0 Acres</option>
                  <option value="Field B (Block 1)">Field B (Block 1) — 7.5 Acres</option>
                  <option value="Field C (East)">Field C (East) — 5.0 Acres</option>
                </select>
              </div>

              {/* Soil / Moisture Context */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Soil Moisture Reading
                </label>
                <div className="p-2 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                  <span>{soilMoistureContext}</span>
                  <span className="text-[11px] font-medium text-emerald-800">Synced</span>
                </div>
              </div>
            </div>

            {/* AI Analysis CTA & State */}
            <div className="mt-5 pt-3 border-t border-slate-100">
              {isAnalyzing ? (
                <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-center space-y-1.5">
                  <div className="flex items-center justify-center gap-1.5 text-slate-800 font-medium text-xs">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-600" />
                    <span>Analyzing Leaf Morphology</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    {analysisStep}
                  </p>
                  <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-1.5">
                    <div className="bg-slate-700 h-full w-3/4 transition-all duration-300" />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={runAnalysis}
                  disabled={!selectedImage}
                  className="w-full py-2.5 px-3 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>Analyze Crop Sample</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <p className="text-[11px] text-slate-400 text-center mt-2">
                Evaluates confidence, matched symptoms, and provides practical treatment steps.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
