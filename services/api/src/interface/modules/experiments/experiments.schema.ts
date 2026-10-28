import { Type, Static } from '@sinclair/typebox';

export const RunExperimentBodySchema = Type.Object({
  model: Type.Optional(Type.String({ default: 'gpt-4o-mini' })),
  datasetVersion: Type.Optional(Type.String({ default: 'v1-golden' })),
});

export type RunExperimentBodyDto = Static<typeof RunExperimentBodySchema>;
