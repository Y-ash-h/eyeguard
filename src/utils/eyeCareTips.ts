export const eyeCareTips = [
  "Follow the 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds.",
  "Blink often to reduce dryness and keep your eyes moist.",
  "Adjust your posture and sit back a bit from the screen.",
  "Consider zooming in instead of leaning forward to see better.",
  "Ensure your screen is slightly below eye level to reduce neck strain.",
  "Take regular breaks from screen work every hour.",
  "Adjust screen brightness to match your surroundings.",
  "Use proper lighting to reduce glare on your screen.",
  "Keep your screen clean to avoid straining to see through smudges.",
  "Stay hydrated - dehydration can cause dry eyes.",
  "Consider using artificial tears if your eyes feel dry.",
  "Adjust font size instead of moving closer to read small text."
];

export const getRandomEyeCareTip = (): string => {
  return eyeCareTips[Math.floor(Math.random() * eyeCareTips.length)];
};