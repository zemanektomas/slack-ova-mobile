import { create } from 'zustand';
import { setLang as persistLang, type Lang } from '../i18n';

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export const useLangStore = create<LangState>((set) => ({
  lang: 'cs',
  setLang: (lang) => {
    set({ lang });
    persistLang(lang).catch(() => {});
  },
}));
