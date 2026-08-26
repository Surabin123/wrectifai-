console.log("=== AGENT PROCESS ENVIRONMENT KEY CHECK ===");
for (const key of Object.keys(process.env)) {
  if (key.includes('RENDER') || key.includes('DEPLOY') || key.includes('VERCEL') || key.includes('GH') || key.includes('GITHUB') || key.includes('API')) {
    console.log(`${key}: PRESENT (${process.env[key] ? 'not-empty' : 'empty'})`);
  }
}
