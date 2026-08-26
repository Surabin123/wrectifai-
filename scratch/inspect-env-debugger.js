const WebSocket = require('d:/WRECTIFIAI/wrectifai/node_modules/.pnpm/isomorphic-ws@5.0.0_ws@8.18.0/node_modules/ws');

const wsUrl = 'ws://localhost:9229/c9c46a67-8d9d-4bb2-bc15-aa8641c42daf';
const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  // Send inspector command to evaluate process.env keys and selected values
  const payload = {
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const env = process.env;
        return {
          GROQ_API_KEY_PRESENT: !!env.GROQ_API_KEY,
          GROQ_API_KEY_LENGTH: env.GROQ_API_KEY ? env.GROQ_API_KEY.length : 0,
          OPENAI_API_KEY_PRESENT: !!env.OPENAI_API_KEY,
          OPENAI_API_KEY_LENGTH: env.OPENAI_API_KEY ? env.OPENAI_API_KEY.length : 0,
          LLM_PROVIDER: env.LLM_PROVIDER,
          LLM_MODEL: env.LLM_MODEL,
          NODE_ENV: env.NODE_ENV,
          PORT: env.PORT,
          DATABASE_URL_PRESENT: !!env.DATABASE_URL
        };
      })()`,
      returnByValue: true
    }
  };
  ws.send(JSON.stringify(payload));
});

ws.on('message', (data) => {
  const response = JSON.parse(data);
  if (response.id === 1) {
    console.log("=== RUNTIME ENVIRONMENT ANALYSIS (PORT 3000) ===");
    if (response.result && response.result.result && response.result.result.value) {
      console.log(JSON.stringify(response.result.result.value, null, 2));
    } else {
      console.log("Error or empty response:", JSON.stringify(response, null, 2));
    }
    ws.close();
  }
});

ws.on('error', (err) => {
  console.error("WebSocket connection error:", err);
});
