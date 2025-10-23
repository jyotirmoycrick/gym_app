import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AttendanceScreen(): JSX.Element {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (!isScanning) return;
    const { data } = result;
    if (!data) return;

    setIsScanning(false);
    setScannedData(data);
    markAttendance(data);
  };

  const markAttendance = async (qrData: string) => {
    try {
      setIsLoading(true);

      // Extract gym_id from QR code: fitdesert://gym/gym_XXXX/attendance
      const gymIdMatch = qrData.match(/gym\/(gym_[\d.]+)/);
      const gymId = gymIdMatch ? gymIdMatch[1] : null;

      if (!gymId) {
        Alert.alert("Invalid QR Code", "The scanned QR code is not valid.");
        return;
      }

      // Retrieve session token from AsyncStorage
      const sessionToken = await AsyncStorage.getItem("session_token");
      if (!sessionToken) {
        Alert.alert("Not Authenticated", "Please log in again to continue.");
        return;
      }

      // Send request to backend
      const response = await fetch(
        `http://192.168.29.223:8000/api/attendance/scan?gym_id=${gymId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        Alert.alert("Attendance", result.message || "Attendance marked successfully.");
      } else if (result.detail === "Invalid session") {
        Alert.alert("Session Expired", "Please log in again.");
        await AsyncStorage.removeItem("session_token");
      } else {
        Alert.alert("Error", result.detail || "Failed to mark attendance.");
      }
    } catch (error) {
      Alert.alert("Network Error", "Unable to reach the server. Please try again.");
    } finally {
      setIsLoading(false);
      setIsScanning(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Requesting camera permission...</Text>
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

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#2e7d32" />
          <Text style={styles.loaderText}>Marking attendance...</Text>
        </View>
      )}

      {scannedData ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultHeader}>QR Code Scanned</Text>
          <Text style={styles.resultValue}>{scannedData}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setScannedData(null);
              setIsScanning(true);
            }}
          >
            <Text style={styles.buttonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 16,
    color: "#333",
  },
  resultContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  resultHeader: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#2e7d32",
  },
  resultValue: {
    fontSize: 15,
    color: "#555",
    marginBottom: 16,
  },
  loaderOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loaderText: {
    marginTop: 8,
    color: "#2e7d32",
    fontSize: 15,
  },
  button: {
    backgroundColor: "#2e7d32",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
  },
});
