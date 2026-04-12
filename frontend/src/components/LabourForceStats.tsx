import React, { Component } from 'react';
import { Line } from 'react-chartjs-2';
import {
  CHART_COLORS,
  CHART_DISPLAY_SANS,
  chartGridColor,
  chartTextColor,
  chartTitleColor,
  chartTooltipPluginOptions,
  labourHousingPlotWashPlugin,
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
  Filler,
  labourHousingPlotWashPlugin
);

interface HousingByYear {
  year: number;
  totalStarts: number;
  singleStarts: number;
  multiUnitStarts: number;
}

/** Ontario annual rates: prefer PUMF roll-up, else published StatCan annual table */
interface LabourRatesByYear {
  year: number;
  employmentRate: number;
  unemploymentRate: number;
  participationRate: number;
  monthsAveraged?: number;
  partialYear?: boolean;
}

interface LabourForceStatsState {
  housingByYear: HousingByYear[];
  labourByYear: LabourRatesByYear[];
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
  /** Set in getChartData for labour tooltip (interpolated gap years between observed rates). */
  private chartLabourInterpolated: boolean[] = [];

  public state: LabourForceStatsState = {
    housingByYear: [],
    labourByYear: [],
    loading: true,
    error: null,
    chartKey: Date.now(),
    selectedMetric: 'employment',
    selectedHousingType: 'total',
    description: 'Loading…'
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

  /**
   * Keep the long published annual series, then attach PUMF calendar-year rows only for years
   * beyond the latest published year (or years absent from published). Avoids replacing 2006–2024
   * with a single recent PUMF year on the chart.
   */
  private static mergePublishedAndPumfAnnual(
    published: LabourRatesByYear[],
    pumf: LabourRatesByYear[]
  ): LabourRatesByYear[] {
    if (published.length === 0) return [...pumf].sort((a, b) => a.year - b.year);
    if (pumf.length === 0) return [...published].sort((a, b) => a.year - b.year);

    const pubYears = new Set(published.map((r) => r.year));
    const maxPubYear = Math.max(...published.map((r) => r.year));

    const map = new Map<number, LabourRatesByYear>();
    for (const r of published) map.set(r.year, { ...r });
    for (const r of pumf) {
      if (r.year > maxPubYear || !pubYears.has(r.year)) {
        map.set(r.year, { ...r });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.year - b.year);
  }

  /**
   * Linearly interpolate null labour values between the nearest non-null neighbours on the housing year axis.
   */
  private static interpolateLabourSeries(
    values: (number | null)[]
  ): { values: (number | null)[]; interpolated: boolean[] } {
    const out = [...values];
    const interpolated = out.map(() => false);
    for (let i = 0; i < out.length; i++) {
      if (out[i] != null) continue;
      let p = i - 1;
      while (p >= 0 && out[p] == null) p--;
      let n = i + 1;
      while (n < out.length && out[n] == null) n++;
      if (p >= 0 && n < out.length && out[p] != null && out[n] != null) {
        const span = n - p;
        const step = (out[n]! - out[p]!) / span;
        for (let j = p + 1; j < n; j++) {
          out[j] = out[p]! + step * (j - p);
          interpolated[j] = true;
        }
      }
    }
    return { values: out, interpolated };
  }

  private readonly fetchData = async (): Promise<void> => {
    try {
      const housingRes = await fetch('/api/housingStats');
      if (!housingRes.ok) throw new Error(`Housing API: HTTP ${housingRes.status}`);

      const [pumfRes, publishedRes] = await Promise.all([
        fetch('/api/labourOntarioAnnualFromPumf'),
        fetch('/api/labourRatesByYear'),
      ]);

      const housingData = await housingRes.json();
      const housingByYear = this.aggregateHousingByYear(housingData);

      let published: LabourRatesByYear[] = [];
      if (publishedRes.ok) {
        const pub = await publishedRes.json();
        if (Array.isArray(pub) && pub.length > 0) {
          published = pub.map((r: Record<string, unknown>) => ({
            year: r.year as number,
            employmentRate: r.employmentRate as number,
            unemploymentRate: r.unemploymentRate as number,
            participationRate: r.participationRate as number,
          }));
        }
      }

      let pumf: LabourRatesByYear[] = [];
      if (pumfRes.ok) {
        const raw = await pumfRes.json();
        if (Array.isArray(raw) && raw.length > 0) {
          pumf = raw.map((r: Record<string, unknown>) => ({
            year: r.year as number,
            employmentRate: r.employmentRate as number,
            unemploymentRate: r.unemploymentRate as number,
            participationRate: r.participationRate as number,
            monthsAveraged: r.monthsAveraged as number | undefined,
            partialYear: r.partialYear as boolean | undefined,
          }));
        }
      }

      /** Published baseline; PUMF rows apply only for years after the latest published year (or years missing from published). */
      const labourByYear = LabourForceStats.mergePublishedAndPumfAnnual(published, pumf);

      let description = '';
      if (published.length > 0 && pumf.length > 0) {
        description =
          'Housing starts for Toronto are from Statistics Canada (table 34-10-0154). Ontario labour rates combine published annual LFS summary (StatCan 14100393) through the latest official year with PUMF-derived calendar-year averages for later years (partial-year when fewer than 12 survey months are loaded). Any calendar year on this chart that falls between those anchors but has no direct estimate is filled by linear interpolation for display only (see tooltip).';
      } else if (pumf.length > 0) {
        description =
          'Housing starts for Toronto are from Statistics Canada (table 34-10-0154). Ontario employment, unemployment, and participation rates are derived from LFS PUMF microdata: for each calendar year we average the monthly rates from every survey wave you have loaded (a rolling mean when fewer than 12 months exist for that year; see partialYear in the API).';
      } else if (published.length > 0) {
        description =
          'Housing starts for Toronto are from Statistics Canada (table 34-10-0154). Ontario labour rates by year use published annual LFS summary data (StatCan product 14100393). Ingest LFS PUMF months to extend past the latest published annual year.';
      }

      if (description) {
        description +=
          " Labour rates are from Statistics Canada's Labour Force Survey, a sample survey of households: sampling variability, revisions, and (on this chart) blending sources or interpolating missing years can make year-to-year movement look sharper or more dramatic than a single smooth official series would suggest.";
      }

      if (labourByYear.length === 0) {
        throw new Error('No Ontario labour rate time series (load PUMF and/or annual summary via ingester)');
      }

      this.setState({
        housingByYear,
        labourByYear,
        description,
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
    const { housingByYear, labourByYear, selectedMetric, selectedHousingType } = this.state;

    const labels = housingByYear.map(h => String(h.year));

    const rateMap = new Map<number, LabourRatesByYear>(
      labourByYear.map((r) => [r.year, r])
    );

    const rawLabour = housingByYear.map((h) => {
      const row = rateMap.get(h.year);
      if (!row) return null;
      switch (selectedMetric) {
        case 'employment':
          return row.employmentRate;
        case 'unemployment':
          return row.unemploymentRate;
        default:
          return row.participationRate;
      }
    });

    const { values: labourSeries, interpolated } = LabourForceStats.interpolateLabourSeries(rawLabour);
    this.chartLabourInterpolated = interpolated;

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

    const labourStroke = CHART_COLORS[1]?.solid ?? 'rgba(43, 155, 218, 1)';
    const housingStroke = CHART_COLORS[2]?.solid ?? 'rgba(255, 99, 132, 1)';
    const housingFill = CHART_COLORS[2]?.fill ?? 'rgba(255, 99, 132, 0.12)';
    const { darkMode } = this.props;
    const pointFillLabour = darkMode ? 'rgba(15, 17, 22, 0.95)' : '#ffffff';

    return {
      labels,
      datasets: [
        {
          label: labourLabel,
          data: labourSeries,
          borderColor: labourStroke,
          backgroundColor: labourStroke,
          yAxisID: 'y',
          fill: false,
          tension: 0.18,
          borderDash: [7, 5],
          borderWidth: 2.5,
          pointRadius: 3.5,
          pointHoverRadius: 8,
          pointBackgroundColor: pointFillLabour,
          pointBorderColor: labourStroke,
          pointBorderWidth: 2,
          spanGaps: true,
        },
        {
          label: housingLabel,
          data: housingMetric,
          borderColor: housingStroke,
          backgroundColor: housingFill,
          yAxisID: 'y1',
          fill: true,
          tension: 0.28,
          borderWidth: 2.5,
          pointRadius: 3.5,
          pointHoverRadius: 8,
          pointBackgroundColor: pointFillLabour,
          pointBorderColor: housingStroke,
          pointBorderWidth: 2,
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

    // Full 0–100% scale so movement is not exaggerated by a zoomed band
    const laborForceAxisRange = { min: 0, max: 100 };

    const sans = CHART_DISPLAY_SANS;
    const muted = chartTextColor(darkMode);

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        labourHousingPlotWash: { darkMode },
        title: {
          display: true,
          text: [
            `${laborForceAxisLabel} vs ${housingAxisLabel}`,
            'Toronto housing (units) · Ontario labour rate (%)',
          ],
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
            color: muted,
            font: { family: sans, size: 11, weight: '500' },
            usePointStyle: true,
            pointStyle: 'line' as const,
            padding: 10,
            boxWidth: 28,
            boxHeight: 10,
          },
        },
        tooltip: {
          ...chartTooltipPluginOptions(darkMode),
          callbacks: {
            label: (ctx: any) => {
              let label = ctx.dataset.label || '';
              if (label) label += ': ';
              if (ctx.datasetIndex === 0) {
                const y = ctx.parsed.y;
                label += y == null ? 'n/a' : Number(y).toFixed(1) + '%';
                if (y != null && this.chartLabourInterpolated[ctx.dataIndex]) {
                  label += ' (interpolated)';
                }
              } else {
                label += ctx.parsed.y.toLocaleString();
              }
              return label;
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          grid: { color: chartGridColor(darkMode), drawBorder: false },
          title: {
            display: true,
            text: 'Year',
            font: { weight: '600', family: sans, size: 12 },
            color: muted,
            padding: { top: 10 },
          },
          ticks: { color: muted, font: { family: sans, size: 11, weight: '500' }, maxRotation: 0 },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          min: laborForceAxisRange.min,
          max: laborForceAxisRange.max,
          beginAtZero: true,
          grid: { color: chartGridColor(darkMode), drawBorder: false },
          title: {
            display: true,
            text: laborForceAxisLabel,
            font: { weight: '600', family: sans, size: 12 },
            color: muted,
            padding: { bottom: 8 },
          },
          ticks: {
            color: muted,
            font: { family: sans, size: 11 },
            callback: (value: any) => `${value}%`,
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          title: {
            display: true,
            text: housingAxisLabel,
            font: { weight: '600', family: sans, size: 12 },
            color: muted,
            padding: { bottom: 8 },
          },
          ticks: {
            color: muted,
            font: { family: sans, size: 11 },
            callback: (v: any) => v.toLocaleString(),
          },
        },
      },
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

          <p
            className={`text-xs tracking-wide uppercase mb-3 max-w-[900px] mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
            style={{ fontFamily: CHART_DISPLAY_SANS }}
          >
            StatCan tables · Published annual labour + PUMF where loaded · Interpolation noted in tooltip
          </p>

          <div className="mb-4 flex flex-wrap gap-4 items-center justify-between max-w-[900px] mx-auto">
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

          <div
            className={`labour-housing-chart-panel max-w-[900px] mx-auto rounded-2xl border p-5 md:p-6 ${
              darkMode
                ? 'border-white/[0.08] bg-[linear-gradient(165deg,rgba(255,255,255,0.04)_0%,transparent_45%)] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.65)]'
                : 'border-[var(--color-border)] bg-white/60 shadow-[0_20px_40px_-28px_rgba(30,58,74,0.18)]'
            }`}
            style={{ height: '460px', width: '100%' }}
          >
            <Line
              key={chartKey}
              data={this.getChartData()}
              options={this.getChartOptions()}
              id="labour-housing-chart"
            />
          </div>

          <div className="mt-5 max-w-[900px] mx-auto">
            <label
              htmlFor="labour-housing-chart-description"
              className={`chart-section-label block font-semibold mb-2 text-lg tracking-tight ${darkMode ? 'text-white' : 'text-[var(--color-primary-dark)]'}`}
              style={{ fontFamily: CHART_DISPLAY_SANS }}
            >
              Data summary
            </label>
            <div
              id="labour-housing-chart-description"
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

export default LabourForceStats;
