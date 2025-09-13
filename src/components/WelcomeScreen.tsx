import React from 'react';
import { Eye, Shield, Monitor } from 'lucide-react';

interface WelcomeScreenProps {
  onStart: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-6 shadow-lg">
            <Eye className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            EyeGuard
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your Personal Screen Distance Monitor
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Monitor className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Smart Monitoring</h3>
              <p className="text-sm text-gray-600">
                Uses your webcam to track your distance from the screen in real-time
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Eye Protection</h3>
              <p className="text-sm text-gray-600">
                Prevents eye strain by alerting you when you're sitting too close
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <Eye className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Personalized Care</h3>
              <p className="text-sm text-gray-600">
                Adapts to your vision needs and provides customized recommendations
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">How it works:</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                We'll ask about your vision to calculate your optimal screen distance
              </li>
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                Your webcam monitors your position (all processing happens locally)
              </li>
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                Get gentle alerts with eye care tips when you're too close
              </li>
            </ul>
          </div>

          <button
            onClick={onStart}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
          >
            Start Eye Protection
          </button>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Your privacy is protected - all monitoring happens locally on your device</p>
        </div>
      </div>
    </div>
  );
};