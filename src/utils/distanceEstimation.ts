// Face detection and distance estimation utilities

export type FaceBox = { x: number; y: number; width: number; height: number };

export class DistanceEstimator {
  private KNOWN_FACE_WIDTH_CM = 15; // Average adult face width in cm
  private focalLength = 600; // Calibrated per device/resolution
  private faceDetector: any | null = null;
  private mediaipeFaceDetection: any | null = null;
  private blazeFaceModel: any | null = null;
  // New: ratio-based calibration baseline
  private baselineScalePx?: number;
  private baselineDistanceCm?: number;

  private minAcceptableScale = 20; // Minimum acceptable scale in px
  private maxAcceptableScale = 600; // Maximum acceptable scale in px

  constructor() {
    this.initializeDetectors();
  }

  private async initializeDetectors() {
    // 1. Try TensorFlow.js BlazeFace (most reliable)
    try {
      if (typeof window !== 'undefined' && window.blazeface) {
        console.log('Loading BlazeFace model...');
        this.blazeFaceModel = await window.blazeface.load();
        console.log('BlazeFace model loaded successfully');
      }
    } catch (error) {
      console.log('BlazeFace not available:', error);
    }

    // 2. Built-in FaceDetector API (if available)
    if ('FaceDetector' in window) {
      try {
        this.faceDetector = new (window as any).FaceDetector({
          fastMode: false,
          maxDetectedFaces: 1,
        });
        console.log('Native FaceDetector initialized');
      } catch (error) {
        console.log('Native FaceDetector failed:', error);
        this.faceDetector = null;
      }
    }

    // Note: MediaPipe removed for now due to complexity - can be added later if needed
  }

  getFocalLength(): number {
    return this.focalLength;
  }

  setFocalLength(px: number) {
    if (Number.isFinite(px) && px > 0) this.focalLength = px;
  }

  getKnownFaceWidthCm(): number {
    return this.KNOWN_FACE_WIDTH_CM;
  }

  setKnownFaceWidthCm(cm: number) {
    if (Number.isFinite(cm) && cm > 5 && cm < 30) this.KNOWN_FACE_WIDTH_CM = cm;
  }

  // Expose ratio-baseline
  getBaseline(): { scalePx: number; distanceCm: number } | null {
    if (this.baselineScalePx && this.baselineDistanceCm) {
      return { scalePx: this.baselineScalePx, distanceCm: this.baselineDistanceCm };
    }
    return null;
  }

  setRatioBaseline(scalePx: number, distanceCm: number) {
    if (Number.isFinite(scalePx) && scalePx > 0 && Number.isFinite(distanceCm) && distanceCm > 0) {
      this.baselineScalePx = scalePx;
      this.baselineDistanceCm = distanceCm;
    }
  }

  // Calibrate focal length using a real measurement
  calibrateFocalLength(faceWidthPixels: number, realDistanceCm: number, realFaceWidthCm: number = this.KNOWN_FACE_WIDTH_CM) {
    // Stricter validation
    if (!faceWidthPixels || !realDistanceCm || faceWidthPixels <= 0 || realDistanceCm <= 0) {
      console.error('Invalid calibration values:', { faceWidthPixels, realDistanceCm });
      return false; // Indicate failure
    }

    console.log(`Calibrating with scale=${faceWidthPixels}px at distance=${realDistanceCm}cm`);
    
    // Calculate focal length and set it
    const newFocalLength = (faceWidthPixels * realDistanceCm) / realFaceWidthCm;
    this.focalLength = newFocalLength;
    
    // Set ratio baseline which takes precedence
    this.baselineScalePx = faceWidthPixels;
    this.baselineDistanceCm = realDistanceCm;
    
    console.log(`Calibration complete: f=${this.focalLength}, baseline=${this.baselineScalePx}px:${this.baselineDistanceCm}cm`);
    return true; // Indicate success
  }

  clearCalibration() {
    this.baselineScalePx = undefined;
    this.baselineDistanceCm = undefined;
  }

