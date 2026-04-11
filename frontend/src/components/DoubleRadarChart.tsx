import React, { Component } from 'react';
import { Radar } from 'react-chartjs-2';
import { CHART_FONT_FAMILY, chartTextColor, chartTitleColor, chartGridColor } from '../chartTheme';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';

// Register required Chart.js components for radar charts
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface RadarChartProps {
  showCompletions?: boolean;
  darkMode: boolean; // Add darkMode prop
}

// Define interface for city housing data
interface CityHousingData {
  singlesStarts: number;
  semisStarts: number;
  rowStarts: number;
  apartmentStarts: number;
  singlesComplete: number;
  semisComplete: number;
  rowComplete: number;
  apartmentComplete: number;
}

interface RadarChartState {
  cityData: Record<string, CityHousingData>;
  loading: boolean;
  error: string | null;
  chartKey: number;
  showCompletions: boolean;
  description: string;
  selectedYear: number | null;
  availableYears: number[];
  rawData: any[];
}


class DoubleRadarChart extends Component<RadarChartProps, RadarChartState> {
  public state: RadarChartState = {
    cityData: {},
    loading: true,
    error: null,
    chartKey: Date.now(),
    showCompletions: this.props.showCompletions || false,
    description: "This radar chart visualizes housing data across major Canadian metropolitan areas. Each axis represents a different housing type: singles, semis, townhomes, and apartments. The radar shape illustrates the distribution pattern of housing across these categories, making it easy to identify which cities favor certain housing types. Toggle between housing starts and completions to compare how construction priorities match with finished housing projects.",
    selectedYear: null,
    availableYears: [],
    rawData: []
  };

  public componentDidMount(): void {
    this.fetchData();
  }

  public componentDidUpdate(prevProps: RadarChartProps): void {
    if (prevProps.showCompletions !== this.props.showCompletions && this.props.showCompletions !== undefined) {
      this.setState({
        showCompletions: this.props.showCompletions,
        chartKey: Date.now()
      });
    }
  }

  public componentWillUnmount(): void {
    // Explicitly destroy chart instance
    const chartInstance = ChartJS.getChart("radar-chart-container");
    if (chartInstance) {
      chartInstance.destroy();
    }
  }

  private readonly toggleView = (): void => {
    this.setState(prevState => ({
      showCompletions: !prevState.showCompletions,
      chartKey: Date.now()
    }));
  };

  private readonly fetchData = async (): Promise<void> => {
    try {
      const response = await fetch('/api/housingStats');
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const allData = await response.json();

      const yearsSet = new Set<number>();
      allData.forEach((item: any) => {
        if (item.year) yearsSet.add(item.year);
      });
      const availableYears = Array.from(yearsSet).sort((a, b) => b - a);
      const selectedYear = availableYears[0] ?? null;

      const cityData = this.processDataForYear(allData, selectedYear);

      this.setState({
        rawData: allData,
        availableYears,
        selectedYear,
        cityData,
        loading: false,
        error: null,
        chartKey: Date.now()
      });
    } catch (err) {
      console.error('Error in fetchData for radar chart:', err);
      this.setState({
        error: err instanceof Error ? err.message : "Unexpected error",
        loading: false
      });
    }
  };

  private processDataForYear(allData: any[], year: number | null): Record<string, CityHousingData> {
    const cities = ["Vancouver", "Toronto", "Montreal", "Edmonton", "Ottawa-Gatineau"];
    const cityData: Record<string, CityHousingData> = {};
    cities.forEach(city => {
      cityData[city] = {
        singlesStarts: 0, semisStarts: 0, rowStarts: 0, apartmentStarts: 0,
        singlesComplete: 0, semisComplete: 0, rowComplete: 0, apartmentComplete: 0
      };
    });

    allData.forEach((item: any) => {
      if (year && item.year !== year) return;
      const city = item.censusArea;
      if (cities.includes(city)) {
        cityData[city].singlesStarts += item.singleStarts || 0;
        cityData[city].semisStarts += item.semisStarts || 0;
        cityData[city].rowStarts += item.rowStarts || 0;
        cityData[city].apartmentStarts += item.apartmentStarts || 0;
        cityData[city].singlesComplete += item.singlesComplete || 0;
        cityData[city].semisComplete += item.semisComplete || 0;
        cityData[city].rowComplete += item.rowComplete || 0;
        cityData[city].apartmentComplete += item.apartmentComplete || 0;
      }
    });
    return cityData;
  }

