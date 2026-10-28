import { Type, Static } from '@sinclair/typebox';

export const ListRefundsQuerySchema = Type.Object({
  status: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
});

export type ListRefundsQueryDto = Static<typeof ListRefundsQuerySchema>;

export const CreateRefundBodySchema = Type.Object({
  caseId: Type.String(),
  transactionId: Type.String(),
  amount: Type.Number({ minimum: 0.01 }),
  reason: Type.String({ minLength: 1 }),
  notes: Type.Optional(Type.String()),
});

export type CreateRefundBodyDto = Static<typeof CreateRefundBodySchema>;

export const UpdateRefundStatusBodySchema = Type.Object({
  status: Type.Union([
    Type.Literal('approved'),
    Type.Literal('rejected'),
    Type.Literal('executed'),
  ]),
  notes: Type.Optional(Type.String()),
});

export type UpdateRefundStatusBodyDto = Static<typeof UpdateRefundStatusBodySchema>;
