# EyeGuard - Smart Screen Distance Monitor

A modern web application that uses AI-powered face detection to monitor your distance from the screen and protect your eyes from strain. Built with React, TypeScript, and advanced machine learning models.

![EyeGuard Demo](https://img.shields.io/badge/EyeGuard-Eye%20Protection-blue?style=for-the-badge&logo=eye)

## 🌟 Features

- **🤖 AI-Powered Face Detection** - Uses TensorFlow.js BlazeFace and native browser APIs
- **👀 Personalized Vision Support** - Adapts to your eye power and vision needs
- **📏 Real-time Distance Monitoring** - Tracks your position with sub-second accuracy
- **🎯 Smart Calibration** - One-time setup for precise measurements
- **🔔 Gentle Alerts** - Audio and visual notifications with eye care tips
- **📊 Session Analytics** - Track your posture habits over time
- **🔒 Privacy First** - All processing happens locally, no data leaves your device

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- Modern web browser (Chrome, Edge, Firefox, Safari)
- Webcam access

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd eyedistance/project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   - Navigate to `http://localhost:5173`
   - Allow camera permissions when prompted
   - Ensure good lighting for optimal face detection

## 🎯 How It Works

### 1. Vision Assessment
- Answer whether you wear glasses/contacts
- Enter your eye power (if applicable) for personalized distance calculations
- Skip if you don't know your prescription

### 2. Smart Calibration (Recommended)
- Position yourself at a known distance (default: 50cm)
- Keep your face within the green guide rails
- Let the AI capture your face measurements
- System calculates your personal baseline for accuracy

### 3. Real-time Monitoring
- Orange rectangles show detected faces with eye landmarks
- Distance calculated using face width or inter-eye distance
- Alerts trigger when you're too close to screen
- Eye care tips provided with each alert

## 🔧 Available Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Check code quality

# Deployment
npm run build && npm run preview
```

## 🎨 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Face Detection**: TensorFlow.js BlazeFace, Browser FaceDetector API
- **Build Tool**: Vite
- **Icons**: Lucide React
- **Audio**: Web Audio API

## 📱 Browser Compatibility

| Browser | Face Detection | Audio Alerts | Overall Support |
|---------|---------------|--------------|-----------------|
| Chrome 90+ | ✅ BlazeFace + Native | ✅ | ✅ Excellent |
| Edge 90+ | ✅ BlazeFace + Native | ✅ | ✅ Excellent |
| Firefox 85+ | ✅ BlazeFace | ✅ | ✅ Good |
| Safari 14+ | ✅ BlazeFace | ✅ | ✅ Good |

## 🛠️ Configuration

### Safe Distance Calculation

The app calculates personalized safe distances based on vision type:

- **Normal Vision**: 35-45cm optimal range
- **Myopia (Nearsightedness)**: Closer safe distance based on eye power
- **Hyperopia (Farsightedness)**: Further safe distance based on eye power

### Calibration Tips

For best accuracy:
- Use good, even lighting
- Position face centered in camera view
- Maintain steady distance during calibration
- Recalibrate if you change seating setup

## 🔒 Privacy & Security

- **100% Local Processing**: All face detection happens in your browser
- **No Data Collection**: No personal information is stored or transmitted
- **Camera Access**: Only used for real-time detection, not recording
- **Offline Capable**: Works without internet after initial load

## 🎯 Eye Care Tips

Built-in eye care recommendations based on optometry best practices:

- **20-20-20 Rule**: Every 20 minutes, look 20 feet away for 20 seconds
- **Proper Posture**: Maintain arm's length distance from screen
- **Screen Position**: Top of screen at or below eye level
- **Lighting**: Avoid glare and ensure adequate ambient lighting
- **Blinking**: Conscious blinking to prevent dry eyes

## 🚨 Troubleshooting

### Camera Issues
- Ensure camera permissions are granted
- Use HTTPS or localhost (required for camera access)
- Check if other apps are using the camera
- Try refreshing the page

### Face Detection Issues
- Improve lighting conditions
- Remove obstructions (hands, hair, masks)
- Position face within camera view
- Ensure face is clearly visible and not too close/far

### Calibration Problems
- Use steady, consistent lighting
- Maintain exact distance during calibration
- Keep face centered and still
- Try recalibrating if readings seem off

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for:

- Bug reports and feature requests
- Code style and commit conventions
- Pull request process
- Development setup

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- TensorFlow.js team for BlazeFace model
- Optometry research for safe distance guidelines
- Web standards for camera and audio APIs
- Community feedback and testing

---

**⚠️ Disclaimer**: This app is for general wellness and is not a substitute for professional eye care. Consult an optometrist for vision concerns.

**Made with ❤️ for healthier screen time**