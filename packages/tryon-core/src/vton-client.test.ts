import { describe, it, expect } from 'vitest';
import { GenerativeVTonClient } from './vton-client.js';

describe('GenerativeVTonClient', () => {
  it('initializes with default neural simulator config', () => {
    const client = new GenerativeVTonClient();
    const config = client.getConfig();
    expect(config.provider).toBe('neural-simulator');
    expect(config.timeoutMs).toBe(30000);
  });

  it('updates configuration dynamically', () => {
    const client = new GenerativeVTonClient();
    client.updateConfig({
      endpointUrl: 'https://api.fashn.ai/v1/run',
      apiKey: 'test-key-123',
      provider: 'fashn'
    });
    const config = client.getConfig();
    expect(config.endpointUrl).toBe('https://api.fashn.ai/v1/run');
    expect(config.apiKey).toBe('test-key-123');
    expect(config.provider).toBe('fashn');
  });
});
