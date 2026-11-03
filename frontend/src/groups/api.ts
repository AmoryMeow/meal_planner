import type { AuthenticatedRequest } from "@package/auth";

export type GroupRole = "owner" | "member";

export type MealGroup = {
  id: number;
  name: string;
  color: string;
  role: GroupRole;
  plan_id: number;
  member_count: number;
  created_at: string;
  updated_at: string;
};

export type GroupMember = {
  id: number;
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: GroupRole;
  created_at: string;
};

export type GroupDetails = MealGroup & {
  members: GroupMember[];
};

export type GroupInviteStatus = "pending" | "accepted" | "revoked";

export type GroupInvite = {
  id: number;
  email: string;
  token: string;
  status: GroupInviteStatus;
  is_expired: boolean;
  expires_at: string;
  created_at: string;
};

export type CreateGroupInput = Pick<MealGroup, "name" | "color">;
export type CreateGroupInviteInput = Pick<GroupInvite, "email">;

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

export const createGroup = (request: AuthenticatedRequest, input: CreateGroupInput) =>
  request<MealGroup>("/groups/", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const getGroupInvites = (request: AuthenticatedRequest, groupId: number) =>
  request<GroupInvite[]>(`/groups/${groupId}/invites/`);

export const createGroupInvite = (
  request: AuthenticatedRequest,
  groupId: number,
  input: CreateGroupInviteInput
) =>
  request<GroupInvite>(`/groups/${groupId}/invites/`, {
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
