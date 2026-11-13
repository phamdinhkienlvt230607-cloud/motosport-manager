import { createPostgresSslOptions } from './postgres-ssl.js';

describe('createPostgresSslOptions', () => {
  it('requires certificate validation for verify-full even without an explicit CA', () => {
    expect(createPostgresSslOptions('verify-full')).toEqual({
      rejectUnauthorized: true,
    });
  });

  it('enables certificate validation and supplies the CA when configured', () => {
    expect(createPostgresSslOptions('require', 'test CA')).toEqual({
      rejectUnauthorized: true,
      ca: 'test CA',
    });
  });

  it('preserves require mode encryption without claiming certificate validation', () => {
    expect(createPostgresSslOptions('require')).toEqual({
      rejectUnauthorized: false,
    });
  });
});
