import {
  NodeSDK,
  resources,
} from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { config } from '../../config.js';

/**
 * Initializes OpenTelemetry SDK with:
 * - OTLP trace exporter (HTTP/JSON)
 * - OTLP metrics exporter (30s interval)
 * - Auto-instrumentation for Fastify, HTTP, PostgreSQL
 *
 * Must be called BEFORE importing Fastify or postgres drivers.
 */
export function initTelemetry(): NodeSDK {
  const sdk = new NodeSDK({
    resource: new resources.Resource({
      [ATTR_SERVICE_NAME]: config.OTEL_SERVICE_NAME_API,
      [ATTR_SERVICE_VERSION]: '1.0.0',
      'deployment.environment': config.NODE_ENV,
    }),
    traceExporter: new OTLPTraceExporter({
      url: `${config.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${config.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`,
      }),
      exportIntervalMillis: 30_000,
    }),
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingRequestHook: (req) =>
          req.url === '/health' || req.url === '/health/ready' || req.url === '/metrics',
      }),
      new FastifyInstrumentation(),
      new PgInstrumentation(),
    ],
  });

  sdk.start();
  return sdk;
}
