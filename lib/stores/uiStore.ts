import { create } from 'zustand';

interface UIStore {
  snackbar: {
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  };
  showSnackbar: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideSnackbar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  snackbar: {
    visible: false,
    message: '',
    type: 'info',
  },
  showSnackbar: (message, type = 'info') =>
    set({ snackbar: { visible: true, message, type } }),
  hideSnackbar: () =>
    set((state) => ({
      snackbar: { ...state.snackbar, visible: false },
    })),
}));
