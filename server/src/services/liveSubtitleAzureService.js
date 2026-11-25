import { buildIssueTokenUrl, F0_LIMITS } from '../../../client/shared/liveSubtitles.js';

const TOKEN_REQUEST_TIMEOUT_MS = 8000;

const serviceError = (code, message, status) => {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
};

export const getAzureSpeechConfig = () => ({
  key: process.env.AZURE_SPEECH_F0_KEY || '',
  region: process.env.AZURE_SPEECH_F0_REGION || '',
  subdomain: process.env.AZURE_SPEECH_F0_SUBDOMAIN || '',
});

export const isAzureSpeechConfigured = () => {
  const { key, region } = getAzureSpeechConfig();
  return Boolean(key && region);
};

export const getAzureSpeechPublicRegion = () => getAzureSpeechConfig().region;

export const fetchAzureSpeechToken = async () => {
  const { key, region, subdomain } = getAzureSpeechConfig();
  if (!key || !region) {
    throw serviceError(
      'AZURE_SUBTITLES_NOT_CONFIGURED',
      'Live subtitles are not configured. Add the Azure Speech F0 key and region to the server environment.',
      503
    );
  }

  let url;
  try {
    url = buildIssueTokenUrl({ region, subdomain });
  } catch {
    throw serviceError(
      'AZURE_SUBTITLES_CONFIG_INVALID',
      'The Azure Speech F0 region configuration is invalid.',
      503
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TOKEN_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: '',
      signal: controller.signal,
    });

    const body = await response.text();
    if (!response.ok) {
      const status = response.status === 401 || response.status === 403 ? 502 : 502;
      throw serviceError(
        'AZURE_TOKEN_ISSUANCE_FAILED',
        `Azure Speech token request failed (HTTP ${response.status}).`,
        status
      );
    }

    const token = body.trim();
    if (!token) {
      throw serviceError(
        'AZURE_TOKEN_ISSUANCE_FAILED',
        'Azure Speech returned an empty token.',
        502
      );
    }

    return {
      token,
      region,
      expiresAt: Date.now() + F0_LIMITS.tokenValiditySeconds * 1000,
      renewAfterMs: F0_LIMITS.recommendedRenewAfterSeconds * 1000,
    };
  } catch (error) {
    if (error?.code) throw error;
    const aborted = error?.name === 'AbortError';
    throw serviceError(
      'AZURE_TOKEN_ISSUANCE_FAILED',
      aborted
        ? 'Azure Speech token request timed out.'
        : 'Azure Speech token request could not be completed.',
      502
    );
  } finally {
    clearTimeout(timeout);
  }
};

export const liveSubtitleAzureService = {
  getConfig: getAzureSpeechConfig,
  isConfigured: isAzureSpeechConfigured,
  publicRegion: getAzureSpeechPublicRegion,
  fetchToken: fetchAzureSpeechToken,
};

export default liveSubtitleAzureService;
