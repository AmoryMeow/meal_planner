import { useMutation, useQuery } from "@tanstack/react-query";

import { getProfile, login, refreshToken, register } from "./api";

export const authQueryKeys = {
  all: ["auth"] as const,
  profile: () => [...authQueryKeys.all, "profile"] as const,
};

export const useRegistrationMutation = () => useMutation({ mutationFn: register });

export const useLoginMutation = () => useMutation({ mutationFn: login });

export const useRefreshTokenMutation = () => useMutation({ mutationFn: refreshToken });

export const useProfileQuery = (accessToken: string | null) =>
  useQuery({
    queryKey: authQueryKeys.profile(),
    queryFn: () => getProfile(accessToken as string),
    enabled: Boolean(accessToken),
    retry: false,
  });
