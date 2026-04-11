import React, { Component } from 'react';
import { Line } from 'react-chartjs-2';
import {
  CHART_DISPLAY_SANS,
  EDUCATION_LINE_SERIES_STROKES,
  chartGridColor,
  chartTextColor,
  chartTitleColor,
  chartTooltipPluginOptions,
  employmentPlotWashPlugin,
} from '../chartTheme';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  employmentPlotWashPlugin
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
  59: 'BC',
};

const EDUCATION_NAMES: Record<number, string> = {
  0: '0–8 years',
  1: 'Some high school',
  2: 'High school grad',
  3: 'Some post-sec',
  4: 'Post-sec cert/dip',
  5: "Bachelor's",
  6: "Above bachelor's",
};

const PROVINCE_ORDER = [10, 11, 12, 13, 24, 35, 46, 47, 48, 59];

class LineChartEmployment extends Component<LineChartProps, LineChartState> {
  public state: LineChartState = {
    rateData: {},
    loading: true,
    error: null,
    chartKey: Date.now(),
    description:
      'Each coloured line is one education category; the horizontal axis runs east to west across provinces. Rates come from LFS PUMF microdata aggregated in the API (employed ÷ population in each province × education cell, averaged across ingested survey months when several waves exist). Click a legend label to hide or show a line. Raw fallback rows still use employed ÷ labour force.',
  };

  public componentDidMount(): void {
    this.fetchData();
  }

  public componentWillUnmount(): void {
    const chartInstance = ChartJS.getChart('employment-chart-container');
    if (chartInstance) {
      chartInstance.destroy();
    }
  }

