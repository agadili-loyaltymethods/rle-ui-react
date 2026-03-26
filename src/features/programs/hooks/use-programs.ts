import {
  useEntityList,
  useEntity,
  useCreateEntity,
  useUpdateEntity,
  type ListQueryParams,
} from "@/shared/hooks/use-api";
import type { Program } from "@/shared/types/program";

const ENDPOINT = "programs";

/**
 * List all programs.
 */
export function usePrograms(params?: ListQueryParams) {
  return useEntityList<Program>(ENDPOINT, params);
}

/**
 * Single program by ID.
 */
export function useProgram(id: string | undefined) {
  return useEntity<Program>(ENDPOINT, id);
}

/**
 * Create a new program.
 */
export function useCreateProgram() {
  return useCreateEntity<Program>(ENDPOINT);
}

/**
 * Update an existing program.
 */
export function useUpdateProgram() {
  return useUpdateEntity<Program>(ENDPOINT);
}
