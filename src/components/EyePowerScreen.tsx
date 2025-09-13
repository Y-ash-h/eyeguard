import React, { useState } from 'react';
import { Glasses, ArrowRight, Info } from 'lucide-react';
import { VisionData } from '../types';

interface EyePowerScreenProps {
  onSubmit: (visionData: VisionData) => void;
}

export const EyePowerScreen: React.FC<EyePowerScreenProps> = ({ onSubmit }) => {
  const [leftEye, setLeftEye] = useState<string>('');
  const [rightEye, setRightEye] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const visionData: VisionData = {
      hasSpecs: true,
      leftEye: parseFloat(leftEye) || 0,
      rightEye: parseFloat(rightEye) || 0
    };

    onSubmit(visionData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full mb-6 shadow-lg">
            <Glasses className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Eye Power Details
          </h2>
          <p className="text-lg text-gray-600">
            Enter your prescription details to calculate optimal screen distance
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Left Eye Power
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.25"
                    value={leftEye}
                    onChange={(e) => setLeftEye(e.target.value)}
                    placeholder="e.g., -2.5 or +1.0"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-0 text-lg transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Right Eye Power
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.25"
                    value={rightEye}
                    onChange={(e) => setRightEye(e.target.value)}
                    placeholder="e.g., -2.5 or +1.0"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-0 text-lg transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-2">How to find your eye power:</p>
                  <ul className="space-y-1">
                    <li>• Check your glasses prescription (SPH column)</li>
                    <li>• Use negative values for nearsightedness (e.g., -2.5)</li>
                    <li>• Use positive values for farsightedness (e.g., +1.5)</li>
                    <li>• Enter 0 if you don't know or don't have power in one eye</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center justify-center">
                Start Monitoring
                <ArrowRight className="w-5 h-5 ml-2" />
              </div>
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => onSubmit({ hasSpecs: true, leftEye: 0, rightEye: 0 })}
              className="text-gray-500 hover:text-gray-700 text-sm underline transition-colors"
            >
              Skip - I don't know my eye power
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};