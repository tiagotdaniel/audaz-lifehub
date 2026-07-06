import { create } from "zustand";

interface TimerState {
  activeTaskId: string | null;
  sessionId: string | null;
  startedAt: Date | null;
  elapsedSeconds: number;
  isPaused: boolean;
  setActive: (taskId: string, sessionId: string) => void;
  setPaused: (val: boolean) => void;
  tick: () => void;
  reset: () => void;
  resetLocal: () => void;
}

export const useTimerStore = create<TimerState>((set) => ({
  activeTaskId: null,
  sessionId: null,
  startedAt: null,
  elapsedSeconds: 0,
  isPaused: false,
  setActive: (taskId, sessionId) =>
    set({
      activeTaskId: taskId,
      sessionId,
      startedAt: new Date(),
      elapsedSeconds: 0,
      isPaused: false,
    }),
  setPaused: (val) => set({ isPaused: val }),
  tick: () =>
    set((state) => ({
      elapsedSeconds: state.isPaused ? state.elapsedSeconds : state.elapsedSeconds + 1,
    })),
  reset: () =>
    set({
      activeTaskId: null,
      sessionId: null,
      startedAt: null,
      elapsedSeconds: 0,
      isPaused: false,
    }),
  resetLocal: () =>
    set((state) => ({
      elapsedSeconds: 0,
      startedAt: new Date(),
      isPaused: false,
      activeTaskId: state.activeTaskId,
      sessionId: state.sessionId,
    })),
}));
