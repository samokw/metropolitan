import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LabourForceStats from '../../components/LabourForceStats';

// Mock Chart.js to avoid canvas rendering issues
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="mock-line-chart">Chart Component</div>
}));

// Update the Chart.js mock to include all required exports
vi.mock('chart.js', async () => {
  return {
    Chart: {
      register: vi.fn(),
      getChart: vi.fn(() => ({ destroy: vi.fn() }))
    },
    CategoryScale: { id: 'CategoryScale' },
    LinearScale: { id: 'LinearScale' },
    PointElement: { id: 'PointElement' },
    LineElement: { id: 'LineElement' },
    Title: { id: 'Title' },
    Tooltip: { id: 'Tooltip' },
    Legend: { id: 'Legend' },
    Filler: { id: 'Filler' }
  }
});

describe('LabourForceStats Component', () => {
  const mockProps = {
    darkMode: false
  };
  
  const mockCorrelationData = {
    laborForceData: [
      { period: '2019', employmentRate: 65, unemploymentRate: 5, participationRate: 75 }
    ],
    housingStartsData: [
      { period: '2019', totalStarts: 4000, singleStarts: 1000, multiUnitStarts: 3000 }
    ],
    timePeriodsLabels: ['2019']
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock componentDidMount instead of trying to access private fetchData
    vi.spyOn(LabourForceStats.prototype, 'componentDidMount').mockImplementation(function() {
      this.setState({
        loading: false,
        correlationData: mockCorrelationData,
        chartKey: Date.now()
      });
    });
  });

  it('renders loading state initially', () => {
    // Override componentDidMount to keep loading state
    vi.spyOn(LabourForceStats.prototype, 'componentDidMount').mockImplementation(() => {});
    render(<LabourForceStats {...mockProps} />);
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it('renders the chart after data is loaded', async () => {
    render(<LabourForceStats {...mockProps} />);
    expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();
    expect(screen.getByLabelText('Labor Force Metric:')).toBeInTheDocument();
    expect(screen.getByLabelText('Housing Type:')).toBeInTheDocument();
  });

  it('allows changing the labor force metric', () => {
    render(<LabourForceStats darkMode={false} />);
    
    // Get the labor force metric dropdown
    const metricSelect = screen.getByLabelText('Labor Force Metric:');
    
    // Change to 'unemployment'
    fireEvent.change(metricSelect, { target: { value: 'unemployment' } });
    
    // The chart should re-render
    expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();
  });

  it('allows changing the housing type', () => {
    render(<LabourForceStats darkMode={false} />);
    
    // Get the housing type dropdown
    const housingSelect = screen.getByLabelText('Housing Type:');
    
    // Change to 'single'
    fireEvent.change(housingSelect, { target: { value: 'single' } });
    
    // The chart should re-render
    expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();
  });

  it('renders correctly in dark mode', () => {
    render(<LabourForceStats darkMode={true} />);
    
    // The component should render without errors in dark mode
    expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();
    expect(screen.getByText('Data summary')).toHaveClass('text-white');
  });

  it('displays an error message when data fetching fails', () => {
    // Mock console.error to prevent test output from being cluttered
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Override componentDidMount to simulate error state
    vi.spyOn(LabourForceStats.prototype, 'componentDidMount').mockImplementation(function() {
      this.setState({ 
        error: 'Failed to load data', 
        loading: false 
      });
    });

    render(<LabourForceStats darkMode={false} />);
    
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    
    // Cleanup
    consoleErrorSpy.mockRestore();
  });

  it('shows data summary section with descriptive text', () => {
    render(<LabourForceStats darkMode={false} />);

    expect(screen.getByText('Data summary')).toBeInTheDocument();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });
});
