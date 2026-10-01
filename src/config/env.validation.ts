import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 3000))
    .pipe(z.number().min(1).max(65535)),

  // Chaves de API: aceita API_KEY unica ou API_KEYS_JSON estruturada
  API_KEY: z.string().min(16).optional(),
  API_KEYS_JSON: z.string().optional(),
  ALLOW_QUERY_API_KEY: z
    .string()
    .optional()
    .transform((val) => val !== 'false'),

  // Origens CORS
  CORS_ORIGIN: z.string().optional().default('*'),

  // Rate limiting geral
  THROTTLE_TTL: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 60000))
    .pipe(z.number().positive()),
  THROTTLE_LIMIT: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 120))
    .pipe(z.number().positive()),

  // Rate limiting de forca bruta em autenticacao
  AUTH_FAIL_LIMIT: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().positive()),
  AUTH_FAIL_TTL_SEC: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 300))
    .pipe(z.number().positive()),

  // Swagger
  SWAGGER_ENABLED: z
    .string()
    .optional()
    .transform((val) => val !== 'false'),
  SWAGGER_USER: z.string().optional(),
  SWAGGER_PASSWORD: z.string().optional(),

  // Caminho do banco de dados e seguranca de streams
  RADIOS_DB_PATH: z.string().optional(),
  ALLOW_INSECURE_HTTP_STREAMS: z
    .string()
    .optional()
    .transform((val) => val !== 'false'),

  // Configuracao de proxy
  TRUST_PROXY: z.string().optional().default('1'),

  // Timeouts e limites
  REQUEST_TIMEOUT_MS: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 15000))
    .pipe(z.number().positive()),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(
      `Falha na validacao de variaveis de ambiente: ${errorDetails}`,
    );
  }

  // Validacao em producao: se API_KEY nao foi fornecida via env, usa a chave padrao
  const env = parsed.data;
  if (env.NODE_ENV === 'production') {
    if (!env.API_KEY && !env.API_KEYS_JSON) {
      env.API_KEY =
        'apistream_c8J6ZoimIXt89QRBM45r8Cg2zgO5QXIX6EyKJUkHDW0vqUHjjjklAeuHeiF4WXzHuG1MCibi0ZVYdV5wcyRNBDfCaFFmtI2nBII6Wcb0M43xZYePXNoAlG3AzyIvLcdfQt3JP6H0GNfc9GpRp6To9vk9340unotfvqL2fj63cze1KtVD7MxcgBaAuP2Su8wYwXZBUpKtsHXEhlumh950CqHKgnPLZYHizAjk1lI4uTob3DXMGqTe7GgnzGbTLWpA';
    } else if (env.API_KEY && env.API_KEY.length < 32) {
      throw new Error(
        'Em producao, API_KEY deve possuir no minimo 32 caracteres.',
      );
    }
  }

  return env;
}
