export function getEnv(envSource: Record<string, string | undefined> = process.env) {
  const isProd = envSource.NODE_ENV === 'production';
  const jwtSecret = envSource.JWT_SECRET || (isProd ? '' : 'local-development-jwt-secret');
  const jwtRefreshSecret = envSource.JWT_REFRESH_SECRET || (isProd ? '' : 'local-development-refresh-secret');

  if (isProd || envSource.APP_ENV === 'staging') {
    if (!jwtSecret) {
      throw new Error('FATAL: JWT_SECRET environment variable is not set in production/staging.');
    }
    if (!jwtRefreshSecret) {
      throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is not set in production/staging.');
    }
    if (jwtSecret.length < 32 || jwtRefreshSecret.length < 32) {
      throw new Error('FATAL: JWT secrets must be at least 32 characters in production/staging.');
    }
    if (!envSource.DATABASE_URL) {
      throw new Error('FATAL: DATABASE_URL environment variable is not set in production/staging.');
    }
    if (!envSource.RAZORPAY_WEBHOOK_SECRET) {
      console.warn('WARNING: RAZORPAY_WEBHOOK_SECRET environment variable is not set. Webhooks will fail verification.');
    }
  }

  // Anti-crossover checks for staging environment
  if (envSource.APP_ENV === 'staging') {
    const prodDatabaseUrl = envSource.PROD_DATABASE_URL || '';
    if (prodDatabaseUrl && envSource.DATABASE_URL === prodDatabaseUrl) {
      throw new Error('FATAL STAGING CROSSOVER: DATABASE_URL matches production database URL.');
    }
    const razorpayKey = envSource.RAZORPAY_KEY_ID || '';
    if (razorpayKey.startsWith('rzp_live_')) {
      throw new Error('FATAL STAGING CROSSOVER: RAZORPAY_KEY_ID is set to a live production key in staging.');
    }
  }

  const anyKey = envSource.GROQ_API_KEY || envSource.OPENAI_API_KEY || envSource.open_api_key || envSource.OPEN_API_KEY || '';
  let provider = envSource.LLM_PROVIDER || 'groq';
  
  if (anyKey.startsWith('sk-') || anyKey.startsWith('proj-')) {
    provider = 'openai';
  } else if (anyKey.startsWith('gsk_')) {
    provider = 'groq';
  }

  return {
    nodeEnv: envSource.NODE_ENV ?? 'development',
    host: envSource.HOST ?? '0.0.0.0',
    port: envSource.PORT ? Number(envSource.PORT) : 3000,
    databaseUrl: envSource.DATABASE_URL ?? 'postgresql://postgres:password@localhost:5432/wrectifai',
    databaseSslCa: envSource.DATABASE_SSL_CA || envSource.PGSSLROOTCERT,
    jwtSecret,
    jwtRefreshSecret,
    razorpayWebhookSecret: envSource.RAZORPAY_WEBHOOK_SECRET ?? '',
    adminTemporaryPassword: envSource.ADMIN_TEMPORARY_PASSWORD ?? envSource.ADMIN_BOOTSTRAP_PASSWORD,
    trustProxy: envSource.TRUST_PROXY !== undefined ? (isNaN(Number(envSource.TRUST_PROXY)) ? envSource.TRUST_PROXY : Number(envSource.TRUST_PROXY)) : 1,
    corsOrigins: envSource.WEB_ORIGINS ? envSource.WEB_ORIGINS.split(',') : (isProd ? [] : ['http://localhost:4200', 'http://localhost:3001']),
    googleClientId: envSource.GOOGLE_CLIENT_ID || '',
    firebaseWebApiKey: envSource.FIREBASE_WEB_API_KEY || '',
    demoAuthEnabled: envSource.DEMO_AUTH_ENABLED === 'true',
    demoOtp: envSource.DEMO_OTP || '123456',
    // The garage-registration OTP provider is intentionally a fixed testing
    // mechanism for non-production environments until SMS delivery is wired.
    // Set GARAGE_REGISTRATION_TEMP_OTP_ENABLED=false to disable it locally.
    // Set GARAGE_REGISTRATION_TEMP_OTP_ENABLED=false to disable it on a deployed server.
    garageRegistrationTempOtpEnabled: envSource.GARAGE_REGISTRATION_TEMP_OTP_ENABLED !== 'false',
    llmProvider: provider,
    llmModel: (envSource.LLM_MODEL?.trim() === 'llama-3.1-70b-versatile' || envSource.LLM_MODEL?.trim() === 'llama-3.3-70b-versatile') ? 'llama3-70b-8192' : (envSource.LLM_MODEL?.trim() || 'llama3-70b-8192'),
    groqApiKey: anyKey,
    openaiApiKey: anyKey,
    imageLlmProvider: envSource.IMAGE_LLM_PROVIDER ?? provider,
    // Groq's Qwen 3.6 model may be unavailable to the deployed project.
    // Use the currently supported multimodal Qwen model when an old value is
    // still present in the deployment environment.
    imageLlmModel: ['qwen/qwen3.6-27b', 'qwen/qwen3.6-27b-preview'].includes(envSource.IMAGE_LLM_MODEL?.trim() || '')
      ? 'qwen/qwen3.8-27b'
      : (envSource.IMAGE_LLM_MODEL?.trim() || 'qwen/qwen3.8-27b'),
    audioProvider: envSource.AUDIO_PROVIDER ?? provider,
    audioModel: envSource.AUDIO_MODEL ?? 'whisper-large-v3-turbo',
  };
}
