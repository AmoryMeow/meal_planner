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

export type CreateGroupInput = Pick<MealGroup, "name" | "color">;

export const getGroup = (request: AuthenticatedRequest, groupId: number) =>
  request<GroupDetails>(`/groups/${groupId}/`);

export const createGroup = (request: AuthenticatedRequest, input: CreateGroupInput) =>
  request<MealGroup>("/groups/", {
    method: "POST",
    body: JSON.stringify(input),
  });
