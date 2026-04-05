import { createContext, useContext, useEffect, useState } from "react";
import type { Language, Translations } from "../i18n/translations";
import { LANGUAGES, translations } from "../i18n/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: translations.en,
  isRtl: false,
});

const STORAGE_KEY = "whofeelanearthquake-lang";

function detectBrowserLanguage(): Language {
  const nav = navigator.language || "en";
  const code = nav.split("-")[0].toLowerCase() as Language;
  const supported = LANGUAGES.map((l) => l.code);
  return supported.includes(code) ? code : "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (stored && translations[stored]) return stored;
    } catch {}
    return detectBrowserLanguage();
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  };

  const meta = LANGUAGES.find((l) => l.code === language);
  const isRtl = meta?.rtl ?? false;

  // Apply dir attribute to html for RTL support
  useEffect(() => {
    document.documentElement.setAttribute("dir", isRtl ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", language);
  }, [language, isRtl]);

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t: translations[language], isRtl }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
