import React, { useState, useEffect, useRef } from 'react';
import { Eye, Play, Pause, AlertTriangle, Camera, CameraOff, Ruler } from 'lucide-react';
import { VisionData, MonitoringStats } from '../types';
import { calculateSafeDistance, getVisionTypeDescription } from '../utils/visionCalculator';
import { DistanceEstimator, FaceBox } from '../utils/distanceEstimation';
import { AudioManager } from '../utils/audioManager';
import { getRandomEyeCareTip } from '../utils/eyeCareTips';

interface MonitoringScreenProps {
  visionData: VisionData;
  onRestart: () => void;
}

export const MonitoringScreen: React.FC<MonitoringScreenProps> = ({ visionData, onRestart }) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentDistance, setCurrentDistance] = useState<number>(0);
  const [alertVisible, setAlertVisible] = useState(false);
  const [currentTip, setCurrentTip] = useState<string>('');
  const [cameraPermission, setCameraPermission] = useState<boolean>(false);
  const [stats, setStats] = useState<MonitoringStats>({
    sessionStartTime: new Date(),
    totalAlerts: 0,
    averageDistance: 0
  });
  const [calibrationFeedback, setCalibrationFeedback] = useState<string>('');
  const [calibrationSuccess, setCalibrationSuccess] = useState<boolean>(false);
  const [baselineScale, setBaselineScale] = useState<number>(0);
  const [baselineDistance, setBaselineDistance] = useState<number>(0);

  // Add missing state for calibration UI and debugging
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [calibrationProgress, setCalibrationProgress] = useState<number>(0);
  const [detectedFaces, setDetectedFaces] = useState<number>(0);
  const [canvasVisible, setCanvasVisible] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const distanceEstimatorRef = useRef<DistanceEstimator>(new DistanceEstimator());
  const audioManagerRef = useRef<AudioManager>(new AudioManager());

  // New: calibration/debug state
  const [knownDistanceCm, setKnownDistanceCm] = useState<number>(50);
  const [focalLengthPx, setFocalLengthPx] = useState<number>(distanceEstimatorRef.current.getFocalLength());
  const [faceWidthPx, setFaceWidthPx] = useState<number>(0);
  const [faceHeightPx, setFaceHeightPx] = useState<number>(0);
  const [saturatedFrame, setSaturatedFrame] = useState<boolean>(false);
  const [scaleUsedPx, setScaleUsedPx] = useState<number>(0);
  const [plateau, setPlateau] = useState<boolean>(false); // new: indicates we froze scale due to saturation

  // New: better average (keep count)
  const samplesCountRef = useRef<number>(0);
  const prevSmoothedRef = useRef<number>(0);
  const lastGoodScaleRef = useRef<number>(0); // new: largest unsaturated scale seen (px)

  const safeDistance = calculateSafeDistance(visionData);
  const visionType = getVisionTypeDescription(visionData);

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, []);

  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        // Wait until we know video dimensions
        await new Promise<void>((resolve) => {
          const v = videoRef.current!;
          if (v.readyState >= 2 && v.videoWidth && v.videoHeight) return resolve();
          const onLoaded = () => {
            v.removeEventListener('loadedmetadata', onLoaded);
            resolve();
          };
          v.addEventListener('loadedmetadata', onLoaded);
        });
      }
      // Load any saved focal length and ratio-baseline for this resolution
      if (videoRef.current) {
        const vw = videoRef.current.videoWidth;
        const vh = videoRef.current.videoHeight;

        const key = getFocalKey(vw, vh);
        const saved = localStorage.getItem(key);
        if (saved) {
          const f = parseFloat(saved);
          if (Number.isFinite(f) && f > 0) {
            distanceEstimatorRef.current.setFocalLength(f);
            setFocalLengthPx(f);
          }
        }

        const bKey = getBaselineKey(vw, vh);
        const bSaved = localStorage.getItem(bKey);
        if (bSaved) {
          try {
            const b = JSON.parse(bSaved) as { scalePx: number; distanceCm: number };
            if (
              b &&
              Number.isFinite(b.scalePx) &&
              b.scalePx > 0 &&
              Number.isFinite(b.distanceCm) &&
              b.distanceCm > 0 &&
              b.scalePx < 0.9 * vw // discard obviously bad (too large) baselines
            ) {
              distanceEstimatorRef.current.setRatioBaseline(b.scalePx, b.distanceCm);
            } else {
              localStorage.removeItem(bKey);
            }
          } catch {}
        }
      }

      setCameraPermission(true);
      return true;
    } catch (error) {
      console.error('Camera permission denied:', error);
      setCameraPermission(false);
      return false;
    }
  };

  // Load persisted data on mount
  useEffect(() => {
    if (!videoRef.current) return;

    // Reset debug values
    setFaceWidthPx(0);
    setFaceHeightPx(0);
    setScaleUsedPx(0);
    setPlateau(false);
  }, []);

  // Use a lower alpha for smoother measurements
  const SMOOTHING_ALPHA = 0.15; // Lower = smoother, higher = more responsive
  
  // Compute width scale; mark saturation near any edge or very large box
  const computeFaceScalePx = (
    face: FaceBox,
    vw: number,
    vh: number
  ) => {
    // Use WIDTH as the primary metric for distance
    const scaleMetric = face.width; 
    
    // Consider saturated if approaching frame edges
    const marginW = 0.05 * vw; 
    const marginH = 0.05 * vh;
    
    const nearLeft = face.x < marginW;
    const nearRight = face.x + face.width > vw - marginW;
    const nearTop = face.y < marginH;
    const nearBottom = face.y + face.height > vh - marginH;
    
    const saturated =
      nearLeft || nearRight || nearTop || nearBottom ||
      face.width > 0.9 * vw || face.height > 0.9 * vh ||
      face.width >= vw - 2 || face.height >= vh - 2; // guard full-frame box
    return { scalePx: scaleMetric, saturated };
  };

  const startMonitoring = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    // Clear calibration feedback
    setCalibrationFeedback('');
    setCalibrationSuccess(false);
    
    setIsMonitoring(true);
    setStats(prev => ({ ...prev, sessionStartTime: new Date(), averageDistance: 0 }));
    
    // Reset smoothing/averaging
    prevSmoothedRef.current = 0;
    samplesCountRef.current = 0;
    lastGoodScaleRef.current = 0;
    setPlateau(false);
    
    // Check and update baseline info
    const baseline = distanceEstimatorRef.current.getBaseline();
    if (baseline) {
      setBaselineScale(baseline.scalePx);
      setBaselineDistance(baseline.distanceCm);
    } else {
      setBaselineScale(0);
      setBaselineDistance(0);
    }

    monitoringIntervalRef.current = setInterval(() => {
      // detect asynchronously to avoid blocking
      void checkDistance();
    }, 300);
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraPermission(false);
  };

  // Fixed checkDistance function to properly handle scale calculations
  const checkDistance = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) return;

    const vw = videoRef.current.videoWidth;
    const vh = videoRef.current.videoHeight;

    const face = await distanceEstimatorRef.current.detectFace(canvasRef.current!, videoRef.current!);
    if (face && face.width > 0 && face.height > 0) {
      setFaceWidthPx(Math.round(face.width));
      setFaceHeightPx(Math.round(face.height));

      const { scalePx, saturated } = computeFaceScalePx(face, vw, vh);
      setSaturatedFrame(saturated);

      // If saturated and we have no valid history, ignore this frame
      if (saturated && lastGoodScaleRef.current === 0) return;

      let usedScale = scalePx;
      let isPlateau = false;
      if (!saturated) {
        if (scalePx > lastGoodScaleRef.current) lastGoodScaleRef.current = scalePx;
      } else if (lastGoodScaleRef.current > 0) {
        usedScale = lastGoodScaleRef.current;
        isPlateau = true;
      }

      // Cap the effective scale to avoid spurious huge boxes
      if (baselineScale > 0) {
        const maxAllowed = baselineScale * 1.25;
        usedScale = Math.min(usedScale, maxAllowed);
      }

      setPlateau(isPlateau);
      setScaleUsedPx(Math.round(usedScale));

      if (usedScale >= 20) {
        const rawDistance = distanceEstimatorRef.current.estimateDistance(usedScale);
        
        // More responsive smoothing
        const alpha = saturated ? SMOOTHING_ALPHA * 0.5 : SMOOTHING_ALPHA;
        const prev = prevSmoothedRef.current || rawDistance;
        const smoothed = Math.round(alpha * rawDistance + (1 - alpha) * prev);
        
        prevSmoothedRef.current = smoothed;
        setCurrentDistance(smoothed);
        
        // Running mean
        samplesCountRef.current += 1;
        setStats(prevStats => {
          const n = samplesCountRef.current;
          const avg = n <= 1 ? smoothed : ((prevStats.averageDistance * (n - 1)) + smoothed) / n;
          return { ...prevStats, averageDistance: avg };
        });

        if (smoothed > 0 && smoothed < safeDistance.alertThreshold) {
          triggerAlert();
        }
      }
    }
  };

  const triggerAlert = () => {
    if (alertVisible) return; // Don't trigger multiple alerts

    // Play alert sound
    audioManagerRef.current.playAlertSound();

    // Show visual alert
    setCurrentTip(getRandomEyeCareTip());
    setAlertVisible(true);

    // Update stats
    setStats(prev => ({
      ...prev,
      totalAlerts: prev.totalAlerts + 1,
      lastAlertTime: new Date()
    }));

    // Hide alert after 5 seconds
    alertTimeoutRef.current = setTimeout(() => {
      setAlertVisible(false);
    }, 5000);
  };

  const dismissAlert = () => {
    setAlertVisible(false);
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
  };

  const getDistanceStatus = () => {
    if (currentDistance === 0) return { status: 'no-face', color: 'text-gray-500' };
    if (currentDistance < safeDistance.alertThreshold) return { status: 'too-close', color: 'text-red-500' };
    if (currentDistance <= safeDistance.maxDistance) return { status: 'optimal', color: 'text-green-500' };
    return { status: 'far', color: 'text-blue-500' };
  };

  const distanceStatus = getDistanceStatus();

  // New: persist focal per resolution
  const getFocalKey = (w: number, h: number) => `eyeguard:focal:${w}x${h}`;
  const getBaselineKey = (w: number, h: number) => `eyeguard:baseline:${w}x${h}`;

  // Calibration target band (as fraction of video width). We relax this over time if needed.
  const CALIB_TARGET_MIN = 0.15; // 15%
  const CALIB_TARGET_MAX = 0.70; // 70%

  // Collect multiple frames and return median scale for calibration (strictly reject saturated frames)
  const collectCalibrationScale = async (samples = 8, timeoutMs = 4000) => {
    if (!videoRef.current || !canvasRef.current) return null;

    setIsCalibrating(true);
    setCalibrationProgress(0);
    setDetectedFaces(0);
    setCanvasVisible(true);

    const vw = videoRef.current.videoWidth;
    const vh = videoRef.current.videoHeight;

    const scales: number[] = [];
    const start = performance.now();

    // Prepare canvas
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return null;
    canvasRef.current.width = vw;
    canvasRef.current.height = vh;

    // Helper: draw guides and HUD
    const drawGuides = (minBandPx: number, maxBandPx: number, currentW?: number) => {
      ctx.clearRect(0, 0, vw, vh);
      ctx.drawImage(videoRef.current!, 0, 0, vw, vh);

      // Bands
      ctx.save();
      ctx.fillStyle = 'rgba(76, 175, 80, 0.12)'; // green-ish
      ctx.fillRect(minBandPx, 0, Math.max(0, maxBandPx - minBandPx), vh);
      ctx.strokeStyle = 'rgba(76, 175, 80, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(minBandPx, 0); ctx.lineTo(minBandPx, vh);
      ctx.moveTo(maxBandPx, 0); ctx.lineTo(maxBandPx, vh);
      ctx.stroke();
      ctx.restore();

      // HUD
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(8, 8, 260, 48);
      ctx.fillStyle = '#fff';
      ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.fillText(`Calibration samples: ${scales.length}/${samples}`, 16, 26);
      ctx.fillText(`Target band: ${Math.round(minBandPx)}–${Math.round(maxBandPx)} px`, 16, 42);
      if (currentW) {
        ctx.fillText(`Face width: ${Math.round(currentW)} px`, 150, 26);
      }
      ctx.restore();
    };

    try {
      while (scales.length < samples && performance.now() - start < timeoutMs) {
        // Dynamically relax band over time
        const elapsed = performance.now() - start;
        let minBandPx = CALIB_TARGET_MIN * vw;
        let maxBandPx = CALIB_TARGET_MAX * vw;
        if (elapsed > 1500) { minBandPx = 0.12 * vw; maxBandPx = 0.75 * vw; }
        if (elapsed > 3000) { minBandPx = 0.10 * vw; maxBandPx = 0.85 * vw; }

        const face = await distanceEstimatorRef.current.detectFace(canvasRef.current!, videoRef.current!);
        let currentW: number | undefined;

        if (face && face.width > 0 && face.height > 0) {
          setDetectedFaces((prev: number) => prev + 1);
          const { scalePx, saturated } = computeFaceScalePx(face, vw, vh);
          currentW = scalePx;

          const inBand = scalePx >= minBandPx && scalePx <= maxBandPx;
          const relaxed = elapsed > 3500 && scales.length < 3; // final fallback if still no samples

          if (!saturated && (inBand || relaxed) && scalePx > 0) {
            scales.push(scalePx);
            setCalibrationProgress(Math.round((scales.length / samples) * 100));
          }
        }

        // Draw guides + HUD every iteration
        drawGuides(
          Math.round(minBandPx),
          Math.round(maxBandPx),
          currentW
        );

        await new Promise(r => setTimeout(r, 100));
      }
    } finally {
      setTimeout(() => {
        setCanvasVisible(false);
        setIsCalibrating(false);
      }, 300);
    }

    // Need at least half the requested samples or min 4
    if (scales.length < Math.max(4, Math.floor(samples / 2))) return null;

    const sorted = scales.slice().sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return median;
  };

  const handleCalibrate = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setCalibrationFeedback("Camera not initialized");
      setCalibrationSuccess(false);
      return;
    }
    setCalibrationFeedback("Calibrating... Keep your face between the green rails; step back if needed.");
    setCalibrationSuccess(false);

    const vw = videoRef.current.videoWidth;
    const medianScale = await collectCalibrationScale(10, 5500);
    if (!medianScale) {
      setCalibrationFeedback(`Failed to get clear samples (${detectedFaces} detections). Ensure good lighting and keep your face inside the rails, then try again.`);
      setCalibrationSuccess(false);
      return;
    }
    if (medianScale >= 0.9 * vw) {
      setCalibrationFeedback("Too close during calibration. Please step back so your face doesn’t touch frame edges, then try again.");
      setCalibrationSuccess(false);
      return;
    }

    const known = Math.max(20, Math.min(200, Math.round(knownDistanceCm)));
    distanceEstimatorRef.current.clearCalibration();
    const ok = distanceEstimatorRef.current.calibrateFocalLength(medianScale, known);
    if (!ok) {
      setCalibrationFeedback("Calibration failed with invalid values.");
      setCalibrationSuccess(false);
      return;
    }

    const f = distanceEstimatorRef.current.getFocalLength();
    setFocalLengthPx(f);
    const baseline = distanceEstimatorRef.current.getBaseline();
    if (baseline) {
      setBaselineScale(baseline.scalePx);
      setBaselineDistance(baseline.distanceCm);
    }

    localStorage.setItem(getFocalKey(vw, videoRef.current.videoHeight), String(f));
    localStorage.setItem(getBaselineKey(vw, videoRef.current.videoHeight), JSON.stringify({ scalePx: medianScale, distanceCm: known }));

    prevSmoothedRef.current = known;
    samplesCountRef.current = 0;
    lastGoodScaleRef.current = medianScale;
    setPlateau(false);
    setStats(prev => ({ ...prev, averageDistance: known }));
    setCurrentDistance(known);
    setCalibrationFeedback(`Calibrated at ${known}cm with face width ${Math.round(medianScale)}px`);
    setCalibrationSuccess(true);
  };

  const handleResetCalibration = () => {
    if (videoRef.current) {
      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      localStorage.removeItem(getFocalKey(vw, vh));
      localStorage.removeItem(getBaselineKey(vw, vh));
    }
    distanceEstimatorRef.current.clearCalibration();
    distanceEstimatorRef.current.setFocalLength(600);
    setFocalLengthPx(distanceEstimatorRef.current.getFocalLength());
    prevSmoothedRef.current = 0;
    samplesCountRef.current = 0;
    lastGoodScaleRef.current = 0;
    setPlateau(false);
    setStats(prev => ({ ...prev, averageDistance: 0 }));
    setCalibrationSuccess(false);
    setCalibrationFeedback('Calibration reset');
    setBaselineScale(0);
    setBaselineDistance(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 p-4">
      {/* Alert Modal */}
      {alertVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform animate-pulse">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                You're sitting too close!
              </h3>
              <p className="text-gray-600 mb-6">
                {currentTip}
              </p>
              <button
                onClick={dismissAlert}
                className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full mb-4 shadow-lg">
            <Eye className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">EyeGuard Monitoring</h1>
          <p className="text-gray-600">Protecting your eyes while you work</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Monitoring Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Live Monitoring</h2>
                <div className="flex gap-3">
                  {!isMonitoring ? (
                    <button
                      onClick={startMonitoring}
                      className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start
                    </button>
                  ) : (
                    <button
                      onClick={stopMonitoring}
                      className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Stop
                    </button>
                  )}
                </div>
              </div>

              {/* Camera Status - make canvas conditionally visible */}
              <div className="mb-6">
                {cameraPermission ? (
                  <div className="flex items-center text-green-600 mb-4">
                    <Camera className="w-5 h-5 mr-2" />
                    Camera Active
                  </div>
                ) : (
                  <div className="flex items-center text-gray-500 mb-4">
                    <CameraOff className="w-5 h-5 mr-2" />
                    Camera Not Active
                  </div>
                )}
                
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  className="w-full max-w-sm h-40 bg-gray-100 rounded-lg object-contain"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <canvas
                  ref={canvasRef}
                  className={`${canvasVisible ? 'block' : 'hidden'} mt-2 border border-gray-300 rounded-lg`}
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </div>

              {/* Distance Display with improved debug info */}
              <div className="text-center">
                <div className={`text-4xl font-bold mb-2 ${distanceStatus.color}`}>
                  {currentDistance > 0 ? `${currentDistance} cm` : 'No face detected'}
                </div>
                <div className="text-gray-600">
                  {currentDistance > 0 ? 'Current Distance from Screen' : 'Please position your face in view'}
                </div>

                {/* Debug line with calibration progress */}
                <div className="mt-3 text-xs text-gray-500">
                  {videoRef.current && (
                    <>
                      <div>
                        Res: {videoRef.current.videoWidth}×{videoRef.current.videoHeight}
                        {' '}• f = {Math.round(focalLengthPx)} px
                        {' '}• face w×h = {faceWidthPx || 0}×{faceHeightPx || 0}px
                        {' '}• scale(w) = {scaleUsedPx || 0}px
                        {baselineScale ? ` • cal ${Math.round(baselineScale)}px@${baselineDistance}cm` : ''}
                        {saturatedFrame ? ' • sat' : ''}
                        {plateau ? ' • plateau' : ''}
                      </div>
                      {isCalibrating && (
                        <div className="mt-1 bg-blue-100 text-blue-800 p-1 rounded">
                          Calibration progress: {calibrationProgress}% ({detectedFaces} faces detected)
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats and Configuration */}
          <div className="space-y-6">
            {/* Vision Configuration */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Configuration</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Vision Type:</span>
                  <span className="font-medium">{visionType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Safe Distance:</span>
                  <span className="font-medium">{safeDistance.minDistance}-{safeDistance.maxDistance} cm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Alert Threshold:</span>
                  <span className="font-medium text-red-600">&lt; {safeDistance.alertThreshold} cm</span>
                </div>
              </div>
              <button
                onClick={onRestart}
                className="w-full mt-4 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Reconfigure
              </button>
            </div>

            {/* Calibration Panel */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Calibration</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Ruler className="w-4 h-4 text-indigo-600" />
                  <span className="text-gray-600">Calibrate at a known distance for accuracy</span>
                </div>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={knownDistanceCm}
                    onChange={(e) => setKnownDistanceCm(parseFloat(e.target.value) || 50)}
                    className="w-28 px-3 py-2 border rounded-lg"
                    min={20}
                    max={200}
                    step={1}
                    placeholder="cm"
                    aria-label="Known distance (cm)"
                  />
                  <button
                    onClick={handleCalibrate}
                    disabled={!cameraPermission}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                  >
                    Calibrate
                  </button>
                  <button
                    onClick={handleResetCalibration}
                    disabled={!cameraPermission}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Reset
                  </button>
                </div>
                {calibrationFeedback && (
                  <div className={`text-sm p-2 rounded ${calibrationSuccess ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                    {calibrationFeedback}
                  </div>
                )}
                <div className="text-sm text-gray-600">
                  <div>
                    Focal: <span className="font-mono">{Math.round(focalLengthPx)}</span> px
                    {baselineScale > 0 && (
                      <span className="ml-1 text-indigo-600">• Calibrated with scale={Math.round(baselineScale)}px</span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Tip: Position yourself at exactly {knownDistanceCm}cm from screen, keep centered and well-lit.
                </div>
              </div>
            </div>

            {/* Session Stats */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Alerts:</span>
                  <span className="font-medium text-red-600">{stats.totalAlerts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Distance:</span>
                  <span className="font-medium">
                    {stats.averageDistance > 0 ? `${Math.round(stats.averageDistance)} cm` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Session Time:</span>
                  <span className="font-medium">
                    {Math.round((Date.now() - stats.sessionStartTime.getTime()) / 60000)} min
                  </span>
                </div>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h3>
              <div className={`p-4 rounded-xl ${
                distanceStatus.status === 'optimal' ? 'bg-green-50 border border-green-200' :
                distanceStatus.status === 'too-close' ? 'bg-red-50 border border-red-200' :
                distanceStatus.status === 'no-face' ? 'bg-gray-50 border border-gray-200' :
                'bg-gray-50 border border-gray-200'
              }`}>
                <div className={`font-medium ${distanceStatus.color}`}>
                  {distanceStatus.status === 'optimal' && '✓ Perfect Distance'}
                  {distanceStatus.status === 'too-close' && '⚠ Too Close'}
                  {distanceStatus.status === 'far' && '→ A bit Far'}
                  {distanceStatus.status === 'no-face' && '👁 No Face Detected'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};