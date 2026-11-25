import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  issueLiveSubtitleSession,
  releaseLiveSubtitleSession,
  reportLiveSubtitleUsage,
  resetLiveSubtitleQuotaForTests,
} from '../src/services/liveSubtitleQuotaService.js';
import {
  authorizeLiveSubtitleMember,
  clearLiveSubtitleMemberships,
  isLiveSubtitleMember,
  removeLiveSubtitleMemberBySocket,
} from '../src/services/liveSubtitleMembershipService.js';
import { buildSubtitleTokenRequest, F0_LIMITS } from '../../client/shared/liveSubtitles.js';

const base = { accountId: 'acct-1', roomId: 'room-1', peerId: 'peer-1' };

beforeEach(() => {
  resetLiveSubtitleQuotaForTests();
  clearLiveSubtitleMemberships();
});

test('F0 concurrency is limited to one active session', async () => {
  const first = await issueLiveSubtitleSession(base);
  assert.equal(F0_LIMITS.maxConcurrentRequests, 1);

  await assert.rejects(
    issueLiveSubtitleSession({ ...base, accountId: 'acct-2', peerId: 'peer-2' }),
    (error) => error.code === 'F0_CONCURRENCY_LIMIT'
  );

  assert.equal(releaseLiveSubtitleSession({ sessionId: first.sessionId, accountId: 'acct-1' }), true);
  assert.ok((await issueLiveSubtitleSession({ ...base, accountId: 'acct-2', peerId: 'peer-2' })).sessionId);
});

test('renewal reuses the lease instead of creating a second concurrent request', async () => {
  const first = await issueLiveSubtitleSession(base);
  const renewed = await issueLiveSubtitleSession({ ...base, sessionId: first.sessionId });
  assert.equal(renewed.sessionId, first.sessionId);
  assert.equal(renewed.renewed, true);

  await assert.rejects(
    issueLiveSubtitleSession({ ...base, accountId: 'acct-2', peerId: 'peer-2' }),
    (error) => error.code === 'F0_CONCURRENCY_LIMIT'
  );
});

test('monthly audio quota fails closed at five hours', async () => {
  const { sessionId } = await issueLiveSubtitleSession(base);
  for (let i = 0; i < 20; i += 1) {
    await reportLiveSubtitleUsage({ sessionId, accountId: 'acct-1', audioSeconds: 900 * (i + 1) });
  }

  await assert.rejects(
    reportLiveSubtitleUsage({ sessionId, accountId: 'acct-1', audioSeconds: 18001 }),
    (error) => error.code === 'F0_QUOTA_EXHAUSTED'
  );
  await assert.rejects(
    issueLiveSubtitleSession({ ...base, accountId: 'acct-2', peerId: 'peer-2' }),
    (error) => error.code === 'F0_QUOTA_EXHAUSTED'
  );
});

test('usage reports require a matching session and account', async () => {
  const { sessionId } = await issueLiveSubtitleSession(base);
  await assert.rejects(
    reportLiveSubtitleUsage({ sessionId, accountId: 'other', audioSeconds: 5 }),
    (error) => error.code === 'INVALID_SUBTITLE_SESSION'
  );
  await assert.rejects(
    reportLiveSubtitleUsage({ sessionId: 'missing', accountId: 'acct-1', audioSeconds: 5 }),
    (error) => error.code === 'INVALID_SUBTITLE_SESSION'
  );
});

test('membership binding is authenticated, scoped, and removed on socket cleanup', () => {
  const request = buildSubtitleTokenRequest({
    roomId: 'room-1',
    peerId: 'peer-1',
    sourceLanguage: 'en-US',
    targetLanguage: 'hi',
  });
  assert.equal(isLiveSubtitleMember({ ...request, accountId: 'acct-1' }), false);

  authorizeLiveSubtitleMember({ ...request, accountId: 'acct-1', socketId: 'socket-1' });
  assert.equal(isLiveSubtitleMember({ ...request, accountId: 'acct-1' }), true);
  assert.equal(isLiveSubtitleMember({ ...request, accountId: 'acct-2' }), false);

  const removed = removeLiveSubtitleMemberBySocket('socket-1');
  assert.equal(removed.length, 1);
  assert.equal(isLiveSubtitleMember({ ...request, accountId: 'acct-1' }), false);
});
