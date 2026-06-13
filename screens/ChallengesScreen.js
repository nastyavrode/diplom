import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import ScreenBackButton from '../components/ScreenBackButton';
import TextToSpeechButton from '../components/TextToSpeechButton';
import { completeChallenge, getCurrentProgress } from '../utils/storage';
import { buildChallengeSpeechText } from '../utils/speechText';
import {
  buildDailyChallengeForDateKey,
  dateKeyLocal,
  formatRuDateKey,
  getChallengesStartDateKey,
  getRecentPastDateKeys,
} from '../utils/challenges';

export default function ChallengesScreen({ navigation }) {
  const todayKey = dateKeyLocal();
  const todayChallenge = useMemo(() => buildDailyChallengeForDateKey(todayKey), [todayKey]);
  const [selectedDateKey, setSelectedDateKey] = useState(() => dateKeyLocal());
  const [program, setProgram] = useState([]);
  const [completedIds, setCompletedIds] = useState([]);
  const [challengeStars, setChallengeStars] = useState({});
  const [starsEarned, setStarsEarned] = useState(0);
  const [showStarsModal, setShowStarsModal] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const pastDateKeys = useMemo(() => getRecentPastDateKeys(todayKey, 50, { excludeEnd: true }), [todayKey]);

  const activeChallenge = useMemo(() => buildDailyChallengeForDateKey(selectedDateKey), [selectedDateKey]);
  const challengeSpeechText = useMemo(
    () => (activeChallenge ? buildChallengeSpeechText(activeChallenge) : ''),
    [activeChallenge]
  );

  const reloadProgress = useCallback(async () => {
    const progress = await getCurrentProgress();
    setCompletedIds(progress.completedChallenges || []);
    setChallengeStars(progress.challengeStars && typeof progress.challengeStars === 'object' ? progress.challengeStars : {});
  }, []);

  React.useEffect(() => {
    reloadProgress();
  }, [reloadProgress]);

  React.useEffect(() => {
    const unsub = navigation.addListener('focus', reloadProgress);
    return unsub;
  }, [navigation, reloadProgress]);

  React.useEffect(() => {
    setProgram([]);
  }, [selectedDateKey]);

  const maxLen = activeChallenge?.maxProgramLength ?? 14;
  const expected = activeChallenge?.expected ?? [];
  const optimalSteps = expected.length;

  const addCommand = (cmd) =>
    setProgram((prev) => (prev.length < maxLen ? [...prev, cmd] : prev));
  const clearProgram = () => setProgram([]);
  const removeLast = () => setProgram((prev) => prev.slice(0, -1));

  const calcStars = (steps, optimal) => {
    if (steps <= optimal) return 3;
    const mid = optimal + Math.floor((maxLen - optimal) / 2);
    if (steps <= mid) return 2;
    return 1;
  };

  const isDoneFor = (id) => completedIds.includes(id);
  const starsFor = (id) => (typeof challengeStars[id] === 'number' ? challengeStars[id] : 0);

  const checkChallenge = async () => {
    if (!activeChallenge) {
      Alert.alert('Нет задания', 'Для этой даты челлендж ещё не начался.');
      return;
    }
    if (isDoneFor(activeChallenge.id)) {
      Alert.alert('Уже готово', 'Этот челлендж уже выполнен. Можно посмотреть другой день в архиве.');
      return;
    }

    const ok =
      program.length === expected.length && expected.every((cmd, idx) => cmd === program[idx]);
    if (!ok) {
      Alert.alert(
        'Пока не совпало',
        `Нужна программа ровно из ${expected.length} команд, в указанном порядке. Прочти блок «Как решать» и попробуй ещё раз.`
      );
      return;
    }

    const stars = calcStars(program.length, optimalSteps);
    await completeChallenge(activeChallenge.id, stars);
    await reloadProgress();
    setStarsEarned(stars);
    setShowStarsModal(true);
  };

  const palette = activeChallenge?.commands ?? ['Вперёд', 'Повернуть →', 'Повернуть ←'];

  if (!todayChallenge) {
    return (
      <View style={[styles.container, { position: 'relative', paddingHorizontal: 16 }]}>
        <ScreenBackButton
          navigation={navigation}
          target="MainMenu"
          variant="overlay"
          overlayStyle={{ top: 48, left: 16 }}
        />
        <Text style={styles.title}>Челленджи</Text>
        <Text style={styles.subtitle}>
          Расписание начинается с {formatRuDateKey(getChallengesStartDateKey())}. Зайди в этот день или позже.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { position: 'relative' }]}>
      <ScreenBackButton
        navigation={navigation}
        target="MainMenu"
        variant="overlay"
        overlayStyle={{ top: 48, left: 16 }}
      />

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Челленджи</Text>
        <Text style={styles.subtitle}>
          Каждый календарный день — новое задание. Собери программу из кнопок и нажми «Проверить».
        </Text>

        <TouchableOpacity
          style={[styles.pickRow, selectedDateKey === todayKey && styles.pickRowActive]}
          onPress={() => setSelectedDateKey(todayKey)}
          activeOpacity={0.85}
        >
          <Text style={styles.pickRowTitle}>Сегодня</Text>
          <Text style={styles.pickRowSub}>{formatRuDateKey(todayKey)}</Text>
          {todayChallenge && isDoneFor(todayChallenge.id) ? <Text style={styles.pickBadge}>✅</Text> : null}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sectionTitleBtn}
          onPress={() => setArchiveOpen((o) => !o)}
          activeOpacity={0.85}
        >
          <Text style={styles.sectionTitleText}>Прошлые дни</Text>
          <Svg width={22} height={22} viewBox="0 0 24 24" style={{ transform: [{ rotate: archiveOpen ? '90deg' : '0deg' }] }}>
            <Path d="M8 5v14l11-7z" fill="#fff" />
          </Svg>
        </TouchableOpacity>

        {archiveOpen ? (
          <View style={styles.archiveBox}>
            {pastDateKeys.length === 0 ? (
              <Text style={styles.archiveEmpty}>Пока нет прошлых дней — загляни завтра.</Text>
            ) : (
              pastDateKeys.map((dk) => {
                const ch = buildDailyChallengeForDateKey(dk);
                if (!ch) return null;
                const done = isDoneFor(ch.id);
                const active = dk === selectedDateKey;
                return (
                  <TouchableOpacity
                    key={dk}
                    style={[styles.archiveRow, active && styles.archiveRowActive]}
                    onPress={() => setSelectedDateKey(dk)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.archiveDate}>{formatRuDateKey(dk)}</Text>
                      <Text style={styles.archiveTitle} numberOfLines={1}>
                        {ch.title}
                      </Text>
                    </View>
                    <Text style={styles.archiveMark}>{done ? '✅' : '○'}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ) : null}

        {activeChallenge ? (
          <View style={styles.card}>
            <Text style={styles.dateLine}>
              {selectedDateKey === todayKey ? 'Сегодня' : formatRuDateKey(selectedDateKey)}
            </Text>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>{activeChallenge.title}</Text>
              <TextToSpeechButton text={challengeSpeechText} />
            </View>
            <Text style={styles.cardDescription}>{activeChallenge.description}</Text>

            <View style={styles.howBox}>
              <Text style={styles.howTitle}>Как решать</Text>
              <Text style={styles.howText}>{activeChallenge.howToSolve}</Text>
              <Text style={styles.howHint}>
                Программа должна совпадать с задумкой посимвольно: ровно {expected.length} команд, без лишних
                в начале и в конце.
              </Text>
            </View>

            {isDoneFor(activeChallenge.id) ? (
              <View style={styles.doneBanner}>
                <Text style={styles.doneBannerText}>
                  Выполнено{starsFor(activeChallenge.id) ? ` · звёзды: ${starsFor(activeChallenge.id)}/3` : ''}
                </Text>
              </View>
            ) : null}

            <Text style={styles.programCap}>
              Программа ({program.length}/{maxLen}, нужно {expected.length})
            </Text>
            <View style={styles.programRow}>
              {program.length === 0 ? <Text style={styles.empty}>Добавь команды кнопками ниже</Text> : null}
              {program.map((item, idx) => (
                <View key={`${item}-${idx}`} style={styles.commandChip}>
                  <Text style={styles.commandText}>{item}</Text>
                </View>
              ))}
            </View>

            <View style={styles.actionsRow}>
              {palette.map((cmd) => (
                <TouchableOpacity key={cmd} style={styles.actionBtn} onPress={() => addCommand(cmd)}>
                  <Text style={styles.actionText}>+ {cmd}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.deleteBtn} onPress={removeLast}>
                <Text style={styles.actionText}>Удалить</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.clearBtn} onPress={clearProgram}>
                <Text style={styles.clearText}>Очистить</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.runBtn, isDoneFor(activeChallenge.id) && styles.runBtnDisabled]}
              onPress={checkChallenge}
              disabled={isDoneFor(activeChallenge.id)}
            >
              <Text style={styles.runText}>{isDoneFor(activeChallenge.id) ? 'Уже выполнено' : 'Проверить'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.subtitle}>Для выбранной даты нет челленджа.</Text>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <Modal
        visible={showStarsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStarsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Челлендж выполнен!</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3].map((i) => (
                <Text key={i} style={[styles.star, i <= starsEarned ? styles.starGold : styles.starGrey]}>
                  ★
                </Text>
              ))}
            </View>
            {starsEarned < 3 ? (
              <Text style={styles.starHint}>Попробуй решить за меньшее число команд (не длиннее нужного).</Text>
            ) : null}
            <TouchableOpacity style={styles.modalBtnClose} onPress={() => setShowStarsModal(false)}>
              <Text style={styles.modalBtnCloseText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4F8CFF',
    paddingTop: 92,
  },
  scrollInner: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 34,
    color: '#FFD600',
    fontFamily: 'aMavickFont',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 14,
    textAlign: 'center',
    color: '#fff',
    fontFamily: 'aMavickFont',
    fontSize: 17,
    lineHeight: 22,
  },
  pickRow: {
    backgroundColor: '#FFA726',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  pickRowActive: {
    backgroundColor: '#7C4DFF',
  },
  pickRowTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'aMavickFont',
  },
  pickRowSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontFamily: 'aMavickFont',
    marginTop: 2,
  },
  pickBadge: {
    position: 'absolute',
    right: 14,
    top: 14,
    fontSize: 22,
  },
  sectionTitleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  sectionTitleText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'aMavickFont',
  },
  archiveBox: {
    marginBottom: 12,
    gap: 6,
  },
  archiveEmpty: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'aMavickFont',
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 8,
  },
  archiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbe8',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  archiveRowActive: {
    borderWidth: 2,
    borderColor: '#7C4DFF',
  },
  archiveDate: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'aMavickFont',
  },
  archiveTitle: {
    fontSize: 17,
    color: '#222',
    fontFamily: 'aMavickFont',
    marginTop: 2,
  },
  archiveMark: {
    fontSize: 20,
    marginLeft: 8,
  },
  card: {
    marginTop: 4,
    backgroundColor: '#fffbe8',
    borderRadius: 18,
    padding: 14,
  },
  dateLine: {
    fontSize: 15,
    color: '#7C4DFF',
    fontFamily: 'aMavickFont',
    marginBottom: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 4,
  },
  cardTitle: {
    flex: 1,
    fontSize: 24,
    color: '#333',
    fontFamily: 'aMavickFont',
  },
  cardDescription: {
    marginTop: 6,
    color: '#444',
    fontSize: 16,
    fontFamily: 'aMavickFont',
    lineHeight: 22,
  },
  howBox: {
    marginTop: 12,
    backgroundColor: '#E8F4FF',
    borderRadius: 14,
    padding: 12,
  },
  howTitle: {
    fontSize: 18,
    color: '#1565C0',
    fontFamily: 'aMavickFont',
    marginBottom: 6,
  },
  howText: {
    fontSize: 16,
    color: '#1a237e',
    fontFamily: 'aMavickFont',
    lineHeight: 22,
  },
  howHint: {
    marginTop: 8,
    fontSize: 14,
    color: '#455A64',
    fontFamily: 'aMavickFont',
    lineHeight: 20,
  },
  doneBanner: {
    marginTop: 12,
    backgroundColor: '#C8E6C9',
    borderRadius: 12,
    padding: 10,
  },
  doneBannerText: {
    fontFamily: 'aMavickFont',
    fontSize: 17,
    color: '#1B5E20',
    textAlign: 'center',
  },
  programCap: {
    marginTop: 12,
    fontSize: 15,
    color: '#555',
    fontFamily: 'aMavickFont',
  },
  programRow: {
    minHeight: 56,
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  empty: {
    color: '#777',
    fontFamily: 'aMavickFont',
    fontSize: 16,
  },
  commandChip: {
    backgroundColor: '#A3E635',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  commandText: {
    color: '#234',
    fontFamily: 'aMavickFont',
    fontSize: 16,
  },
  actionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  deleteBtn: {
    backgroundColor: '#E53935',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  clearBtn: {
    backgroundColor: '#FFD600',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'aMavickFont',
  },
  clearText: {
    color: '#333',
    fontSize: 16,
    fontFamily: 'aMavickFont',
  },
  runBtn: {
    marginTop: 12,
    backgroundColor: '#7C4DFF',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  runBtnDisabled: {
    backgroundColor: '#9E9E9E',
  },
  runText: {
    color: '#fff',
    fontFamily: 'aMavickFont',
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fffbe8',
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 18,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'aMavickFont',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  star: {
    fontSize: 40,
    fontFamily: 'aMavickFont',
  },
  starGold: {
    color: '#FFD600',
  },
  starGrey: {
    color: '#B0B0B0',
  },
  starHint: {
    marginTop: 6,
    fontFamily: 'aMavickFont',
    fontSize: 16,
    color: '#607D8B',
    textAlign: 'center',
  },
  modalBtnClose: {
    marginTop: 14,
    backgroundColor: '#4F8CFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  modalBtnCloseText: {
    color: '#fff',
    fontFamily: 'aMavickFont',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
