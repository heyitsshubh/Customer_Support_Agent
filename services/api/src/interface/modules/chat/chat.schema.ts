import { Type, Static } from '@sinclair/typebox';

export const StartChatBodySchema = Type.Object({
  customerId: Type.String(),
  message: Type.String({ minLength: 1 }),
  orderNumber: Type.Optional(Type.String()),
});

export type StartChatBodyDto = Static<typeof StartChatBodySchema>;

export const SendMessageBodySchema = Type.Object({
  message: Type.String({ minLength: 1 }),
});

export type SendMessageBodyDto = Static<typeof SendMessageBodySchema>;

export const ApproveCaseBodySchema = Type.Object({
  approved: Type.Boolean(),
  notes: Type.Optional(Type.String()),
});

export type ApproveCaseBodyDto = Static<typeof ApproveCaseBodySchema>;

export const ChatResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    caseId: Type.String(),
    threadId: Type.String(),
    status: Type.String(),
    response: Type.Optional(Type.String()),
    pendingAction: Type.Optional(
      Type.Object({
        type: Type.String(),
        amount: Type.Optional(Type.Number()),
        description: Type.Optional(Type.String()),
        reason: Type.Optional(Type.String()),
        order_number: Type.Optional(Type.String()),
      })
    ),
  }),
});
