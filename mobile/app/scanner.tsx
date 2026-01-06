// ============================================================
// ClimaTrak Mobile - QR Code Scanner Screen
// ============================================================

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Camera as CameraIcon,
  Flashlight,
  FlashlightOff,
  QrCode,
} from 'lucide-react-native';
import { assetService } from '@/shared/api';
import { theme } from '@/theme';

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || isSearching) return;
    
    setScanned(true);
    setIsSearching(true);

    try {
      // Try to find asset by QR code or tag
      let asset = await assetService.findByQrCode(data);
      
      if (!asset) {
        // Try searching by tag
        asset = await assetService.findByTag(data);
      }

      if (asset) {
        // Navigate to asset detail
        router.replace(`/asset/${asset.id}`);
      } else {
        Alert.alert(
          'Ativo não encontrado',
          `Nenhum ativo encontrado para o código: ${data}`,
          [
            { 
              text: 'Escanear novamente', 
              onPress: () => {
                setScanned(false);
                setIsSearching(false);
              }
            },
            { 
              text: 'Fechar', 
              onPress: () => router.back(),
              style: 'cancel',
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Erro',
        'Não foi possível buscar o ativo. Tente novamente.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              setScanned(false);
              setIsSearching(false);
            }
          },
        ]
      );
    }
  };

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <CameraIcon size={64} color={theme.colors.neutral[400]} />
          <Text style={styles.permissionTitle}>Permissão da Câmera</Text>
          <Text style={styles.permissionText}>
            Precisamos de acesso à câmera para escanear códigos QR dos ativos.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Permitir Acesso</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        {/* Header */}
        <SafeAreaView style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <X size={24} color={theme.colors.white} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Escanear QR Code</Text>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setTorch(!torch)}
          >
            {torch ? (
              <FlashlightOff size={24} color={theme.colors.white} />
            ) : (
              <Flashlight size={24} color={theme.colors.white} />
            )}
          </TouchableOpacity>
        </SafeAreaView>

        {/* Scan Overlay */}
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            
            {isSearching && (
              <View style={styles.searchingOverlay}>
                <ActivityIndicator size="large" color={theme.colors.white} />
                <Text style={styles.searchingText}>Buscando ativo...</Text>
              </View>
            )}
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <QrCode size={24} color={theme.colors.white} />
          <Text style={styles.instructionsText}>
            Aponte a câmera para o QR Code do ativo
          </Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.black,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[8],
    backgroundColor: theme.colors.white,
    gap: 16,
  },
  permissionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginTop: theme.spacing[4],
  },
  permissionText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral[600],
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing[8],
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing[4],
  },
  permissionButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    color: theme.colors.white,
  },
  cancelButton: {
    paddingHorizontal: theme.spacing[8],
    paddingVertical: theme.spacing[3],
  },
  cancelButtonText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral[500],
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[2],
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.white,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: theme.colors.primary[400],
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  searchingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
  },
  searchingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.white,
    fontWeight: '500',
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[8],
    paddingHorizontal: theme.spacing[4],
    gap: 12,
  },
  instructionsText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.white,
    textAlign: 'center',
  },
});
