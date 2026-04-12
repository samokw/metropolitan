import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DoubleRadarChart from '../../components/DoubleRadarChart';

// Mock Chart.js to avoid canvas rendering issues
vi.mock('react-chartjs-2', () => ({
  Radar: () => <div data-testid="radar-chart">Radar Chart Component</div>
}));

// Mock Chart.js getChart function
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
    getChart: vi.fn(() => ({ destroy: vi.fn() }))
  },
  RadialLinearScale: {},
  PointElement: {},
  LineElement: {},
  Filler: {},
  Tooltip: {},
  Legend: {},
  Title: {},
}));

describe('DoubleRadarChart Component', () => {
  const mockProps = {
    showCompletions: false,
    darkMode: false,
  };
  
  const mockHousingData = [
    {
      id: 1,
      censusArea: 'Toronto',
      singleStarts: 200,
      semisStarts: 150,
      rowStarts: 300,
      apartmentStarts: 800,
      singlesComplete: 180,
      semisComplete: 130,
      rowComplete: 280,
      apartmentComplete: 750
    },
    {
      id: 2,
      censusArea: 'Vancouver',
      singleStarts: 150,
      semisStarts: 100,
      rowStarts: 250,
      apartmentStarts: 600,
      singlesComplete: 140,
      semisComplete: 90,
      rowComplete: 220,
      apartmentComplete: 550
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
    render(<DoubleRadarChart {...mockProps} />);
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it('renders the chart after data is loaded', async () => {
    render(<DoubleRadarChart {...mockProps} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
    });
    
    // Verify chart is rendered
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
  });

  it('allows toggling between housing starts and completions', async () => {
    render(<DoubleRadarChart {...mockProps} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
    });
    
    // Check initial state shows housing starts button
    const toggleButton = screen.getByText(/Show Housing Completions/i);
    expect(toggleButton).toBeInTheDocument();
    
    // Click the toggle button
    fireEvent.click(toggleButton);
    
    // Check if button text changes after toggle
    expect(screen.getByText(/Show Housing Starts/i)).toBeInTheDocument();
  });

});