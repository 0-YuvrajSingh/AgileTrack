import { describe, it, expect } from 'vitest';
import { getApiErrorMessage } from '../../src/api/axios';

const axiosLike = (status: number, message?: string) => ({
  isAxiosError: true,
  response: { status, data: message === undefined ? {} : { message } },
});

describe('getApiErrorMessage', () => {
  it('prefers the server-provided message', () => {
    expect(getApiErrorMessage(axiosLike(400, 'Title is required'), 'fallback')).toBe(
      'Title is required'
    );
  });

  it('returns a permission-specific message for 403 without a server message', () => {
    expect(getApiErrorMessage(axiosLike(403), 'fallback')).toBe(
      'You do not have permission to perform this action.'
    );
  });

  it('still prefers the server message on 403 when one is present', () => {
    expect(getApiErrorMessage(axiosLike(403, 'VIEWER role is read-only'), 'fallback')).toBe(
      'VIEWER role is read-only'
    );
  });

  it('falls back for non-403 statuses without a server message', () => {
    expect(getApiErrorMessage(axiosLike(404), 'fallback')).toBe('fallback');
  });

  it('falls back for non-Axios errors', () => {
    expect(getApiErrorMessage(new Error('boom'), 'fallback')).toBe('fallback');
  });
});
