import React, { Component } from 'react';
import { Radar } from 'react-chartjs-2';
import {
  CHART_DISPLAY_SANS,
  METRO_RADAR_SERIES_COLORS,
  chartGridColor,
  chartTextColor,
  chartTitleColor,
  chartTooltipPluginOptions,
  housingRadarPlotWashPlugin,
} from '../chartTheme';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  Title,
  housingRadarPlotWashPlugin
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
    const { darkMode } = this.props;
    const cities = Object.keys(cityData);
    const pointRing = darkMode ? 'rgba(15, 17, 22, 0.95)' : '#ffffff';

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

      const color = METRO_RADAR_SERIES_COLORS[city] ?? {
        fill: 'rgba(148, 163, 184, 0.15)',
        stroke: 'rgba(148, 163, 184, 1)',
      };

      return {
        label: city,
        data: data,
        backgroundColor: color.fill,
        borderColor: color.stroke,
        borderWidth: 2,
        pointBackgroundColor: color.stroke,
        pointBorderColor: pointRing,
        pointBorderWidth: 2,
        pointHoverBackgroundColor: color.stroke,
        pointHoverBorderColor: pointRing,
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
    const sans = CHART_DISPLAY_SANS;
    const muted = chartTextColor(darkMode);
    const yearSuffix = selectedYear ? ` · ${selectedYear}` : '';
    const titleLines = showCompletions
      ? [`Housing completions by type${yearSuffix}`, 'Five major metros compared']
      : [`Housing starts by type${yearSuffix}`, 'Five major metros compared'];

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest' as const, intersect: false },
      plugins: {
        housingRadarPlotWash: { darkMode },
        title: {
          display: true,
          text: titleLines,
          font: {
            size: 17,
            family: sans,
            weight: '600',
            lineHeight: 1.35,
          },
          color: chartTitleColor(darkMode),
          padding: { top: 4, bottom: 18 },
        },
        legend: {
          position: 'bottom' as const,
          align: 'start' as const,
          labels: {
            font: { size: 11, family: sans, weight: '500' },
            color: muted,
            usePointStyle: true,
            pointStyle: 'circle' as const,
            padding: 10,
          },
        },
        tooltip: {
          ...chartTooltipPluginOptions(darkMode),
          callbacks: {
            label: (context: { dataset: { label?: string }; raw: number }) =>
              `${context.dataset.label ?? ''}: ${Number(context.raw).toLocaleString()}`,
          },
        },
      },
      scales: {
        r: {
          beginAtZero: true,
          ticks: {
            color: muted,
            backdropColor: 'transparent',
            font: { family: sans, size: 10 },
          },
          pointLabels: {
            color: muted,
            font: { size: 12, weight: '600', family: sans },
          },
          grid: { color: chartGridColor(darkMode) },
          angleLines: { color: chartGridColor(darkMode) },
        },
      },
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

          <p
            className={`text-xs tracking-wide uppercase mb-3 max-w-[900px] mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
            style={{ fontFamily: CHART_DISPLAY_SANS }}
          >
            Census metropolitan areas · Singles through apartments · Toggle starts / completions
          </p>

          <div className="mb-4 flex flex-wrap gap-4 items-center max-w-[900px] mx-auto">
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

          <div
            className={`housing-radar-chart-panel max-w-[900px] mx-auto rounded-2xl border p-5 md:p-6 ${
              darkMode
                ? 'border-white/[0.08] bg-[linear-gradient(165deg,rgba(255,255,255,0.04)_0%,transparent_45%)] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.65)]'
                : 'border-[var(--color-border)] bg-white/60 shadow-[0_20px_40px_-28px_rgba(30,58,74,0.18)]'
            }`}
            style={{ height: '480px', width: '100%' }}
          >
            <Radar
              key={chartKey}
              data={this.getRadarChartData()}
              options={this.getRadarOptions()}
              id="radar-chart-container"
            />
          </div>

          <div className="mt-5 max-w-[900px] mx-auto">
            <label
              htmlFor="radar-chart-description"
              className={`chart-section-label block font-semibold mb-2 text-lg tracking-tight ${darkMode ? 'text-white' : 'text-[var(--color-primary-dark)]'}`}
              style={{ fontFamily: CHART_DISPLAY_SANS }}
            >
              Data summary
            </label>
            <div
              id="radar-chart-description"
              className={`w-full p-4 border rounded-xl text-[15px] leading-relaxed ${darkMode ? 'border-white/[0.1] bg-white/[0.03] text-slate-200' : 'border-[var(--color-border)] bg-white/80 text-[var(--color-primary-dark)]'}`}
              style={{ fontFamily: CHART_DISPLAY_SANS }}
            >
              {description}
            </div>
          </div>
        </div>


      </div>
    );
  }
}

export default DoubleRadarChart;