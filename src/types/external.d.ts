// Type declarations for external ML libraries

declare global {
  interface Window {
    blazeface?: {
      load(): Promise<BlazeFaceModel>;
    };
    FaceDetection?: any;
    MediaPipe?: any;
  }
}

interface BlazeFaceModel {
  estimateFaces(
    input: HTMLVideoElement | HTMLCanvasElement | ImageData,
    returnTensors?: boolean
  ): Promise<BlazeFacePrediction[]>;
}

interface BlazeFacePrediction {
  topLeft: [number, number];
  bottomRight: [number, number];
  landmarks: [number, number][];
  probability?: number[];
}

interface MediaPipeDetection {
  boundingBox: {
    originX: number;
    originY: number;
    width: number;
    height: number;
  };
  categories: Array<{
    score: number;
    categoryName: string;
  }>;
  keypoints?: Array<{
    x: number;
    y: number;
    score?: number;
  }>;
}

interface MediaPipeDetectionResult {
  detections: MediaPipeDetection[];
}

export {};
