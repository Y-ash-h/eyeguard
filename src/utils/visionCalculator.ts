import { VisionData, SafeDistanceConfig } from '../types';

export const calculateSafeDistance = (visionData: VisionData): SafeDistanceConfig => {
  if (!visionData.hasSpecs) {
    // Normal vision for laptop work
    return {
      minDistance: 35,
      maxDistance: 45,
      alertThreshold: 35
    };
  }

  // Calculate average power if both eyes have values
  const leftPower = visionData.leftEye || 0;
  const rightPower = visionData.rightEye || 0;
  const avgPower = (leftPower + rightPower) / 2;

  if (avgPower < 0) {
    // Myopia (nearsightedness)
    const focalLength = 1 / Math.abs(avgPower);
    const focalCm = focalLength * 100;
    const safeDistance = Math.max(30, focalCm);
    
    return {
      minDistance: 30,
      maxDistance: safeDistance + 10,
      alertThreshold: 30
    };
  } else if (avgPower > 0) {
    // Hypermetropia (farsightedness)
    const focalLength = 1 / avgPower;
    const focalCm = focalLength * 100;
    const safeDistance = Math.max(40, focalCm);
    
    return {
      minDistance: 40,
      maxDistance: safeDistance + 10,
      alertThreshold: 40
    };
  }

  // Default case
  return {
    minDistance: 35,
    maxDistance: 45,
    alertThreshold: 35
  };
};

export const getVisionTypeDescription = (visionData: VisionData): string => {
  if (!visionData.hasSpecs) {
    return 'Normal Vision';
  }

  const leftPower = visionData.leftEye || 0;
  const rightPower = visionData.rightEye || 0;
  const avgPower = (leftPower + rightPower) / 2;

  if (avgPower < 0) {
    return 'Myopia (Nearsightedness)';
  } else if (avgPower > 0) {
    return 'Hypermetropia (Farsightedness)';
  }

  return 'Normal Vision with Correction';
};