import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@package/api";
import { useAuthSession } from "@package/auth";
import { planQueryKeys } from "@package/plan";

import {
  acceptGroupInvite,
  createGroup,
  createGroupInvite,
  getGroup,
  getGroupInvites,
  removeGroupMember,
  revokeGroupInvite,
  type CreateGroupInput,
  type CreateGroupInviteInput,
  type GroupInvite,
  type GroupDetails,
} from "./api";

export const groupQueryKeys = {
  all: ["groups"] as const,
  byUser: (userId: number | null) => [...groupQueryKeys.all, userId] as const,
  detail: (userId: number | null, groupId: number) =>
    [...groupQueryKeys.byUser(userId), "detail", groupId] as const,
};

export const useGroupQuery = (groupId: number) => {
  const { request, user } = useAuthSession();

  return useQuery({
    queryKey: groupQueryKeys.detail(user?.id ?? null, groupId),
    queryFn: () => getGroup(request, groupId),
    enabled: Boolean(user && groupId),
  });
};

export const useRemoveGroupMemberMutation = (groupId: number) => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const queryKey = groupQueryKeys.detail(user?.id ?? null, groupId);

  const mutation = useMutation({
    mutationFn: (membershipId: number) =>
      removeGroupMember(request, groupId, membershipId),
    onSuccess: (_response, membershipId) => {
      queryClient.setQueryData<GroupDetails>(
        queryKey,
        (current: GroupDetails | undefined) =>
          current
            ? {
                ...current,
                member_count: Math.max(0, current.member_count - 1),
                members: current.members.filter(member => member.id !== membershipId),
              }
            : current
      );
    },
  });

  return {
    ...mutation,
    submitError: getSubmitError(mutation.error, {}),
  };
};

export const useCreateGroupMutation = () => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: (input: CreateGroupInput) => createGroup(request, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: planQueryKeys.list(userId) }),
  });
  const apiFieldErrors = getGroupApiFieldErrors(mutation.error);

  return {
    ...mutation,
    apiFieldErrors,
    submitError: getSubmitError(mutation.error, apiFieldErrors),
  };
};

export const groupInviteQueryKeys = {
  all: ["group-invites"] as const,
  byUser: (userId: number | null) => [...groupInviteQueryKeys.all, userId] as const,
  byGroup: (userId: number | null, groupId: number) =>
    [...groupInviteQueryKeys.byUser(userId), "group", groupId] as const,
};

export const useGroupInvitesQuery = (groupId: number) => {
  const { request, user } = useAuthSession();

  return useQuery({
    queryKey: groupInviteQueryKeys.byGroup(user?.id ?? null, groupId),
    queryFn: () => getGroupInvites(request, groupId),
    enabled: Boolean(user && groupId),
  });
};

export const useCreateGroupInviteMutation = (groupId: number) => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const queryKey = groupInviteQueryKeys.byGroup(user?.id ?? null, groupId);

  const mutation = useMutation({
    mutationFn: (input: CreateGroupInviteInput) =>
      createGroupInvite(request, groupId, input),
    onSuccess: invite => {
      queryClient.setQueryData<GroupInvite[]>(
        queryKey,
        (current: GroupInvite[] | undefined) => [invite, ...(current ?? [])]
      );
    },
  });
  const apiFieldErrors = getInviteApiFieldErrors(mutation.error);

  return {
    ...mutation,
    apiFieldErrors,
    submitError: getSubmitError(mutation.error, apiFieldErrors),
  };
};

export const useRevokeGroupInviteMutation = (groupId: number) => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const queryKey = groupInviteQueryKeys.byGroup(user?.id ?? null, groupId);

  const mutation = useMutation({
    mutationFn: (inviteId: number) => revokeGroupInvite(request, groupId, inviteId),
    onSuccess: (_response, inviteId) => {
      queryClient.setQueryData<GroupInvite[]>(
        queryKey,
        (current: GroupInvite[] | undefined) =>
          current?.filter(invite => invite.id !== inviteId)
      );
    },
  });

  return {
    ...mutation,
    submitError: getSubmitError(mutation.error, {}),
  };
};

export const useAcceptGroupInviteMutation = (token: string) => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: () => acceptGroupInvite(request, token),
    onSuccess: group => {
      void queryClient.invalidateQueries({ queryKey: planQueryKeys.list(userId) });
      void queryClient.invalidateQueries({
        queryKey: groupQueryKeys.detail(userId, group.id),
      });
    },
  });

  return {
    ...mutation,
    submitError: getInviteAcceptanceError(mutation.error),
  };
};

type GroupApiFieldErrors = Partial<Record<keyof CreateGroupInput, string>>;
type InviteApiFieldErrors = Partial<Record<keyof CreateGroupInviteInput, string>>;

const getGroupApiFieldErrors = (error: Error | null): GroupApiFieldErrors => {
  if (!(error instanceof ApiError)) return {};

  return {
    name: getFirstError(error.body?.name),
    color: getFirstError(error.body?.color),
  };
};

const getInviteApiFieldErrors = (error: Error | null): InviteApiFieldErrors => {
  if (!(error instanceof ApiError)) return {};

  return {
    email: getFirstError(error.body?.email),
  };
};

const getInviteAcceptanceError = (error: Error | null): string => {
  if (error instanceof ApiError && error.status === 404) {
    return "This invitation link is invalid or no longer available.";
  }
  return getSubmitError(error, {});
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
