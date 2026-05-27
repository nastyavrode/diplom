import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenBackButton from '../components/ScreenBackButton';
import { completeLesson } from '../utils/storage';
import { getLessonById } from '../utils/lessons';
import {
  executeProgram,
  estimateProgramLength,
  flattenProgram,
  normalizeProgram,
} from '../utils/lessonProgram';

const BASE_LABELS = {
  forward: 'Вперёд',
  back: 'Назад',
  up: 'Вверх',
  down: 'Вниз',
};

const MOVE_IDS = new Set(['forward', 'back', 'up', 'down']);

/** Длительность одного шага анимации робота (мс). */
const STEP_ANIM_MS = 220;

const LOOP_COUNT_MIN = 2;
const LOOP_COUNT_MAX = 20;

const DEFAULT_CONDITIONS = [
  { id: 'blocked_forward', label: 'Впереди стена' },
  { id: 'blocked_back', label: 'Сзади стена' },
  { id: 'blocked_up', label: 'Сверху стена' },
  { id: 'blocked_down', label: 'Снизу стена' },
  { id: 'free_forward', label: 'Впереди свободно' },
  { id: 'free_up', label: 'Сверху свободно' },
  { id: 'free_down', label: 'Снизу свободно' },
];

function clampInt(n, min, max) {
  const x = Number.isFinite(Number(n)) ? Number(n) : min;
  return Math.max(min, Math.min(max, Math.trunc(x)));
}

function calcStars(stepCount, optimalSteps, maxProgramLength) {
  const opt = clampInt(optimalSteps, 1, 999);
  const maxLen = clampInt(maxProgramLength, opt, 999);
  if (stepCount <= opt) return 3;
  const mid = opt + Math.floor((maxLen - opt) / 2);
  if (stepCount <= mid) return 2;
  return 1;
}

function getNeededBaseCommands(path) {
  const set = new Set();
  for (let i = 1; i < path.length; i += 1) {
    const prev = path[i - 1];
    const next = path[i];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    if (dx > 0) set.add('forward');
    else if (dx < 0) set.add('back');
    else if (dy > 0) set.add('down');
    else if (dy < 0) set.add('up');
  }
  if (set.size === 0) set.add('forward');
  const order = ['forward', 'back', 'up', 'down'];
  return order.filter((cmd) => set.has(cmd));
}

function configAllowsLoops(config) {
  if (config?.loopsEnabled === true) return true;
  const cmds = Array.isArray(config?.commands) ? config.commands : [];
  return cmds.some((c) => c?.id === 'repeat2' || c?.id === 'repeat3');
}

function getLessonConditions(config) {
  if (Array.isArray(config?.conditions) && config.conditions.length > 0) {
    return config.conditions
      .filter((c) => c && typeof c.id === 'string' && typeof c.label === 'string')
      .map((c) => ({ id: c.id, label: c.label }));
  }
  return DEFAULT_CONDITIONS;
}

function configAllowsConditionals(config) {
  if (config?.conditionalsEnabled === true) return true;
  return Array.isArray(config?.conditions) && config.conditions.length > 0;
}

function buildPaletteCommandIds(path, configCommands) {
  const neededBase = getNeededBaseCommands(path);
  const fromConfig = Array.isArray(configCommands)
    ? configCommands.map((c) => c?.id).filter((id) => MOVE_IDS.has(id))
    : [];
  const merged = [...neededBase];
  for (const id of fromConfig) {
    if (!merged.includes(id)) merged.push(id);
  }
  return merged;
}

function cellKey(p) {
  return `${p.x}:${p.y}`;
}

function flatProgramLength(program) {
  return estimateProgramLength(program);
}

function renderBoldLine(line, baseStyle) {
  const parts = String(line).split(/\*\*/);
  if (parts.length === 1) {
    return <Text style={baseStyle}>{line}</Text>;
  }
  return (
    <Text style={baseStyle}>
      {parts.map((chunk, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={[baseStyle, styles.theoryBold]}>
            {chunk}
          </Text>
        ) : (
          <Text key={i}>{chunk}</Text>
        )
      )}
    </Text>
  );
}

