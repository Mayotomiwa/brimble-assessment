const REQUIRED = [
  'DATABASE_URL',
  'CADDY_ADMIN_URL',
  'REGISTRY_URL',
  'DOCKER_GATEWAY_IP',
  'HEALTH_CHECK_RETRIES',
  'HEALTH_CHECK_INTERVAL',
  'SIGTERM_TIMEOUT',
  'BUILD_TIMEOUT_MINUTES',
] as const;

export function validateEnv() {
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[boot] Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

export const env = {
  databaseUrl:         process.env.DATABASE_URL!,
  caddyAdminUrl:       process.env.CADDY_ADMIN_URL!,
  registryUrl:         process.env.REGISTRY_URL!,
  dockerGatewayIp:     process.env.DOCKER_GATEWAY_IP!,
  healthCheckRetries:  parseInt(process.env.HEALTH_CHECK_RETRIES!),
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL!),
  sigtermTimeout:      parseInt(process.env.SIGTERM_TIMEOUT!),
  buildTimeoutMinutes: parseInt(process.env.BUILD_TIMEOUT_MINUTES!),
};
