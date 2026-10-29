import { Type, Static } from '@sinclair/typebox';

export const OrderParamsSchema = Type.Object({
  id: Type.String(),
});

export type OrderParamsDto = Static<typeof OrderParamsSchema>;

export const CancelOrderBodySchema = Type.Object({
  reason: Type.String({ minLength: 1 }),
});

export type CancelOrderBodyDto = Static<typeof CancelOrderBodySchema>;
