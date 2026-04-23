import { create } from 'zustand';

type WorkOrderStore = {
  answers: Record<string, unknown>;
  setAnswer: (fieldKey: string, value: unknown) => void;
  setAnswers: (answers: Record<string, unknown>) => void;
  reset: () => void;
};

export const useWorkOrderStore = create<WorkOrderStore>((set) => ({
  answers: {},
  setAnswer: (fieldKey, value) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [fieldKey]: value
      }
    })),
  setAnswers: (answers) => set({ answers }),
  reset: () => set({ answers: {} })
}));
