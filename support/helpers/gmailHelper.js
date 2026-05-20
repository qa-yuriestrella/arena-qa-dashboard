const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

/**
 * Connects to Gmail via IMAP and polls for the latest Arena invite email
 * received AFTER sentAfter (if provided), to avoid picking up stale invite links.
 *
 * Requires in .env:
 *   GOOGLE_EMAIL        — the Gmail address (automation.arena1@gmail.com)
 *   GMAIL_APP_PASSWORD  — 16-char App Password from Google Account settings
 *
 * @param {Date} [sentAfter] - Only return invite links from emails received after this time
 * @returns {Promise<string>} The invite URL extracted from the email
 */
async function getLatestArenaInviteUrl(sentAfter = null) {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.GOOGLE_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    logger: false,
  });

  await client.connect();
  // IMAP SINCE is day-granular, so always search the past 24h and filter by time ourselves
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await client.mailboxOpen('INBOX');

  let inviteUrl = null;

  for (let attempt = 0; attempt < 12; attempt++) {
    const uids = await client.search(
      { since, subject: 'invited' },
      { uid: true }
    );

    if (uids.length > 0) {
      // Check most recent first
      const sorted = [...uids].sort((a, b) => b - a);
      for (const uid of sorted) {
        for await (const msg of client.fetch(
          `${uid}`,
          { source: true, envelope: true },
          { uid: true }
        )) {
          // Skip emails received before the invite was sent
          if (sentAfter && msg.envelope?.date && msg.envelope.date < sentAfter) {
            continue;
          }

          const parsed = await simpleParser(msg.source);
          const body = (parsed.html || '') + (parsed.text || '');
          const match = body.match(/https?:\/\/[^\s"'<>]+\/invite\/[^\s"'<>]+/);
          if (match) {
            inviteUrl = match[0].replace(/&amp;/g, '&');
            break;
          }
        }
        if (inviteUrl) break;
      }
    }

    if (inviteUrl) break;
    if (attempt < 11) await new Promise(r => setTimeout(r, 15000));
  }

  await client.logout();

  if (!inviteUrl) {
    throw new Error('Arena invite email not found via IMAP after multiple attempts');
  }

  return inviteUrl;
}

module.exports = { getLatestArenaInviteUrl };
