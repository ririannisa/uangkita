import { z } from "zod";
export type Space = {
  id: string;
  name: string;
  kind: "couple" | "family";
  ownerId: string;
  role: "owner" | "member";
};
export type Member = { userId: string; name: string; email: string };
export type Invite = {
  id: string;
  spaceId: string;
  spaceName: string;
  email: string;
  expiresAt: string;
};
export type SpaceEvent = {
  id: string;
  actorName: string;
  action: string;
  detail: { name?: string; category?: string; amount?: number; email?: string };
  createdAt: string;
};
export type SpaceOverview = {
  spaces: Space[];
  invitations: Invite[];
  emailVerified: boolean;
};
export type SpaceDetails = {
  members: Member[];
  invitations: Invite[];
  events: SpaceEvent[];
};
export type SpaceUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
};
export const spaceActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("deleteSpace"),
    spaceId: z.uuid(),
    confirmation: z.string().min(1).max(80),
  }),
  z.object({
    action: z.literal("create"),
    name: z.string().trim().min(1).max(80),
    kind: z.enum(["couple", "family"]),
  }),
  z.object({
    action: z.literal("invite"),
    spaceId: z.uuid(),
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
  }),
  z.object({ action: z.literal("accept"), invitationId: z.uuid() }),
  z.object({ action: z.literal("decline"), invitationId: z.uuid() }),
  z.object({
    action: z.literal("revoke"),
    spaceId: z.uuid(),
    invitationId: z.uuid(),
  }),
  z.object({
    action: z.literal("removeMember"),
    spaceId: z.uuid(),
    userId: z.string().min(1).max(200),
  }),
]);
export type SpaceAction = z.input<typeof spaceActionSchema>;
