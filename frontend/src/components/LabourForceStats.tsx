import React, { Component } from 'react';
import { Line } from 'react-chartjs-2';
import { CHART_FONT_FAMILY, chartGridColor, chartTextColor, chartTitleColor } from '../chartTheme';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface HousingByYear {
  year: number;
  totalStarts: number;
  singleStarts: number;
  multiUnitStarts: number;
}

interface LabourRates {
  employmentRate: number;
  unemploymentRate: number;
  participationRate: number;
}

interface LabourForceStatsState {
  housingByYear: HousingByYear[];
  labourRates: LabourRates;
  loading: boolean;
  error: string | null;
  chartKey: number;
  selectedMetric: 'employment' | 'unemployment' | 'participation';
  selectedHousingType: 'total' | 'single' | 'multiUnit';
  description: string;
}

interface LabourForceStatsProps {
  darkMode: boolean;
}

class LabourForceStats extends Component<LabourForceStatsProps, LabourForceStatsState> {
  public state: LabourForceStatsState = {
    housingByYear: [],
    labourRates: { employmentRate: 0, unemploymentRate: 0, participationRate: 0 },
    loading: true,
    error: null,
    chartKey: Date.now(),
    selectedMetric: 'employment',
    selectedHousingType: 'total',
    description: "Housing starts for Toronto are from Statistics Canada (table 34-10-0154). Labour force rates (Ontario aggregate) are computed from the LFS Public Use Microdata File. The labour rate is a cross-sectional aggregate shown as a reference line."
  };

  public componentDidMount(): void {
    this.fetchData();
  }

  public componentWillUnmount(): void {
    const chartInstance = ChartJS.getChart("labour-housing-chart");
    if (chartInstance) {
      chartInstance.destroy();
    }
  }

  private readonly fetchData = async (): Promise<void> => {
    try {
      const [housingRes, labourRes] = await Promise.all([
        fetch('/api/housingStats'),
        fetch('/api/labourMarket')
      ]);

      if (!housingRes.ok) throw new Error(`Housing API: HTTP ${housingRes.status}`);
      if (!labourRes.ok) throw new Error(`Labour API: HTTP ${labourRes.status}`);

      const housingData = await housingRes.json();
      const labourData = await labourRes.json();

      const housingByYear = this.aggregateHousingByYear(housingData);
      const labourRates = this.computeOntarioRates(labourData);

      this.setState({
        housingByYear,
        labourRates,
        loading: false,
        error: null,
        chartKey: Date.now()
      });
    } catch (err) {
      console.error('Error fetching correlation data:', err);
      this.setState({
        error: err instanceof Error ? err.message : "Unexpected error",
        loading: false
      });
    }
  };

  private aggregateHousingByYear(data: any[]): HousingByYear[] {
    const byYear: Record<number, HousingByYear> = {};
    for (const item of data) {
      if (item.censusArea !== 'Toronto' || !item.year) continue;
      if (!byYear[item.year]) {
        byYear[item.year] = { year: item.year, totalStarts: 0, singleStarts: 0, multiUnitStarts: 0 };
      }
      byYear[item.year].totalStarts += item.totalStarts || 0;
      byYear[item.year].singleStarts += item.singleStarts || 0;
      const multi = (item.semisStarts || 0) + (item.rowStarts || 0) + (item.apartmentStarts || 0);
      byYear[item.year].multiUnitStarts += multi;
    }
    return Object.values(byYear).sort((a, b) => a.year - b.year);
  }

  private computeOntarioRates(records: any[]): LabourRates {
    let employed = 0;
    let unemployed = 0;
    let notInLF = 0;

    for (const r of records) {
      if (r.province !== 35) continue;
      if (r.labourForceStatus === 1) employed++;
      else if (r.labourForceStatus === 2) unemployed++;
      else if (r.labourForceStatus === 3) notInLF++;
    }

    const labourForce = employed + unemployed;
    const total = employed + unemployed + notInLF;

    return {
      employmentRate: labourForce > 0 ? (employed / labourForce) * 100 : 0,
      unemploymentRate: labourForce > 0 ? (unemployed / labourForce) * 100 : 0,
      participationRate: total > 0 ? (labourForce / total) * 100 : 0,
    };
  }