  // Improve face detection by using multiple strategies
  async detectFace(canvas: HTMLCanvasElement, video: HTMLVideoElement): Promise<FaceBox | null> {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (canvas.width === 0 || canvas.height === 0) return null;
    ctx.drawImage(video, 0, 0);

    const area = canvas.width * canvas.height;
    const tooLarge = (w: number, h: number) => (w * h) / area > 0.3;
    const tooSmall = (w: number, h: number) => (w * h) / area < 0.01;
    const aspectRatioValid = (w: number, h: number) => {
      const ratio = w / h;
      return ratio > 0.6 && ratio < 1.8;
    };

    // 1. Try TensorFlow.js BlazeFace first (most accurate available)
    if (this.blazeFaceModel) {
      try {
        const predictions = await this.blazeFaceModel.estimateFaces(canvas, false);
        if (predictions && predictions.length > 0) {
          const prediction = predictions[0];
          const [x1, y1] = prediction.topLeft;
          const [x2, y2] = prediction.bottomRight;
          const box = {
            x: x1,
            y: y1,
            width: x2 - x1,
            height: y2 - y1
          };
          
          if (!tooLarge(box.width, box.height) && !tooSmall(box.width, box.height) && aspectRatioValid(box.width, box.height)) {
            // Draw face rectangle and eye landmarks
            ctx.strokeStyle = 'orange';
            ctx.lineWidth = 3;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
            
            // Draw eye landmarks for verification
            const landmarks = prediction.landmarks;
            ctx.fillStyle = 'orange';
            landmarks.forEach(([x, y]: [number, number]) => {
              ctx.beginPath();
              ctx.arc(x, y, 2, 0, 2 * Math.PI);
              ctx.fill();
            });
            
            // Calculate inter-eye distance for better accuracy
            if (landmarks.length >= 2) {
              const leftEye = landmarks[0];
              const rightEye = landmarks[1];
              const interEyeDistance = Math.sqrt(
                Math.pow(rightEye[0] - leftEye[0], 2) + Math.pow(rightEye[1] - leftEye[1], 2)
              );
              
              ctx.fillStyle = 'orange';
              ctx.font = '12px Arial';
              ctx.fillText(`BlazeFace: IED=${Math.round(interEyeDistance)}px`, box.x, box.y - 5);
              
              console.log('BlazeFace: Valid face detected', { ...box, interEyeDistance });
              return { ...box, interEyeDistance } as any;
            }
            
            console.log('BlazeFace: Valid face detected', box);
            return box;
          }
        }
      } catch (error) {
        console.log('BlazeFace detection failed:', error);
      }
    }

    // 2. Native FaceDetector API
    if (this.faceDetector) {
      try {
        const faces = await this.faceDetector.detect(canvas);
        if (faces && faces.length > 0) {
          const best = faces.reduce((largest: any, f: any) => {
            const a = f.boundingBox.width * f.boundingBox.height;
            const la = largest ? largest.boundingBox.width * largest.boundingBox.height : 0;
            return a > la ? f : largest;
          }, null as any);
          if (best) {
            const bb = best.boundingBox;
            if (!tooLarge(bb.width, bb.height) && !tooSmall(bb.width, bb.height) && aspectRatioValid(bb.width, bb.height)) {
              ctx.strokeStyle = 'green';
              ctx.lineWidth = 2;
              ctx.strokeRect(bb.x, bb.y, bb.width, bb.height);
              
              ctx.fillStyle = 'green';
              ctx.font = '12px Arial';
              ctx.fillText('Native API', bb.x, bb.y - 5);
              
              console.log('FaceDetector: Valid face detected', { w: bb.width, h: bb.height });
              return { x: bb.x, y: bb.y, width: bb.width, height: bb.height };
            }
          }
        }
      } catch (error) {
        console.log('FaceDetector failed:', error);
      }
    }

    // No face detected with any method
    console.log('No face detected with any detection method');
    return null;
  }

  // Fix distance estimation: always use ratio when baseline exists; remove max-scale halving
  estimateDistance(faceWidthPixels: number, faceBox?: any): number {
    let effectiveWidth = faceWidthPixels;
    
    // If we have inter-eye distance from BlazeFace, use it for more accuracy
    if (faceBox && faceBox.interEyeDistance) {
      // Average inter-eye distance is 6.3cm, use this for distance calculation
      const KNOWN_INTER_EYE_DISTANCE_CM = 6.3;
      const distanceFromEyes = (KNOWN_INTER_EYE_DISTANCE_CM * this.focalLength) / faceBox.interEyeDistance;
      console.log('estimateDistance: Using inter-eye distance', { 
        interEyeDistance: faceBox.interEyeDistance, 
        distance: Math.round(distanceFromEyes) 
      });
      return Math.max(1, Math.round(distanceFromEyes));
    }
    
    if (!Number.isFinite(effectiveWidth) || effectiveWidth <= this.minAcceptableScale) {
      console.log('estimateDistance: Invalid face width', effectiveWidth);
      return 0;
    }
    
    if (this.baselineScalePx && this.baselineDistanceCm) {
      const distance = (this.baselineDistanceCm * this.baselineScalePx) / effectiveWidth;
      console.log('estimateDistance: Using baseline', { 
        baselineScale: this.baselineScalePx, 
        baselineDistance: this.baselineDistanceCm, 
        faceWidth: effectiveWidth, 
        distance 
      });
      return Math.max(1, Math.round(distance));
    }
    
    const distance = (this.KNOWN_FACE_WIDTH_CM * this.focalLength) / effectiveWidth;
    console.log('estimateDistance: Using focal length', { 
      focalLength: this.focalLength, 
      faceWidth: effectiveWidth, 
      distance 
    });
    return Math.max(1, Math.round(distance));
  }
}