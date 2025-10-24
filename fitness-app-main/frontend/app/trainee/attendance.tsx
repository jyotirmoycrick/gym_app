import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
} from "react-native";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import * as SecureStore from "expo-secure-store";
import * as Haptics from "expo-haptics";

export default function AttendanceScreen(): JSX.Element {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ message: string; type: string } | null>(
    null
  );
  const [scanLineAnim] = useState(new Animated.Value(0));
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    if (isScanning) {
      startScanAnimation();
    }
  }, [isScanning]);

  const startScanAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (!isScanning || isLoading) return; // ✅ prevent multiple triggers
    const { data } = result;
    if (!data) return;

    setIsScanning(false);
    markAttendance(data);
  };

  const markAttendance = async (qrData: string) => {
    try {
      setIsLoading(true);
      console.log("🔍 QR Data:", qrData);

      const gymIdMatch = qrData.match(/gym\/(gym_[\d.]+)/);
      const gymId = gymIdMatch ? gymIdMatch[1] : null;

      if (!gymId) {
        setSuccessData({ message: "Invalid QR Code scanned", type: "error" });
        return;
      }

      const sessionToken = await SecureStore.getItemAsync("session_token");
      if (!sessionToken) {
        setSuccessData({ message: "Please log in again", type: "error" });
        return;
      }

      console.log("📡 Sending request with token:", sessionToken);

      const response = await fetch("http://192.168.29.223:8000/api/attendance/scan", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionToken}`,
  },
  body: JSON.stringify({ qr_code: qrData }),
});


      let result: any = {};
      try {
        result = await response.json();
      } catch (err) {
        console.log("⚠️ JSON parse failed", err);
        setSuccessData({ message: "Unexpected server response", type: "error" });
        return;
      }

      console.log("📬 Backend response:", result);

      if (response.ok) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSuccessData({
          message: result.message || "Attendance marked successfully!",
          type: result.type || "success",
        });
      } else if (result.detail === "Invalid session" || result.detail === "Session expired") {
        await SecureStore.deleteItemAsync("session_token");
        setSuccessData({ message: "Session expired. Please log in again.", type: "error" });
      } else {
  // If FastAPI returned a structured validation error
  if (Array.isArray(result.detail)) {
    const firstError = result.detail[0];
    setSuccessData({
      message: `${firstError.msg || "Validation error"} at ${firstError.loc?.join(" → ")}`,
      type: "error",
    });
  } else {
    setSuccessData({
      message: result.detail || "Failed to mark attendance.",
      type: "error",
    });
  }
}

    } catch (error) {
      console.log("❌ Network or unexpected error:", error);
      setSuccessData({ message: "Network error — unable to reach server", type: "error" });
    } finally {
      setTimeout(() => {
        if (mounted) {
          setIsLoading(false);
          setIsScanning(false);
        }
      }, 300);
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Camera permission not granted</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#2e7d32" />
          <Text style={styles.loaderText}>Marking attendance...</Text>
        </View>
      )}

      {successData ? (
        <View style={styles.resultContainer}>
          <Text
            style={[
              styles.resultHeader,
              successData.type === "error" ? { color: "#c0392b" } : { color: "#27ae60" },
            ]}
          >
            {successData.type === "error" ? "❌ Failed" : "✅ Success"}
          </Text>
          <Text style={styles.resultValue}>{successData.message}</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setSuccessData(null);
              setIsScanning(true);
            }}
          >
            <Text style={styles.buttonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.overlay}>
            <View style={styles.frame}>
              <Animated.View
                style={[styles.scanLine, { transform: [{ translateY: scanLineTranslateY }] }]}
              />
            </View>
            <Text style={styles.instructionText}>Align the QR within the frame</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  cameraContainer: { flex: 1, position: "relative" },
  camera: { flex: 1, width: "100%" },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  frame: {
    width: 250,
    height: 250,
    borderColor: "#2e7d32",
    borderWidth: 3,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  scanLine: {
    width: "100%",
    height: 3,
    backgroundColor: "#00ff6a",
    opacity: 0.8,
  },
  instructionText: {
    marginTop: 20,
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  resultContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
    padding: 24,
  },
  resultHeader: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 12,
  },
  resultValue: {
    fontSize: 15,
    color: "#ddd",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  button: {
    backgroundColor: "#2e7d32",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  loaderText: {
    marginTop: 10,
    color: "#2e7d32",
    fontSize: 16,
    fontWeight: "500",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 16, color: "#ccc", marginBottom: 10 },
});
