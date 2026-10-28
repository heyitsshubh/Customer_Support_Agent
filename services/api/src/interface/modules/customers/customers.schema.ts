import { Type, Static } from '@sinclair/typebox';

export const CustomerParamsSchema = Type.Object({
  id: Type.String(),
});

export type CustomerParamsDto = Static<typeof CustomerParamsSchema>;

export const CustomerOrdersQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50, default: 10 })),
});

export type CustomerOrdersQueryDto = Static<typeof CustomerOrdersQuerySchema>;
