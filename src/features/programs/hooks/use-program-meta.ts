import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";

/**
 * Module-level caches to avoid repeated setup queries within a session.
 */
const extensionSchemaChecked = new Set<string>();
const metaFolderCache = new Map<string, string>(); // programId → folderId

/** Ensure a Rule ExtensionSchema exists so `ext._meta` can be written. */
export async function ensureRuleExtensionSchema(): Promise<void> {
  if (extensionSchemaChecked.has("Rule")) return;

  const response = await apiClient.get<Array<{ _id: string }>>(
    "extensionschemas",
    {
      params: {
        query: JSON.stringify({ model: "Rule" }),
        limit: "1",
      },
    },
  );

  if (response.data.length === 0) {
    await apiClient.post("extensionschemas", {
      model: "Rule",
      extSchema: JSON.stringify({
        type: "object",
        properties: { _meta: { type: "object" } },
        additionalProperties: true,
      }),
    });
  }

  extensionSchemaChecked.add("Rule");
}

/** Find or create the `_meta` RuleFolder for a program. */
export async function ensureMetaFolder(programId: string): Promise<string> {
  const cached = metaFolderCache.get(programId);
  if (cached) return cached;

  const response = await apiClient.get<Array<{ _id: string }>>(
    "rulefolders",
    {
      params: {
        query: JSON.stringify({ program: programId, name: "_meta" }),
        limit: "1",
      },
    },
  );

  let folderId: string;
  if (response.data.length > 0) {
    folderId = response.data[0]!._id;
  } else {
    const created = await apiClient.post<{ _id: string }>("rulefolders", {
      name: "_meta",
      desc: "RCX UX Metadata",
      program: programId,
    });
    folderId = created.data._id;
  }

  metaFolderCache.set(programId, folderId);
  return folderId;
}

/**
 * Generic hook for reading/writing _meta data stored as Rules.
 *
 * Uses the _meta storage pattern: a Rule named `_meta <subject>` per program,
 * with metadata stored in `rule.ext._meta`. Rules are placed in a `_meta`
 * RuleFolder to keep them out of the program flow.
 *
 * @see memory/meta-storage-pattern.md
 */
export function useProgramMeta<T>(
  programId: string | undefined,
  subject: string,
) {
  const queryClient = useQueryClient();
  const queryKey = ["rules", "meta", programId, subject];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await apiClient.get<
        Array<{ _id: string; ext?: { _meta?: T } }>
      >("rules", {
        params: {
          query: JSON.stringify({
            program: programId,
            name: `_meta ${subject}`,
          }),
          limit: "1",
        },
      });

      const rule = response.data[0];
      if (!rule) return { ruleId: null, meta: null };
      return { ruleId: rule._id, meta: rule.ext?._meta ?? null };
    },
    enabled: !!programId,
  });

  const ruleId = data?.ruleId ?? null;
  const meta = data?.meta ?? null;

  async function save(payload: T) {
    await ensureRuleExtensionSchema();

    if (ruleId) {
      await apiClient.patch(`rules/${ruleId}`, {
        ext: { _meta: payload },
      });
    } else {
      if (!programId) throw new Error("No program");
      const folderId = await ensureMetaFolder(programId);
      await apiClient.post("rules", {
        name: `_meta ${subject}`,
        program: programId,
        ruleFolder: folderId,
        effectiveFrom: "2000-01-01T00:00:00.000Z",
        ext: { _meta: payload },
      });
    }

    await queryClient.invalidateQueries({ queryKey });
  }

  return { data: meta, isLoading, save };
}
