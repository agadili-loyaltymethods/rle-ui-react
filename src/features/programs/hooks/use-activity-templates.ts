import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import { useEnumOptions } from "@/shared/hooks/use-enums";
import { ensureRuleExtensionSchema, ensureMetaFolder } from "./use-program-meta";
import type { ActivityTemplateConfig, ActivityTemplatesMeta } from "../types/activity-template-config";

interface MetaRule {
  _id: string;
  name: string;
  ext?: { _meta?: ActivityTemplateConfig };
}

interface LegacyRule {
  _id: string;
  name: string;
  ruleFolder?: string;
  ext?: { _meta?: ActivityTemplatesMeta };
}

function metaAtQueryKey(programId: string | undefined) {
  return ["rules", "meta-at", programId] as const;
}

/**
 * Migrate legacy single-rule storage to individual rule documents.
 * Returns the migrated configs (already persisted as individual rules).
 */
async function migrateLegacyRule(
  legacyRule: LegacyRule,
  programId: string,
): Promise<MetaRule[]> {
  const configs = legacyRule.ext?._meta?.types ?? [];
  if (configs.length === 0) {
    // Empty legacy rule — just delete it
    await apiClient.delete(`rules/${legacyRule._id}`);
    return [];
  }

  await ensureRuleExtensionSchema();
  const folderId = await ensureMetaFolder(programId);

  // Create individual rules for each config
  const created: MetaRule[] = [];
  for (const config of configs) {
    const response = await apiClient.post<MetaRule>("rules", {
      name: `_meta AT:${config.id}`,
      program: programId,
      ruleFolder: folderId,
      effectiveFrom: "2000-01-01T00:00:00.000Z",
      divisions: config.divisions ?? [],
      ext: { _meta: config },
    });
    created.push(response.data);
  }

  // Delete the legacy rule
  await apiClient.delete(`rules/${legacyRule._id}`);

  return created;
}

/** All activity template configs for the current program. */
export function useActivityTemplates(programId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = metaAtQueryKey(programId);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<MetaRule[]> => {
      // Fetch individual rules and legacy rule in parallel
      const [individualRes, legacyRes] = await Promise.all([
        apiClient.get<MetaRule[]>("rules", {
          params: {
            query: JSON.stringify({
              program: programId,
              name: { $regex: "^_meta AT:" },
            }),
            limit: "200",
          },
        }),
        apiClient.get<LegacyRule[]>("rules", {
          params: {
            query: JSON.stringify({
              program: programId,
              name: "_meta Activity Templates",
            }),
            limit: "1",
          },
        }),
      ]);

      let rules = individualRes.data;
      const legacyRule = legacyRes.data[0];

      // Migrate legacy format if found
      if (legacyRule?.ext?._meta?.types) {
        const migrated = await migrateLegacyRule(legacyRule, programId!);
        rules = [...rules, ...migrated];
      } else if (legacyRule) {
        // Empty legacy rule — just clean it up
        await apiClient.delete(`rules/${legacyRule._id}`);
      }

      return rules;
    },
    enabled: !!programId,
  });

  const rules = data ?? [];

  const types = useMemo(
    () =>
      rules
        .map((r) => r.ext?._meta)
        .filter((c): c is ActivityTemplateConfig => c != null),
    [rules],
  );

  // Mapping of configId → ruleId for update/delete operations
  const configRuleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const rule of rules) {
      const config = rule.ext?._meta;
      if (config?.id) {
        map.set(config.id, rule._id);
      }
    }
    return map;
  }, [rules]);

  // No-op save for API compat (unused by pages)
  const save = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return { types, isLoading, save, rawMeta: null, configRuleMap };
}

/** Single activity template config by ID. */
export function useActivityTemplate(programId: string | undefined, configId: string | undefined) {
  const { types, isLoading, save, rawMeta } = useActivityTemplates(programId);
  const config = useMemo(
    () => types.find((t) => t.id === configId) ?? null,
    [types, configId],
  );
  return { config, isLoading, save, allTypes: types, rawMeta };
}

