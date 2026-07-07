import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar as NativeStatusBar,
  Text,
  TextInput,
  Vibration,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

type CoinFace = 'pile' | 'face';

type FlipRecord = {
  id: number;
  face: CoinFace;
  prediction: CoinFace | null;
};

type CoinLabels = Record<CoinFace, string>;
type CoinImages = Partial<Record<CoinFace, string>>;

const DEFAULT_FACE_LABELS: CoinLabels = {
  pile: 'Pile',
  face: 'Face',
};

const COIN_FACES: CoinFace[] = ['pile', 'face'];
const MAX_HISTORY_ITEMS = 12;
const MAX_CUSTOM_LABEL_LENGTH = 18;
const SETTINGS_STORAGE_KEY = 'azar:coin-settings:v1';
const COIN_IMAGE_DIRECTORY_NAME = 'azar-coin-images';

type StoredCoinSettings = {
  labels?: Partial<CoinLabels>;
  images?: CoinImages;
};

type CoinPose = {
  edgeOpacity: number;
  scaleX: number;
  scaleY: number;
  tilt: number;
};

function normalizeLabel(value: string, fallback: string) {
  const normalized = value.trim().replace(/\s+/g, ' ');

  return normalized || fallback;
}

function getCoinInitial(label: string) {
  return label.trim().slice(0, 2).toUpperCase() || '?';
}

function getFaceFromAngle(angle: number): CoinFace {
  const normalizedAngle = ((angle % 360) + 360) % 360;

  return normalizedAngle <= 90 || normalizedAngle >= 270 ? 'pile' : 'face';
}

function getCoinPoseFromAngle(angle: number): CoinPose {
  const radians = (angle * Math.PI) / 180;
  const sideAmount = Math.abs(Math.cos(radians));

  return {
    edgeOpacity: 1 - sideAmount,
    scaleX: Math.max(0.1, sideAmount),
    scaleY: 1 + (1 - sideAmount) * 0.045,
    tilt: Math.sin(radians) * 4,
  };
}

function getCoinImageDirectory() {
  return FileSystem.documentDirectory
    ? `${FileSystem.documentDirectory}${COIN_IMAGE_DIRECTORY_NAME}/`
    : null;
}

function getImageExtension(uri: string) {
  if (uri.startsWith('data:image/')) {
    return 'jpg';
  }

  const cleanUri = uri.split('?')[0] ?? uri;
  const extension = cleanUri.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase();

  return extension && extension.length <= 5 ? extension : 'jpg';
}

function isManagedCoinImage(uri: string) {
  const directory = getCoinImageDirectory();

  return Boolean(directory && uri.startsWith(directory));
}

async function copyImageToAppStorage(uri: string, face: CoinFace) {
  const directory = getCoinImageDirectory();

  if (!directory || isManagedCoinImage(uri) || uri.startsWith('data:')) {
    return uri;
  }

  try {
    const directoryInfo = await FileSystem.getInfoAsync(directory);

    if (!directoryInfo.exists) {
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    }

    const extension = getImageExtension(uri);
    const destination = `${directory}${face}-${Date.now()}.${extension}`;
    await FileSystem.copyAsync({ from: uri, to: destination });

    return destination;
  } catch (error) {
    console.warn('Unable to copy Azar coin image, keeping original URI', error);
    return uri;
  }
}

async function prepareCoinImages(images: CoinImages) {
  const nextImages: CoinImages = {};

  for (const face of COIN_FACES) {
    const uri = images[face];

    if (uri) {
      nextImages[face] = await copyImageToAppStorage(uri, face);
    }
  }

  return nextImages;
}

async function removeUnusedManagedImages(previous: CoinImages, next: CoinImages) {
  await Promise.all(
    COIN_FACES.map(async (face) => {
      const previousUri = previous[face];

      if (
        previousUri &&
        previousUri !== next[face] &&
        isManagedCoinImage(previousUri)
      ) {
        await FileSystem.deleteAsync(previousUri, { idempotent: true });
      }
    }),
  );
}

