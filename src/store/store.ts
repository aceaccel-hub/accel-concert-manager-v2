import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings } from '../types';

type MenuPage = 'dashboard' | 'concerts' | 'repertoire' | 'members' | 'groups' | 'rehearsals' | 'budget' | 'documents' | 'settings';

interface AppStore {
  selectedConcertId: string | null;
  currentPage: MenuPage;
  currentTab: string;
  settings: Settings;

  setSelectedConcertId: (id: string | null) => void;
  setCurrentPage: (page: MenuPage) => void;
  setCurrentTab: (tab: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  baseYear: new Date().getFullYear(),
  dataPath: '',
  outputFormat: 'pdf',
  language: 'ko',
  autoSaveInterval: 5,
  backupCycle: 7,
  maskResidentNumber: true,
  maskBankAccount: true,
};

export const useStore = create<AppStore>()(
  persist(
    (set) => ({
      selectedConcertId: null,
      currentPage: 'dashboard',
      currentTab: '기본정보',
      settings: defaultSettings,

      setSelectedConcertId: (id) => set({ selectedConcertId: id }),
      setCurrentPage: (page) => set({ currentPage: page }),
      setCurrentTab: (tab) => set({ currentTab: tab }),
      updateSettings: (s) => set((state) => ({ settings: { ...state.settings, ...s } })),
    }),
    { name: 'accel-concert-store', partialize: (s) => ({ selectedConcertId: s.selectedConcertId, settings: s.settings }) }
  )
);
