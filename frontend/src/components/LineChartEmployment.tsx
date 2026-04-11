import React, { Component } from 'react';
import { Line } from 'react-chartjs-2';
import { CHART_FONT_FAMILY, CHART_COLORS, chartGridColor, chartTextColor, chartTitleColor } from '../chartTheme';
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

interface LabourRecord {
  province: number;
  educationLevel: number;
  labourForceStatus: number;
}

interface RatesByProvinceAndEducation {
  [provinceCode: number]: {
    [educationCode: number]: number;
  };
}

interface LineChartState {
  rateData: RatesByProvinceAndEducation;
  loading: boolean;
  error: string | null;
  chartKey: number;
  description: string;
}

interface LineChartProps {
  darkMode: boolean;
}

const PROVINCE_NAMES: Record<number, string> = {
  10: 'NL',
  11: 'PEI',
  12: 'NS',
  13: 'NB',
  24: 'Quebec',
  35: 'Ontario',
  46: 'Manitoba',
  47: 'Saskatchewan',
  48: 'Alberta',
  59: 'BC'
};

const EDUCATION_NAMES: Record<number, string> = {
  0: '0–8 years',
  1: 'Some high school',
  2: 'High school grad',
  3: 'Some post-sec',
  4: 'Post-sec cert/dip',
  5: "Bachelor's",
  6: "Above bachelor's"
};

const PROVINCE_ORDER = [10, 11, 12, 13, 24, 35, 46, 47, 48, 59];

class LineChartEmployment extends Component<LineChartProps, LineChartState> {
  public state: LineChartState = {
    rateData: {},
    loading: true,
    error: null,
    chartKey: Date.now(),
    description: "Employment rate by education level across provinces, calculated from Statistics Canada Labour Force Survey microdata. The rate is the share of labour force participants who are employed."
  };

  public componentDidMount(): void {
    this.fetchData();
  }

  public componentWillUnmount(): void {
    const chartInstance = ChartJS.getChart("employment-chart-container");
    if (chartInstance) {
      chartInstance.destroy();
    }
  }

  private readonly fetchData = async (): Promise<void> => {
    try {
      const response = await fetch('/api/labourMarket');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const records: LabourRecord[] = await response.json();
      const rateData = this.computeRates(records);

      this.setState({ rateData, loading: false, error: null, chartKey: Date.now() });
    } catch (err) {
      console.error('Error fetching labour data:', err);
      this.setState({
        error: err instanceof Error ? err.message : 'Unexpected error',
        loading: false
      });
    }
  };

  private computeRates(records: LabourRecord[]): RatesByProvinceAndEducation {
    const groups: Record<string, { employed: number; labourForce: number }> = {};

    for (const r of records) {
      const key = `${r.province}:${r.educationLevel}`;
      if (!groups[key]) groups[key] = { employed: 0, labourForce: 0 };

      if (r.labourForceStatus === 1) {
        groups[key].employed += 1;
        groups[key].labourForce += 1;
      } else if (r.labourForceStatus === 2) {
        groups[key].labourForce += 1;
      }
    }

    const result: RatesByProvinceAndEducation = {};
    for (const [key, g] of Object.entries(groups)) {
      const [prov, edu] = key.split(':').map(Number);
      if (!result[prov]) result[prov] = {};
      result[prov][edu] = g.labourForce > 0 ? (g.employed / g.labourForce) * 100 : 0;
    }
    return result;
  }

  private readonly getLineChartData = (): any => {
    const { rateData } = this.state;

    const educationCodes = new Set<number>();
    Object.values(rateData).forEach(byEdu => {
      Object.keys(byEdu).forEach(k => educationCodes.add(Number(k)));
    });
    const sortedEdu = Array.from(educationCodes).sort((a, b) => a - b);

    const datasets = sortedEdu.map((eduCode, idx) => {
      const color = CHART_COLORS[idx % CHART_COLORS.length];
      const data = PROVINCE_ORDER.map(prov => rateData[prov]?.[eduCode] ?? null);
      return {
        label: EDUCATION_NAMES[eduCode] ?? `Level ${eduCode}`,
        data,
        backgroundColor: color.fill,
        borderColor: color.solid,
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      };
    });

    return {
      labels: PROVINCE_ORDER.map(p => PROVINCE_NAMES[p] ?? `${p}`),
      datasets
    };
  };

  private readonly getLineOptions = (): any => {
    const { darkMode } = this.props;
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Employment Rate by Education Level Across Provinces',
          font: { size: 18, family: CHART_FONT_FAMILY, weight: 'bold' },
          color: chartTitleColor(darkMode),
          padding: { bottom: 16 },
        },
        legend: {
          position: 'top',
          labels: {
            font: { size: 11, family: CHART_FONT_FAMILY },
            color: chartTextColor(darkMode),
            usePointStyle: true,
            padding: 14,
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw?.toFixed(1) ?? '—'}%`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 40,
          max: 100,
          grid: { color: chartGridColor(darkMode), drawBorder: false },
          title: {
            display: true,
            text: 'Employment Rate (%)',
            font: { weight: 'bold', family: CHART_FONT_FAMILY },
            color: chartTextColor(darkMode),
          },
          ticks: {
            color: chartTextColor(darkMode),
            font: { family: CHART_FONT_FAMILY, size: 11 },
            callback: (v: any) => v + '%'
          }
        },
        x: {
          grid: { color: chartGridColor(darkMode), drawBorder: false },
          title: {
            display: true,
            text: 'Province',
            font: { weight: 'bold', family: CHART_FONT_FAMILY },
            color: chartTextColor(darkMode),
          },
          ticks: { color: chartTextColor(darkMode), font: { family: CHART_FONT_FAMILY, size: 11 } }
        }
      }
    };
  };

  public render(): React.JSX.Element {
    const { loading, error, chartKey, description } = this.state;
    const { darkMode } = this.props;

    if (loading) {
      return (
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="chart-container flex-1 w-full">
            <div className={`h-[400px] w-full max-w-[900px] mx-auto ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg animate-pulse flex items-center justify-center`}>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Loading chart...</span>
            </div>
            <div className="mt-4">
              <div className={`h-6 w-32 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded mb-2 animate-pulse`} />
              <div className={`w-full p-3 border-2 border-[var(--color-border)] rounded-lg ${darkMode ? 'bg-transparent' : 'bg-white/50'}`}>
                <div className={`h-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded mb-2 animate-pulse`} />
                <div className={`h-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded animate-pulse w-4/6`} />
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

          <div style={{ height: '400px', width: '100%', maxWidth: '900px', margin: '0 auto' }}>
            <Line
              key={chartKey}
              data={this.getLineChartData()}
              options={this.getLineOptions()}
              id="employment-chart-container"
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

export default LineChartEmployment;
