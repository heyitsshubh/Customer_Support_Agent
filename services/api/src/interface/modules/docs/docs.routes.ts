import { randomUUID } from 'node:crypto';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { NotFoundError } from '../../../domain/errors/DomainErrors.js';
import { KnowledgeDocument } from '../../../domain/entities/Document.js';
import {
  CreateDocBodyDto,
  CreateDocBodySchema,
  UpdateDocBodyDto,
  UpdateDocBodySchema,
  SearchDocsBodyDto,
  SearchDocsBodySchema,
  ListDocsQueryDto,
  ListDocsQuerySchema,
} from './docs.schema.js';

// Generates a normalized 1536-dim vector for embeddings in Node.js
function generateTextEmbedding(text: string): number[] {
  const dim = 1536;
  const seed = Array.from(text.toLowerCase()).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const values: number[] = [];
  let sumSq = 0;

  for (let i = 0; i < dim; i++) {
    const v = Math.sin((seed + 1) * 1000 + i);
    values.push(v);
    sumSq += v * v;
  }

  const norm = Math.sqrt(sumSq) || 1;
  return values.map((v) => Number((v / norm).toFixed(6)));
}

export const docsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const { documentRepository } = fastify.container.cradle;

  // POST /api/v1/docs: Ingest/Create a new knowledge base document
  fastify.post<{ Body: CreateDocBodyDto }>(
    '/docs',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['agent', 'reviewer', 'admin'])],
      schema: { body: CreateDocBodySchema },
    },
    async (request, reply) => {
      const docId = randomUUID();
      const embedding = generateTextEmbedding(`${request.body.title} ${request.body.content}`);

      const doc = new KnowledgeDocument(
        docId,
        request.body.title,
        request.body.content,
        request.body.category || 'general',
        embedding,
        request.body.source,
        request.body.metadata || {}
      );

      await documentRepository.save(doc);

      return reply.status(201).send({
        success: true,
        message: 'Document successfully ingested and embedded into pgvector knowledge base.',
        data: {
          id: doc.id,
          title: doc.title,
          category: doc.category,
          source: doc.source,
        },
      });
    }
  );

  // GET /api/v1/docs: List documents
  fastify.get<{ Querystring: ListDocsQueryDto }>(
    '/docs',
    {
      preHandler: [fastify.authenticate],
      schema: { querystring: ListDocsQuerySchema },
    },
    async (request, reply) => {
      const limit = request.query.limit || 50;
      const docs = await documentRepository.listAll(request.query.category, limit);

      return reply.status(200).send({
        success: true,
        data: {
          total: docs.length,
          documents: docs.map((d) => ({
            id: d.id,
            title: d.title,
            category: d.category,
            source: d.source,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          })),
        },
      });
    }
  );

  // GET /api/v1/docs/:id: Single document
  fastify.get<{ Params: { id: string } }>(
    '/docs/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const doc = await documentRepository.findById(request.params.id);
      if (!doc) {
        throw new NotFoundError('KnowledgeDocument', request.params.id);
      }

      return reply.status(200).send({
        success: true,
        data: { document: doc },
      });
    }
  );

  // PATCH /api/v1/docs/:id: Update and re-embed document
  fastify.patch<{ Params: { id: string }; Body: UpdateDocBodyDto }>(
    '/docs/:id',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
      schema: { body: UpdateDocBodySchema },
    },
    async (request, reply) => {
      const doc = await documentRepository.findById(request.params.id);
      if (!doc) {
        throw new NotFoundError('KnowledgeDocument', request.params.id);
      }

      if (request.body.title) doc.title = request.body.title;
      if (request.body.category) doc.category = request.body.category;
      if (request.body.content) {
        const newEmbedding = generateTextEmbedding(`${doc.title} ${request.body.content}`);
        doc.updateContent(request.body.content, newEmbedding);
      } else {
        doc.updatedAt = new Date();
      }

      await documentRepository.save(doc);

      return reply.status(200).send({
        success: true,
        message: 'Document updated and re-indexed in vector store.',
        data: { id: doc.id, title: doc.title, category: doc.category },
      });
    }
  );

  // DELETE /api/v1/docs/:id: Delete document
  fastify.delete<{ Params: { id: string } }>(
    '/docs/:id',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    },
    async (request, reply) => {
      await documentRepository.delete(request.params.id);

      return reply.status(200).send({
        success: true,
        message: `Document ${request.params.id} successfully removed from knowledge base.`,
      });
    }
  );

  // POST /api/v1/docs/search: Direct RAG vector similarity search test endpoint
  fastify.post<{ Body: SearchDocsBodyDto }>(
    '/docs/search',
    {
      preHandler: [fastify.authenticate],
      schema: { body: SearchDocsBodySchema },
    },
    async (request, reply) => {
      const { query, topK = 3, category } = request.body;
      const queryVector = generateTextEmbedding(query);

      const results = await documentRepository.searchByVector(queryVector, topK, category);

      return reply.status(200).send({
        success: true,
        data: {
          query,
          topK,
          resultsCount: results.length,
          results: results.map((r) => ({
            id: r.document.id,
            title: r.document.title,
            category: r.document.category,
            content: r.document.content,
            source: r.document.source,
            similarityScore: r.similarityScore,
          })),
        },
      });
    }
  );
};
