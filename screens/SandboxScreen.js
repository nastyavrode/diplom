import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Modal, Alert, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import ScreenBackButton from '../components/ScreenBackButton';
import { saveGalleryItem, updateGalleryItem, getGalleryItemById } from '../utils/storage';

const DEFAULT_SIZE = 7;
const MAX_PROGRAM_LENGTH = 20;
const SIZES = [5, 7, 10];

function getRandomCell(size) {
  return {
    x: Math.floor(Math.random() * size),
    y: Math.floor(Math.random() * size),
  };
}

function cellsEqual(a, b) {
  return Math.round(a.x) === Math.round(b.x) && Math.round(a.y) === Math.round(b.y);
}

const VALID_COMMANDS = new Set(['Вперёд', 'Повернуть →', 'Повернуть ←']);

function clampCell(value, max) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, n));
}

function normalizeDir(dir) {
  const n = Math.round(Number(dir));
  if (!Number.isFinite(n)) return 0;
  return ((n % 4) + 4) % 4;
}

function buildGallerySnapshot({ size, program, hero, finish, obstacles }) {
  return {
    title: `Маршрут ${size}x${size}`,
    size,
    commandsCount: program.length,
    obstaclesCount: obstacles.length,
    program: [...program],
    hero: {
      x: clampCell(hero.x, size - 1),
      y: clampCell(hero.y, size - 1),
      dir: normalizeDir(hero.dir),
    },
    finish: {
      x: clampCell(finish.x, size - 1),
      y: clampCell(finish.y, size - 1),
    },
    obstacles: obstacles.map((o) => ({
      x: clampCell(o.x, size - 1),
      y: clampCell(o.y, size - 1),
    })),
  };
}

function parseGalleryProject(item) {
  if (!item || typeof item !== 'object') {
    return { ok: false, error: 'Данные проекта повреждены.' };
  }
  const size = Number(item.size);
  if (!SIZES.includes(size)) {
    return { ok: false, error: 'Некорректный размер поля в сохранённом проекте.' };
  }
  if (!Array.isArray(item.program)) {
    return {
      ok: false,
      error: 'Эта работа сохранена без полного состояния и не может быть открыта для редактирования.',
    };
  }
  const program = item.program.filter((cmd) => typeof cmd === 'string' && VALID_COMMANDS.has(cmd));
  const heroRaw = item.hero && typeof item.hero === 'object' ? item.hero : { x: 0, y: 0, dir: 0 };
  const finishRaw = item.finish && typeof item.finish === 'object'
    ? item.finish
    : { x: size - 1, y: size - 1 };
  const hero = {
    x: clampCell(heroRaw.x, size - 1),
    y: clampCell(heroRaw.y, size - 1),
    dir: normalizeDir(heroRaw.dir),
  };
  const finish = {
    x: clampCell(finishRaw.x, size - 1),
    y: clampCell(finishRaw.y, size - 1),
  };
  const obstacles = Array.isArray(item.obstacles)
    ? item.obstacles
        .filter((o) => o && typeof o === 'object')
        .map((o) => ({ x: clampCell(o.x, size - 1), y: clampCell(o.y, size - 1) }))
        .filter((o) => !cellsEqual(o, hero) && !cellsEqual(o, finish))
    : [];

  return {
    ok: true,
    state: { size, program, hero, finish, obstacles },
  };
}

