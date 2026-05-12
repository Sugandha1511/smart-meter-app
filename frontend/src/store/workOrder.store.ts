import { create } from 'zustand';

type WorkOrderStore = {
  answers: Record<string, unknown>;
  language: 'en' | 'hi';
  setAnswer: (fieldKey: string, value: unknown) => void;
  setAnswers: (answers: Record<string, unknown>) => void;
  setLanguage: (lang: 'en' | 'hi') => void;
  reset: () => void;
};

export const useWorkOrderStore = create<WorkOrderStore>((set) => ({
  answers: {},
  language: 'en',
  setAnswer: (fieldKey, value) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [fieldKey]: value
      }
    })),
  setAnswers: (answers) => set({ answers }),
  setLanguage: (language) => set({ language }),
  reset: () => set({ answers: {} })
}));