  private readonly handleMetricChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    this.setState({
      selectedMetric: event.target.value as 'employment' | 'unemployment' | 'participation',
      chartKey: Date.now()
    });
  };

  private readonly handleHousingTypeChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    this.setState({
      selectedHousingType: event.target.value as 'total' | 'single' | 'multiUnit',
      chartKey: Date.now()
    });
  };

  private readonly getChartData = (): any => {
    const { housingByYear, labourRates, selectedMetric, selectedHousingType } = this.state;

    const labels = housingByYear.map(h => String(h.year));

    const labourValue = {
      employment: labourRates.employmentRate,
      unemployment: labourRates.unemploymentRate,
      participation: labourRates.participationRate,
    }[selectedMetric];

    const labourLabel = {
      employment: 'Employment Rate — Ontario (%)',
      unemployment: 'Unemployment Rate — Ontario (%)',
      participation: 'Participation Rate — Ontario (%)',
    }[selectedMetric];

    const housingMetric = housingByYear.map(h => {
      switch (selectedHousingType) {
        case 'single': return h.singleStarts;
        case 'multiUnit': return h.multiUnitStarts;
        default: return h.totalStarts;
      }
    });

    const housingLabel = {
      total: 'Total Housing Starts — Toronto',
      single: 'Single-Unit Starts — Toronto',
      multiUnit: 'Multi-Unit Starts — Toronto',
    }[selectedHousingType];

    return {
      labels,
      datasets: [
        {
          label: labourLabel,
          data: labels.map(() => labourValue),
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          yAxisID: 'y',
          fill: false,
          tension: 0,
          borderDash: [6, 4],
          pointRadius: 0,
        },
        {
          label: housingLabel,
          data: housingMetric,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.15)',
          yAxisID: 'y1',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        }
      ]
    };
  };

  private readonly getChartOptions = (): any => {
    const { selectedMetric, selectedHousingType } = this.state;
    const { darkMode } = this.props;

    const laborForceAxisLabel = {
      employment: 'Employment Rate (%)',
      unemployment: 'Unemployment Rate (%)',
      participation: 'Participation Rate (%)'
    }[selectedMetric];

    const housingAxisLabel = {
      total: 'Total Housing Starts',
      single: 'Single-Unit Housing Starts',
      multiUnit: 'Multi-Unit Housing Starts'
    }[selectedHousingType];

    const laborForceAxisRange = {
      employment: { min: 50, max: 100 },
      unemployment: { min: 0, max: 20 },
      participation: { min: 50, max: 100 }
    }[selectedMetric];

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        title: {
          display: true,
          text: `${laborForceAxisLabel} vs ${housingAxisLabel} — Toronto`,
          font: { size: 16, weight: 'bold', family: CHART_FONT_FAMILY },
          color: chartTitleColor(darkMode),
          padding: { bottom: 16 },
        },
        legend: {
          labels: {
            color: chartTextColor(darkMode),
            font: { family: CHART_FONT_FAMILY, size: 12 },
            usePointStyle: true,
            padding: 16,
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              let label = ctx.dataset.label || '';
              if (label) label += ': ';
              if (ctx.datasetIndex === 0) {
                label += ctx.parsed.y.toFixed(1) + '%';
              } else {
                label += ctx.parsed.y.toLocaleString();
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: { color: chartGridColor(darkMode), drawBorder: false },
          title: {
            display: true,
            text: 'Year',
            font: { weight: 'bold', family: CHART_FONT_FAMILY },
            color: chartTextColor(darkMode),
          },
          ticks: { color: chartTextColor(darkMode), font: { family: CHART_FONT_FAMILY, size: 11 } }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          min: laborForceAxisRange.min,
          max: laborForceAxisRange.max,
          grid: { color: chartGridColor(darkMode), drawBorder: false },
          title: {
            display: true,
            text: laborForceAxisLabel,
            font: { weight: 'bold', family: CHART_FONT_FAMILY },
            color: chartTextColor(darkMode),
          },
          ticks: {
            color: chartTextColor(darkMode),
            font: { family: CHART_FONT_FAMILY, size: 11 },
            callback: (value: any) => `${value}%`
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          title: {
            display: true,
            text: housingAxisLabel,
            font: { weight: 'bold', family: CHART_FONT_FAMILY },
            color: chartTextColor(darkMode),
          },
          ticks: {
            color: chartTextColor(darkMode),
            font: { family: CHART_FONT_FAMILY, size: 11 },
            callback: (v: any) => v.toLocaleString()
          }
        },
      }
    };
  };

  public render(): React.JSX.Element {
    const { loading, error, chartKey, description, selectedMetric, selectedHousingType } = this.state;
    const { darkMode } = this.props;
    if (loading) {
      return (
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="chart-container flex-1 w-full">
            <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-4">
                <div>
                  <div className={`h-4 w-32 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded mb-2 animate-pulse`}></div>
                  <div className={`h-10 w-40 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded animate-pulse`}></div>
                </div>
                <div>
                  <div className={`h-4 w-24 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded mb-2 animate-pulse`}></div>
                  <div className={`h-10 w-40 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded animate-pulse`}></div>
                </div>
              </div>
            </div>
            <div className={`h-[400px] w-full max-w-[900px] mx-auto ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg animate-pulse flex items-center justify-center`}>
              <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading chart...</span>
            </div>
            <div className="mt-4">
              <div className={`h-6 w-32 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded mb-2 animate-pulse`}></div>
              <div className={`w-full p-3 border-2 border-[var(--color-border)] ${darkMode ? 'bg-transparent' : 'bg-white/50'} rounded-lg`}>
                <div className={`h-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded mb-2 animate-pulse`}></div>
                <div className={`h-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded mb-2 animate-pulse w-5/6`}></div>
                <div className={`h-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded animate-pulse w-4/6`}></div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="chart-container flex-1 w-full">
          {error && <div className="error-banner bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>}

          <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4">
              <div>
                <label htmlFor="metric-select" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                  Labor Force Metric:
                </label>
                <select
                  id="metric-select"
                  value={selectedMetric}
                  onChange={this.handleMetricChange}
                  className="form-select"
                >
                  <option value="employment">Employment Rate</option>
                  <option value="unemployment">Unemployment Rate</option>
                  <option value="participation">Participation Rate</option>
                </select>
              </div>

              <div>
                <label htmlFor="housing-select" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                  Housing Type:
                </label>
                <select
                  id="housing-select"
                  value={selectedHousingType}
                  onChange={this.handleHousingTypeChange}
                  className="form-select"
                >
                  <option value="total">Total Housing Starts</option>
                  <option value="single">Single-Unit Housing</option>
                  <option value="multiUnit">Multi-Unit Housing</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ height: '400px', width: '100%', maxWidth: '900px', margin: '0 auto' }}>
            <Line
              key={chartKey}
              data={this.getChartData()}
              options={this.getChartOptions()}
              id="labour-housing-chart"
            />
          </div>

          <div className="mt-4">
            <label htmlFor="chart-description" className={`chart-section-label block font-semibold mb-2 text-xl ${darkMode ? 'text-white' : 'text-[var(--color-primary-dark)]'}`}>
              Data Summary
            </label>
            <div
              className={`w-full p-3 border-2 border-[var(--color-border)] rounded-lg text-area-styled ${darkMode ? 'bg-transparent text-white' : 'bg-white/50 text-[var(--color-primary-dark)]'}`}
            >
              {description}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default LabourForceStats;
