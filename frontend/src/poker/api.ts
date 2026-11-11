import type {
  PaginatedPokerMealList,
  PlanItem,
  PokerCompleteRequest,
  PokerSession,
  PokerSessionCreateRequest,
  PokerVoteSubmissionRequest,
  SourceEnum,
} from "@package/api/generated/schema";
import type { AuthenticatedRequest } from "@package/auth";

export type {
  PokerCompleteRequest as CompletePokerSessionInput,
  PokerMeal,
  PokerParticipant,
  PokerResult,
  PokerSession,
  PokerSessionCreateRequest as CreatePokerSessionInput,
  PokerSessionStatusEnum as PokerSessionStatus,
  PokerVote,
  PokerVoteSubmissionRequest as SubmitPokerVotesInput,
} from "@package/api/generated/schema";

export type PokerMealQuery = {
  search?: string;
  sources?: SourceEnum[];
  tags?: string[];
  page?: number;
};

export const getPokerSessions = (request: AuthenticatedRequest) =>
  request<PokerSession[]>("/poker/sessions/");

export const getPokerSession = (request: AuthenticatedRequest, sessionId: number) =>
  request<PokerSession>(`/poker/sessions/${sessionId}/`);

export const createPokerSession = (
  request: AuthenticatedRequest,
  input: PokerSessionCreateRequest
) =>
  request<PokerSession>("/poker/sessions/", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const getPokerMeals = (
  request: AuthenticatedRequest,
  sessionId: number,
  { search, sources = [], tags = [], page }: PokerMealQuery = {}
) => {
  const query = new URLSearchParams();
  if (search?.trim()) query.set("search", search.trim());
  sources.forEach(source => query.append("source", source));
  tags.forEach(tag => query.append("tag", tag));
  if (page) query.set("page", String(page));
  const suffix = query.size ? `?${query.toString()}` : "";

  return request<PaginatedPokerMealList>(
    `/poker/sessions/${sessionId}/meals/${suffix}`
  );
};

const runPokerSessionAction = (
  request: AuthenticatedRequest,
  sessionId: number,
  action: "join" | "start" | "reveal" | "cancel"
) =>
  request<PokerSession>(`/poker/sessions/${sessionId}/${action}/`, {
    method: "POST",
  });

export const joinPokerSession = (request: AuthenticatedRequest, sessionId: number) =>
  runPokerSessionAction(request, sessionId, "join");

export const startPokerSession = (request: AuthenticatedRequest, sessionId: number) =>
  runPokerSessionAction(request, sessionId, "start");

export const revealPokerSession = (request: AuthenticatedRequest, sessionId: number) =>
  runPokerSessionAction(request, sessionId, "reveal");

export const cancelPokerSession = (request: AuthenticatedRequest, sessionId: number) =>
  runPokerSessionAction(request, sessionId, "cancel");

export const submitPokerVotes = (
  request: AuthenticatedRequest,
  sessionId: number,
  input: PokerVoteSubmissionRequest
) =>
  request<PokerSession>(`/poker/sessions/${sessionId}/vote/`, {
    method: "PUT",
    body: JSON.stringify(input),
  });

export const completePokerSession = (
  request: AuthenticatedRequest,
  sessionId: number,
  input: PokerCompleteRequest = {}
) =>
  request<PokerSession>(`/poker/sessions/${sessionId}/complete/`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const addPokerWinnerToPlan = (
  request: AuthenticatedRequest,
  sessionId: number
) =>
  request<PlanItem>(`/poker/sessions/${sessionId}/add-to-plan/`, {
    method: "POST",
  });
