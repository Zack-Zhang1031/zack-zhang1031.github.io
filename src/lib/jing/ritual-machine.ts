export type BuddhistRitualAction = 'complete' | 'palms' | 'bow' | 'kneel' | 'return';

export type BuddhistRitualPose =
  | 'ready'
  | 'palms'
  | 'bow'
  | 'kneel'
  | 'prostrate'
  | 'rise'
  | 'return';

export interface BuddhistRitualStep {
  pose: BuddhistRitualPose;
  label: string;
  duration: number;
  mark?: 'chime' | 'ripple';
}

export type BuddhistRitualStatus = 'idle' | 'running' | 'completed';

export interface BuddhistRitualState {
  status: BuddhistRitualStatus;
  action: BuddhistRitualAction;
  stepIndex: number;
}

export type BuddhistRitualEvent =
  | { type: 'SELECT'; action: BuddhistRitualAction }
  | { type: 'START' }
  | { type: 'ADVANCE' }
  | { type: 'COMPLETE' }
  | { type: 'STOP' }
  | { type: 'RESET' };

const READY: BuddhistRitualStep = { pose: 'ready', label: '正身 · 调息', duration: 400 };
const PALMS: BuddhistRitualStep = { pose: 'palms', label: '合掌 · 收心', duration: 520 };
const RETURN: BuddhistRitualStep = { pose: 'return', label: '回礼 · 复位', duration: 800 };

const oneBow = (index: number): BuddhistRitualStep[] => [
  { pose: 'bow', label: `${index}礼 · 低首`, duration: 450 },
  { pose: 'kneel', label: `${index}礼 · 徐徐跪下`, duration: 450 },
  { pose: 'prostrate', label: `${index}礼 · 安住`, duration: 700, mark: 'chime' },
  { pose: 'kneel', label: `${index}礼 · 起身`, duration: 350 },
  { pose: 'rise', label: `${index}礼 · 徐徐起身`, duration: 450 },
  { pose: 'palms', label: `${index}礼 · 合掌`, duration: 400, mark: 'ripple' },
];

const SEQUENCES: Record<BuddhistRitualAction, readonly BuddhistRitualStep[]> = {
  complete: [READY, PALMS, ...oneBow(1), ...oneBow(2), ...oneBow(3), RETURN],
  palms: [READY, { ...PALMS, duration: 1_250, mark: 'chime' }, RETURN],
  bow: [READY, PALMS, { pose: 'bow', label: '低首 · 致敬', duration: 1_150, mark: 'chime' }, PALMS, RETURN],
  kneel: [
    READY,
    PALMS,
    { pose: 'bow', label: '低首 · 致敬', duration: 450 },
    { pose: 'kneel', label: '徐徐跪下', duration: 500 },
    { pose: 'prostrate', label: '跪拜 · 安住', duration: 1_150, mark: 'chime' },
    { pose: 'kneel', label: '缓缓起身', duration: 420 },
    { pose: 'rise', label: '起身 · 调息', duration: 520 },
    RETURN,
  ],
  return: [READY, PALMS, { ...RETURN, duration: 1_200, mark: 'chime' }],
};

export function createBuddhistRitualState(
  action: BuddhistRitualAction = 'complete',
): BuddhistRitualState {
  return { status: 'idle', action, stepIndex: -1 };
}

export function transitionBuddhistRitual(
  state: BuddhistRitualState,
  event: BuddhistRitualEvent,
): BuddhistRitualState {
  switch (event.type) {
    case 'SELECT':
      return state.status === 'running'
        ? state
        : { status: 'idle', action: event.action, stepIndex: -1 };
    case 'START':
      return state.status === 'running'
        ? state
        : { ...state, status: 'running', stepIndex: 0 };
    case 'ADVANCE':
      return state.status === 'running'
        ? { ...state, stepIndex: state.stepIndex + 1 }
        : state;
    case 'COMPLETE':
      return { ...state, status: 'completed' };
    case 'STOP':
    case 'RESET':
      return { ...state, status: 'idle', stepIndex: -1 };
  }
}

export function getBuddhistRitualSequence(
  action: BuddhistRitualAction,
): readonly BuddhistRitualStep[] {
  return SEQUENCES[action];
}

export function getBuddhistReducedSteps(
  action: BuddhistRitualAction,
): readonly BuddhistRitualStep[] {
  if (action === 'complete') {
    return [1, 2, 3].map((index) => ({
      pose: 'prostrate' as const,
      label: `${index}礼 · 静态示意`,
      duration: 0,
      mark: 'chime' as const,
    }));
  }

  const sequence = SEQUENCES[action];
  const target = sequence.find((step) => step.mark === 'chime') ?? sequence.at(-1) ?? READY;
  return [{ ...target, duration: 0 }];
}