function TheoryLessonScreen({ lesson, navigation }) {
  const goNext = () => {
    if (lesson.nextLessonId) {
      navigation.replace('LessonPlayer', { lessonId: lesson.nextLessonId });
    } else {
      navigation.navigate('LessonsList');
    }
  };

  const onContinue = () => {
    void completeLesson(lesson.id, 3).catch(() => {});
    goNext();
  };

  const raw = typeof lesson.theoryContent === 'string' ? lesson.theoryContent : '';
  const blocks = raw.split(/\n\n+/).filter((b) => b.trim() !== '');

  return (
    <View style={styles.container}>
      <View style={styles.lessonTopBar}>
        <ScreenBackButton navigation={navigation} target="LessonsList" variant="embed" />
      </View>
      <Text style={styles.title}>{lesson.title}</Text>
      {lesson.description ? <Text style={styles.desc}>{lesson.description}</Text> : null}

      <ScrollView style={styles.theoryScroll} contentContainerStyle={styles.theoryScrollContent} showsVerticalScrollIndicator>
        {blocks.map((block, bi) => {
          const lines = block.split('\n');
          const inFence = lines[0]?.trim().startsWith('```');
          if (inFence) {
            const inner = lines
              .slice(1)
              .filter((l) => !l.trim().startsWith('```'))
              .join('\n');
            return (
              <View key={bi} style={styles.codeBlock}>
                <Text style={styles.codeBlockText}>{inner || lines.join('\n')}</Text>
              </View>
            );
          }
          return (
            <View key={bi} style={styles.theoryBlock}>
              {lines.map((line, li) => (
                <View key={li} style={styles.theoryLineWrap}>
                  {renderBoldLine(line, styles.theoryLine)}
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.theoryActions}>
        <TouchableOpacity style={styles.mainBtn} onPress={() => navigation.navigate('LessonsList')}>
          <Text style={styles.mainBtnText}>К списку</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.modalBtnNext} onPress={onContinue}>
          <Text style={styles.modalBtnNextText}>Дальше</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ProgramBadge({ label }) {
  return (
    <View style={styles.commandBadge}>
      <Text style={styles.commandBadgeText}>{label}</Text>
    </View>
  );
}

function ProgramTree({ items, commandMap, conditionMap, keyPrefix = '' }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <View style={styles.programTreeRow}>
      {items.map((it, idx) => {
        const k = `${keyPrefix}-${idx}`;
        if (it.kind === 'cmd') {
          return <ProgramBadge key={k} label={commandMap[it.id] || it.id} />;
        }
        if (it.kind === 'loop') {
          return (
            <View key={k} style={styles.loopBlock}>
              <Text style={styles.loopHeader}>Цикл ×{it.count}</Text>
              <View style={styles.loopBody}>
                <ProgramTree
                  items={it.body}
                  commandMap={commandMap}
                  conditionMap={conditionMap}
                  keyPrefix={k}
                />
              </View>
            </View>
          );
        }
        if (it.kind === 'if') {
          const condLabel = conditionMap[it.condition] || it.condition;
          return (
            <View key={k} style={styles.ifBlock}>
              <Text style={styles.ifHeader}>Если: {condLabel}</Text>
              <Text style={styles.ifBranchLabel}>то</Text>
              <View style={styles.ifBody}>
                <ProgramTree
                  items={it.body}
                  commandMap={commandMap}
                  conditionMap={conditionMap}
                  keyPrefix={`${k}-t`}
                />
              </View>
              {it.elseBody && it.elseBody.length > 0 ? (
                <>
                  <Text style={styles.ifBranchLabel}>иначе</Text>
                  <View style={styles.ifBody}>
                    <ProgramTree
                      items={it.elseBody}
                      commandMap={commandMap}
                      conditionMap={conditionMap}
                      keyPrefix={`${k}-e`}
                    />
                  </View>
                </>
              ) : null}
            </View>
          );
        }
        return null;
      })}
    </View>
  );
}

function PathFourDirLesson({ lesson, navigation }) {
  const config = lesson.config || {};
  const gridW = clampInt(config?.gridSize?.w, 2, 12);
  const gridH = clampInt(config?.gridSize?.h, 1, 12);
  const cellSize = clampInt(config.cellSize, 40, 72);
  const maxProgramLength = clampInt(config.maxProgramLength, 1, 120);
  const optimalSteps = clampInt(config.optimalSteps, 1, 999);
  const path = Array.isArray(config.path) ? config.path : [];
  const loopsEnabled = configAllowsLoops(config);
  const conditionalsEnabled = configAllowsConditionals(config);
  const lessonConditions = getLessonConditions(config);
  const conditionMap = Object.fromEntries(lessonConditions.map((c) => [c.id, c.label]));
  const paletteIds = buildPaletteCommandIds(path, config.commands);
  const availableCommands = paletteIds.map((id) => ({ id, label: BASE_LABELS[id] || id }));
  const commandMap = Object.fromEntries(availableCommands.map((c) => [c.id, c.label]));

  const start = path[0] || { x: 0, y: 0 };
  const finish = path[path.length - 1] || start;
  const pathSet = useMemo(() => new Set(path.map((p) => cellKey(p))), [path]);
  const wallSet = useMemo(() => {
    const w = Array.isArray(config.walls) ? config.walls : [];
    return new Set(w.map((p) => cellKey(p)));
  }, [config.walls]);

  const [program, setProgram] = useState(() =>
    normalizeProgram(Array.isArray(config.initialProgram) ? config.initialProgram : [])
  );
  const [result, setResult] = useState(null);
  const [starsEarned, setStarsEarned] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [running, setRunning] = useState(false);
  const [painted, setPainted] = useState(() => new Set());
  const [showHintModal, setShowHintModal] = useState(false);
  const [buildingLoop, setBuildingLoop] = useState(null);
  const [showLoopModal, setShowLoopModal] = useState(false);
  const [pendingLoopCount, setPendingLoopCount] = useState(2);
  const [buildingIf, setBuildingIf] = useState(null);
  const [showIfModal, setShowIfModal] = useState(false);
  const lastRunRef = useRef(null);

  const robotX = useRef(new Animated.Value(start.x * cellSize)).current;
  const robotY = useRef(new Animated.Value(start.y * cellSize)).current;

  useEffect(() => {
    robotX.setValue(start.x * cellSize);
    robotY.setValue(start.y * cellSize);
    setProgram(normalizeProgram(Array.isArray(config.initialProgram) ? config.initialProgram : []));
    setResult(null);
    setStarsEarned(0);
    setShowModal(false);
    setShowHintModal(false);
    setRunning(false);
    setPainted(new Set());
    setBuildingLoop(null);
    setShowLoopModal(false);
    setPendingLoopCount(2);
    setBuildingIf(null);
    setShowIfModal(false);
  }, [lesson.id, start.x, start.y, cellSize, robotX, robotY, config.initialProgram]);

  const appendToDraft = (draft, cmd) => {
    if (draft.kind === 'loop') {
      return { ...draft, body: [...draft.body, cmd] };
    }
    if (draft.kind === 'if') {
      if (draft.stage === 'else') {
        return { ...draft, elseBody: [...(draft.elseBody || []), cmd] };
      }
      return { ...draft, body: [...draft.body, cmd] };
    }
    return draft;
  };

  const addCommand = (id) => {
    if (running || !MOVE_IDS.has(id)) return;
    const cmd = { kind: 'cmd', id };
    if (buildingLoop) {
      const nextBody = [...buildingLoop.body, cmd];
      const loopNode = { kind: 'loop', count: buildingLoop.count, body: nextBody };
      const flat = flatProgramLength([...program, loopNode]);
      if (flat > maxProgramLength) return;
      setBuildingLoop({ ...buildingLoop, body: nextBody });
      return;
    }
    if (buildingIf) {
      const nextDraft = appendToDraft({ ...buildingIf, kind: 'if' }, cmd);
      const previewNode = {
        kind: 'if',
        condition: buildingIf.condition,
        body: nextDraft.body,
        elseBody: nextDraft.elseBody,
      };
      if (flatProgramLength([...program, previewNode]) > maxProgramLength) return;
      setBuildingIf(nextDraft);
      return;
    }
    const next = [...program, cmd];
    if (flatProgramLength(next) > maxProgramLength) return;
    setProgram(next);
  };

  const removeCommand = () => {
    if (running) return;
    if (buildingIf) {
      if (buildingIf.stage === 'else' && buildingIf.elseBody && buildingIf.elseBody.length > 0) {
        setBuildingIf({ ...buildingIf, elseBody: buildingIf.elseBody.slice(0, -1) });
      } else if (buildingIf.body.length > 0) {
        setBuildingIf({ ...buildingIf, body: buildingIf.body.slice(0, -1) });
      } else if (buildingIf.stage === 'else') {
        setBuildingIf({ ...buildingIf, stage: 'then', elseBody: null });
      } else {
        setBuildingIf(null);
      }
      return;
    }
    if (buildingLoop) {
      if (buildingLoop.body.length > 0) {
        setBuildingLoop({ ...buildingLoop, body: buildingLoop.body.slice(0, -1) });
      } else {
        setBuildingLoop(null);
      }
      return;
    }
    setProgram((prev) => prev.slice(0, -1));
  };

  const reset = () => {
    if (running) return;
    setProgram(normalizeProgram(Array.isArray(config.initialProgram) ? config.initialProgram : []));
    setResult(null);
    setStarsEarned(0);
    setShowModal(false);
    setShowHintModal(false);
    setPainted(new Set());
    setBuildingLoop(null);
    setBuildingIf(null);
    robotX.setValue(start.x * cellSize);
    robotY.setValue(start.y * cellSize);
  };

  const openLoopModal = () => {
    if (running || buildingLoop || buildingIf || !loopsEnabled) return;
    setPendingLoopCount(2);
    setShowLoopModal(true);
  };

  const openIfModal = () => {
    if (running || buildingLoop || buildingIf || !conditionalsEnabled) return;
    setShowIfModal(true);
  };

  const startIfBlock = (condition) => {
    setShowIfModal(false);
    setBuildingIf({
      condition: condition.id,
      conditionLabel: condition.label,
      body: [],
      elseBody: null,
      stage: 'then',
    });
  };

  const cancelBuildingIf = () => {
    setBuildingIf(null);
  };

  const beginElseBranch = () => {
    if (!buildingIf || buildingIf.body.length === 0) return;
    setBuildingIf({ ...buildingIf, stage: 'else', elseBody: [] });
  };

  const finishIf = () => {
    if (!buildingIf || buildingIf.body.length === 0) return;
    const node = {
      kind: 'if',
      condition: buildingIf.condition,
      body: buildingIf.body,
      elseBody:
        buildingIf.stage === 'else' && buildingIf.elseBody && buildingIf.elseBody.length > 0
          ? buildingIf.elseBody
          : null,
    };
    const next = [...program, node];
    if (flatProgramLength(next) > maxProgramLength) return;
    setProgram(next);
    setBuildingIf(null);
  };

  const confirmLoopCount = () => {
    const count = clampInt(pendingLoopCount, LOOP_COUNT_MIN, LOOP_COUNT_MAX);
    setShowLoopModal(false);
    setBuildingLoop({ count, body: [] });
  };

  const cancelBuildingLoop = () => {
    setBuildingLoop(null);
  };

  const finishLoop = () => {
    if (!buildingLoop || buildingLoop.body.length === 0) return;
    const node = { kind: 'loop', count: buildingLoop.count, body: buildingLoop.body };
    const next = [...program, node];
    if (flatProgramLength(next) > maxProgramLength) return;
    setProgram(next);
    setBuildingLoop(null);
  };

  const animateTrace = (trace, onLand) =>
    new Promise((resolve) => {
      if (!Array.isArray(trace) || trace.length < 1) {
        resolve();
        return;
      }
      onLand(trace[0]);
      if (trace.length < 2) {
        resolve();
        return;
      }
      const steps = trace.slice(1).map((p) =>
        Animated.parallel([
          Animated.timing(robotX, {
            toValue: p.x * cellSize,
            duration: STEP_ANIM_MS,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
          Animated.timing(robotY, {
            toValue: p.y * cellSize,
            duration: STEP_ANIM_MS,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
        ])
      );
      let i = 0;
      const runNext = () => {
        if (i >= steps.length) {
          resolve();
          return;
        }
        steps[i].start(() => {
          onLand(trace[i + 1]);
          i += 1;
          runNext();
        });
      };
      runNext();
    });

  const runProgram = async () => {
    if (running || buildingLoop || buildingIf) return;
    const flat = flattenProgram(program);
    if (flat.length === 0) return;
    setRunning(true);
    setResult(null);
    setShowModal(false);
    setShowHintModal(false);
    robotX.setValue(start.x * cellSize);
    robotY.setValue(start.y * cellSize);
    setPainted(new Set());

    const runResult = executeProgram(program, { start, finish, pathSet, wallSet });
    await animateTrace(runResult.trace, (p) => {
      setPainted((prev) => {
        const next = new Set(prev);
        next.add(cellKey(p));
        return next;
      });
    });

    lastRunRef.current = runResult;
    setRunning(false);

    if (runResult.success) {
      const stars = calcStars(runResult.movedSteps, optimalSteps, maxProgramLength);
      setStarsEarned(stars);
      setResult('success');
      void completeLesson(lesson.id, stars).catch(() => {});
    } else {
      setStarsEarned(0);
      setResult('fail');
    }
    setShowModal(true);
  };

  const goNext = () => {
    if (lesson.nextLessonId) {
      navigation.replace('LessonPlayer', { lessonId: lesson.nextLessonId });
    } else {
      navigation.navigate('LessonsList');
    }
  };

  const hintText =
    typeof lesson.hint === 'string' && lesson.hint.trim() !== ''
      ? lesson.hint.trim()
      : 'Для этого задания подсказка пока не добавлена.';

  const canRemove = Boolean(buildingIf) || Boolean(buildingLoop) || program.length > 0;
  const canRun = !buildingLoop && !buildingIf && flattenProgram(program).length > 0;
  const draftIfItems =
    buildingIf && buildingIf.stage === 'else' ? buildingIf.elseBody || [] : buildingIf?.body || [];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <ScreenBackButton navigation={navigation} target="LessonsList" variant="embed" />
        <View style={styles.topBarSpacer} />
        <TouchableOpacity style={styles.hintLampBtn} onPress={() => setShowHintModal(true)} accessibilityLabel="Подсказка" accessibilityRole="button">
          <Text style={styles.hintLampIcon}>💡</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>{lesson.title}</Text>
      <Text style={styles.desc}>{lesson.description}</Text>

      {buildingLoop ? (
        <Text style={styles.loopBanner}>
          Внутри цикла (повтор ×{buildingLoop.count}). Добавь команды, затем нажми «Закончить цикл».
        </Text>
      ) : null}
      {buildingIf ? (
        <Text style={styles.ifBanner}>
          Условие «{buildingIf.conditionLabel}». Добавь команды в ветку «{buildingIf.stage === 'else' ? 'иначе' : 'то'}».
        </Text>
      ) : null}

      <View style={[styles.field, { width: gridW * cellSize, height: gridH * cellSize }]}>
        {Array.from({ length: gridW * gridH }).map((_, idx) => {
          const x = idx % gridW;
          const y = Math.floor(idx / gridW);
          const key = `${x}:${y}`;
          const isPath = pathSet.has(key);
          const isWallCell = wallSet.has(key);
          const isStart = x === start.x && y === start.y;
          const isFinish = x === finish.x && y === finish.y;
          const isPainted = painted.has(key);
          return (
            <View
              key={key}
              style={[
                styles.cell,
                { width: cellSize, height: cellSize, left: x * cellSize, top: y * cellSize },
                isPath ? styles.pathCell : styles.offPathCell,
                isWallCell && !isPath ? styles.barrierCell : null,
                isPainted ? styles.paintedCell : null,
                isStart ? styles.startCell : null,
                isFinish ? styles.finishCell : null,
              ]}
            >
              {isWallCell && !isPath ? <Text style={styles.wallGlyph}>▓</Text> : null}
              {isFinish ? <Text style={styles.flag}>🏁</Text> : null}
            </View>
          );
        })}
        <Animated.View
          style={[
            styles.robot,
            { width: cellSize - 12, height: cellSize - 12, left: robotX, top: robotY, margin: 6 },
          ]}
        >
          <Text style={styles.robotEmoji}>🤖</Text>
        </Animated.View>
      </View>
      {running ? <Text style={styles.runningText}>Робот выполняет программу...</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.programScroll}>
        <View style={styles.commandsRow}>
          <ProgramTree items={program} commandMap={commandMap} conditionMap={conditionMap} keyPrefix="p" />
          {buildingLoop ? (
            <View style={styles.loopDraft}>
              <Text style={styles.loopDraftLabel}>…тело</Text>
              {buildingLoop.body.map((it, idx) =>
                it.kind === 'cmd' ? (
                  <ProgramBadge key={`d-${idx}`} label={commandMap[it.id] || it.id} />
                ) : null
              )}
            </View>
          ) : null}
          {buildingIf ? (
            <View style={styles.ifDraft}>
              <Text style={styles.ifDraftLabel}>
                Если {buildingIf.conditionLabel} → {buildingIf.stage === 'else' ? 'иначе' : 'то'}
              </Text>
              {draftIfItems.map((it, idx) =>
                it.kind === 'cmd' ? (
                  <ProgramBadge key={`if-${idx}`} label={commandMap[it.id] || it.id} />
                ) : null
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.panelRow}>
        {availableCommands.map((command) => (
          <TouchableOpacity
            key={command.id}
            style={styles.smallBtn}
            onPress={() => addCommand(command.id)}
            disabled={running}
          >
            <Text style={styles.smallBtnText}>+ {command.label}</Text>
          </TouchableOpacity>
        ))}
        {loopsEnabled && !buildingLoop && !buildingIf ? (
          <TouchableOpacity style={styles.loopBtn} onPress={openLoopModal} disabled={running}>
            <Text style={styles.smallBtnText}>+ Цикл…</Text>
          </TouchableOpacity>
        ) : null}
        {conditionalsEnabled && !buildingLoop && !buildingIf ? (
          <TouchableOpacity style={styles.ifBtn} onPress={openIfModal} disabled={running}>
            <Text style={styles.smallBtnText}>+ Если…</Text>
          </TouchableOpacity>
        ) : null}
        {buildingLoop ? (
          <>
            <TouchableOpacity style={styles.loopDoneBtn} onPress={finishLoop} disabled={running || buildingLoop.body.length === 0}>
              <Text style={styles.smallBtnText}>Закончить цикл</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.loopCancelBtn} onPress={cancelBuildingLoop} disabled={running}>
              <Text style={styles.smallBtnText}>Отмена</Text>
            </TouchableOpacity>
          </>
        ) : null}
        {buildingIf ? (
          <>
            {buildingIf.stage === 'then' && config?.elseEnabled !== false ? (
              <TouchableOpacity
                style={styles.ifElseBtn}
                onPress={beginElseBranch}
                disabled={running || buildingIf.body.length === 0}
              >
                <Text style={styles.smallBtnText}>+ Иначе…</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.ifDoneBtn}
              onPress={finishIf}
              disabled={
                running ||
                buildingIf.body.length === 0 ||
                (buildingIf.stage === 'else' && (!buildingIf.elseBody || buildingIf.elseBody.length === 0))
              }
            >
              <Text style={styles.smallBtnText}>Закончить условие</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ifCancelBtn} onPress={cancelBuildingIf} disabled={running}>
              <Text style={styles.smallBtnText}>Отмена</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>

      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.deleteBtn} onPress={removeCommand} disabled={running || !canRemove}>
          <Text style={styles.actionText}>Удалить</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.runBtn} onPress={runProgram} disabled={running || !canRun}>
          <Text style={styles.actionText}>Выполнить</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetBtn} onPress={reset} disabled={running}>
          <Text style={styles.resetText}>Сбросить</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showLoopModal} transparent animationType="fade" onRequestClose={() => setShowLoopModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.loopModalTitle}>Сколько раз повторить?</Text>
            <View style={styles.loopCountRow}>
              <TouchableOpacity
                style={styles.loopCountBtn}
                onPress={() => setPendingLoopCount((c) => Math.max(LOOP_COUNT_MIN, c - 1))}
              >
                <Text style={styles.loopCountBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.loopCountValue}>{pendingLoopCount}</Text>
              <TouchableOpacity
                style={styles.loopCountBtn}
                onPress={() => setPendingLoopCount((c) => Math.min(LOOP_COUNT_MAX, c + 1))}
              >
                <Text style={styles.loopCountBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.loopModalHint}>Потом добавь команды внутрь цикла.</Text>
            <TouchableOpacity style={styles.modalBtnNext} onPress={confirmLoopCount}>
              <Text style={styles.modalBtnNextText}>Начать цикл</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnRetry} onPress={() => setShowLoopModal(false)}>
              <Text style={styles.modalBtnRetryText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showIfModal} transparent animationType="fade" onRequestClose={() => setShowIfModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.loopModalTitle}>Когда проверять?</Text>
            <Text style={styles.loopModalHint}>Выбери условие для команды «если».</Text>
            {lessonConditions.map((cond) => (
              <TouchableOpacity key={cond.id} style={styles.ifCondBtn} onPress={() => startIfBlock(cond)}>
                <Text style={styles.ifCondBtnText}>{cond.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalBtnRetry} onPress={() => setShowIfModal(false)}>
              <Text style={styles.modalBtnRetryText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showHintModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHintModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.hintModalCard}>
            <Text style={styles.hintModalTitle}>Подсказка</Text>
            <ScrollView style={styles.hintScroll} showsVerticalScrollIndicator>
              <Text style={styles.hintModalText}>{hintText}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.hintCloseBtn} onPress={() => setShowHintModal(false)}>
              <Text style={styles.hintCloseBtnText}>Понятно</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {result === 'success' ? (
              <>
                <Text style={styles.modalOk}>Уровень пройден!</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3].map((i) => (
                    <Text key={i} style={[styles.star, i <= starsEarned ? styles.starGold : styles.starGrey]}>
                      ★
                    </Text>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.modalFail}>
                {(() => {
                  const r = lastRunRef.current;
                  if (r?.crashed) return 'Робот вышел за дорожку или в стену. Попробуй другую программу.';
                  if (r && !r.allPathCellsVisited) return 'Не все клетки дорожки закрашены. Пройди по каждой клетке хотя бы один раз.';
                  if (r && !r.atFinish) return 'Робот должен остановиться на финише.';
                  return 'Условия уровня не выполнены. Попробуй изменить программу.';
                })()}
              </Text>
            )}

            <TouchableOpacity style={styles.modalBtnBack} onPress={() => navigation.navigate('LessonsList')}>
              <Text style={styles.modalBtnBackText}>К списку</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnRetry} onPress={() => setShowModal(false)}>
              <Text style={styles.modalBtnRetryText}>Исправить</Text>
            </TouchableOpacity>
            {result === 'success' ? (
              <TouchableOpacity style={styles.modalBtnNext} onPress={goNext}>
                <Text style={styles.modalBtnNextText}>Дальше</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function LessonPlayerScreen({ navigation, route }) {
  const { lessonId } = route.params || {};
  const lesson = useMemo(() => getLessonById(lessonId), [lessonId]);

  if (!lesson) {
    return (
      <View style={styles.centered}>
        <ScreenBackButton
          navigation={navigation}
          target="LessonsList"
          variant="overlay"
          overlayStyle={styles.lessonBackOverlay}
        />
        <Text style={styles.title}>Урок не найден</Text>
        <TouchableOpacity style={styles.mainBtn} onPress={() => navigation.navigate('LessonsList')}>
          <Text style={styles.mainBtnText}>К списку уроков</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (lesson.type === 'theory') {
    return <TheoryLessonScreen lesson={lesson} navigation={navigation} />;
  }

  if (lesson.type !== 'path-4dir') {
    return (
      <View style={styles.centered}>
        <ScreenBackButton
          navigation={navigation}
          target="LessonsList"
          variant="overlay"
          overlayStyle={styles.lessonBackOverlay}
        />
        <Text style={styles.title}>Неподдерживаемый формат урока</Text>
        <TouchableOpacity style={styles.mainBtn} onPress={() => navigation.navigate('LessonsList')}>
          <Text style={styles.mainBtnText}>К списку уроков</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <PathFourDirLesson lesson={lesson} navigation={navigation} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4F8CFF',
    paddingTop: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  theoryScroll: {
    width: '100%',
    flex: 1,
    marginTop: 8,
  },
  theoryScrollContent: {
    paddingBottom: 20,
  },
  theoryBlock: {
    marginBottom: 14,
  },
  theoryLineWrap: {
    marginBottom: 4,
  },
  theoryLine: {
    fontFamily: 'aMavickFont',
    fontSize: 17,
    color: '#fff',
    lineHeight: 24,
  },
  theoryBold: {
    fontWeight: '800',
  },
  codeBlock: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  codeBlockText: {
    fontFamily: 'Courier',
    fontSize: 14,
    color: '#E8E8E8',
  },
  theoryActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  loopBanner: {
    color: '#FFD600',
    fontFamily: 'aMavickFont',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  programScroll: {
    maxHeight: 140,
    width: '100%',
    marginBottom: 8,
  },
  programTreeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  loopBlock: {
    borderWidth: 2,
    borderColor: '#FFD600',
    borderRadius: 12,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    gap: 6,
  },
  loopHeader: {
    fontFamily: 'aMavickFont',
    fontSize: 14,
    color: '#FFD600',
  },
  loopBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingLeft: 4,
  },
  loopDraft: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#fff',
    borderRadius: 12,
    padding: 8,
  },
  loopDraftLabel: {
    color: '#fff',
    fontFamily: 'aMavickFont',
    fontSize: 14,
  },
  loopBtn: {
    backgroundColor: '#7C4DFF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  loopDoneBtn: {
    backgroundColor: '#7C4DFF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  loopCancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  ifBanner: {
    color: '#FF9800',
    fontFamily: 'aMavickFont',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  ifBlock: {
    borderWidth: 2,
    borderColor: '#FF9800',
    borderRadius: 12,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    gap: 4,
  },
  ifHeader: {
    fontFamily: 'aMavickFont',
    fontSize: 14,
    color: '#FF9800',
  },
  ifBranchLabel: {
    fontFamily: 'aMavickFont',
    fontSize: 13,
    color: '#fff',
    opacity: 0.85,
  },
  ifBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingLeft: 4,
    marginBottom: 4,
  },
  ifDraft: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FF9800',
    borderRadius: 12,
    padding: 8,
  },
  ifDraftLabel: {
    color: '#FF9800',
    fontFamily: 'aMavickFont',
    fontSize: 14,
  },
  ifBtn: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  ifElseBtn: {
    backgroundColor: '#FFB74D',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  ifDoneBtn: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  ifCancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  ifCondBtn: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  ifCondBtnText: {
    color: '#fff',
    fontFamily: 'aMavickFont',
    fontSize: 16,
  },
  loopModalTitle: {
    fontFamily: 'aMavickFont',
    fontSize: 22,
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  loopModalHint: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'aMavickFont',
  },
  loopCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  loopCountBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4F8CFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loopCountBtnText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  loopCountValue: {
    fontSize: 28,
    fontFamily: 'aMavickFont',
    color: '#333',
    minWidth: 48,
    textAlign: 'center',
  },
  lessonTopBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingBottom: 4,
    minHeight: 44,
  },
  lessonBackOverlay: {
    top: 12,
    left: 14,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingBottom: 4,
    minHeight: 44,
  },
  topBarSpacer: {
    flex: 1,
  },
  hintLampBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFD600',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  hintLampIcon: {
    fontSize: 26,
  },
  hintModalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    maxHeight: '70%',
  },
  hintModalTitle: {
    fontFamily: 'aMavickFont',
    fontSize: 24,
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  hintScroll: {
    maxHeight: 320,
    marginBottom: 16,
  },
  hintModalText: {
    fontFamily: 'aMavickFont',
    fontSize: 17,
    color: '#444',
    lineHeight: 24,
  },
  hintCloseBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  hintCloseBtnText: {
    color: '#fff',
    fontFamily: 'aMavickFont',
    fontSize: 18,
  },
  centered: {
    flex: 1,
    backgroundColor: '#4F8CFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    position: 'relative',
  },
  title: {
    fontSize: 28,
    color: '#FFD600',
    fontFamily: 'aMavickFont',
    textAlign: 'center',
    marginBottom: 8,
  },
  desc: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'aMavickFont',
    textAlign: 'center',
    marginBottom: 16,
  },
  field: {
    position: 'relative',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
  },
  cell: {
    position: 'absolute',
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathCell: {
    backgroundColor: '#fff',
    borderColor: '#B3C6FF',
  },
  offPathCell: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.25)',
  },
  barrierCell: {
    backgroundColor: '#5D4037',
    borderColor: '#3E2723',
  },
  wallGlyph: {
    fontSize: 16,
    color: '#8D6E63',
    opacity: 0.9,
  },
  paintedCell: {
    backgroundColor: '#4CAF50',
    borderColor: '#388E3C',
  },
  startCell: {
    borderColor: '#4CAF50',
    borderWidth: 3,
  },
  finishCell: {
    backgroundColor: '#FFD600',
    borderColor: '#FFB300',
    borderWidth: 3,
  },
  robot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  robotEmoji: {
    fontSize: 22,
  },
  flag: {
    fontSize: 22,
  },
  runningText: {
    color: '#fff',
    fontFamily: 'aMavickFont',
    marginBottom: 8,
  },
  commandsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    minHeight: 46,
    marginBottom: 10,
  },
  commandBadge: {
    backgroundColor: '#FFA726',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  commandBadgeText: {
    color: '#fff',
    fontFamily: 'aMavickFont',
    fontSize: 16,
  },
  panelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  smallBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  smallBtnText: {
    color: '#fff',
    fontFamily: 'aMavickFont',
    fontSize: 15,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteBtn: {
    backgroundColor: '#E53935',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  runBtn: {
    backgroundColor: '#FFA726',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  resetBtn: {
    backgroundColor: '#FFD600',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  actionText: {
    color: '#fff',
    fontFamily: 'aMavickFont',
    fontSize: 17,
  },
  resetText: {
    color: '#333',
    fontFamily: 'aMavickFont',
    fontSize: 17,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalOk: {
    color: '#4CAF50',
    fontFamily: 'aMavickFont',
    fontSize: 24,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalFail: {
    color: '#E53935',
    fontFamily: 'aMavickFont',
    fontSize: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 6,
  },
  star: {
    fontSize: 36,
    fontFamily: 'aMavickFont',
  },
  starGold: {
    color: '#FFD600',
  },
  starGrey: {
    color: '#B0B0B0',
  },
  modalBtnBack: {
    backgroundColor: '#E53935',
    borderRadius: 14,
    paddingVertical: 10,
    width: '100%',
    marginTop: 6,
  },
  modalBtnRetry: {
    backgroundColor: '#FFD600',
    borderRadius: 14,
    paddingVertical: 10,
    width: '100%',
    marginTop: 8,
  },
  modalBtnNext: {
    backgroundColor: '#7C4DFF',
    borderRadius: 14,
    paddingVertical: 10,
    width: '100%',
    marginTop: 8,
  },
  modalBtnBackText: {
    color: '#fff',
    fontFamily: 'aMavickFont',
    fontSize: 18,
    textAlign: 'center',
  },
  modalBtnRetryText: {
    color: '#333',
    fontFamily: 'aMavickFont',
    fontSize: 18,
    textAlign: 'center',
  },
  modalBtnNextText: {
    color: '#fff',
    fontFamily: 'aMavickFont',
    fontSize: 18,
    textAlign: 'center',
  },
  mainBtn: {
    backgroundColor: '#FFA726',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  mainBtnText: {
    color: '#fff',
    fontFamily: 'aMavickFont',
    fontSize: 18,
  },
});
