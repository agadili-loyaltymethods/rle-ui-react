import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface AppConfig {
  flags: {
    disableMemberUnMerge: boolean;
    disableSearchFLName: boolean;
    disableSearchPhone: boolean;
    disableSearchEmail: boolean;
    disablePointsDivider: boolean;
    mode: string;
    decimalPrecision: number;
    enableAutoExpiration: boolean;
  };
  env: {
    name: string;
    color: string;
  };
  oidcEnabled: boolean;
}

/**
 * Fetches runtime config from the server (/api/config).
 * Stale time is Infinity because config doesn't change during a session.
 */
export function useAppConfig() {
  return useQuery({
    queryKey: ["app-config"],
    queryFn: async () => {
      const res = await axios.get<AppConfig>("/api/config");
      return res.data;
    },
    staleTime: Infinity,
  });
}
