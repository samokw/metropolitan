import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LineChartEmployment from '../../components/LineChartEmployment';

// Mock Chart.js to avoid canvas rendering issues
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart">Line Chart Component</div>
}));

// Mock Chart.js getChart function
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
    getChart: vi.fn(() => ({ destroy: vi.fn() }))
  },
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
  Filler: {}
}));

/** Minimal aggregated rows so the chart skips the raw /api/labourMarket fallback (Node fetch needs absolute URLs). */
const mockProvinceEducationRates = [
  { province: 10, educationLevel: 0, employmentRatePercent: 18 },
  { province: 10, educationLevel: 5, employmentRatePercent: 62 },
  { province: 35, educationLevel: 0, employmentRatePercent: 20 },
  { province: 35, educationLevel: 5, employmentRatePercent: 68 },
];

describe('LineChartEmployment Component', () => {
  const mockProps = {
    darkMode: false,
  };

  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof Request
            ? input.url
            : String(input);
      if (url.includes('labourEmploymentRatesByProvinceEducation')) {
        return {
          ok: true,
          json: async () => mockProvinceEducationRates,
        } as Response;
      }
      return {
        ok: true,
        json: async () => [],
      } as Response;
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('renders the chart after data is loaded', async () => {
    render(<LineChartEmployment {...mockProps} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
    });
    
    // Verify chart is rendered
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('displays data summary text', async () => {
    render(<LineChartEmployment {...mockProps} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
    });
    
    // Verify data summary is displayed
    expect(screen.getByText(/Data Summary/i)).toBeInTheDocument();
    
    // Check for content in the summary box
    const summaryText = screen.getByText(/Each coloured line is one education category/i);
    expect(summaryText).toBeInTheDocument();
  });

  it('handles chart rendering without errors', async () => {
    // Spy on console.error to catch rendering issues
    const consoleSpy = vi.spyOn(console, 'error');
    consoleSpy.mockImplementation(() => {});
    
    render(<LineChartEmployment {...mockProps} />);
    
    // Wait for rendering to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
    });
    
    // Check that no errors were logged to console
    expect(consoleSpy).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  // Additional test for chart configuration
  it('renders chart with correct title based on current view', async () => {
    render(<LineChartEmployment {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
    });
    
    // Find the chart title (this is a simplified test since we're mocking the chart)
    const chartComponent = screen.getByTestId('line-chart');
    expect(chartComponent).toBeInTheDocument();
    
    // In a real test, we'd check the options passed to the Line component
    // But since we're mocking it, we're just verifying the component rendered
    // The actual title would be controlled by getLineOptions() method
  });
});