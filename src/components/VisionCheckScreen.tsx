import React from 'react';
import { Glasses, Eye, ArrowRight } from 'lucide-react';

interface VisionCheckScreenProps {
  onAnswer: (hasSpecs: boolean) => void;
}

export const VisionCheckScreen: React.FC<VisionCheckScreenProps> = ({ onAnswer }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mb-6 shadow-lg">
            <Eye className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Vision Assessment
          </h2>
          <p className="text-lg text-gray-600">
            To provide personalized recommendations, we need to know about your vision
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              Do you wear glasses or have eye power?
            </h3>
            <p className="text-gray-600">
              This helps us calculate the optimal screen distance for your eyes
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <button
              onClick={() => onAnswer(false)}
              className="group bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-8 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 transition-all duration-200 transform hover:scale-[1.02]"
            >
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4 group-hover:bg-blue-200 transition-colors">
                  <Eye className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">No Glasses</h4>
                <p className="text-gray-600 mb-4">I have normal vision without correction</p>
                <div className="inline-flex items-center text-blue-600 font-medium">
                  Continue <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </button>

            <button
              onClick={() => onAnswer(true)}
              className="group bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-8 hover:from-purple-100 hover:to-pink-100 hover:border-purple-300 transition-all duration-200 transform hover:scale-[1.02]"
            >
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4 group-hover:bg-purple-200 transition-colors">
                  <Glasses className="w-8 h-8 text-purple-600" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Yes, I Wear Glasses</h4>
                <p className="text-gray-600 mb-4">I have eye power or wear corrective lenses</p>
                <div className="inline-flex items-center text-purple-600 font-medium">
                  Enter Details <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </button>
          </div>

          <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4">
            <p className="text-sm text-amber-800 text-center">
              <strong>Note:</strong> Your vision information is used only for distance calculations and is never stored or shared
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};