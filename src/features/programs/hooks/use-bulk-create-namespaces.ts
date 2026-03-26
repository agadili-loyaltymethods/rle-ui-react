import { useState, useCallback, useMemo } from "react";
import type { ActivityTemplateConfig } from "../types/activity-template-config";

/** Generate a camelCase namespace from a type value string. */
export function generateNamespace(typeValue: string): string {
  return (
    typeValue
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .replace(/^([0-9])/, "_$1")
      .replace(/_([a-zA-Z])/g, (_, c: string) => c.toUpperCase())
      .replace(/_+$/, "") || `type_${typeValue.slice(0, 8)}`
  );
}

interface UseBulkCreateNamespacesOptions {
  /** All existing templates (to detect field name collisions). */
  existingTemplates: ActivityTemplateConfig[];
  /** Standard model field names (to detect collisions with built-in fields). */
  modelFieldNames: Iterable<string>;
}

interface UseBulkCreateNamespacesReturn {
  namespaceConfirmOpen: boolean;
  setNamespaceConfirmOpen: (open: boolean) => void;
  namespaceMap: Record<string, string>;
  setNamespaceMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  openNamespaceDialog: (typeValues: string[]) => void;
  getNamespaceError: (typeValue: string, value: string) => string | null;
  hasNamespaceErrors: boolean;
}

export function useBulkCreateNamespaces({
  existingTemplates,
  modelFieldNames,
}: UseBulkCreateNamespacesOptions): UseBulkCreateNamespacesReturn {
  const [namespaceConfirmOpen, setNamespaceConfirmOpen] = useState(false);
  const [namespaceMap, setNamespaceMap] = useState<Record<string, string>>({});

  const openNamespaceDialog = useCallback((typeValues: string[]) => {
    const initial: Record<string, string> = {};
    for (const tv of typeValues) {
      initial[tv] = generateNamespace(tv);
    }
    setNamespaceMap(initial);
    setNamespaceConfirmOpen(true);
  }, []);

  const getNamespaceError = useCallback(
    (typeValue: string, value: string): string | null => {
      if (!value) return "Namespace is required";
      if (!/^[a-zA-Z_]\w*$/.test(value)) return "Must be a valid identifier (letters, numbers, underscores)";
      // Check against existing templates
      const existingFieldNames = existingTemplates.map((t) => t.fieldName.toLowerCase());
      if (existingFieldNames.includes(value.toLowerCase())) return "Already used by an existing template";
      // Check against standard fields
      for (const fn of modelFieldNames) {
        if (fn.toLowerCase() === value.toLowerCase()) return `"${value}" is a standard Activity field`;
      }
      // Check for duplicates within the current batch
      const otherValues = Object.entries(namespaceMap)
        .filter(([tv]) => tv !== typeValue)
        .map(([, ns]) => ns.toLowerCase());
      if (otherValues.includes(value.toLowerCase())) return "Duplicate namespace in this batch";
      return null;
    },
    [existingTemplates, modelFieldNames, namespaceMap],
  );

  const hasNamespaceErrors = useMemo(
    () => Object.entries(namespaceMap).some(([tv, ns]) => getNamespaceError(tv, ns) !== null),
    [namespaceMap, getNamespaceError],
  );

  return {
    namespaceConfirmOpen,
    setNamespaceConfirmOpen,
    namespaceMap,
    setNamespaceMap,
    openNamespaceDialog,
    getNamespaceError,
    hasNamespaceErrors,
  };
}
