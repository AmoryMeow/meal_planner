import type { RequiredFields } from "@package/api";
import type {
  Group,
  GroupDetail,
  GroupRequest,
  Invite,
  InviteRequest,
} from "@package/api/generated/schema";
import type { AuthenticatedRequest } from "@package/auth";

export type MealGroup = RequiredFields<Group, "color" | "role">;
export type GroupDetails = RequiredFields<GroupDetail, "color" | "role">;

export type {
  GroupMember,
  GroupRequest as CreateGroupInput,
  Invite as GroupInvite,
  InviteRequest as CreateGroupInviteInput,
  RoleEnum as GroupRole,
  InviteStatusEnum as GroupInviteStatus,
} from "@package/api/generated/schema";

export const getGroups = (request: AuthenticatedRequest) =>
  request<MealGroup[]>("/groups/");

export const getGroup = (request: AuthenticatedRequest, groupId: number) =>
  request<GroupDetails>(`/groups/${groupId}/`);

export const removeGroupMember = (
  request: AuthenticatedRequest,
  groupId: number,
  membershipId: number
) =>
  request<void>(`/groups/${groupId}/members/${membershipId}/`, {
    method: "DELETE",
  });

export const createGroup = (request: AuthenticatedRequest, input: GroupRequest) =>
  request<MealGroup>("/groups/", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const getGroupInvites = (request: AuthenticatedRequest, groupId: number) =>
  request<Invite[]>(`/groups/${groupId}/invites/`);

export const createGroupInvite = (
  request: AuthenticatedRequest,
  groupId: number,
  input: InviteRequest
) =>
  request<Invite>(`/groups/${groupId}/invites/`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const revokeGroupInvite = (
  request: AuthenticatedRequest,
  groupId: number,
  inviteId: number
) =>
  request<void>(`/groups/${groupId}/invites/${inviteId}/`, {
    method: "DELETE",
  });

export const acceptGroupInvite = (request: AuthenticatedRequest, token: string) =>
  request<MealGroup>(`/invites/${token}/accept/`, {
    method: "POST",
  });
