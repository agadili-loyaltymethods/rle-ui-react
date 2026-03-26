import {
  useEntityList,
  useEntity,
  type ListQueryParams,
} from "@/shared/hooks/use-api";
import type { EntityBase } from "@/shared/types/api";

/**
 * Minimal Rule type stub. Full type created by types-engineer.
 */
interface Rule extends EntityBase {
  name: string;
  description?: string;
  program: string;
  conditions?: unknown[];
  actions?: unknown[];
  effectiveFrom?: string;
  effectiveTo?: string;
  budget?: number;
  countLimit?: number;
  status?: string;
  folder?: string;
}

/**
 * Minimal RuleFolder type stub. Full type created by types-engineer.
 */
interface RuleFolder extends EntityBase {
  name: string;
  program: string;
  parentFolder?: string;
  isPromoFolder?: boolean;
  isStreakFolder?: boolean;
  isTrash?: boolean;
}

const RULE_ENDPOINT = "Rule";
const FOLDER_ENDPOINT = "RuleFolder";

/**
 * Rules for a specific program.
 */
export function useRules(programId: string | undefined, params?: ListQueryParams) {
  const filter = programId ? JSON.stringify({ program: programId }) : undefined;

  return useEntityList<Rule>(RULE_ENDPOINT, {
    ...params,
    query: filter,
    enabled: !!programId,
  });
}

/**
 * Single rule by ID.
 */
export function useRule(id: string | undefined) {
  return useEntity<Rule>(RULE_ENDPOINT, id);
}

/**
 * Rule folders for a specific program.
 */
export function useRuleFolders(programId: string | undefined, params?: ListQueryParams) {
  const filter = programId ? JSON.stringify({ program: programId }) : undefined;

  return useEntityList<RuleFolder>(FOLDER_ENDPOINT, {
    ...params,
    query: filter,
    enabled: !!programId,
  });
}
