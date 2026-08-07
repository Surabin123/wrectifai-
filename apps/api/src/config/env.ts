let warnLogged = false;

export function getEnv(envSource: Record<string, string | undefined> = process.env) {
  const isProd = envSource.NODE_ENV === 'production';
  const jwtSecret = envSource.JWT_SECRET;
  const jwtRefreshSecret = envSource.JWT_REFRESH_SECRET;

  if (isProd) {
    if (!jwtSecret) {
      throw new Error('FATAL: JWT_SECRET environment variable is not set in production.');
    }
    if (!jwtRefreshSecret) {
      throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is not set in production.');
    }
  } else if (!warnLogged) {
    if (!jwtSecret || !jwtRefreshSecret) {
      if (!jwtSecret) {
        console.warn('WARNING: JWT_SECRET is not set. Falling back to default weak key. Do not use this in production.');
      }
      if (!jwtRefreshSecret) {
        console.warn('WARNING: JWT_REFRESH_SECRET is not set. Falling back to default weak key. Do not use this in production.');
      }
      warnLogged = true;
    }
  }

  return {
    host: envSource.HOST ?? '0.0.0.0',
    port: envSource.PORT ? Number(envSource.PORT) : 3000,
    databaseUrl: envSource.DATABASE_URL ?? 'postgresql://postgres:password@localhost:5432/wrectifai',
    jwtSecret: jwtSecret ?? 'super-secret-jwt-key',
    jwtRefreshSecret: jwtRefreshSecret ?? 'super-secret-refresh-key',
    corsOrigins: envSource.WEB_ORIGINS ? envSource.WEB_ORIGINS.split(',') : ['http://localhost:4200', 'http://localhost:3001'],
    googleClientId: envSource.GOOGLE_CLIENT_ID,
    llmProvider: envSource.LLM_PROVIDER ?? 'groq',
    llmModel: envSource.LLM_MODEL ?? 'llama-3.1-70b-versatile',
    groqApiKey: envSource.GROQ_API_KEY ?? envSource.OPENAI_API_KEY,
    openaiApiKey: envSource.OPENAI_API_KEY ?? envSource.GROQ_API_KEY,
    imageLlmProvider: envSource.IMAGE_LLM_PROVIDER ?? 'groq',
    imageLlmModel: envSource.IMAGE_LLM_MODEL ?? 'meta-llama/llama-4-scout-17b-16e-instruct',
    audioProvider: envSource.AUDIO_PROVIDER ?? 'groq',
    audioModel: envSource.AUDIO_MODEL ?? 'whisper-large-v3-turbo',
  };
}
