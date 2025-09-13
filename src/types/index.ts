export interface VisionData {
  hasSpecs: boolean;
  leftEye: number;
  rightEye: number;
}

export interface SafeDistanceConfig {
  minDistance: number;
  maxDistance: number;
  alertThreshold: number;
}

export interface MonitoringStats {
  sessionStartTime: Date;
  totalAlerts: number;
  averageDistance: number;
  lastAlertTime?: Date;
}

export type AppStep = 'welcome' | 'vision-check' | 'eye-power' | 'monitoring';