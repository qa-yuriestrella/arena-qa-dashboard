await page.getByText('All AI Avatar').waitFor({ state: 'visible', timeout: 30000 });
const lastElement = page.locator('[class*="grid grid-cols"]').last();
await lastElement.waitFor({ state: 'visible', timeout: 10000 });
await lastElement.click();
const fetchPageMetaPromise = page.waitForResponse(
  response => response.url().includes('zmkzrjuczejhbgxlupsc.supabase.co/functions/v1/fetch-page-meta'),
  { timeout: 30000 }
);

const conversationAgentPromise = page.waitForResponse(
  response => response.url().includes('ai-agents.arena.im/api/v1/stream/conversation_supervisor_agent/init'),
  { timeout: 30000 }
);

const [fetchPageMetaResponse, conversationAgentResponse] = await Promise.all([
  fetchPageMetaPromise,
  conversationAgentPromise
]);

const fetchPageMetaStatus = fetchPageMetaResponse.status();
const conversationAgentStatus = conversationAgentResponse.status();

console.log(`fetch-page-meta status: ${fetchPageMetaStatus}`);
console.log(`conversation_supervisor_agent status: ${conversationAgentStatus}`);

if (fetchPageMetaStatus !== 200) {
  throw new Error(`fetch-page-meta returned ${fetchPageMetaStatus}, expected 200`);
}

if (conversationAgentStatus !== 200) {
  throw new Error(`conversation_supervisor_agent returned ${conversationAgentStatus}, expected 200`);
}

console.log('Both API requests returned 200 successfully');