/** Save (create or update) a single activity template config. */
export function useSaveActivityTemplate(programId: string | undefined) {
  const { configRuleMap } = useActivityTemplates(programId);
  const queryClient = useQueryClient();
  const queryKey = metaAtQueryKey(programId);

  const saveType = useCallback(
    async (config: ActivityTemplateConfig) => {
      if (!programId) throw new Error("No program selected");

      const existingRuleId = configRuleMap.get(config.id);

      if (existingRuleId) {
        // Update existing rule
        await apiClient.patch(`rules/${existingRuleId}`, {
          divisions: config.divisions ?? [],
          ext: { _meta: config },
        });
      } else {
        // Create new rule
        await ensureRuleExtensionSchema();
        const folderId = await ensureMetaFolder(programId);
        await apiClient.post("rules", {
          name: `_meta AT:${config.id}`,
          program: programId,
          ruleFolder: folderId,
          effectiveFrom: "2000-01-01T00:00:00.000Z",
          divisions: config.divisions ?? [],
          ext: { _meta: config },
        });
      }

      await queryClient.invalidateQueries({ queryKey });
    },
    [programId, configRuleMap, queryClient, queryKey],
  );

  return saveType;
}

/** Delete an activity template config by ID. */
export function useDeleteActivityTemplate(programId: string | undefined) {
  const { configRuleMap } = useActivityTemplates(programId);
  const queryClient = useQueryClient();
  const queryKey = metaAtQueryKey(programId);

  const deleteType = useCallback(
    async (configId: string) => {
      const ruleId = configRuleMap.get(configId);
      if (!ruleId) throw new Error(`No rule found for config ${configId}`);

      await apiClient.delete(`rules/${ruleId}`);
      await queryClient.invalidateQueries({ queryKey });
    },
    [configRuleMap, queryClient, queryKey],
  );

  return deleteType;
}

/** Bulk edit activity template configs by config IDs. */
export function useBulkEditActivityTemplates(programId: string | undefined) {
  const { configRuleMap } = useActivityTemplates(programId);
  const queryClient = useQueryClient();
  const queryKey = metaAtQueryKey(programId);

  const bulkEdit = useCallback(
    async (configIds: string[], update: Record<string, unknown>) => {
      const ruleIds = configIds
        .map((id) => configRuleMap.get(id))
        .filter((id): id is string => id != null);
      if (ruleIds.length === 0) throw new Error("No matching rules found");

      // Prefix all fields with ext._meta.
      const ruleUpdate: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(update)) {
        ruleUpdate[`ext._meta.${key}`] = value;
      }

      await apiClient.patch("multiedit", {
        model: "Rule",
        ids: ruleIds,
        update: ruleUpdate,
      });

      await queryClient.invalidateQueries({ queryKey });
    },
    [configRuleMap, queryClient, queryKey],
  );

  return bulkEdit;
}

/** Bulk delete activity template configs by config IDs. */
export function useBulkDeleteActivityTemplates(programId: string | undefined) {
  const { configRuleMap } = useActivityTemplates(programId);
  const queryClient = useQueryClient();
  const queryKey = metaAtQueryKey(programId);

  const bulkDelete = useCallback(
    async (configIds: string[]) => {
      const ruleIds = configIds
        .map((id) => configRuleMap.get(id))
        .filter((id): id is string => id != null);
      if (ruleIds.length === 0) throw new Error("No matching rules found");

      await apiClient.post("multidelete", {
        model: "Rule",
        ids: ruleIds,
      });

      await queryClient.invalidateQueries({ queryKey });
    },
    [configRuleMap, queryClient, queryKey],
  );

  return bulkDelete;
}

/** Count for the hub card badge. */
export function useActivityTemplateCount(programId: string | undefined) {
  const { types, isLoading } = useActivityTemplates(programId);
  return { count: types.length, isLoading };
}

/** Reason code enum options. */
export function useReasonCodeOptions() {
  return useEnumOptions("ActivityReasonCode");
}