export type TaoistRitualAction = 'complete' | 'hands' | 'bow' | 'respect' | 'return';
export type TaoistRitualPose = 'ready' | 'hands' | 'bow' | 'respect' | 'return';

export interface TaoistRitualStep {
  pose: TaoistRitualPose;
  label: string;
  duration: number;
  mark?: 'chime' | 'ripple';
}

export interface TaoistRitualState {
  status: BuddhistRitualStatus;
  action: TaoistRitualAction;
  stepIndex: number;
}

export type TaoistRitualEvent =
  | { type: 'SELECT'; action: TaoistRitualAction }
  | { type: 'START' }
  | { type: 'ADVANCE' }
  | { type: 'COMPLETE' }
  | { type: 'STOP' }
  | { type: 'RESET' };

const TAOIST_READY: TaoistRitualStep = { pose: 'ready', label: '正身 · 调息', duration: 450 };
const TAOIST_HANDS: TaoistRitualStep = { pose: 'hands', label: '拱手 · 收心', duration: 700 };
const TAOIST_RETURN: TaoistRitualStep = { pose: 'return', label: '回礼 · 复位', duration: 850 };

const TAOIST_SEQUENCES: Record<TaoistRitualAction, readonly TaoistRitualStep[]> = {
  complete: [
    TAOIST_READY,
    TAOIST_HANDS,
    { pose: 'bow', label: '躬身 · 致敬', duration: 720, mark: 'ripple' },
    { pose: 'respect', label: '礼敬 · 安住', duration: 1_150, mark: 'chime' },
    { pose: 'bow', label: '缓缓起身', duration: 520 },
    { ...TAOIST_HANDS, label: '拱手 · 回敬', duration: 650, mark: 'ripple' },
    TAOIST_RETURN,
  ],
  hands: [TAOIST_READY, { ...TAOIST_HANDS, duration: 1_250, mark: 'chime' }, TAOIST_RETURN],
  bow: [TAOIST_READY, TAOIST_HANDS, { pose: 'bow', label: '躬身 · 致敬', duration: 1_150, mark: 'chime' }, TAOIST_HANDS, TAOIST_RETURN],
  respect: [
    TAOIST_READY,
    TAOIST_HANDS,
    { pose: 'bow', label: '躬身 · 徐缓', duration: 520 },
    { pose: 'respect', label: '礼敬 · 安住', duration: 1_250, mark: 'chime' },
    { pose: 'bow', label: '缓缓起身', duration: 520 },
    TAOIST_HANDS,
    TAOIST_RETURN,
  ],
  return: [TAOIST_READY, TAOIST_HANDS, { ...TAOIST_RETURN, duration: 1_150, mark: 'chime' }],
};

export function createTaoistRitualState(action: TaoistRitualAction = 'complete'): TaoistRitualState {
  return { status: 'idle', action, stepIndex: -1 };
}

export function transitionTaoistRitual(
  state: TaoistRitualState,
  event: TaoistRitualEvent,
): TaoistRitualState {
  switch (event.type) {
    case 'SELECT':
      return state.status === 'running' ? state : { status: 'idle', action: event.action, stepIndex: -1 };
    case 'START':
      return state.status === 'running' ? state : { ...state, status: 'running', stepIndex: 0 };
    case 'ADVANCE':
      return state.status === 'running' ? { ...state, stepIndex: state.stepIndex + 1 } : state;
    case 'COMPLETE':
      return { ...state, status: 'completed' };
    case 'STOP':
    case 'RESET':
      return { ...state, status: 'idle', stepIndex: -1 };
  }
}

export function getTaoistRitualSequence(action: TaoistRitualAction): readonly TaoistRitualStep[] {
  return TAOIST_SEQUENCES[action];
}

export function getTaoistReducedSteps(action: TaoistRitualAction): readonly TaoistRitualStep[] {
  if (action === 'complete') {
    return [TAOIST_HANDS, { pose: 'respect', label: '礼敬 · 静态示意', duration: 0, mark: 'chime' }, TAOIST_RETURN];
  }
  const sequence = TAOIST_SEQUENCES[action];
  const target = sequence.find((step) => step.mark === 'chime') ?? sequence.at(-1) ?? TAOIST_READY;
  return [{ ...target, duration: 0 }];
}
