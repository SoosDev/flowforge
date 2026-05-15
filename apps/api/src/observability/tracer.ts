import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { Resource } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { SimpleSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base'

const exporter = process.env['OTEL_EXPORTER_OTLP_ENDPOINT']
  ? new OTLPTraceExporter()
  : new ConsoleSpanExporter()

export const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'flowforge-api',
    [ATTR_SERVICE_VERSION]: '1.0.0',
  }),
  spanProcessors: [new SimpleSpanProcessor(exporter)],
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
})

sdk.start()

process.on('SIGTERM', () => void sdk.shutdown())
