import { Type, Static } from '@sinclair/typebox';

export const CreateDocBodySchema = Type.Object({
  title: Type.String({ minLength: 2, maxLength: 255 }),
  content: Type.String({ minLength: 10 }),
  category: Type.Optional(Type.String({ default: 'general' })),
  source: Type.Optional(Type.String()),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Any())),
});

export type CreateDocBodyDto = Static<typeof CreateDocBodySchema>;

export const UpdateDocBodySchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 2 })),
  content: Type.Optional(Type.String({ minLength: 10 })),
  category: Type.Optional(Type.String()),
});

export type UpdateDocBodyDto = Static<typeof UpdateDocBodySchema>;

export const SearchDocsBodySchema = Type.Object({
  query: Type.String({ minLength: 2 }),
  topK: Type.Optional(Type.Integer({ minimum: 1, maximum: 20, default: 3 })),
  category: Type.Optional(Type.String()),
});

export type SearchDocsBodyDto = Static<typeof SearchDocsBodySchema>;

export const ListDocsQuerySchema = Type.Object({
  category: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 50 })),
});

export type ListDocsQueryDto = Static<typeof ListDocsQuerySchema>;
