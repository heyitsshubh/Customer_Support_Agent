import { Type, Static } from '@sinclair/typebox';

export const DailyReportQuerySchema = Type.Object({
  format: Type.Optional(Type.Union([Type.Literal('json'), Type.Literal('csv')], { default: 'json' })),
  days: Type.Optional(Type.Integer({ minimum: 1, maximum: 90, default: 7 })),
});

export type DailyReportQueryDto = Static<typeof DailyReportQuerySchema>;