  private readonly fetchData = async (): Promise<void> => {
    try {
      const aggRes = await fetch('/api/labourEmploymentRatesByProvinceEducation');
      let rateData: RatesByProvinceAndEducation = {};

      if (aggRes.ok) {
        const rows: {
          province: number;
          educationLevel: number;
          employmentRatePercent: number;
        }[] = await aggRes.json();
        if (rows.length > 0) {
          for (const r of rows) {
            if (!rateData[r.province]) rateData[r.province] = {};
            rateData[r.province][r.educationLevel] = r.employmentRatePercent;
          }
        }
      }

      if (Object.keys(rateData).length === 0) {
        const response = await fetch('/api/labourMarket');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const records: LabourRecord[] = await response.json();
        rateData = this.computeRates(records);
      }

      this.setState({ rateData, loading: false, error: null, chartKey: Date.now() });
    } catch (err) {
      console.error('Error fetching labour data:', err);
      this.setState({
        error: err instanceof Error ? err.message : 'Unexpected error',
        loading: false,
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
    const { darkMode } = this.props;

    const educationCodes = new Set<number>();
    Object.values(rateData).forEach((byEdu) => {
      Object.keys(byEdu).forEach((k) => educationCodes.add(Number(k)));
    });
    const sortedEdu = Array.from(educationCodes).sort((a, b) => a - b);

    const pointFill = darkMode ? 'rgba(15, 17, 22, 0.95)' : '#ffffff';

    const datasets = sortedEdu.map((eduCode, idx) => {
      const stroke = EDUCATION_LINE_SERIES_STROKES[idx % EDUCATION_LINE_SERIES_STROKES.length];
      const data = PROVINCE_ORDER.map((prov) => rateData[prov]?.[eduCode] ?? null);
      return {
        label: EDUCATION_NAMES[eduCode] ?? `Level ${eduCode}`,
        data,
        borderColor: stroke,
        backgroundColor: stroke,
        borderWidth: 2.5,
        tension: 0.22,
        fill: false,
        pointRadius: 3.5,
        pointHoverRadius: 8,
        pointBorderWidth: 2,
        pointBackgroundColor: pointFill,
        pointBorderColor: stroke,
        pointHoverBackgroundColor: stroke,
        pointHoverBorderColor: darkMode ? '#0f1116' : '#ffffff',
        pointHoverBorderWidth: 2,
        borderJoinStyle: 'round' as const,
        spanGaps: false,
      };
    });

    return {
      labels: PROVINCE_ORDER.map((p) => PROVINCE_NAMES[p] ?? `${p}`),
      datasets,
    };
  };

  private readonly getLineOptions = (): any => {
    const { darkMode } = this.props;
    const sans = CHART_DISPLAY_SANS;
    const muted = chartTextColor(darkMode);

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      hover: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        employmentPlotWash: { darkMode },
        title: {
          display: true,
          text: ['Employment rate by education', 'Across provinces, % of population in each group'],
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
            pointStyle: 'line' as const,
            padding: 10,
            boxWidth: 28,
            boxHeight: 10,
          },
        },
        tooltip: {
          ...chartTooltipPluginOptions(darkMode),
          bodyColor: muted,
          callbacks: {
            title: (items: { label: string }[]) => (items.length ? `Province: ${items[0].label}` : ''),
            label: (ctx: any) =>
              `${ctx.dataset.label}: ${ctx.raw != null ? Number(ctx.raw).toFixed(1) : '—'}%`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          min: 0,
          max: 100,
          grid: { color: chartGridColor(darkMode), drawBorder: false },
          title: {
            display: true,
            text: 'Employment rate (% of population in group)',
            font: { weight: '600', family: sans, size: 12 },
            color: muted,
            padding: { bottom: 8 },
          },
          ticks: {
            color: muted,
            font: { family: sans, size: 11 },
            callback: (v: any) => `${v}%`,
          },
        },
        x: {
          grid: { color: chartGridColor(darkMode), drawBorder: false },
          title: {
            display: true,
            text: 'Province',
            font: { weight: '600', family: sans, size: 12 },
            color: muted,
            padding: { top: 10 },
          },
          ticks: {
            color: muted,
            font: { family: sans, size: 11, weight: '500' },
            maxRotation: 0,
          },
        },
      },
    };
  };

  public render(): React.JSX.Element {
    const { loading, error, chartKey, description } = this.state;
    const { darkMode } = this.props;

    if (loading) {
      return (
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="chart-container flex-1 w-full">
            <div
              className={`h-[400px] w-full max-w-[900px] mx-auto ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg animate-pulse flex items-center justify-center`}
            >
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Loading chart...</span>
            </div>
            <div className="mt-4">
              <div
                className={`h-6 w-32 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded mb-2 animate-pulse`}
              />
              <div
                className={`w-full p-3 border-2 border-[var(--color-border)] rounded-lg ${darkMode ? 'bg-transparent' : 'bg-white/50'}`}
              >
                <div
                  className={`h-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded mb-2 animate-pulse`}
                />
                <div
                  className={`h-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded animate-pulse w-4/6`}
                />
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

          <p
            className={`text-xs tracking-wide uppercase mb-3 max-w-[900px] mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
            style={{ fontFamily: CHART_DISPLAY_SANS }}
          >
            Labour Force Survey · PUMF · Legend toggles series
          </p>

          <div
            className={`employment-chart-panel max-w-[900px] mx-auto rounded-2xl border p-5 md:p-6 ${
              darkMode
                ? 'border-white/[0.08] bg-[linear-gradient(165deg,rgba(255,255,255,0.04)_0%,transparent_45%)] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.65)]'
                : 'border-[var(--color-border)] bg-white/60 shadow-[0_20px_40px_-28px_rgba(30,58,74,0.18)]'
            }`}
            style={{ height: '460px', width: '100%' }}
          >
            <Line
              key={chartKey}
              data={this.getLineChartData()}
              options={this.getLineOptions()}
              id="employment-chart-container"
            />
          </div>

          <div className="mt-5 max-w-[900px] mx-auto">
            <label
              htmlFor="employment-chart-description"
              className={`chart-section-label block font-semibold mb-2 text-lg tracking-tight ${darkMode ? 'text-white' : 'text-[var(--color-primary-dark)]'}`}
              style={{ fontFamily: CHART_DISPLAY_SANS }}
            >
              Data summary
            </label>
            <div
              id="employment-chart-description"
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

export default LineChartEmployment;
