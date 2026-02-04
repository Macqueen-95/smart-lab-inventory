import serial
import requests
import time

# -------- CONFIG --------
SERIAL_PORT = "COM3"   # macOS: /dev/tty.usbserial-xxxx or /dev/tty.usbmodem-xxxx
BAUD_RATE = 9600

API_URL = "https://cyber-forge-1.onrender.com/api/rfid/scan"

SCANNER_ID = "LAB_EXIT_01"
EVENT_TYPE = "SCAN"
# ------------------------

def main():
    print("Starting RFID bridge...")
    print("Connecting to Arduino...")

    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        time.sleep(2)  # allow Arduino to reset
    except Exception as e:
        print("❌ Serial connection failed:", e)
        return

    print("✅ Connected to Arduino")

    while True:
        try:
            line = ser.readline().decode().strip()

            if not line:
                continue

            uid = line
            print("📡 RFID detected:", uid)

            payload = {
                "uid": uid,
                "scanner_id": SCANNER_ID,
                "event_type": EVENT_TYPE
            }

            response = requests.post(API_URL, json=payload, timeout=5)

            if response.status_code == 200:
                print("✅ Sent to server")
            else:
                print("⚠️ Server error:", response.status_code, response.text)

        except Exception as e:
            print("❌ Error:", e)
            time.sleep(1)

if __name__ == "__main__":
    main()
