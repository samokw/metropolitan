import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';

// Mock createRoot from react-dom/client
vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
  })),
}));

// Import the mocked module
import { createRoot } from 'react-dom/client';

describe('Main entry point', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock document.getElementById
    document.getElementById = vi.fn().mockReturnValue({});
  });
  
  it('renders App component into root element', async () => {
    await import('../main');

    expect(document.getElementById).toHaveBeenCalledWith('root');
    expect(createRoot).toHaveBeenCalled();

    const renderMock = vi.mocked(createRoot).mock.results[0].value.render;

    expect(renderMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: App })
    );
  });
});
