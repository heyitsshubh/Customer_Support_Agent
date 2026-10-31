import { Type, Static } from '@sinclair/typebox';

export const ListCasesQuerySchema = Type.Object({
  status: Type.Optional(Type.String()),
  priority: Type.Optional(Type.String()),
  customerId: Type.Optional(Type.String()),
  assignedTo: Type.Optional(Type.String()),
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
});

export type ListCasesQueryDto = Static<typeof ListCasesQuerySchema>;

export const AssignCaseBodySchema = Type.Object({
  agentId: Type.String(),
});

export type AssignCaseBodyDto = Static<typeof AssignCaseBodySchema>;

export const UpdatePriorityBodySchema = Type.Object({
  priority: Type.Union([
    Type.Literal('low'),
    Type.Literal('medium'),
    Type.Literal('high'),
    Type.Literal('urgent'),
  ]),
});

export type UpdatePriorityBodyDto = Static<typeof UpdatePriorityBodySchema>;

export const CloseCaseBodySchema = Type.Object({
  resolutionNotes: Type.String({ minLength: 1 }),
});

export type CloseCaseBodyDto = Static<typeof CloseCaseBodySchema>;

export const AddNoteBodySchema = Type.Object({
  note: Type.String({ minLength: 1 }),
});

export type AddNoteBodyDto = Static<typeof AddNoteBodySchema>;