async function persistCoinSettings(labels: CoinLabels, images: CoinImages) {
  const payload: StoredCoinSettings = { labels, images };
  await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
}

export default function App() {
  const { height, width } = useWindowDimensions();
  const [currentFace, setCurrentFace] = useState<CoinFace>('pile');
  const [history, setHistory] = useState<FlipRecord[]>([]);
  const [selectedPrediction, setSelectedPrediction] = useState<CoinFace | null>(null);
  const [faceLabels, setFaceLabels] = useState<CoinLabels>(DEFAULT_FACE_LABELS);
  const [draftLabels, setDraftLabels] = useState<CoinLabels>(DEFAULT_FACE_LABELS);
  const [coinImages, setCoinImages] = useState<CoinImages>({});
  const [draftImages, setDraftImages] = useState<CoinImages>({});
  const [isInfoVisible, setIsInfoVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [coinPose, setCoinPose] = useState<CoinPose>(getCoinPoseFromAngle(0));
  const [visibleCoinFace, setVisibleCoinFace] = useState<CoinFace>('pile');
  const flipProgress = useRef(new Animated.Value(0)).current;
  const flipProgressListener = useRef<string | null>(null);
  const isCompactHeight = height < 700;
  const coinSize = Math.min(isCompactHeight ? 192 : 224, width - 78);
  const coinInnerSize = Math.max(coinSize - 40, 140);
  const visibleHistory = history.slice(0, MAX_HISTORY_ITEMS);

  useEffect(() => {
    let isMounted = true;

    async function loadStoredSettings() {
      try {
        const rawSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);

        if (!rawSettings || !isMounted) {
          return;
        }

        const storedSettings = JSON.parse(rawSettings) as StoredCoinSettings;
        const nextLabels: CoinLabels = {
          pile: normalizeLabel(
            storedSettings.labels?.pile ?? DEFAULT_FACE_LABELS.pile,
            DEFAULT_FACE_LABELS.pile,
          ),
          face: normalizeLabel(
            storedSettings.labels?.face ?? DEFAULT_FACE_LABELS.face,
            DEFAULT_FACE_LABELS.face,
          ),
        };
        const nextImages: CoinImages = {};

        COIN_FACES.forEach((face) => {
          const uri = storedSettings.images?.[face];

          if (uri) {
            nextImages[face] = uri;
          }
        });

        setFaceLabels(nextLabels);
        setDraftLabels(nextLabels);
        setCoinImages(nextImages);
        setDraftImages(nextImages);
      } catch (error) {
        console.warn('Unable to load Azar settings', error);
      }
    }

    void loadStoredSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (flipProgressListener.current) {
        flipProgress.removeListener(flipProgressListener.current);
      }
    };
  }, [flipProgress]);

  const stats = useMemo(() => {
    let pile = 0;
    let predictionTotal = 0;
    let predictionWins = 0;

    history.forEach((item) => {
      if (item.face === 'pile') {
        pile += 1;
      }

      if (item.prediction) {
        predictionTotal += 1;

        if (item.prediction === item.face) {
          predictionWins += 1;
        }
      }
    });

    const face = history.length - pile;
    const latestFace = history[0]?.face;
    const currentStreak = latestFace
      ? history.findIndex((item) => item.face !== latestFace)
      : 0;

    return {
      pile,
      face,
      total: history.length,
      predictionTotal,
      predictionWins,
      predictionAccuracy: predictionTotal
        ? Math.round((predictionWins / predictionTotal) * 100)
        : 0,
      streakFace: latestFace,
      streak: currentStreak === -1 ? history.length : currentStreak,
    };
  }, [history]);

  const flipCoin = () => {
    if (isFlipping) {
      return;
    }

    const nextFace: CoinFace = Math.random() < 0.5 ? 'pile' : 'face';
    const activePrediction = selectedPrediction;
    const startAngle = currentFace === 'pile' ? 0 : 180;
    const targetAngle = nextFace === 'pile' ? 0 : 180;
    const deltaToTarget = (targetAngle - startAngle + 360) % 360;
    const totalAngle = 1440 + deltaToTarget;

    setIsFlipping(true);
    setVisibleCoinFace(currentFace);
    Vibration.vibrate(16);
    flipProgress.setValue(0);

    if (flipProgressListener.current) {
      flipProgress.removeListener(flipProgressListener.current);
    }

    flipProgressListener.current = flipProgress.addListener(({ value }) => {
      const angle = startAngle + totalAngle * value;
      setVisibleCoinFace(getFaceFromAngle(angle));
      setCoinPose(getCoinPoseFromAngle(angle));
    });

    Animated.timing(flipProgress, {
      toValue: 1,
      duration: 1180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (flipProgressListener.current) {
        flipProgress.removeListener(flipProgressListener.current);
        flipProgressListener.current = null;
      }

      if (!finished) {
        setIsFlipping(false);
        return;
      }

      setCurrentFace(nextFace);
      setVisibleCoinFace(nextFace);
      setCoinPose(getCoinPoseFromAngle(targetAngle));
      setHistory((items) => [
        { id: Date.now(), face: nextFace, prediction: activePrediction },
        ...items,
      ]);
      setIsFlipping(false);
    });
  };

  const resetSession = () => {
    setCurrentFace('pile');
    setVisibleCoinFace('pile');
    setCoinPose(getCoinPoseFromAngle(0));
    setHistory([]);
    setSelectedPrediction(null);
    flipProgress.setValue(0);
  };

  const pileRatio = stats.total ? Math.round((stats.pile / stats.total) * 100) : 0;
  const faceRatio = stats.total ? 100 - pileRatio : 0;
  const latestRecord = history[0];
  const latestPrediction = latestRecord?.prediction
    ? (latestRecord as FlipRecord & { prediction: CoinFace })
    : null;
  const latestPredictionWon = latestPrediction
    ? latestPrediction.prediction === latestPrediction.face
    : false;
  const openSettings = () => {
    setDraftLabels(faceLabels);
    setDraftImages(coinImages);
    setIsSettingsVisible(true);
  };

  const saveLabels = async () => {
    const nextLabels = {
      pile: normalizeLabel(draftLabels.pile, DEFAULT_FACE_LABELS.pile),
      face: normalizeLabel(draftLabels.face, DEFAULT_FACE_LABELS.face),
    };

    setIsSavingSettings(true);

    try {
      const nextImages = await prepareCoinImages(draftImages);
      await persistCoinSettings(nextLabels, nextImages);
      await removeUnusedManagedImages(coinImages, nextImages);

      setFaceLabels(nextLabels);
      setCoinImages(nextImages);
      setDraftLabels(nextLabels);
      setDraftImages(nextImages);
      setIsSettingsVisible(false);
    } catch (error) {
      Alert.alert(
        'Enregistrement impossible',
        'La personnalisation n’a pas pu être sauvegardée. Réessaie avec une autre image.',
      );
      console.warn('Unable to save Azar settings', error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const pickImageForFace = async (face: CoinFace) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(false);

    if (!permission.granted) {
      Alert.alert(
        'Autorisation requise',
        'Autorise l’accès aux photos pour choisir une image de pièce.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      base64: false,
      mediaTypes: ['images'],
      quality: 0.82,
      selectionLimit: 1,
    });

    const asset = result.canceled ? null : result.assets[0];

    if (asset?.uri) {
      setDraftImages((images) => ({
        ...images,
        [face]: asset.uri,
      }));
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <ExpoStatusBar style="dark" />
        <ScrollView
          bounces={false}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop:
                Platform.OS === 'android'
                  ? (NativeStatusBar.currentHeight ?? 0) + 18
                  : 18,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.brand}>Azar</Text>
              <View style={styles.headerActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Personnaliser la pièce"
                  onPress={openSettings}
                  style={({ pressed }) => [
                    styles.iconButton,
                    pressed ? styles.iconButtonPressed : null,
                  ]}
                >
                  <Text style={styles.iconButtonText}>Aa</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ouvrir les informations de confidentialité"
                  onPress={() => setIsInfoVisible(true)}
                  style={({ pressed }) => [
                    styles.iconButton,
                    pressed ? styles.iconButtonPressed : null,
                  ]}
                >
                  <Text style={styles.iconButtonText}>i</Text>
                </Pressable>
              </View>
            </View>
            <Text style={styles.title}>Pile ou face</Text>
          </View>

          <View style={styles.coinSection}>
            <Animated.View
              accessibilityLabel={`Pièce, face visible ${faceLabels[visibleCoinFace]}`}
              style={[
                styles.coin,
                {
                  borderRadius: coinSize / 2,
                  height: coinSize,
                  transform: [
                    { perspective: 900 },
                    { rotateZ: `${coinPose.tilt}deg` },
                    { scaleX: coinPose.scaleX },
                    { scaleY: coinPose.scaleY },
                  ],
                  width: coinSize,
                },
              ]}
            >
              <View
                pointerEvents="none"
                style={[
                  styles.coinEdge,
                  {
                    borderRadius: coinSize / 2,
                    opacity: coinPose.edgeOpacity,
                  },
                ]}
              />
              <CoinSide
                face={visibleCoinFace}
                imageUri={coinImages[visibleCoinFace]}
                innerSize={coinInnerSize}
                label={faceLabels[visibleCoinFace]}
                size={coinSize}
              />
            </Animated.View>

            <Text
              accessibilityLiveRegion="polite"
              style={styles.result}
            >
              {isFlipping ? 'Lancement' : faceLabels[currentFace]}
            </Text>

            {latestPrediction ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[
                  styles.predictionFeedback,
                  latestPredictionWon
                    ? styles.predictionFeedbackSuccess
                    : styles.predictionFeedbackMiss,
                ]}
              >
                {latestPredictionWon
                  ? 'Prédiction réussie'
                  : `Prédiction manquée : ${faceLabels[latestPrediction.prediction]}`}
              </Text>
            ) : null}
          </View>

          <View style={styles.predictionSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Prédiction</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Effacer la prédiction"
                disabled={!selectedPrediction || isFlipping}
                onPress={() => setSelectedPrediction(null)}
                style={({ pressed }) => [
                  styles.clearPredictionButton,
                  pressed && selectedPrediction ? styles.clearPredictionButtonPressed : null,
                  !selectedPrediction || isFlipping
                    ? styles.clearPredictionButtonDisabled
                    : null,
                ]}
              >
                <Text style={styles.clearPredictionButtonText}>Effacer</Text>
              </Pressable>
            </View>

            <View style={styles.segmentedControl}>
              {COIN_FACES.map((face) => {
                const isSelected = selectedPrediction === face;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Prédire ${faceLabels[face]}`}
                    disabled={isFlipping}
                    key={face}
                    onPress={() => setSelectedPrediction(isSelected ? null : face)}
                    style={({ pressed }) => [
                      styles.segmentButton,
                      isSelected ? styles.segmentButtonSelected : null,
                      pressed && !isFlipping ? styles.segmentButtonPressed : null,
                      isFlipping ? styles.segmentButtonDisabled : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentButtonText,
                        isSelected ? styles.segmentButtonTextSelected : null,
                      ]}
                      adjustsFontSizeToFit
                      numberOfLines={1}
                    >
                      {faceLabels[face]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lancer pile ou face"
            disabled={isFlipping}
            onPress={flipCoin}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !isFlipping ? styles.primaryButtonPressed : null,
              isFlipping ? styles.primaryButtonDisabled : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {isFlipping ? 'En cours...' : 'Lancer'}
            </Text>
          </Pressable>

          <View style={styles.metricsGrid}>
            <Metric label="Lancers" value={String(stats.total)} />
            <Metric
              label={faceLabels.pile}
              value={`${stats.pile}`}
              detail={stats.total ? `${pileRatio}%` : undefined}
            />
            <Metric
              label={faceLabels.face}
              value={`${stats.face}`}
              detail={stats.total ? `${faceRatio}%` : undefined}
            />
            <Metric
              label="Prédictions"
              value={`${stats.predictionWins}/${stats.predictionTotal}`}
              detail={
                stats.predictionTotal
                  ? `${stats.predictionAccuracy}%`
                  : undefined
              }
            />
            <Metric
              label="Série"
              value={stats.streak ? String(stats.streak) : '-'}
              detail={stats.streakFace ? faceLabels[stats.streakFace] : undefined}
            />
          </View>

          <View style={styles.historySection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Historique</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Réinitialiser la session"
                disabled={!history.length || isFlipping}
                onPress={resetSession}
                style={({ pressed }) => [
                  styles.resetButton,
                  pressed && history.length ? styles.resetButtonPressed : null,
                  !history.length || isFlipping ? styles.resetButtonDisabled : null,
                ]}
              >
                <Text style={styles.resetButtonText}>Réinitialiser</Text>
              </Pressable>
            </View>

            {visibleHistory.length ? (
              <View style={styles.historyList}>
                {visibleHistory.map((item, index) => (
                  <View
                    key={item.id}
                    style={[
                      styles.historyPill,
                      item.face === 'pile' ? styles.historyPile : styles.historyFace,
                    ]}
                  >
                    <Text style={styles.historyIndex}>#{history.length - index}</Text>
                    <Text style={styles.historyText}>
                      {faceLabels[item.face]}
                    </Text>
                    {item.prediction ? (
                      <Text
                        style={[
                          styles.historyPrediction,
                          item.prediction === item.face
                            ? styles.historyPredictionSuccess
                            : styles.historyPredictionMiss,
                        ]}
                      >
                        {item.prediction === item.face ? 'OK' : 'Raté'}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyHistory}>
                <Text style={styles.emptyHistoryText}>Aucun lancer</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <Modal
          animationType="fade"
          onRequestClose={() => setIsSettingsVisible(false)}
          transparent
          visible={isSettingsVisible}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalBackdrop}
          >
            <View style={styles.modalPanel}>
              <Text style={styles.modalTitle}>Personnalisation</Text>

              <ScrollView
                contentContainerStyle={styles.settingsScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.settingsScroll}
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Face pile</Text>
                  <TextInput
                    autoCapitalize="words"
                    maxLength={MAX_CUSTOM_LABEL_LENGTH}
                    onChangeText={(value) =>
                      setDraftLabels((labels) => ({ ...labels, pile: value }))
                    }
                    placeholder={DEFAULT_FACE_LABELS.pile}
                    returnKeyType="next"
                    selectTextOnFocus
                    style={styles.textInput}
                    value={draftLabels.pile}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Face face</Text>
                  <TextInput
                    autoCapitalize="words"
                    maxLength={MAX_CUSTOM_LABEL_LENGTH}
                    onChangeText={(value) =>
                      setDraftLabels((labels) => ({ ...labels, face: value }))
                    }
                    placeholder={DEFAULT_FACE_LABELS.face}
                    returnKeyType="done"
                    selectTextOnFocus
                    style={styles.textInput}
                    value={draftLabels.face}
                  />
                </View>

                <View style={styles.imageSettings}>
                  {COIN_FACES.map((face) => {
                    const label = normalizeLabel(
                      draftLabels[face],
                      DEFAULT_FACE_LABELS[face],
                    );
                    const imageUri = draftImages[face];

                    return (
                      <View key={face} style={styles.imageSettingRow}>
                        <View style={styles.imageSettingPreview}>
                          {imageUri ? (
                            <Image
                              source={{ uri: imageUri }}
                              style={styles.imageSettingPreviewImage}
                            />
                          ) : (
                            <Text style={styles.imageSettingPreviewText}>
                              {getCoinInitial(label)}
                            </Text>
                          )}
                        </View>
                        <View style={styles.imageSettingActions}>
                          <Text
                            adjustsFontSizeToFit
                            numberOfLines={1}
                            style={styles.imageSettingLabel}
                          >
                            {label}
                          </Text>
                          <View style={styles.imageSettingButtons}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Choisir une image pour ${label}`}
                              disabled={isSavingSettings}
                              onPress={() => pickImageForFace(face)}
                              style={({ pressed }) => [
                                styles.smallActionButton,
                                pressed ? styles.smallActionButtonPressed : null,
                                isSavingSettings ? styles.smallActionButtonDisabled : null,
                              ]}
                            >
                              <Text style={styles.smallActionButtonText}>Image</Text>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Retirer l’image de ${label}`}
                              disabled={!imageUri || isSavingSettings}
                              onPress={() =>
                                setDraftImages((images) => ({
                                  ...images,
                                  [face]: undefined,
                                }))
                              }
                              style={({ pressed }) => [
                                styles.smallActionButton,
                                pressed && imageUri
                                  ? styles.smallActionButtonPressed
                                  : null,
                                !imageUri || isSavingSettings
                                  ? styles.smallActionButtonDisabled
                                  : null,
                              ]}
                            >
                              <Text style={styles.smallActionButtonText}>Retirer</Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Annuler la personnalisation"
                  disabled={isSavingSettings}
                  onPress={() => setIsSettingsVisible(false)}
                  style={({ pressed }) => [
                    styles.secondaryModalButton,
                    pressed ? styles.secondaryModalButtonPressed : null,
                    isSavingSettings ? styles.secondaryModalButtonDisabled : null,
                  ]}
                >
                  <Text style={styles.secondaryModalButtonText}>Annuler</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Revenir aux libellés par défaut"
                  disabled={isSavingSettings}
                  onPress={() => {
                    setDraftLabels(DEFAULT_FACE_LABELS);
                    setDraftImages({});
                  }}
                  style={({ pressed }) => [
                    styles.secondaryModalButton,
                    pressed ? styles.secondaryModalButtonPressed : null,
                    isSavingSettings ? styles.secondaryModalButtonDisabled : null,
                  ]}
                >
                  <Text style={styles.secondaryModalButtonText}>Défaut</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Enregistrer les libellés"
                  disabled={isSavingSettings}
                  onPress={saveLabels}
                  style={({ pressed }) => [
                    styles.modalButton,
                    styles.modalButtonFlex,
                    pressed ? styles.modalButtonPressed : null,
                    isSavingSettings ? styles.modalButtonDisabled : null,
                  ]}
                >
                  <Text style={styles.modalButtonText}>
                    {isSavingSettings ? '...' : 'Enregistrer'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal
          animationType="fade"
          onRequestClose={() => setIsInfoVisible(false)}
          transparent
          visible={isInfoVisible}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalPanel}>
              <Text style={styles.modalTitle}>Confidentialité</Text>
              <Text style={styles.modalText}>
                Azar fonctionne sans compte, sans publicité, sans analytics et
                sans collecte de données.
              </Text>
              <Text style={styles.modalText}>
                Les statistiques restent uniquement dans la session ouverte. Il
                n'y a aucun achat intégré, aucune mise et aucune récompense.
              </Text>
              <Text style={styles.modalText}>
                Si une image est choisie pour la pièce, elle est utilisée
                localement pour l'affichage et n'est jamais envoyée.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer les informations"
                onPress={() => setIsInfoVisible(false)}
                style={({ pressed }) => [
                  styles.modalButton,
                  pressed ? styles.modalButtonPressed : null,
                ]}
              >
                <Text style={styles.modalButtonText}>Fermer</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {detail ? <Text style={styles.metricDetail}>{detail}</Text> : null}
    </View>
  );
}

function CoinSide({
  face,
  imageUri,
  innerSize,
  label,
  size,
}: {
  face: CoinFace;
  imageUri?: string;
  innerSize: number;
  label: string;
  size: number;
}) {
  const initial = getCoinInitial(label);

  return (
    <View
      style={[
        styles.coinSide,
        face === 'pile' ? styles.coinPile : styles.coinFace,
        {
          borderRadius: size / 2,
        },
      ]}
    >
      {imageUri ? (
        <>
          <Image source={{ uri: imageUri }} style={styles.coinImage} />
          <View pointerEvents="none" style={styles.coinImageScrim} />
        </>
      ) : null}
      <View
        style={[
          styles.coinOuterRing,
          {
            borderRadius: (innerSize + 20) / 2,
            height: innerSize + 20,
            width: innerSize + 20,
          },
        ]}
      >
        <View
          style={[
            styles.coinInnerRing,
            {
              borderRadius: innerSize / 2,
              height: innerSize,
              width: innerSize,
            },
          ]}
        >
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            style={[
              styles.coinMark,
              imageUri ? styles.coinMarkOnImage : null,
              { fontSize: size * 0.26 },
            ]}
          >
            {initial}
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.62}
            numberOfLines={1}
            style={[
              styles.coinLabel,
              imageUri ? styles.coinLabelOnImage : null,
              { fontSize: size * 0.085 },
            ]}
          >
            {label}
          </Text>
        </View>
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.coinHighlight,
          {
            borderRadius: size / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 30,
  },
  header: {
    gap: 4,
    marginBottom: 26,
  },
  headerTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  brand: {
    color: '#1F8A70',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D0D5DD',
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  iconButtonPressed: {
    backgroundColor: '#EAF7F2',
  },
  iconButtonText: {
    color: '#15202B',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  title: {
    color: '#15202B',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
  },
  coinSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    minHeight: 290,
  },
  coin: {
    alignItems: 'center',
    borderRadius: 112,
    elevation: 10,
    height: 224,
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    width: 224,
  },
  coinEdge: {
    backgroundColor: '#B98222',
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderWidth: 2,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    transform: [{ scaleX: 0.62 }],
  },
  coinSide: {
    alignItems: 'center',
    borderColor: 'rgba(23, 32, 42, 0.12)',
    borderWidth: 1,
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  coinImage: {
    height: '100%',
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  coinImageScrim: {
    backgroundColor: 'rgba(21, 32, 43, 0.16)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  coinPile: {
    backgroundColor: '#E8B449',
  },
  coinFace: {
    backgroundColor: '#D7A338',
  },
  coinOuterRing: {
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.68)',
    borderWidth: 7,
    justifyContent: 'center',
  },
  coinInnerRing: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(23, 32, 42, 0.16)',
    borderRadius: 92,
    borderWidth: 2,
    height: 184,
    justifyContent: 'center',
    paddingHorizontal: 18,
    width: 184,
  },
  coinHighlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    height: '38%',
    left: '12%',
    position: 'absolute',
    top: '9%',
    transform: [{ rotate: '-28deg' }],
    width: '18%',
  },
  coinMark: {
    color: '#17202A',
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 78,
  },
  coinMarkOnImage: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.32)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  coinLabel: {
    color: '#17202A',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0,
    marginTop: 2,
  },
  coinLabelOnImage: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.36)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  result: {
    color: '#15202B',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 20,
    minHeight: 36,
    textAlign: 'center',
  },
  predictionFeedback: {
    borderRadius: 8,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 8,
    minHeight: 24,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
    textAlign: 'center',
  },
  predictionFeedbackSuccess: {
    backgroundColor: '#DDF7EF',
    color: '#17735E',
  },
  predictionFeedbackMiss: {
    backgroundColor: '#FFF0E7',
    color: '#9A4B22',
  },
  predictionSection: {
    marginBottom: 16,
  },
  segmentedControl: {
    backgroundColor: '#E8EEF5',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    padding: 6,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 7,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  segmentButtonSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  segmentButtonPressed: {
    backgroundColor: '#F8FAFC',
  },
  segmentButtonDisabled: {
    opacity: 0.65,
  },
  segmentButtonText: {
    color: '#667085',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  segmentButtonTextSelected: {
    color: '#15202B',
  },
  clearPredictionButton: {
    alignItems: 'center',
    borderColor: '#CDD5DF',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
  },
  clearPredictionButtonPressed: {
    backgroundColor: '#FFFFFF',
  },
  clearPredictionButtonDisabled: {
    opacity: 0.42,
  },
  clearPredictionButtonText: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#15202B',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 58,
    shadowColor: '#15202B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  primaryButtonPressed: {
    transform: [{ translateY: 1 }],
  },
  primaryButtonDisabled: {
    opacity: 0.72,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 24,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 92,
    padding: 14,
  },
  metricLabel: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#15202B',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 8,
  },
  metricDetail: {
    color: '#1F8A70',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
    marginTop: 2,
  },
  historySection: {
    marginTop: 28,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#15202B',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0,
  },
  resetButton: {
    alignItems: 'center',
    borderColor: '#CDD5DF',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 13,
  },
  resetButtonPressed: {
    backgroundColor: '#FFFFFF',
  },
  resetButtonDisabled: {
    opacity: 0.42,
  },
  resetButtonText: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  historyList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyPill: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 7,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  historyPile: {
    backgroundColor: '#FFF4D6',
  },
  historyFace: {
    backgroundColor: '#DDF7EF',
  },
  historyIndex: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  historyText: {
    color: '#15202B',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  historyPrediction: {
    borderRadius: 7,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  historyPredictionSuccess: {
    backgroundColor: '#FFFFFF',
    color: '#17735E',
  },
  historyPredictionMiss: {
    backgroundColor: '#FFFFFF',
    color: '#9A4B22',
  },
  emptyHistory: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 70,
  },
  emptyHistoryText: {
    color: '#667085',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(21, 32, 43, 0.42)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    maxHeight: '88%',
    maxWidth: 420,
    padding: 22,
    width: '100%',
  },
  modalTitle: {
    color: '#15202B',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 12,
  },
  modalText: {
    color: '#344054',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 22,
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CDD5DF',
    borderRadius: 8,
    borderWidth: 1,
    color: '#15202B',
    fontSize: 17,
    fontWeight: '800',
    minHeight: 50,
    paddingHorizontal: 13,
  },
  settingsScroll: {
    marginHorizontal: -2,
  },
  settingsScrollContent: {
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  imageSettings: {
    gap: 10,
    marginBottom: 16,
    marginTop: 2,
  },
  imageSettingRow: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 10,
  },
  imageSettingPreview: {
    alignItems: 'center',
    backgroundColor: '#E8B449',
    borderColor: 'rgba(23, 32, 42, 0.12)',
    borderRadius: 27,
    borderWidth: 1,
    height: 54,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 54,
  },
  imageSettingPreviewImage: {
    height: '100%',
    width: '100%',
  },
  imageSettingPreviewText: {
    color: '#17202A',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0,
  },
  imageSettingActions: {
    flex: 1,
    gap: 8,
  },
  imageSettingLabel: {
    color: '#15202B',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  imageSettingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  smallActionButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CDD5DF',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 11,
  },
  smallActionButtonPressed: {
    backgroundColor: '#EAF7F2',
  },
  smallActionButtonDisabled: {
    opacity: 0.42,
  },
  smallActionButtonText: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  modalButton: {
    alignItems: 'center',
    backgroundColor: '#15202B',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 48,
  },
  modalButtonFlex: {
    flex: 1,
    marginTop: 0,
  },
  modalButtonPressed: {
    opacity: 0.88,
  },
  modalButtonDisabled: {
    opacity: 0.64,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  secondaryModalButton: {
    alignItems: 'center',
    borderColor: '#CDD5DF',
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 15,
  },
  secondaryModalButtonPressed: {
    backgroundColor: '#F8FAFC',
  },
  secondaryModalButtonDisabled: {
    opacity: 0.5,
  },
  secondaryModalButtonText: {
    color: '#344054',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
});
