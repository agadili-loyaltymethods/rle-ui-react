import { useTranslation } from "react-i18next";
import { useCallback, useMemo } from "react";

const rtlLocales = new Set(["ar", "he", "fa", "ur"]);

export function useLocale() {
  const { i18n } = useTranslation();

  const currentLocale = i18n.language;

  const changeLocale = useCallback(
    (locale: string) => {
      i18n.changeLanguage(locale);
    },
    [i18n],
  );

  const isRTL = useMemo(() => rtlLocales.has(currentLocale), [currentLocale]);
  const dir = isRTL ? ("rtl" as const) : ("ltr" as const);

  return { currentLocale, changeLocale, isRTL, dir };
}
