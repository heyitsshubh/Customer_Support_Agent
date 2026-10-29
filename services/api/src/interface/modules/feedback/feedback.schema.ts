import { Type, Static } from '@sinclair/typebox';

export const SubmitFeedbackBodySchema = Type.Object({
  caseId: Type.String(),
  score: Type.Integer({ minimum: 1, maximum: 5 }),
  comment: Type.Optional(Type.String()),
});

export type SubmitFeedbackBodyDto = Static<typeof SubmitFeedbackBodySchema>;

export const ListFeedbackQuerySchema = Type.Object({
  score: Type.Optional(Type.Integer({ minimum: 1, maximum: 5 })),
  maxScore: Type.Optional(Type.Integer({ minimum: 1, maximum: 5 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 50 })),
});

export type ListFeedbackQueryDto = Static<typeof ListFeedbackQuerySchema>;
