import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import type { QueryParams } from "@/shared/types/api";

/** Response metadata extracted from headers */
export interface ListMeta {
  totalCount: number;
}

/** Options for list queries */
export interface ListQueryParams extends QueryParams {
  enabled?: boolean;
}

/**
 * Generic hook factory for express-restify-mongoose list endpoints.
 *
 * GET /api/{endpoint}?query=...&sort=...&skip=...&limit=...
 * Response: T[] with x-total-count header
 */
export function useEntityList<T>(
  endpoint: string,
  params?: ListQueryParams,
  options?: Omit<UseQueryOptions<{ data: T[]; meta: ListMeta }>, "queryKey" | "queryFn">,
) {
  const { enabled, ...queryParams } = params ?? {};
  return useQuery({
    queryKey: [endpoint, "list", queryParams],
    queryFn: async () => {
      const searchParams: Record<string, string> = {};

      if (queryParams.query) searchParams.query = queryParams.query;
      if (queryParams.sort) searchParams.sort = queryParams.sort;
      if (queryParams.skip != null) searchParams.skip = String(queryParams.skip);
      if (queryParams.limit != null) searchParams.limit = String(queryParams.limit);
      if (queryParams.select) searchParams.select = queryParams.select;
      if (queryParams.populate) searchParams.populate = queryParams.populate;
      if (queryParams.distinct) searchParams.distinct = queryParams.distinct;

      const response = await apiClient.get<T[]>(endpoint, {
        params: searchParams,
      });

      const totalCount = Number(response.headers["x-total-count"] ?? response.data.length);

      return { data: response.data, meta: { totalCount } };
    },
    enabled: enabled ?? true,
    ...options,
  });
}

/**
 * Generic hook for fetching a single entity.
 *
 * GET /api/{endpoint}/{id}
 */
export function useEntity<T>(
  endpoint: string,
  id: string | undefined,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: [endpoint, "detail", id],
    queryFn: async () => {
      const response = await apiClient.get<T>(`${endpoint}/${id}`);
      return response.data;
    },
    enabled: !!id,
    ...options,
  });
}

/**
 * Generic hook for creating an entity.
 *
 * POST /api/{endpoint}
 */
export function useCreateEntity<T, TInput = Partial<T>>(
  endpoint: string,
  options?: UseMutationOptions<T, unknown, TInput>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TInput) => {
      const response = await apiClient.post<T>(endpoint, data);
      return response.data;
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

/**
 * Generic hook for updating an entity.
 *
 * PATCH /api/{endpoint}/{id}
 */
export function useUpdateEntity<T extends { _id: string }, TInput = Partial<T>>(
  endpoint: string,
  options?: UseMutationOptions<T, unknown, { id: string; data: TInput }>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TInput }) => {
      const response = await apiClient.patch<T>(`${endpoint}/${id}`, data);
      return response.data;
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

/**
 * Generic hook for deleting an entity.
 *
 * DELETE /api/{endpoint}/{id}
 */
export function useDeleteEntity(
  endpoint: string,
  options?: UseMutationOptions<void, unknown, string>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`${endpoint}/${id}`);
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}
