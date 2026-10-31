import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { NotFoundError } from '../../../domain/errors/DomainErrors.js';
import {
  SubmitFeedbackBodyDto,
  SubmitFeedbackBodySchema,
  ListFeedbackQueryDto,
  ListFeedbackQuerySchema,
} from './feedback.schema.js';

export const feedbackRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const { caseRepository, sql } = fastify.container.cradle;

  // POST /api/v1/feedback: Submit CSAT rating for a resolved support case
  fastify.post<{ Body: SubmitFeedbackBodyDto }>(
    '/feedback',
    {
      preHandler: [fastify.authenticate],
      schema: { body: SubmitFeedbackBodySchema },
    },
    async (request, reply) => {
      const supportCase = await caseRepository.findById(request.body.caseId);
      if (!supportCase) {
        throw new NotFoundError('SupportCase', request.body.caseId);
      }

      const [feedback] = await sql`
        INSERT INTO feedback (id, case_id, score, comment, created_at)
        VALUES (uuid_generate_v4(), ${request.body.caseId}, ${request.body.score}, ${request.body.comment || null}, NOW())
        RETURNING id, case_id, score, comment, created_at;
      `;

      return reply.status(201).send({
        success: true,
        message: 'Thank you for your feedback! Your rating helps us improve.',
        data: { feedback },
      });
    }
  );

  // GET /api/v1/feedback: List feedback records with score filters
  fastify.get<{ Querystring: ListFeedbackQueryDto }>(
    '/feedback',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['reviewer', 'admin'])],
      schema: { querystring: ListFeedbackQuerySchema },
    },
    async (request, reply) => {
      const limit = request.query.limit || 50;
      const score = request.query.score;
      const maxScore = request.query.maxScore;

      const rows = await sql`
        SELECT f.id, f.case_id, f.score, f.comment, f.created_at,
               c.thread_id, c.intent, c.customer_id
        FROM feedback f
        JOIN support_cases c ON f.case_id = c.id
        WHERE (${score ? sql`f.score = ${score}` : sql`TRUE`})
          AND (${maxScore ? sql`f.score <= ${maxScore}` : sql`TRUE`})
        ORDER BY f.created_at DESC
        LIMIT ${limit};
      `;

      return reply.status(200).send({
        success: true,
        data: {
          total: rows.length,
          feedback: rows.map((r) => ({
            id: r.id,
            caseId: r.case_id,
            threadId: r.thread_id,
            intent: r.intent,
            customerId: r.customer_id,
            score: Number(r.score),
            comment: r.comment,
            createdAt: r.created_at,
          })),
        },
      });
    }
  );

  // GET /api/v1/feedback/summary: CSAT executive score summary
  fastify.get(
    '/feedback/summary',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['reviewer', 'admin'])],
    },
    async (_request, reply) => {
      const [stats] = await sql`
        SELECT 
          COUNT(*)::int as total_responses,
          COALESCE(AVG(score), 0)::float as average_score,
          COUNT(*) FILTER (WHERE score = 5)::int as five_star,
          COUNT(*) FILTER (WHERE score = 4)::int as four_star,
          COUNT(*) FILTER (WHERE score = 3)::int as three_star,
          COUNT(*) FILTER (WHERE score = 2)::int as two_star,
          COUNT(*) FILTER (WHERE score = 1)::int as one_star
        FROM feedback;
      `;

      return reply.status(200).send({
        success: true,
        data: {
          totalResponses: stats.total_responses,
          averageScore: Number(stats.average_score.toFixed(2)),
          distribution: {
            5: stats.five_star,
            4: stats.four_star,
            3: stats.three_star,
            2: stats.two_star,
            1: stats.one_star,
          },
        },
      });
    }
  );
};
