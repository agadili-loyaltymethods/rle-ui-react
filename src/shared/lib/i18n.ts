import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

const supportedLngs = ["en", "ja"] as const;

const ns = [
  "common",
  "members",
  "programs",
  "reference-data",
  "analytics",
  "settings",
] as const;

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs,
    fallbackLng: "en",
    defaultNS: "common",
    ns: [...ns],
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "rcx.language",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: true,
    },
  });

export default i18n;
export type SupportedLocale = (typeof supportedLngs)[number];
export type Namespace = (typeof ns)[number];
