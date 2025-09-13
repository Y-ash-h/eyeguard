import { useState } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { VisionCheckScreen } from './components/VisionCheckScreen';
import { EyePowerScreen } from './components/EyePowerScreen';
import { MonitoringScreen } from './components/MonitoringScreen';
import { VisionData, AppStep } from './types';

function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>('welcome');
  const [visionData, setVisionData] = useState<VisionData>({
    hasSpecs: false,
    leftEye: 0,
    rightEye: 0
  });

  const handleStart = () => {
    setCurrentStep('vision-check');
  };

  const handleVisionAnswer = (hasSpecs: boolean) => {
    if (hasSpecs) {
      setCurrentStep('eye-power');
    } else {
      setVisionData({ hasSpecs: false, leftEye: 0, rightEye: 0 });
      setCurrentStep('monitoring');
    }
  };

  const handleEyePowerSubmit = (data: VisionData) => {
    setVisionData(data);
    setCurrentStep('monitoring');
  };

  const handleRestart = () => {
    setCurrentStep('welcome');
    setVisionData({ hasSpecs: false, leftEye: 0, rightEye: 0 });
  };

  switch (currentStep) {
    case 'welcome':
      return <WelcomeScreen onStart={handleStart} />;
    
    case 'vision-check':
      return <VisionCheckScreen onAnswer={handleVisionAnswer} />;
    
    case 'eye-power':
      return <EyePowerScreen onSubmit={handleEyePowerSubmit} />;
    
    case 'monitoring':
      return <MonitoringScreen visionData={visionData} onRestart={handleRestart} />;
    
    default:
      return <WelcomeScreen onStart={handleStart} />;
  }
}

export default App;