import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { DailyReportQueryDto, DailyReportQuerySchema } from './analytics.schema.js';

export const analyticsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const { sql } = fastify.container.cradle;

  // GET /api/v1/analytics/overview: High-level KPI dashboard
  fastify.get(
    '/analytics/overview',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['reviewer', 'admin'])],
    },
    async (_request, reply) => {
      const [[casesStats], [refundStats], [feedbackStats]] = await Promise.all([
        sql`
          SELECT 
            COUNT(*)::int as total_cases,
            COUNT(*) FILTER (WHERE status = 'resolved')::int as resolved_cases,
            COUNT(*) FILTER (WHERE status = 'pending_approval')::int as pending_approvals,
            COUNT(*) FILTER (WHERE status = 'open')::int as open_cases
          FROM support_cases;
        `,
        sql`
          SELECT 
            COUNT(*)::int as total_refunds,
            COALESCE(SUM(amount) FILTER (WHERE status = 'executed' OR status = 'approved'), 0)::float as total_disbursed_amount
          FROM refund_requests;
        `,
        sql`
          SELECT COALESCE(AVG(score), 0)::float as average_csat FROM feedback;
        `,
      ]);

      const totalCases = casesStats.total_cases;
      const resolvedCases = casesStats.resolved_cases;
      const resolutionRate = totalCases > 0 ? (resolvedCases / totalCases) * 100 : 0;

      return reply.status(200).send({
        success: true,
        data: {
          totalCases,
          openCases: casesStats.open_cases,
          pendingApprovals: casesStats.pending_approvals,
          resolvedCases,
          resolutionRatePercent: Number(resolutionRate.toFixed(1)),
          totalRefundsDisbursed: Number(refundStats.total_disbursed_amount.toFixed(2)),
          averageCsat: Number(feedbackStats.average_csat.toFixed(2)),
        },
      });
    }
  );

  // GET /api/v1/analytics/topics: Issue category volume breakdown
  fastify.get(
    '/analytics/topics',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['reviewer', 'admin'])],
    },
    async (_request, reply) => {
      const rows = await sql`
        SELECT 
          COALESCE(intent, 'general') as intent,
          COUNT(*)::int as count
        FROM support_cases
        GROUP BY intent
        ORDER BY count DESC;
      `;

      return reply.status(200).send({
        success: true,
        data: {
          topics: rows.map((r) => ({
            intent: r.intent,
            count: r.count,
          })),
        },
      });
    }
  );

  // GET /api/v1/analytics/refunds: Refund financial metrics
  fastify.get(
    '/analytics/refunds',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['reviewer', 'admin'])],
    },
    async (_request, reply) => {
      const [stats] = await sql`
        SELECT 
          COUNT(*)::int as total_requests,
          COUNT(*) FILTER (WHERE status IN ('approved', 'executed'))::int as approved_count,
          COUNT(*) FILTER (WHERE status = 'rejected')::int as rejected_count,
          COUNT(*) FILTER (WHERE status = 'pending')::int as pending_count,
          COALESCE(SUM(amount) FILTER (WHERE status IN ('approved', 'executed')), 0)::float as approved_amount,
          COALESCE(AVG(amount), 0)::float as average_request_amount
        FROM refund_requests;
      `;

      const approvalRate = stats.total_requests > 0
        ? (stats.approved_count / stats.total_requests) * 100
        : 0;

      return reply.status(200).send({
        success: true,
        data: {
          totalRequests: stats.total_requests,
          approvedCount: stats.approved_count,
          rejectedCount: stats.rejected_count,
          pendingCount: stats.pending_count,
          approvalRatePercent: Number(approvalRate.toFixed(1)),
          approvedAmountTotal: Number(stats.approved_amount.toFixed(2)),
          averageRequestAmount: Number(stats.average_request_amount.toFixed(2)),
        },
      });
    }
  );

  // GET /api/v1/analytics/agent-performance: Workload & resolution per support user
  fastify.get(
    '/analytics/agent-performance',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    },
    async (_request, reply) => {
      const rows = await sql`
        SELECT 
          u.id as agent_id,
          u.name as agent_name,
          u.email as agent_email,
          u.role as agent_role,
          COUNT(c.id)::int as assigned_cases,
          COUNT(c.id) FILTER (WHERE c.status = 'resolved')::int as resolved_cases
        FROM users u
        LEFT JOIN support_cases c ON c.assigned_to = u.id
        WHERE u.role IN ('agent', 'reviewer', 'admin')
        GROUP BY u.id, u.name, u.email, u.role
        ORDER BY resolved_cases DESC;
      `;

      return reply.status(200).send({
        success: true,
        data: {
          agents: rows.map((r) => ({
            id: r.agent_id,
            name: r.agent_name,
            email: r.agent_email,
            role: r.agent_role,
            assignedCases: r.assigned_cases,
            resolvedCases: r.resolved_cases,
            completionRate: r.assigned_cases > 0
              ? Number(((r.resolved_cases / r.assigned_cases) * 100).toFixed(1))
              : 0,
          })),
        },
      });
    }
  );

  // GET /api/v1/reports/daily: Audit report download (JSON or CSV)
  fastify.get<{ Querystring: DailyReportQueryDto }>(
    '/reports/daily',
    {
      preHandler: [fastify.authenticate, fastify.authorize(['reviewer', 'admin'])],
      schema: { querystring: DailyReportQuerySchema },
    },
    async (request, reply) => {
      const format = request.query.format || 'json';
      const days = request.query.days || 7;

      const rows = await sql`
        SELECT c.id, c.thread_id, c.customer_id, c.status, c.priority, c.intent,
               c.created_at, c.resolved_at,
               cust.name as customer_name, cust.tier as customer_tier
        FROM support_cases c
        JOIN customers cust ON c.customer_id = cust.id
        WHERE c.created_at >= NOW() - (${days} || ' days')::interval
        ORDER BY c.created_at DESC;
      `;

      if (format === 'csv') {
        const header = 'id,thread_id,customer_name,customer_tier,status,priority,intent,created_at,resolved_at\n';
        const lines = rows.map((r) =>
          `"${r.id}","${r.thread_id}","${r.customer_name}","${r.customer_tier}","${r.status}","${r.priority}","${r.intent || ''}","${r.created_at}","${r.resolved_at || ''}"`
        ).join('\n');

        return reply
          .header('Content-Type', 'text/csv')
          .header('Content-Disposition', 'attachment; filename="daily_case_report.csv"')
          .send(header + lines);
      }

      return reply.status(200).send({
        success: true,
        data: {
          periodDays: days,
          totalRecords: rows.length,
          records: rows,
        },
      });
    }
  );
};
