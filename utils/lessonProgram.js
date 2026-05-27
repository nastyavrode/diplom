/**
 * Программа урока: дерево шагов.
 * — { kind: 'cmd', id } — команда движения (forward, back, up, down)
 * — { kind: 'loop', count, body } — цикл
 * — { kind: 'if', condition, body, elseBody? } — ветвление
 */

const DELTA = {
  forward: { x: 1, y: 0 },
  back: { x: -1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

const CONDITION_RE = /^(blocked|free)_(forward|back|up|down)$/;

export function evaluateCondition(pos, conditionId, { pathSet, wallSet }) {
  const m = CONDITION_RE.exec(conditionId);
  if (!m) return false;
  const [, kind, dir] = m;
  const d = DELTA[dir];
  if (!d) return false;
  const next = { x: pos.x + d.x, y: pos.y + d.y };
  const key = `${next.x}:${next.y}`;
  const blocked = wallSet.has(key) || !pathSet.has(key);
  return kind === 'blocked' ? blocked : !blocked;
}

export function normalizeProgram(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string') {
        return { kind: 'cmd', id: item };
      }
      if (item && item.kind === 'cmd' && typeof item.id === 'string') {
        return { kind: 'cmd', id: item.id };
      }
      if (item && item.kind === 'loop' && Array.isArray(item.body)) {
        const count = Math.max(1, Math.min(20, Number(item.count) || 2));
        const body = normalizeProgram(item.body);
        return { kind: 'loop', count, body };
      }
      if (item && item.kind === 'if' && typeof item.condition === 'string' && Array.isArray(item.body)) {
        const body = normalizeProgram(item.body);
        const elseBody =
          item.elseBody != null && Array.isArray(item.elseBody) ? normalizeProgram(item.elseBody) : null;
        return {
          kind: 'if',
          condition: item.condition,
          body,
          elseBody: elseBody && elseBody.length > 0 ? elseBody : null,
        };
      }
      return null;
    })
    .filter(Boolean);
}

function flattenItems(items, out) {
  for (const it of items) {
    if (!it) continue;
    if (it.kind === 'cmd') out.push(it.id);
    else if (it.kind === 'loop' && Array.isArray(it.body)) {
      const n = Math.max(1, Math.min(20, Number(it.count) || 1));
      for (let t = 0; t < n; t += 1) {
        flattenItems(it.body, out);
      }
    } else if (it.kind === 'if') {
      flattenItems(it.body || [], out);
      if (it.elseBody) flattenItems(it.elseBody, out);
    }
  }
}

/** Развёрнутая длина (для лимита программы; ветки if считаются обе). */
export function flattenProgram(program) {
  const out = [];
  flattenItems(program, out);
  return out;
}

function estimateIfLength(ifNode) {
  const thenLen = flattenProgram(ifNode.body || []).length;
  const elseLen = ifNode.elseBody ? flattenProgram(ifNode.elseBody).length : 0;
  return 1 + Math.max(thenLen, elseLen);
}

export function countProgramTokens(program) {
  let n = 0;
  for (const it of program) {
    if (it.kind === 'cmd') n += 1;
    else if (it.kind === 'loop') n += 1 + (it.body?.length || 0);
    else if (it.kind === 'if') n += 1 + (it.body?.length || 0) + (it.elseBody?.length || 0);
  }
  return n;
}

export function estimateProgramLength(program) {
  let n = 0;
  for (const it of program) {
    if (it.kind === 'cmd') n += 1;
    else if (it.kind === 'loop') {
      const bodyLen = flattenProgram(it.body || []).length;
      const count = Math.max(1, Math.min(20, Number(it.count) || 1));
      n += 1 + bodyLen * count;
    } else if (it.kind === 'if') {
      n += estimateIfLength(it);
    }
  }
  return n;
}

export function executeProgram(program, { start, finish, pathSet, wallSet }) {
  let pos = { ...start };
  let crashed = false;
  let movedSteps = 0;
  const trace = [{ ...pos }];
  const visited = new Set();
  visited.add(`${start.x}:${start.y}`);

  const ctx = { pathSet, wallSet };

  const tryMove = (id) => {
    const d = DELTA[id];
    if (!d) return;
    const next = { x: pos.x + d.x, y: pos.y + d.y };
    const key = `${next.x}:${next.y}`;
    if (wallSet.has(key) || !pathSet.has(key)) {
      crashed = true;
      return;
    }
    pos = next;
    movedSteps += 1;
    visited.add(key);
    trace.push({ ...pos });
  };

  const runItems = (items) => {
    for (const it of items) {
      if (crashed || !it) break;
      if (it.kind === 'cmd') {
        tryMove(it.id);
      } else if (it.kind === 'loop' && Array.isArray(it.body)) {
        const n = Math.max(1, Math.min(20, Number(it.count) || 1));
        for (let t = 0; t < n && !crashed; t += 1) {
          runItems(it.body);
        }
      } else if (it.kind === 'if') {
        const ok = evaluateCondition(pos, it.condition, ctx);
        const branch = ok ? it.body : it.elseBody || [];
        runItems(branch);
      }
    }
  };

  runItems(normalizeProgram(program));

  let allPathCellsVisited = true;
  for (const key of pathSet) {
    if (!visited.has(key)) {
      allPathCellsVisited = false;
      break;
    }
  }
  const atFinish = pos.x === finish.x && pos.y === finish.y;
  const success = !crashed && atFinish && allPathCellsVisited;
  return { success, crashed, movedSteps, trace, visited, atFinish, allPathCellsVisited };
}

/** @deprecated используйте executeProgram */
export function executeMoves(moveIds, ctx) {
  const program = (moveIds || []).map((id) => ({ kind: 'cmd', id }));
  return executeProgram(program, ctx);
}
