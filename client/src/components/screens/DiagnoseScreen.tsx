import React, { useEffect, useRef, useState } from 'react';
import {
  Upload,
  Camera,
  RefreshCw,
  ArrowRight,
  Trash2,
  X,
} from 'lucide-react';
import { DiagnosisRecord, ScreenType, SupportedCrop, SUPPORTED_CROPS } from '../../types';
import { diagnosisService } from '../../services/diagnosisService';
import { useToast } from '../../context/ToastContext';
import { useFarm } from '../../context/FarmContext';
import { BackButton } from '../common/BackButton';

interface DiagnoseScreenProps {
  onDiagnosisComplete: (result: DiagnosisRecord) => void;
  onNavigate: (screen: ScreenType) => void;
}

export const DiagnoseScreen: React.FC<DiagnoseScreenProps> = ({
  onDiagnosisComplete,
  onNavigate,
}) => {
  const { showToast } = useToast();
  const { activeFarm } = useFarm();

  const [selectedImage, setSelectedImage] = useState<string>('');
  const [imageName, setImageName] = useState<string>('');
  const [selectedCrop, setSelectedCrop] = useState<SupportedCrop>('tomato');
  const [variety, setVariety] = useState('');
  const [growthStage, setGrowthStage] = useState('Vegetative stage');
  const [fieldLocation, setFieldLocation] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fields = activeFarm?.plots ?? [];

  useEffect(() => {
    if (fields.length > 0 && !fieldLocation) {
      setFieldLocation(fields[0].name);
      setSelectedCrop(fields[0].crop);
      if (fields[0].variety) setVariety(fields[0].variety);
      if (fields[0].growthStage) setGrowthStage(fields[0].growthStage);
    }
  }, [fields, fieldLocation]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    stopCamera();
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera API is not available in this browser.');
        showToast('Camera is not supported on this device/browser.', 'error');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      // Attach after state update paints the video element
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to access camera. Check permissions.';
      setCameraError(msg);
      setIsCameraActive(false);
      showToast('Camera permission denied or unavailable.', 'error');
    }
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      showToast('Camera is not ready yet. Wait a moment and try again.', 'warning');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setSelectedImage(dataUrl);
    setImageName(`field_capture_${Date.now()}.jpg`);
    stopCamera();
    setIsCameraActive(false);
    showToast('Photo captured from camera.', 'info');
  };

  const closeCamera = () => {
    stopCamera();
    setIsCameraActive(false);
  };

  const validateAndLoadFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type) && !file.type.startsWith('image/')) {
      showToast('Unsupported format. Please upload a JPG, PNG, or WebP crop image.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('File exceeds 10MB limit.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedImage(event.target.result as string);
        setImageName(file.name);
        showToast(`Loaded ${file.name}.`, 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndLoadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndLoadFile(file);
  };

  const handleFieldChange = (name: string) => {
    setFieldLocation(name);
    const field = fields.find((f) => f.name === name);
    if (field) {
      setSelectedCrop(field.crop);
      if (field.variety) setVariety(field.variety);
      if (field.growthStage) setGrowthStage(field.growthStage);
    }
  };

  const runAnalysis = async () => {
    if (!selectedImage) {
      showToast('Upload or capture a leaf photo before analyzing.', 'warning');
      return;
    }

    // Block known reference/demo sample assets (SVG illustrations and named samples)
    const looksLikeReference =
      selectedImage.startsWith('data:image/svg') ||
      /sample|reference|demo.?leaf|stock/i.test(imageName) ||
      selectedImage.includes('SAMPLE_LEAF');
    if (looksLikeReference) {
      showToast(
        'Reference sample photos cannot be analyzed. Capture or upload a real field leaf image.',
        'error'
      );
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep('Preparing expert advisory from crop knowledge...');

    try {
      const record = await diagnosisService.analyzeCrop(
        {
          imageUrl: selectedImage,
          imageName,
          crop: selectedCrop,
          variety,
          growthStage,
          fieldLocation: fieldLocation || 'Unspecified field',
          soilMoistureContext: 'No IoT sensor — moisture unknown',
        },
        (step) => setAnalysisStep(step)
      );

      await diagnosisService.saveDiagnosis(record);
      setIsAnalyzing(false);
      onDiagnosisComplete(record);
      onNavigate('diagnosis-result');
      showToast(`Advisory generated: ${record.diseaseName}`, 'success');
    } catch (err) {
      setIsAnalyzing(false);
      showToast(err instanceof Error ? err.message : 'Diagnosis failed.', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="pb-2 border-b border-slate-200/80 dark:border-slate-800 space-y-1">
        <BackButton label="Back to Dashboard" onClick={() => onNavigate('dashboard')} />
        <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
          Crop Disease Diagnosis
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Upload or capture a real leaf photo. Reference sample analysis is disabled — only your field images are used.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-medium uppercase tracking-wider text-slate-400 text-[11px]">Leaf Sample</span>
              <span className="text-slate-400 text-[11px]">JPG, PNG, WEBP (up to 10MB)</span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative rounded-lg border border-dashed transition-colors overflow-hidden flex flex-col items-center justify-center min-h-[280px] p-4 ${
                isDragging
                  ? 'border-emerald-600 bg-emerald-50/40'
                  : selectedImage
                    ? 'border-slate-200 dark:border-slate-700 bg-slate-50/50'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/20'
              }`}
            >
              {selectedImage ? (
                <div className="w-full flex flex-col items-center">
                  <img
                    src={selectedImage}
                    alt="Crop leaf preview"
                    className="max-h-[260px] w-auto object-contain rounded"
                  />
                  <div className="w-full mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px] truncate max-w-[60%]">{imageName}</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImage('');
                          setImageName('');
                        }}
                        className="text-slate-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer text-[11px]"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer text-[11px]"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Replace
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6">
                  <Upload className="w-5 h-5 text-slate-500 mx-auto mb-2.5" />
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Upload or capture a leaf photo</h3>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Use your device camera or upload a photo from the field. Do not use stock/reference images.
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload File
              </button>
              <button
                type="button"
                onClick={() => (isCameraActive ? closeCamera() : void startCamera())}
                disabled={isAnalyzing}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                {isCameraActive ? 'Close Camera' : 'Open Camera'}
              </button>
            </div>

            {cameraError && (
              <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-400">{cameraError}</p>
            )}

            {isCameraActive && (
              <div className="mt-3 p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-900 text-white">
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live camera
                  </span>
                  <button type="button" onClick={closeCamera} className="text-slate-400 hover:text-white cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative h-56 bg-black rounded overflow-hidden border border-slate-700">
                  <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" />
                  <div className="absolute inset-6 border border-white/30 rounded pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] text-white/80 bg-slate-900/70 px-2 py-0.5 rounded">
                      Center leaf in frame
                    </span>
                  </div>
                </div>
                <div className="mt-2.5 flex justify-center">
                  <button
                    type="button"
                    onClick={captureFromCamera}
                    className="px-4 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium cursor-pointer flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Capture Photo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
            <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">Field Context</div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Field</label>
                <select
                  value={fieldLocation}
                  onChange={(e) => handleFieldChange(e.target.value)}
                  disabled={isAnalyzing}
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-2"
                >
                  {fields.length === 0 ? (
                    <option value="">No fields — add in Management</option>
                  ) : (
                    fields.map((f) => (
                      <option key={f.id} value={f.name}>
                        {f.name} ({SUPPORTED_CROPS.find((c) => c.value === f.crop)?.label})
                      </option>
                    ))
                  )}
                </select>
                {fields.length === 0 && (
                  <button
                    type="button"
                    onClick={() => onNavigate('management')}
                    className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 cursor-pointer"
                  >
                    Open Management to add fields
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Crop Type</label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value as SupportedCrop)}
                  disabled={isAnalyzing}
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-2"
                >
                  {SUPPORTED_CROPS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Variety</label>
                <input
                  type="text"
                  value={variety}
                  onChange={(e) => setVariety(e.target.value)}
                  disabled={isAnalyzing}
                  placeholder="Optional"
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Growth Stage</label>
                <select
                  value={growthStage}
                  onChange={(e) => setGrowthStage(e.target.value)}
                  disabled={isAnalyzing}
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-2"
                >
                  <option value="Seedling / Emergence">Seedling / Emergence</option>
                  <option value="Vegetative stage">Vegetative stage</option>
                  <option value="Flowering">Flowering</option>
                  <option value="Fruiting">Fruiting / Tuber fill</option>
                  <option value="Maturity / Harvest">Maturity / Harvest</option>
                </select>
              </div>

              <div className="p-2 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
                Soil moisture: unknown without IoT sensors. Integrate devices for accurate readings.
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
              {isAnalyzing ? (
                <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 text-center space-y-1.5">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-medium">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Generating advisory
                  </div>
                  <p className="text-xs text-slate-600">{analysisStep}</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={runAnalysis}
                  disabled={!selectedImage || isAnalyzing}
                  className="w-full py-2.5 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  Analyze Leaf Photo
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <p className="text-[11px] text-slate-400 text-center mt-2">
                Uses crop knowledge for Pepper Bell, Potato, and Tomato. This is an expert advisory, not automated ML classification of the image.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
