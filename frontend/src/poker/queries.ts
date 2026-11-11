import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { ApiError } from "@package/api";
import { useAuthSession } from "@package/auth";
import { planItemQueryKeys } from "@package/plan";

import {
  addPokerWinnerToPlan,
  cancelPokerSession,
  completePokerSession,
  createPokerSession,
  getPokerMeals,
  getPokerSession,
  getPokerSessions,
  joinPokerSession,
  revealPokerSession,
  startPokerSession,
  submitPokerVotes,
  type CompletePokerSessionInput,
  type CreatePokerSessionInput,
  type PokerMealQuery,
  type PokerSession,
  type SubmitPokerVotesInput,
} from "./api";

export const pokerQueryKeys = {
  all: ["poker-sessions"] as const,
  byUser: (userId: number | null) => [...pokerQueryKeys.all, userId] as const,
  list: (userId: number | null) => [...pokerQueryKeys.byUser(userId), "list"] as const,
  detail: (userId: number | null, sessionId: number) =>
    [...pokerQueryKeys.byUser(userId), "detail", sessionId] as const,
  meals: (
    userId: number | null,
    sessionId: number,
    { search = "", sources = [], tags = [], page = 1 }: PokerMealQuery
  ) =>
    [
      ...pokerQueryKeys.detail(userId, sessionId),
      "meals",
      search,
      sources,
      tags,
      page,
    ] as const,
};

export const usePokerSessionsQuery = () => {
  const { request, user } = useAuthSession();

  return useQuery({
    queryKey: pokerQueryKeys.list(user?.id ?? null),
    queryFn: () => getPokerSessions(request),
    enabled: Boolean(user),
    refetchInterval: 10000,
  });
};

export const usePokerSessionQuery = (sessionId: number) => {
  const { request, user } = useAuthSession();

  return useQuery({
    queryKey: pokerQueryKeys.detail(user?.id ?? null, sessionId),
    queryFn: () => getPokerSession(request, sessionId),
    enabled: Boolean(user && sessionId),
    refetchInterval: query => {
      const status = query.state.data?.status;
      return status === "waiting" || status === "voting" ? 5000 : false;
    },
  });
};

export const usePokerMealsQuery = (
  sessionId: number,
  query: PokerMealQuery = {},
  enabled = true
) => {
  const { request, user } = useAuthSession();

  return useQuery({
    queryKey: pokerQueryKeys.meals(user?.id ?? null, sessionId, query),
    queryFn: () => getPokerMeals(request, sessionId, query),
    enabled: Boolean(enabled && user && sessionId),
  });
};

export const useCreatePokerSessionMutation = () => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: (input: CreatePokerSessionInput) => createPokerSession(request, input),
    onSuccess: session => updatePokerSessionCache(queryClient, userId, session),
  });
  const apiFieldErrors = getCreateSessionFieldErrors(mutation.error);

  return {
    ...mutation,
    apiFieldErrors,
    submitError: getSubmitError(mutation.error, apiFieldErrors),
  };
};

const usePokerSessionActionMutation = (
  sessionId: number,
  action: "join" | "start" | "reveal" | "cancel"
) => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: () => {
      if (action === "join") return joinPokerSession(request, sessionId);
      if (action === "start") return startPokerSession(request, sessionId);
      if (action === "reveal") return revealPokerSession(request, sessionId);
      return cancelPokerSession(request, sessionId);
    },
    onSuccess: session => updatePokerSessionCache(queryClient, userId, session),
  });

  return withSubmitError(mutation);
};

export const useJoinPokerSessionMutation = (sessionId: number) =>
  usePokerSessionActionMutation(sessionId, "join");

export const useStartPokerSessionMutation = (sessionId: number) =>
  usePokerSessionActionMutation(sessionId, "start");

export const useRevealPokerSessionMutation = (sessionId: number) =>
  usePokerSessionActionMutation(sessionId, "reveal");

export const useCancelPokerSessionMutation = (sessionId: number) =>
  usePokerSessionActionMutation(sessionId, "cancel");

export const useSubmitPokerVotesMutation = (sessionId: number) => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: (input: SubmitPokerVotesInput) =>
      submitPokerVotes(request, sessionId, input),
    onSuccess: session => updatePokerSessionCache(queryClient, userId, session),
  });

  return withSubmitError(mutation);
};

export const useCompletePokerSessionMutation = (sessionId: number) => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: (input: CompletePokerSessionInput = {}) =>
      completePokerSession(request, sessionId, input),
    onSuccess: session => updatePokerSessionCache(queryClient, userId, session),
  });

  return withSubmitError(mutation);
};

export const useAddPokerWinnerToPlanMutation = (sessionId: number) => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: () => addPokerWinnerToPlan(request, sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: pokerQueryKeys.detail(userId, sessionId),
      });
      void queryClient.invalidateQueries({
        queryKey: pokerQueryKeys.list(userId),
      });
      return queryClient.invalidateQueries({
        queryKey: planItemQueryKeys.ranges(userId),
      });
    },
  });

  return withSubmitError(mutation);
};

const updatePokerSessionCache = (
  queryClient: QueryClient,
  userId: number | null,
  session: PokerSession
) => {
  queryClient.setQueryData(pokerQueryKeys.detail(userId, session.id), session);
  queryClient.setQueryData<PokerSession[]>(
    pokerQueryKeys.list(userId),
    (current: PokerSession[] | undefined) => {
      if (!current) return [session];
      const exists = current.some(item => item.id === session.id);
      return exists
        ? current.map(item => (item.id === session.id ? session : item))
        : [session, ...current];
    }
  );
};

const withSubmitError = <T extends { error: Error | null }>(mutation: T) => ({
  ...mutation,
  submitError: getSubmitError(mutation.error, {}),
});

type CreateSessionFieldErrors = Partial<Record<keyof CreatePokerSessionInput, string>>;

const getCreateSessionFieldErrors = (error: Error | null): CreateSessionFieldErrors => {
  if (!(error instanceof ApiError)) return {};

  return {
    group_id: getFirstError(error.body?.group_id),
    date: getFirstError(error.body?.date),
    meal_type: getFirstError(error.body?.meal_type),
  };
};

const getSubmitError = (
  error: Error | null,
  apiFieldErrors: Record<string, string | undefined>
): string => {
  if (!error || Object.values(apiFieldErrors).some(Boolean)) return "";
  if (error instanceof ApiError) return error.message;
  return "Unable to connect to the server. Please try again.";
};

const getFirstError = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
};
