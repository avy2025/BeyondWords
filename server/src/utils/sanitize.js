/**
 * Basic sanitization for socket message payloads.
 * Prevents common XSS and malicious characters in userName, messages, etc.
 */
export const sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .trim()
    .replace(/[<>]/g, '') // Basic tag removal
    .substring(0, 500); // Prevent buffer overflow attacks
};

export const sanitizeUserName = (name) => {
  if (typeof name !== 'string') return 'Guest';
  return name
    .trim()
    .replace(/[^a-zA-Z0-9 _-]/g, '') // alphanumeric, spaces, underscores, dashes
    .substring(0, 32) || 'Guest';
};

export const sanitizeGestureLabel = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, 64);
};

export const sanitizeEmoji = (emoji) => {
  if (typeof emoji !== 'string') return '';
  // Limit to 10 chars to allow for multi-component emojis but prevent massive strings
  return emoji.substring(0, 10);
};
