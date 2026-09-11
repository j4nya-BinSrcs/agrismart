import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  RefreshCw,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { DiagnosisRecord, ScreenType } from '../../types';
import { SAMPLE_LEAF_IMAGES } from '../../data/mockData';
import { diagnosisService } from '../../services/diagnosisService';
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
  const [soilMoistureContext] = useState<string>('31% (Current sensor reading)');
  
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

  const validateAndLoadFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type) && !file.type.startsWith('image/')) {
      showToast('Unsupported format. Please upload a JPG, PNG, or WebP crop image.', 'error');
      return;
    }

    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeBytes) {
      showToast('File exceeds 10MB limit. Please upload a smaller photo.', 'error');
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
    reader.onerror = () => {
      showToast('Unable to read image file. Please try again.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndLoadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndLoadFile(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage('');
    setImageName('');
    showToast('Image removed.', 'info');
  };

  const runAnalysis = async () => {
    if (!selectedImage) {
      showToast('Please select or upload a crop leaf image before analyzing.', 'warning');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep('Calibrating color balance & leaf morphology...');

    try {
      const record = await diagnosisService.analyzeCrop(
        {
          imageUrl: selectedImage,
          imageName,
          crop: selectedCrop,
          variety,
          growthStage,
          fieldLocation,
          soilMoistureContext,
        },
        (step) => setAnalysisStep(step)
      );

      // Save to persistence history
      await diagnosisService.saveDiagnosis(record);

      setIsAnalyzing(false);
      onDiagnosisComplete(record);
      onNavigate('diagnosis-result');
      showToast(`Diagnosis generated: ${record.diseaseName}`, 'success');
    } catch (err) {
      console.error('Diagnosis failed:', err);
      setIsAnalyzing(false);
      showToast('Unable to complete diagnostic inference. Please try again.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      {/* Title & Introduction */}
      <div className="pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
          Crop Disease Diagnosis
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Upload or capture a leaf photo to identify symptoms, verify confidence, and receive weather-aware treatment actions.
        </p>
      </div>

      {/* Main Diagnosis Work area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Uploader & Preview (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 text-[11px]">
                Leaf Sample
              </span>
              <span className="text-slate-400 dark:text-slate-500 text-[11px]">
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
                  ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30'
                  : selectedImage
                  ? 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/20 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
              }`}
            >
              {selectedImage ? (
                <div className="w-full flex flex-col items-center">
                  <div className="relative max-h-[280px] w-full flex items-center justify-center rounded overflow-hidden">
                    <img
                      src={selectedImage}
                      alt="Crop leaf preview"
                      loading="lazy"
                      decoding="async"
                      className="max-h-[260px] w-auto object-contain rounded"
                    />

                    <div className="absolute top-2 left-2 bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-[11px] font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 inline-block" />
                      <span>Ready for Analysis</span>
                    </div>

                    {imageName && (
                      <div className="absolute top-2 right-2 bg-slate-900/80 dark:bg-slate-950/90 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                        {imageName}
                      </div>
                    )}
                  </div>

                  {/* Replace / Remove Bar */}
                  <div className="w-full mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 inline-block" />
                      <span>Optimal contrast & focus</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
                        title="Remove image"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-400 flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Replace Photo</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6">
                  <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Upload a leaf photo
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                    Drag and drop your crop photo, choose from device, or select a reference sample below.
                  </p>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Action Bar Below Image */}
            <div className="grid grid-cols-2 gap-2.5 mt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Upload File</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCameraActive(!isCameraActive)}
                disabled={isAnalyzing}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <Camera className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>{isCameraActive ? 'Close Camera' : 'Camera Capture'}</span>
              </button>
            </div>

            {/* Camera Viewfinder Simulator */}
            {isCameraActive && (
              <div className="mt-3 p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-900 text-white">
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
                    src={selectedImage || presets[0].image}
                    alt="Camera feed"
                    loading="lazy"
                    decoding="async"
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
                      if (!selectedImage) {
                        setSelectedImage(presets[0].image);
                      }
                      setIsCameraActive(false);
                      setImageName(`field_capture_${Date.now().toString().slice(-4)}.jpg`);
                      showToast('Photo captured from camera.', 'info');
                    }}
                    className="px-4 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-medium cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Capture Photo</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Presets Gallery */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Reference Samples
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
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
                    disabled={isAnalyzing}
                    className={`p-1.5 rounded-md border text-left transition-colors cursor-pointer flex flex-col items-center disabled:opacity-50 ${
                      isCurrent
                        ? 'border-emerald-800 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60'
                    }`}
                  >
                    <div className="w-full h-14 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden mb-1 border border-slate-200 dark:border-slate-700">
                      <img
                        src={p.image}
                        alt={p.label}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-[11px] font-medium text-slate-900 dark:text-slate-100 text-center line-clamp-1 w-full">
                      {p.crop}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 text-center line-clamp-1 w-full">
                      {p.expected.split('(')[0].trim()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Agronomic Context & Form (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 text-[11px]">
                Field Context
              </span>
              <span className="text-emerald-800 dark:text-emerald-400 font-medium text-[11px]">
                Field A Active
              </span>
            </div>

            <div className="space-y-3">
              {/* Crop Select */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Crop Type
                </label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  disabled={isAnalyzing}
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 disabled:opacity-60"
                >
                  <option value="Tomato">Tomato (Solanum lycopersicum)</option>
                  <option value="Wheat">Wheat (Triticum aestivum)</option>
                  <option value="Cotton">Cotton (Gossypium hirsutum)</option>
                  <option value="Potato">Potato (Solanum tuberosum)</option>
                </select>
              </div>

              {/* Variety */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Cultivar / Variety
                </label>
                <input
                  type="text"
                  value={variety}
                  onChange={(e) => setVariety(e.target.value)}
                  disabled={isAnalyzing}
                  placeholder="e.g. Abhinav Hybrid"
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 disabled:opacity-60"
                />
              </div>

              {/* Growth Stage */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Growth Stage
                </label>
                <select
                  value={growthStage}
                  onChange={(e) => setGrowthStage(e.target.value)}
                  disabled={isAnalyzing}
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 disabled:opacity-60"
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
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Field Location
                </label>
                <select
                  value={fieldLocation}
                  onChange={(e) => setFieldLocation(e.target.value)}
                  disabled={isAnalyzing}
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 disabled:opacity-60"
                >
                  <option value="Field A (Plot 2)">Field A (Plot 2) — 6.0 Acres</option>
                  <option value="Field B (Block 1)">Field B (Block 1) — 8.0 Acres</option>
                  <option value="Field C (East)">Field C (East) — 4.5 Acres</option>
                </select>
              </div>

              {/* Soil / Moisture Context */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Soil Moisture Reading
                </label>
                <div className="p-2 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                  <span>{soilMoistureContext}</span>
                  <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-400">Synced</span>
                </div>
              </div>
            </div>

            {/* AI Analysis CTA & State */}
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
              {isAnalyzing ? (
                <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-1.5">
                  <div className="flex items-center justify-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium text-xs">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-600 dark:text-slate-400" />
                    <span>Analyzing Leaf Morphology</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {analysisStep}
                  </p>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden mt-1.5">
                    <div className="bg-emerald-800 dark:bg-emerald-500 h-full w-3/4 transition-all duration-300" />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={runAnalysis}
                  disabled={!selectedImage || isAnalyzing}
                  className="w-full py-2.5 px-3 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <span>Analyze Crop Sample</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-2">
                Evaluates confidence, matched symptoms, and provides practical treatment steps.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
