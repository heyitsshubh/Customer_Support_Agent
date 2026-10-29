import { Type, Static } from '@sinclair/typebox';

export const ListUsersQuerySchema = Type.Object({
  role: Type.Optional(Type.String()),
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
});

export type ListUsersQueryDto = Static<typeof ListUsersQuerySchema>;

export const UpdateUserRoleBodySchema = Type.Object({
  role: Type.Union([
    Type.Literal('customer'),
    Type.Literal('agent'),
    Type.Literal('reviewer'),
    Type.Literal('admin'),
  ]),
});

export type UpdateUserRoleBodyDto = Static<typeof UpdateUserRoleBodySchema>;
