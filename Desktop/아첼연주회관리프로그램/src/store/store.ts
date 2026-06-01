/**
 * 아첼 연주회 관리 프로그램 - Zustand 글로벌 스토어
 *
 * selectedConcertId 는 새로고침 후에도 같은 콘서트가 선택돼야 하므로 persist.
 * Settings 도 persist 한다. currentPage / currentTab 은 휘발성으로 둔다.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings } from '../types';

export type MenuPage =
  | 'dashboard'
  | 'concerts'
  | 'repertoire'
  | 'members'
  | 'groups'
  | 'rehearsals'
  | 'budget'
  | 'documents'
  | 'settings';

interface AppStore {
  selectedConcertId: string | null;
  currentPage: MenuPage;
  currentTab: string;
  settings: Settings;

  setSelectedConcertId: (id: string | null) => void;
  setCurrentPage: (page: MenuPage) => void;
  setCurrentTab: (tab: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  baseYear: new Date().getFullYear(),
  dataPath: '',
  outputFormat: 'pdf',
  language: 'ko',
  autoSaveInterval: 5,
  backupCycle: 7,
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
      updateSettings: (s) =>
        set((state) => ({ settings: { ...state.settings, ...s } })),
      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: 'accel-concert-store',
      // selectedConcertId 와 settings 만 영속화 - 페이지/탭 상태는 휘발성
      partialize: (s) => ({
        selectedConcertId: s.selectedConcertId,
        settings: s.settings,
      }),
    }
  )
);
