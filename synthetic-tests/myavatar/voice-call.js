const voiceCallSessionPromise = page.waitForResponse(
  response => response.url().includes('ai-agents.arena.im/api/v1/voice_call_supervisor_agent/session'),
  { timeout: 30000 }
);

const webSocketPromise = page.waitForResponse(
  response => response.url().includes('api.elevenlabs.io/v1/convai/conversation'),
  { timeout: 30000 }
);

await page.getByRole('button', { name: 'Call' }).waitFor({ state: 'visible', timeout: 10000 });
await page.getByRole('button', { name: 'Call' }).click();
console.log('Call button clicked');

const [voiceCallResponse, webSocketResponse] = await Promise.all([
  voiceCallSessionPromise,
  webSocketPromise
]);

const voiceCallStatus = voiceCallResponse.status();
const webSocketStatus = webSocketResponse.status();

console.log(`voice_call_supervisor_agent/session status: ${voiceCallStatus}`);
console.log(`WebSocket connection status: ${webSocketStatus}`);

if (voiceCallStatus !== 200) {
  throw new Error(`voice_call_supervisor_agent/session returned ${voiceCallStatus}, expected 200`);
}

if (webSocketStatus !== 101) {
  throw new Error(`WebSocket connection returned ${webSocketStatus}, expected 101`);
}

console.log('Voice call and WebSocket connections validated successfully');