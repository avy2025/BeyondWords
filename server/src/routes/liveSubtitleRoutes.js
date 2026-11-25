import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  buildSubtitleTokenRequest,
  isSafeRoomIdentifier,
} from '../../../client/shared/liveSubtitles.js';
import { isLiveSubtitleMember } from '../services/liveSubtitleMembershipService.js';
import {
  issueLiveSubtitleSession,
  releaseLiveSubtitleSession,
  reportLiveSubtitleUsage,
  getLiveSubtitleQuotaStatus,
} from '../services/liveSubtitleQuotaService.js';
import {
  isAzureSpeechConfigured,
  fetchAzureSpeechToken,
  getAzureSpeechPublicRegion,
} from '../services/liveSubtitleAzureService.js';

const router = Router();

const sendServiceError = (res, error) => {
  const status = error?.status || 500;
  const code = error?.code || 'LIVE_SUBTITLES_UNAVAILABLE';
  const message =
    status >= 500 && !error?.code
      ? 'Live subtitles are temporarily unavailable.'
      : error.message || 'Live subtitles are temporarily unavailable.';

  return res.status(status).json({ code, message });
};

// Issue a short-lived Azure Speech token only after JWT + meeting membership checks.
router.post('/token', protect, async (req, res) => {
  let lease;
  try {
    const request = buildSubtitleTokenRequest(req.body || {});
    const accountId = req.user?._id;

    if (!isLiveSubtitleMember({ ...request, accountId })) {
      return sendServiceError(res, {
        status: 403,
        code: 'NOT_A_MEETING_MEMBER',
        message: 'Join the meeting before enabling live subtitles.',
      });
    }

    if (!isAzureSpeechConfigured()) {
      return sendServiceError(res, {
        status: 503,
        code: 'AZURE_SUBTITLES_NOT_CONFIGURED',
        message: 'Live subtitles are not configured on the server.',
      });
    }

    lease = issueLiveSubtitleSession({
      accountId,
      roomId: request.roomId,
      peerId: request.peerId,
      sessionId: request.sessionId,
    });
    const azure = await fetchAzureSpeechToken();

    return res.json({
      token: azure.token,
      region: azure.region || getAzureSpeechPublicRegion(),
      sessionId: lease.sessionId,
      expiresAt: azure.expiresAt,
      renewAfterMs: azure.renewAfterMs,
      quota: lease.quota,
      limits: lease.limits,
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
    });
  } catch (error) {
    if (lease?.sessionId) releaseLiveSubtitleSession({ sessionId: lease.sessionId });
    return sendServiceError(res, error);
  }
});

// Audio-second metadata only. Never accepts or stores transcript text or audio.
router.post('/usage', protect, async (req, res) => {
  try {
    const { sessionId, audioSeconds } = req.body || {};
    if (!isSafeRoomIdentifier(sessionId)) {
      return sendServiceError(res, {
        status: 400,
        code: 'INVALID_SUBTITLE_SESSION',
        message: 'Invalid subtitle session.',
      });
    }

    const quota = await reportLiveSubtitleUsage({
      sessionId,
      accountId: req.user?._id,
      audioSeconds,
    });
    return res.json(quota);
  } catch (error) {
    return sendServiceError(res, error);
  }
});

router.post('/release', protect, (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!isSafeRoomIdentifier(sessionId)) {
      return sendServiceError(res, {
        status: 400,
        code: 'INVALID_SUBTITLE_SESSION',
        message: 'Invalid subtitle session.',
      });
    }

    const released = releaseLiveSubtitleSession({
      sessionId,
      accountId: req.user?._id,
    });
    return res.json({ released });
  } catch (error) {
    return sendServiceError(res, error);
  }
});

router.get('/status', protect, async (req, res) => {
  try {
    return res.json(await getLiveSubtitleQuotaStatus({ accountId: req.user?._id }));
  } catch (error) {
    return sendServiceError(res, error);
  }
});

export default router;
