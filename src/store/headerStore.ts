import { create } from 'zustand';
import { ReactNode } from 'react';

interface HeaderState {
  customRightContent: ReactNode | null;
  setCustomRightContent: (content: ReactNode | null) => void;
}

export const useHeaderStore = create<HeaderState>((set) => ({
  customRightContent: null,
  setCustomRightContent: (content) => set({ customRightContent: content }),
}));
