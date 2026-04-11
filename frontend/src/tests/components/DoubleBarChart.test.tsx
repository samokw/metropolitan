import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HousingChart from '../../components/DoubleBarChart';

// Mock Chart.js to avoid canvas rendering issues
vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart">Chart Component</div>
}));

// Mock Chart.js getChart function
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
    getChart: vi.fn(() => ({ destroy: vi.fn() }))
  },
  CategoryScale: {},
  LinearScale: {},
  BarElement: {},
  Title: {},
  Tooltip: {},
  Legend: {}
}));

describe('DoubleBarChart Component', () => {
  const mockProps = {
    showCompletions: false,
    onToggleView: vi.fn(),
    darkMode: false,
  };
  
  const mockHousingData = [
    {
      id: 1,
      censusArea: 'Toronto',
      totalStarts: 100,
      totalComplete: 80,
      month: 1
    },
    {
      id: 2,
      censusArea: 'Hamilton',
      totalStarts: 60,
      totalComplete: 40,
      month: 1
    }
  ];

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock fetch
    global.fetch = vi.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockHousingData)
      }) as any
    );
  });

  it('renders loading state initially', () => {
    render(<HousingChart {...mockProps} />);
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it('renders the chart after data is loaded', async () => {
    render(<HousingChart {...mockProps} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
    });
    
    // Verify chart is rendered
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders the month filter dropdown', async () => {
    render(<HousingChart {...mockProps} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
    });
    
    // Verify filter exists
    const filterElement = screen.getByLabelText(/^Month:$/i);
    expect(filterElement).toBeInTheDocument();
    expect(filterElement.tagName.toLowerCase()).toBe('select');
  });
});