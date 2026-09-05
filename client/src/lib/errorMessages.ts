import { ErrorCodes, type ErrorCode } from '@app/shared';

/**
 * Maps every server error code to friendly copy. Add a case here whenever a
 * new code is added to packages/shared — the fallback keeps unknown codes
 * (e.g. a code the client hasn't been updated for yet) from crashing the UI.
 */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCodes.VALIDATION_ERROR]: 'Please check the highlighted fields and try again.',
  [ErrorCodes.UNAUTHORIZED]: 'Please sign in to continue.',
  [ErrorCodes.INVALID_CREDENTIALS]: 'That email or password is incorrect.',
  [ErrorCodes.TOKEN_EXPIRED]: 'Your session has expired. Please sign in again.',
  [ErrorCodes.TOKEN_INVALID]: 'Your session is no longer valid. Please sign in again.',
  [ErrorCodes.FORBIDDEN]: "You don't have permission to do that.",
  [ErrorCodes.NOT_FOUND]: "We couldn't find what you were looking for.",
  [ErrorCodes.DUPLICATE_RESOURCE]: 'That already exists.',
  [ErrorCodes.INTERNAL_ERROR]: 'Something went wrong on our end. Please try again.',
  [ErrorCodes.EMAIL_NOT_CONFIGURED]: 'Email sending is not set up yet — ask an admin to configure SMTP.',
};

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

export function getErrorMessage(code: string | undefined, fallbackMessage?: string): string {
  if (code && code in ERROR_MESSAGES) {
    return ERROR_MESSAGES[code as ErrorCode];
  }
  return fallbackMessage ?? FALLBACK_MESSAGE;
}