export default function SandboxScreen({ navigation, route }) {
  const initialProjectId = route.params?.projectId ? String(route.params.projectId) : null;
  const [projectId, setProjectId] = useState(initialProjectId);
  const [loadingProject, setLoadingProject] = useState(Boolean(initialProjectId));
  const [loadError, setLoadError] = useState(null);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [program, setProgram] = useState([]);
  const [anim] = useState(new Animated.Value(0));
  const [animDir] = useState(new Animated.Value(0)); // 0: вправо, 1: вниз, 2: влево, 3: вверх
  const [animX] = useState(new Animated.Value(0));
  const [animY] = useState(new Animated.Value(0));
  const [hero, setHero] = useState({ x: 0, y: 0, dir: 0 });
  const [finish, setFinish] = useState({ x: size - 1, y: size - 1 });
  const [obstacles, setObstacles] = useState([]);
  const [running, setRunning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState(null);

  // Адаптивные размеры поля и клетки
  const SCREEN_WIDTH = Dimensions.get('window').width;
  const SCREEN_HEIGHT = Dimensions.get('window').height;
  const FIELD_MAX_SIZE = Math.min(SCREEN_WIDTH * 0.9, SCREEN_HEIGHT * 0.6);
  const FIELD_PADDING = 8;
  const CELL_SIZE = Math.floor((FIELD_MAX_SIZE - 2 * FIELD_PADDING) / size);

  const applyProjectState = useCallback(({ size: nextSize, program: nextProgram, hero: nextHero, finish: nextFinish, obstacles: nextObstacles }) => {
    setSize(nextSize);
    setProgram(nextProgram);
    setHero(nextHero);
    setFinish(nextFinish);
    setObstacles(nextObstacles);
    animX.setValue(nextHero.x);
    animY.setValue(nextHero.y);
    animDir.setValue(nextHero.dir);
  }, [animX, animY, animDir]);

  const resetFieldForSize = useCallback((newSize) => {
    setHero({ x: 0, y: 0, dir: 0 });
    setFinish({ x: Math.round(newSize - 1), y: Math.round(newSize - 1) });
    setObstacles([]);
    setProgram([]);
    animX.setValue(0);
    animY.setValue(0);
    animDir.setValue(0);
  }, [animX, animY, animDir]);

  useEffect(() => {
    if (!initialProjectId) {
      return;
    }

    let cancelled = false;

    (async () => {
      setLoadingProject(true);
      setLoadError(null);
      try {
        const item = await getGalleryItemById(initialProjectId);
        if (cancelled) return;
        if (!item) {
          setLoadError('Проект не найден. Возможно, он был удалён.');
          return;
        }
        const parsed = parseGalleryProject(item);
        if (!parsed.ok) {
          setLoadError(parsed.error);
          return;
        }
        applyProjectState(parsed.state);
        setProjectId(String(item.id));
      } catch (_e) {
        if (!cancelled) {
          setLoadError('Не удалось загрузить проект. Проверьте соединение и попробуйте снова.');
        }
      } finally {
        if (!cancelled) {
          setLoadingProject(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialProjectId, applyProjectState]);

  useEffect(() => {
    if (loadError) {
      Alert.alert('Ошибка', loadError, [
        { text: 'В галерею', onPress: () => navigation.navigate('Gallery') },
        { text: 'Назад', onPress: () => navigation.goBack() },
      ]);
    }
  }, [loadError, navigation]);

  // Добавить команду
  const addCommand = (cmd) => {
    if (program.length < MAX_PROGRAM_LENGTH) {
      setProgram([...program, cmd]);
    }
  };
  // Удалить последнюю команду
  const removeCommand = () => {
    setProgram(program.slice(0, -1));
  };
  // Очистить поле
  const clearAll = () => {
    setHero({ x: 0, y: 0, dir: 0 });
    setFinish({ x: Math.round(size - 1), y: Math.round(size - 1) });
    setObstacles([]);
    setProgram([]);
    animX.setValue(0);
    animY.setValue(0);
    animDir.setValue(0);
  };
  // Случайный старт
  const randomStart = () => {
    let cell;
    do {
      cell = getRandomCell(size);
    } while (cellsEqual(cell, finish) || obstacles.some(o => cellsEqual(o, cell)));
    setHero({ x: cell.x, y: cell.y, dir: 0 });
    animX.setValue(cell.x);
    animY.setValue(cell.y);
    animDir.setValue(0);
  };
  // Случайный финиш
  const randomFinish = () => {
    let cell;
    do {
      cell = getRandomCell(size);
    } while (cellsEqual(cell, hero) || obstacles.some(o => cellsEqual(o, cell)));
    setFinish({ x: Math.round(cell.x), y: Math.round(cell.y) });
  };
  // Добавить/убрать препятствие
  const toggleObstacle = (x, y) => {
    if (cellsEqual(hero, { x, y }) || cellsEqual(finish, { x, y })) return;
    setObstacles((prev) => {
      const idx = prev.findIndex(o => o.x === x && o.y === y);
      if (idx >= 0) {
        return prev.filter((_, i) => i !== idx);
      } else {
        return [...prev, { x, y }];
      }
    });
  };
  // Изменить размер поля
  const changeSize = (newSize) => {
    if (newSize === size) return;
    setSize(newSize);
    resetFieldForSize(newSize);
  };
  // Запуск программы
  const runCommands = () => {
    setRunning(true);
    setResult(null);
    let x = Math.round(animX.__getValue());
    let y = Math.round(animY.__getValue());
    let dir = Math.round(animDir.__getValue());
    let steps = [{ x, y, dir }];
    let failed = false;
    for (let cmd of program) {
      if (cmd === 'Вперёд') {
        let nx = x, ny = y;
        if (dir === 0) nx++;
        if (dir === 1) ny++;
        if (dir === 2) nx--;
        if (dir === 3) ny--;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size || obstacles.some(o => o.x === nx && o.y === ny)) {
          failed = true;
          break;
        }
        x = nx; y = ny;
      } else if (cmd === 'Повернуть →') {
        dir = (dir + 1) % 4;
      } else if (cmd === 'Повернуть ←') {
        dir = (dir + 3) % 4;
      }
      steps.push({ x, y, dir });
    }
    Animated.sequence(
      steps.map((step, i) =>
        Animated.parallel([
          Animated.timing(animX, {
            toValue: step.x,
            duration: 350,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
          Animated.timing(animY, {
            toValue: step.y,
            duration: 350,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
          Animated.timing(animDir, {
            toValue: step.dir,
            duration: 200,
            easing: Easing.linear,
            useNativeDriver: false,
          })
        ])
      )
    ).start(() => {
      setHero({ x, y, dir });
      setRunning(false);
      if (failed) {
        setResult('fail');
        setShowModal(true);
      } else if (cellsEqual({ x, y }, finish)) {
        setResult('success');
        setShowModal(true);
      } else {
        setResult('incomplete');
        setShowModal(true);
      }
    });
  };

  const saveCurrentWork = async () => {
    const snapshot = buildGallerySnapshot({ size, program, hero, finish, obstacles });
    try {
      if (projectId) {
        await updateGalleryItem(projectId, snapshot);
        Alert.alert('Сохранено', 'Изменения обновлены в галерее.');
      } else {
        const newId = await saveGalleryItem(snapshot);
        if (newId) {
          setProjectId(newId);
        }
        Alert.alert('Сохранено', 'Работа добавлена в галерею.');
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Не удалось сохранить проект.';
      Alert.alert('Ошибка сохранения', message);
    }
  };

  // Координаты героя
  const heroLeft = animX.interpolate({
    inputRange: [0, size - 1],
    outputRange: [0, (size - 1) * CELL_SIZE],
    extrapolate: 'clamp',
  });
  const heroTop = animY.interpolate({
    inputRange: [0, size - 1],
    outputRange: [0, (size - 1) * CELL_SIZE],
    extrapolate: 'clamp',
  });
  const heroRotate = animDir.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: ['0deg', '90deg', '180deg', '270deg'],
  });

  if (loadingProject) {
    return (
      <View style={[styles.container, styles.centeredState]}>
        <ActivityIndicator size="large" color="#FFD600" />
        <Text style={styles.loadingText}>Загрузка проекта...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { position: 'relative' }]}>
      <ScreenBackButton
        navigation={navigation}
        target="MainMenu"
        variant="overlay"
        overlayStyle={{ top: 38, left: 12 }}
      />
      <Text style={styles.title}>Песочница</Text>
      {projectId ? <Text style={styles.editHint}>Редактирование сохранённого проекта</Text> : null}
      <View style={styles.sizeRow}>
        <Text style={styles.sizeLabel}>Размер поля:</Text>
        {SIZES.map(s => (
          <TouchableOpacity key={s} style={[styles.sizeBtn, size === s && styles.sizeBtnActive]} onPress={() => changeSize(s)} disabled={running}>
            <Text style={[styles.sizeBtnText, size === s && styles.sizeBtnTextActive]}>{s}x{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView horizontal style={{ alignSelf: 'center', maxWidth: '100%' }} contentContainerStyle={{ flexGrow: 1 }}>
        <ScrollView style={{ maxHeight: FIELD_MAX_SIZE + 2 * FIELD_PADDING }} contentContainerStyle={{ flexGrow: 1 }}>
          <View style={[styles.field, { width: CELL_SIZE * size, height: CELL_SIZE * size, padding: FIELD_PADDING }] }>
            {/* Клетки */}
            {Array.from({ length: size * size }).map((_, i) => {
              const x = i % size;
              const y = Math.floor(i / size);
              const isObstacle = obstacles.some(o => o.x === x && o.y === y);
              const isFinish = finish.x === x && finish.y === y;
              const isHero = hero.x === x && hero.y === y;
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.cell,
                    { left: x * CELL_SIZE, top: y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE },
                    isFinish && styles.finishCell,
                    isObstacle && styles.obstacleCell,
                    isHero && styles.heroCell,
                  ]}
                  onPress={() => toggleObstacle(x, y)}
                  disabled={running}
                  activeOpacity={0.7}
                >
                  {isFinish && <Text style={styles.flag}>🏁</Text>}
                  {isObstacle && <Text style={styles.obstacleText}>⛰️</Text>}
                </TouchableOpacity>
              );
            })}
            {/* Герой */}
            <Animated.View style={[styles.hero, {
              left: heroLeft,
              top: heroTop,
              width: CELL_SIZE,
              height: CELL_SIZE,
              transform: [{ rotate: heroRotate }],
              justifyContent: 'center',
              alignItems: 'center',
              position: 'absolute',
            }]}
            >
              <View style={[
                styles.heroArrow,
                { marginTop: CELL_SIZE * 0.13, borderBottomWidth: CELL_SIZE * 0.28, borderLeftWidth: CELL_SIZE * 0.16, borderRightWidth: CELL_SIZE * 0.16 }
              ]} />
            </Animated.View>
          </View>
        </ScrollView>
      </ScrollView>
      <View style={styles.commandsRow}>
        {program.map((cmd, i) => (
          <View key={i} style={styles.commandBtn}>
            <Text style={styles.commandText}>{cmd}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.bottomPanel, { marginTop: 0, gap: 0 }]}>
        <View style={styles.panelRow}>
          <TouchableOpacity style={styles.addBtn} onPress={() => addCommand('Вперёд')} disabled={running || program.length >= MAX_PROGRAM_LENGTH}>
            <Text style={styles.panelText}>+ Вперёд</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => addCommand('Повернуть →')} disabled={running || program.length >= MAX_PROGRAM_LENGTH}>
            <Text style={styles.panelText}>+ Повернуть →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => addCommand('Повернуть ←')} disabled={running || program.length >= MAX_PROGRAM_LENGTH}>
            <Text style={styles.panelText}>+ Повернуть ←</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.panelRow}>
          <TouchableOpacity style={styles.removeBtn} onPress={removeCommand} disabled={running || program.length === 0}>
            <Text style={styles.panelText}>Удалить</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearBtn} onPress={clearAll} disabled={running}>
            <Text style={styles.panelText}>Очистить</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.panelRow}>
          <TouchableOpacity style={styles.randomBtn} onPress={randomStart} disabled={running}>
            <Text style={styles.panelText}>Случайный старт</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.randomBtn} onPress={randomFinish} disabled={running}>
            <Text style={styles.panelText}>Случайный финиш</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.runBtn} onPress={runCommands} disabled={running || program.length === 0}>
          <Text style={styles.runText}>Выполнить</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={saveCurrentWork} disabled={running}>
          <Text style={styles.runText}>{projectId ? 'Сохранить изменения' : 'Сохранить в галерею'}</Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {result === 'success' && <Text style={styles.modalSuccess}>Герой дошёл до финиша!</Text>}
            {result === 'fail' && <Text style={styles.modalFail}>Ошибка! Герой столкнулся с препятствием или вышел за поле.</Text>}
            {result === 'incomplete' && <Text style={styles.modalFail}>Герой не дошёл до финиша.</Text>}
            <View style={styles.modalBtnGroup}>
              <TouchableOpacity style={styles.modalBtnBack} onPress={() => { setShowModal(false); }}>
                <Text style={styles.modalBtnTextBack}>Назад</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnRetry} onPress={() => { setShowModal(false); clearAll(); }}>
                <Text style={styles.modalBtnTextRetry}>Очистить</Text>
              </TouchableOpacity>
            </View>
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
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 92,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 32,
    color: '#FFD600',
    fontWeight: 'bold',
    fontFamily: 'aMavickFont',
    marginBottom: 18,
    marginTop: 2,
    textAlign: 'center',
  },
  editHint: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'aMavickFont',
    marginTop: -10,
    marginBottom: 10,
    textAlign: 'center',
  },
  centeredState: {
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#fff',
    fontFamily: 'aMavickFont',
    fontSize: 18,
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 5,
  },
  sizeLabel: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'aMavickFont',
    marginRight: 8,
  },
  sizeBtn: {
    backgroundColor: '#fffbe8',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginHorizontal: 2,
    borderWidth: 2,
    borderColor: '#FFD600',
  },
  sizeBtnActive: {
    backgroundColor: '#FFD600',
    borderColor: '#FFD600',
  },
  sizeBtnText: {
    color: '#333',
    fontSize: 16,
    fontFamily: 'aMavickFont',
    fontWeight: 'bold',
  },
  sizeBtnTextActive: {
    color: '#fff',
  },
  field: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    position: 'relative',
    overflow: 'visible',
    marginBottom: 12,
    alignSelf: 'center',
  },
  cell: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#B3C6FF',
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishCell: {
    backgroundColor: '#FFD600',
    borderColor: '#FFD600',
    zIndex: 2,
  },
  heroCell: {
    borderColor: '#4CAF50',
  },
  obstacleCell: {
    backgroundColor: '#B3C6FF',
    borderColor: '#7C4DFF',
  },
  flag: {
    fontSize: 20,
    textAlign: 'center',
    marginTop: 2,
  },
  obstacleText: {
    fontSize: 20,
    color: '#7C4DFF',
  },
  hero: {
    position: 'absolute',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#388E3C',
    zIndex: 2,
  },
  heroArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#fff',
    borderTopWidth: 0,
    alignSelf: 'center',
  },
  commandsRow: {
    flexDirection: 'row',
    marginBottom: 8,
    minHeight: 36,
    flexWrap: 'wrap',
    justifyContent: 'center',
    rowGap: 6,
    gap: 6,
  },
  commandBtn: {
    backgroundColor: '#FFA726',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 4,
  },
  commandText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'aMavickFont',
  },
  bottomPanel: {
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
    marginTop: 2,
    marginBottom: 30,
  },
  panelRow: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  addBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 2,
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtn: {
    backgroundColor: '#E53935',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 2,
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtn: {
    backgroundColor: '#FFD600',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 2,
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  randomBtn: {
    backgroundColor: '#7C4DFF',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 2,
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  panelText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'aMavickFont',
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  runBtn: {
    backgroundColor: '#FFA726',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 18,
    elevation: 2,
    width: '100%',
    maxWidth: 220,
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: '#00B8D4',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 18,
    elevation: 2,
    width: '100%',
    maxWidth: 220,
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  runText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'aMavickFont',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    minWidth: 260,
    elevation: 8,
  },
  modalBtnGroup: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  modalSuccess: {
    color: '#4CAF50',
    fontSize: 22,
    fontFamily: 'aMavickFont',
    fontWeight: 'bold',
    marginBottom: 18,
    textAlign: 'center',
  },
  modalFail: {
    color: '#E53935',
    fontSize: 20,
    fontFamily: 'aMavickFont',
    fontWeight: 'bold',
    marginBottom: 18,
    textAlign: 'center',
  },
  modalBtn: {
    backgroundColor: '#4F8CFF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 36,
    marginTop: 8,
    elevation: 2,
    width: '100%',
    maxWidth: 220,
    alignSelf: 'center',
  },
  modalBtnBack: {
    backgroundColor: '#E53935',
    borderRadius: 18,
    paddingVertical: 12,
    width: 220,
  },
  modalBtnRetry: {
    backgroundColor: '#FFD600',
    borderRadius: 18,
    paddingVertical: 12,
    width: 220,
  },
  modalBtnNext: {
    backgroundColor: '#7C4DFF',
    borderRadius: 18,
    paddingVertical: 12,
    width: 220,
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'aMavickFont',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalBtnTextBack: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'aMavickFont',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalBtnTextRetry: {
    color: '#333',
    fontSize: 20,
    fontFamily: 'aMavickFont',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalBtnTextNext: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'aMavickFont',
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 