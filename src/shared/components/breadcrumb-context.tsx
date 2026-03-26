import * as React from "react";

interface BreadcrumbOverrides {
  [segment: string]: string;
}

const BreadcrumbContext = React.createContext<{
  overrides: BreadcrumbOverrides;
  setOverride: (segment: string, label: string) => void;
  removeOverride: (segment: string) => void;
}>({
  overrides: {},
  setOverride: () => {},
  removeOverride: () => {},
});

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = React.useState<BreadcrumbOverrides>({});

  const setOverride = React.useCallback((segment: string, label: string) => {
    setOverrides((prev) => ({ ...prev, [segment]: label }));
  }, []);

  const removeOverride = React.useCallback((segment: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[segment];
      return next;
    });
  }, []);

  const value = React.useMemo(
    () => ({ overrides, setOverride, removeOverride }),
    [overrides, setOverride, removeOverride],
  );

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

/**
 * Register a display name for a URL segment (e.g. mapping an ObjectId to "Gold Points").
 * Automatically cleans up on unmount.
 */
export function useBreadcrumbOverride(segment: string | undefined, label: string | undefined) {
  const { setOverride, removeOverride } = React.useContext(BreadcrumbContext);

  React.useEffect(() => {
    if (segment && label) {
      setOverride(segment, label);
      return () => removeOverride(segment);
    }
  }, [segment, label, setOverride, removeOverride]);
}

/**
 * Read all breadcrumb overrides. Used by the Breadcrumbs component.
 */
export function useBreadcrumbOverrides() {
  return React.useContext(BreadcrumbContext).overrides;
}