  private readonly handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const year = parseInt(event.target.value, 10);
    const cityData = this.processDataForYear(this.state.rawData, year);
    this.setState({ selectedYear: year, cityData, chartKey: Date.now() });
  };

  private readonly getRadarChartData = (): any => {
    const { cityData, showCompletions } = this.state;
    const cities = Object.keys(cityData);

    // Define colors for each city
    const cityColors = {
      "Vancouver": { bg: 'rgba(54, 162, 235, 0.2)', border: 'rgba(54, 162, 235, 1)' },
      "Toronto": { bg: 'rgba(255, 99, 132, 0.2)', border: 'rgba(255, 99, 132, 1)' },
      "Montreal": { bg: 'rgba(255, 206, 86, 0.2)', border: 'rgba(255, 206, 86, 1)' },
      "Edmonton": { bg: 'rgba(75, 192, 192, 0.2)', border: 'rgba(75, 192, 192, 1)' },
      "Ottawa-Gatineau": { bg: 'rgba(153, 102, 255, 0.2)', border: 'rgba(153, 102, 255, 1)' }
    };

    // Create datasets for each city
    const datasets = cities.map(city => {
      const data = showCompletions
        ? [
          cityData[city].singlesComplete || 0,
          cityData[city].semisComplete || 0,
          cityData[city].rowComplete || 0,
          cityData[city].apartmentComplete || 0
        ]
        : [
          cityData[city].singlesStarts || 0,
          cityData[city].semisStarts || 0,
          cityData[city].rowStarts || 0,
          cityData[city].apartmentStarts || 0
        ];

      const color = cityColors[city as keyof typeof cityColors] ||
        { bg: 'rgba(201, 203, 207, 0.2)', border: 'rgba(201, 203, 207, 1)' };

      return {
        label: city,
        data: data,
        backgroundColor: color.bg,
        borderColor: color.border,
        borderWidth: 2,
        pointBackgroundColor: color.border,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: color.border
      };
    });

    return {
      labels: ['Singles', 'Semis', 'Townhomes', 'Apartments'],
      datasets: datasets
    };
  };

  private readonly getRadarOptions = (): any => {
    const { showCompletions, selectedYear } = this.state;
    const { darkMode } = this.props;
    const yearLabel = selectedYear ? ` (${selectedYear})` : '';
    const chartTitle = showCompletions
      ? `Housing Completions by Type${yearLabel}`
      : `Housing Starts by Type${yearLabel}`;

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: chartTitle,
          font: { size: 18, family: CHART_FONT_FAMILY, weight: 'bold' },
          color: chartTitleColor(darkMode),
          padding: { bottom: 16 },
        },
        legend: {
          position: 'top',
          labels: {
            font: { size: 12, family: CHART_FONT_FAMILY },
            color: chartTextColor(darkMode),
            usePointStyle: true,
            padding: 16,
          }
        },
        tooltip: {
          callbacks: {
            label: function (context: any) {
              return `${context.dataset.label}: ${context.raw}`;
            }
          }
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          ticks: {
            color: chartTextColor(darkMode),
            backdropColor: 'transparent',
            font: { family: CHART_FONT_FAMILY, size: 10 }
          },
          pointLabels: {
            color: chartTextColor(darkMode),
            font: { size: 12, weight: 'bold', family: CHART_FONT_FAMILY }
          },
          grid: { color: chartGridColor(darkMode) },
          angleLines: { color: chartGridColor(darkMode) }
        }
      }
    };
  };

  public render(): React.JSX.Element {
    const { loading, error, chartKey, description, showCompletions } = this.state;
    const { darkMode } = this.props;

    if (loading) {
      return (
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Skeleton Radar Chart Container */}
          <div className="chart-container flex-1 w-full">
            {/* Skeleton toggle button */}
            <div className="mb-4">
              <div className={`h-10 w-48 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded animate-pulse`}></div>
            </div>

            {/* Skeleton chart area */}
            <div className={`h-[500px] w-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg animate-pulse flex items-center justify-center`}>
              <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading chart...</span>
            </div>

            {/* Skeleton description */}
            <div className="mt-4">
              <div className={`h-6 w-32 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded mb-2 animate-pulse`}></div>
              <div className={`w-full p-3 border-2 border-[var(--color-border)] ${darkMode ? 'bg-transparent' : 'bg-white/50'} rounded-lg`}>
                <div className={`h-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded mb-2 animate-pulse`}></div>
                <div className={`h-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded mb-2 animate-pulse w-5/6`}></div>
                <div className={`h-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded mb-2 animate-pulse`}></div>
                <div className={`h-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded animate-pulse w-4/6`}></div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Radar Chart Container */}
        <div className="chart-container flex-1 w-full">
          {error && <div className="error-banner bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>}
          <div className="mb-4 flex flex-wrap gap-4 items-center">
            <button
              onClick={this.toggleView}
              className="toggle-btn"
            >
              {showCompletions ? "Show Housing Starts" : "Show Housing Completions"}
            </button>
            {this.state.availableYears.length > 0 && (
              <div className="flex items-center">
                <label htmlFor="radar-year-filter" className={`mr-2 font-semibold ${darkMode ? 'text-white' : 'text-gray-700'}`}>Year:</label>
                <select
                  id="radar-year-filter"
                  value={this.state.selectedYear?.toString() ?? ''}
                  onChange={this.handleYearChange}
                  className="form-select"
                >
                  {this.state.availableYears.map(y => (
                    <option key={y} value={y.toString()}>{y}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ height: '500px', width: '100%' }}>
            <Radar
              key={chartKey}
              data={this.getRadarChartData()}
              options={this.getRadarOptions()}
              id="radar-chart-container"
            />
          </div>

          {/* Description Box */}
          <div className="mt-4">
            <label
              htmlFor="chart-description"
              className={`chart-section-label block font-semibold mb-2 text-xl ${darkMode ? 'text-white' : 'text-[var(--color-primary-dark)]'}`}
            >Data Summary</label>
            <textarea
              id="chart-description"
              className={`w-full p-3 border-2 border-[var(--color-border)] rounded-lg resize-none text-area-styled ${darkMode ? 'bg-transparent text-white' : 'bg-white/50 text-[var(--color-primary-dark)]'}`}
              rows={5}
              value={description}
              readOnly
            />
          </div>
        </div>


      </div>
    );
  }
}

export default DoubleRadarChart;