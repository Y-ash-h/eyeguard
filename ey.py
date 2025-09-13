import cv2
import tkinter as tk
from tkinter import messagebox, simpledialog
import threading
import time
import random
import winsound
import sys

class EyeStrainMonitor:
    def __init__(self):
        self.monitoring = False
        self.safe_distance = 35
        self.alert_threshold = 35
        self.has_specs = False
        self.left_eye_power = 0
        self.right_eye_power = 0
        self.cap = None
        self.face_cascade = None
        self.last_alert_time = 0
        self.alert_cooldown = 10  # seconds between alerts

        self.calibrated = False
        self.reference_face_width = 0
        self.reference_distance = 50  # cm

        self.alpha = 0.35  # smoothing factor for EMA
        self.smoothed_distance = 0

        self.eye_tips = [
            "Take a 20-second break and look 20 feet away.",
            "Blink often to reduce dryness.",
            "Adjust your posture and sit back a bit.",
            "Consider zooming in instead of leaning forward.",
            "Follow the 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds.",
            "Ensure your screen is slightly below eye level.",
            "Take regular breaks from screen work every hour.",
            "Adjust screen brightness to match your surroundings."
        ]

        try:
            self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        except:
            print("Error: Could not load face detection model")

        self.setup_gui()

    def setup_gui(self):
        self.root = tk.Tk()
        self.root.title("Eye Strain Monitor")
        self.root.geometry("400x350")
        self.root.resizable(False, False)

        main_frame = tk.Frame(self.root, padx=20, pady=20)
        main_frame.pack(fill=tk.BOTH, expand=True)

        title_label = tk.Label(main_frame, text="\U0001F441\uFE0F Eye Strain Monitor", font=("Arial", 16, "bold"))
        title_label.pack(pady=(0, 20))

        desc_label = tk.Label(main_frame, text="Protect your eyes by monitoring screen distance", font=("Arial", 10))
        desc_label.pack(pady=(0, 20))

        setup_btn = tk.Button(main_frame, text="Setup Vision & Start", command=self.setup_vision,
                              bg="#4CAF50", fg="white", font=("Arial", 12, "bold"), padx=20, pady=10)
        setup_btn.pack(pady=10)

        calibrate_btn = tk.Button(main_frame, text="Calibrate Distance (Recommended)", command=self.calibrate_distance,
                                  bg="#2196F3", fg="white", font=("Arial", 10), padx=20, pady=5)
        calibrate_btn.pack(pady=5)

        self.status_label = tk.Label(main_frame, text="Status: Not Started", font=("Arial", 10))
        self.status_label.pack(pady=10)

        self.distance_label = tk.Label(main_frame, text="Current Distance: -- cm", font=("Arial", 10, "bold"))
        self.distance_label.pack(pady=5)

        self.stop_btn = tk.Button(main_frame, text="Stop Monitoring", command=self.stop_monitoring,
                                  bg="#f44336", fg="white", font=("Arial", 10), state=tk.DISABLED)
        self.stop_btn.pack(pady=5)

        exit_btn = tk.Button(main_frame, text="Exit Application", command=self.exit_app, font=("Arial", 10))
        exit_btn.pack(pady=5)

    def calibrate_distance(self):
        try:
            cap = cv2.VideoCapture(0)
            if not cap.isOpened():
                messagebox.showerror("Error", "Could not access webcam!")
                return

            messagebox.showinfo("Calibration", "Sit at exactly 50 cm from your screen.\nClick OK when ready, then look at the camera.")

            calibration_attempts = 0
            max_attempts = 30

            while calibration_attempts < max_attempts:
                ret, frame = cap.read()
                if not ret:
                    continue

                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)

                if len(faces) > 0:
                    face = max(faces, key=lambda x: x[2] * x[3])
                    x, y, w, h = face
                    self.reference_face_width = w
                    self.calibrated = True
                    cap.release()

                    messagebox.showinfo("Calibration Complete", f"Calibration successful!\nReference face width: {w} pixels at 50 cm")
                    return

                calibration_attempts += 1
                time.sleep(0.1)

            cap.release()
            messagebox.showerror("Calibration Failed", "Could not detect face for calibration.\nPlease ensure good lighting and try again.")

        except Exception as e:
            messagebox.showerror("Error", f"Calibration failed: {str(e)}")

    def setup_vision(self):
        has_specs = messagebox.askyesno("Vision Check", "Do you wear glasses or have eye power?")
        self.has_specs = has_specs

        if has_specs:
            try:
                left_power = simpledialog.askfloat("Left Eye Power", "Enter left eye power:", initialvalue=0.0)
                right_power = simpledialog.askfloat("Right Eye Power", "Enter right eye power:", initialvalue=0.0)

                if left_power is not None and right_power is not None:
                    self.left_eye_power = left_power
                    self.right_eye_power = right_power
                    self.calculate_safe_distance()
                else:
                    self.set_normal_vision()
            except:
                self.set_normal_vision()
        else:
            self.set_normal_vision()

        messagebox.showinfo("Safe Distance", f"Your safe screen distance: {self.safe_distance} cm\nAlert will trigger if closer than: {self.alert_threshold} cm")
        self.start_monitoring()

    def set_normal_vision(self):
        self.safe_distance = 40
        self.alert_threshold = 35

    def calculate_safe_distance(self):
        avg_power = (self.left_eye_power + self.right_eye_power) / 2

        if avg_power < 0:
            focal_length = 1 / abs(avg_power)
            focal_cm = focal_length * 100
            self.safe_distance = max(30, int(focal_cm))
            self.alert_threshold = 30
        elif avg_power > 0:
            focal_length = 1 / avg_power
            focal_cm = focal_length * 100
            self.safe_distance = max(40, int(focal_cm))
            self.alert_threshold = 40
        else:
            self.set_normal_vision()

    def start_monitoring(self):
        try:
            self.cap = cv2.VideoCapture(0)
            if not self.cap.isOpened():
                messagebox.showerror("Error", "Could not access webcam!")
                return

            self.monitoring = True
            self.status_label.config(text="Status: Monitoring Active")
            self.stop_btn.config(state=tk.NORMAL)

            threading.Thread(target=self.monitor_distance, daemon=True).start()
            threading.Thread(target=self.update_gui, daemon=True).start()

            if not self.calibrated:
                messagebox.showwarning("Not Calibrated", "Distance measurement may be inaccurate.\nConsider calibrating for better accuracy.")

            messagebox.showinfo("Monitoring Started", "Eye strain monitoring is now active!\nThe app will run in the background.")

        except Exception as e:
            messagebox.showerror("Error", f"Failed to start monitoring: {str(e)}")

    def monitor_distance(self):
        self.current_distance = 0
        self.smoothed_distance = 0

        while self.monitoring:
            try:
                ret, frame = self.cap.read()
                if not ret:
                    time.sleep(0.1)
                    continue

                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)

                if len(faces) > 0:
                    face = max(faces, key=lambda x: x[2] * x[3])
                    x, y, w, h = face
                    distance = self.estimate_distance(w)

                    # Exponential smoothing to reduce jitter
                    if self.smoothed_distance == 0:
                        self.smoothed_distance = distance
                    else:
                        self.smoothed_distance = int(self.alpha * distance + (1 - self.alpha) * self.smoothed_distance)

                    # Clamp reasonable range
                    self.smoothed_distance = max(10, min(200, self.smoothed_distance))
                    self.current_distance = self.smoothed_distance

                    if self.current_distance < self.alert_threshold and self.current_distance > 0:
                        current_time = time.time()
                        if current_time - self.last_alert_time > self.alert_cooldown:
                            self.trigger_alert()
                            self.last_alert_time = current_time
                else:
                    self.current_distance = 0

                time.sleep(0.5)
            except Exception as e:
                print(f"Monitoring error: {e}")
                time.sleep(1)

    def update_gui(self):
        while self.monitoring:
            try:
                if hasattr(self, 'current_distance'):
                    if self.current_distance > 0:
                        color = "green" if self.current_distance >= self.alert_threshold else "red"
                        self.distance_label.config(text=f"Current Distance: {self.current_distance} cm", fg=color)
                    else:
                        self.distance_label.config(text="Current Distance: Face not detected", fg="gray")
                time.sleep(0.5)
            except:
                break

    def estimate_distance(self, face_width_pixels):
        try:
            if self.calibrated and self.reference_face_width > 0:
                distance = (self.reference_face_width * self.reference_distance) / face_width_pixels
            else:
                known_face_width_cm = 15.0
                default_face_width_px = 110
                known_distance_cm = 50
                focal_length_px = (default_face_width_px * known_distance_cm) / known_face_width_cm
                distance = (known_face_width_cm * focal_length_px) / face_width_pixels

            distance_cm = round(distance, 1)
            print(f"[DEBUG] Face width: {face_width_pixels}px → Distance: {distance_cm} cm")
            return max(10, min(200, int(distance_cm)))
        except Exception as e:
            print(f"[ERROR] Distance estimation failed: {e}")
            return 0

    def trigger_alert(self):
        try:
            winsound.Beep(800, 200)
            tip = random.choice(self.eye_tips)

            alert_window = tk.Toplevel(self.root)
            alert_window.title("\u26A0\uFE0F Eye Strain Alert")
            alert_window.geometry("350x200")
            alert_window.resizable(False, False)
            alert_window.attributes('-topmost', True)

            alert_frame = tk.Frame(alert_window, padx=20, pady=20)
            alert_frame.pack(fill=tk.BOTH, expand=True)

            tk.Label(alert_frame, text="\u26A0\uFE0F You're sitting too close!", font=("Arial", 14, "bold"), fg="red").pack(pady=(0, 10))
            tk.Label(alert_frame, text=f"Current distance: {self.current_distance} cm", font=("Arial", 10, "bold")).pack(pady=5)
            tk.Label(alert_frame, text=tip, font=("Arial", 10), wraplength=300, justify=tk.CENTER).pack(pady=10)
            tk.Button(alert_frame, text="Got it!", command=alert_window.destroy, bg="#4CAF50", fg="white").pack(pady=10)

            alert_window.after(5000, alert_window.destroy)
        except Exception as e:
            print(f"Alert error: {e}")

    def stop_monitoring(self):
        self.monitoring = False
        if self.cap:
            self.cap.release()
        self.status_label.config(text="Status: Monitoring Stopped")
        self.distance_label.config(text="Current Distance: -- cm", fg="black")
        self.stop_btn.config(state=tk.DISABLED)
        messagebox.showinfo("Stopped", "Monitoring has been stopped.")

    def exit_app(self):
        self.stop_monitoring()
        self.root.quit()
        self.root.destroy()
        sys.exit()

    def run(self):
        self.root.protocol("WM_DELETE_WINDOW", self.exit_app)
        self.root.mainloop()

if __name__ == "__main__":
    try:
        app = EyeStrainMonitor()
        app.run()
    except Exception as e:
        print(f"Application error: {e}")
        input("Press Enter to exit...")
