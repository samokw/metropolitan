import React, { Component } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { MonthlyData, fetchProcessedHousingData } from '../services/HousingDataService';
import {
    CHART_DISPLAY_SANS,
    HOUSING_BAR_CITY_COLORS,
    chartGridColor,
    chartTextColor,
    chartTitleColor,
    chartTooltipPluginOptions,
    housingBarPlotWashPlugin,
} from '../chartTheme';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, housingBarPlotWashPlugin);


interface HousingChartState {
    startsData: MonthlyData[];
    completionsData: MonthlyData[];
    loading: boolean;
    error: string | null;
    chartKey: number;
    showCompletions: boolean;
    description: string;
    selectedMonth: number | null;
    availableMonths: number[];
    selectedYear: number | null;
    availableYears: number[];
}


interface HousingChartProps {
    showCompletions: boolean;
    onToggleView: () => void;
    darkMode: boolean;
}

class HousingChart extends Component<HousingChartProps, HousingChartState> {
    public state: HousingChartState = {
        startsData: [],
        completionsData: [],
        loading: true,
        error: null,
        chartKey: Date.now(),
        showCompletions: this.props.showCompletions,
        description: "This interactive chart compares housing metrics between Toronto and Hamilton by month, providing valuable insights into regional development. The Housing Starts view displays the number of new construction projects initiated in each city, while the Housing Completions view shows the number of residential projects that reached completion. By toggling between these views, users can analyze the relationship between project initiation and completion rates, helping urban planners, real estate investors, and policymakers understand construction timelines, market efficiency, and housing supply trends.",
        selectedMonth: null,
        availableMonths: [],
        selectedYear: null,
        availableYears: []
    };

    public componentDidMount(): void {
        this.loadData();
    }

    public componentDidUpdate(prevProps: HousingChartProps): void {
        if (prevProps.showCompletions !== this.props.showCompletions) {
            this.setState({
                showCompletions: this.props.showCompletions,
                chartKey: Date.now()
            });
        }
    }

    public componentWillUnmount(): void {
        // Explicitly destroy chart instance
        const chartInstance = ChartJS.getChart("chart-container");
        if (chartInstance) {
            chartInstance.destroy();
        }
    }

    // Handle month selection change
    private readonly handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
        const value = event.target.value;
        const selectedMonth = value === "all" ? null : parseInt(value, 10);

        this.setState({
            selectedMonth,
            chartKey: Date.now()
        });
    };

    private readonly handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
        const value = parseInt(event.target.value, 10);
        this.setState({ loading: true });
        this.loadData(value);
    };

    private readonly loadData = async (year?: number): Promise<void> => {
        try {
            const data = await fetchProcessedHousingData(year);

            this.setState({
                startsData: data.startsData,
                completionsData: data.completionsData,
                availableMonths: data.availableMonths,
                availableYears: data.availableYears,
                selectedYear: year ?? data.availableYears[0] ?? null,
                loading: false,
                error: null,
                chartKey: Date.now()
            });
        } catch (err) {
            console.error('Error loading housing data:', err);
            this.setState({
                error: err instanceof Error ? err.message : "Unexpected error",
                loading: false
            });
        }
    };

    private readonly getChartData = (): any => {
        const { startsData, completionsData, showCompletions, selectedMonth } = this.state;
        let data = showCompletions ? completionsData : startsData;

        // Filter by selected month if one is selected
        if (selectedMonth !== null) {
            data = data.filter(item => item.month === selectedMonth);
        }

        // Convert month numbers to names
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return {
            labels: data.map(item => {
                // Ensure month is treated as a number and is within valid range
                const monthIndex = typeof item.month === 'number' ?
                    Math.min(Math.max(Math.floor(item.month) - 1, 0), 11) : 0;
                return monthNames[monthIndex] || `Month ${item.month}`;
            }),
            datasets: [
                {
                    label: 'Toronto',
                    data: data.map(item => item.toronto || 0),
                    backgroundColor: HOUSING_BAR_CITY_COLORS.toronto.fill,
                    borderColor: HOUSING_BAR_CITY_COLORS.toronto.stroke,
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                },
                {
                    label: 'Hamilton',
                    data: data.map(item => item.hamilton || 0),
                    backgroundColor: HOUSING_BAR_CITY_COLORS.hamilton.fill,
                    borderColor: HOUSING_BAR_CITY_COLORS.hamilton.stroke,
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                }
            ],
        };
    };

    private readonly getBarOptions = (): any => {
        const { darkMode } = this.props;
        const { showCompletions, selectedMonth } = this.state;
        const sans = CHART_DISPLAY_SANS;
        const muted = chartTextColor(darkMode);

        const yAxisTitle = showCompletions ? 'Housing completions (units)' : 'Housing starts (units)';
        const titleLines =
            showCompletions
                ? selectedMonth === null
                    ? ['Housing completions by month', 'Toronto & Hamilton']
                    : ['Housing completions — selected month', 'Toronto & Hamilton']
                : selectedMonth === null
                  ? ['Housing starts by month', 'Toronto & Hamilton']
                  : ['Housing starts — selected month', 'Toronto & Hamilton'];

        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index' as const, intersect: false },
            plugins: {
                housingBarPlotWash: { darkMode },
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
                        pointStyle: 'rect' as const,
                        padding: 10,
                        boxWidth: 10,
                        boxHeight: 10,
                    },
                },
                tooltip: {
                    ...chartTooltipPluginOptions(darkMode),
                    callbacks: {
                        label: (ctx: { dataset: { label?: string }; raw: number }) =>
                            `${ctx.dataset.label ?? ''}: ${Number(ctx.raw).toLocaleString()}`,
                    },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: chartGridColor(darkMode), drawBorder: false },
                    title: {
                        display: true,
                        text: yAxisTitle,
                        font: { size: 12, family: sans, weight: '600' },
                        color: muted,
                        padding: { bottom: 8 },
                    },
                    ticks: { color: muted, font: { family: sans, size: 11 } },
                },
                x: {
                    grid: { color: chartGridColor(darkMode), drawBorder: false },
                    title: {
                        display: true,
                        text: 'Month',
                        font: { size: 12, family: sans, weight: '600' },
                        color: muted,
                        padding: { top: 10 },
                    },
                    ticks: { color: muted, font: { family: sans, size: 11, weight: '500' }, maxRotation: 0 },
                },
            },
        };
    };

    public render(): React.JSX.Element {
        const { loading, error, chartKey, description, showCompletions, availableMonths, selectedMonth } = this.state;
        const { darkMode } = this.props;
        if (loading) {
            return (
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Skeleton Chart Container */}
                    <div className="chart-container flex-1 w-full">
                        {/* Skeleton controls */}
                        <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
                            <div className={`h-10 w-48 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded animate-pulse`}></div>
                            <div className="flex items-center gap-2">
                                <div className={`h-5 w-24 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded animate-pulse`}></div>
                                <div className={`h-10 w-36 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded animate-pulse`}></div>
                            </div>
                        </div>

                        {/* Skeleton chart area */}
                        <div className={`h-[400px] w-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg animate-pulse flex items-center justify-center`}>
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
        // Convert month numbers to names for the dropdown
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        return (
            <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Chart Container */}
                <div className="chart-container flex-1 w-full">
                    {error && <div className="error-banner bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>}

                    <p
                        className={`text-xs tracking-wide uppercase mb-3 max-w-[900px] mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
                        style={{ fontFamily: CHART_DISPLAY_SANS }}
                    >
                        CMHC-style census · Toronto & Hamilton · Year & month filters
                    </p>

                    <div className="mb-4 flex flex-wrap gap-4 items-center justify-between max-w-[900px] mx-auto">
                        <button
                            onClick={this.props.onToggleView}
                            className="toggle-btn"
                        >
                            {showCompletions ? "Show Housing Starts" : "Show Housing Completions"}
                        </button>

                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center">
                                <label htmlFor="year-filter" className={`mr-2 font-semibold ${darkMode ? 'text-white' : 'text-gray-700'}`}>Year:</label>
                                <select
                                    id="year-filter"
                                    value={this.state.selectedYear?.toString() ?? ''}
                                    onChange={this.handleYearChange}
                                    className="form-select"
                                >
                                    {this.state.availableYears.map(y => (
                                        <option key={y} value={y.toString()}>{y}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center">
                                <label htmlFor="month-filter" className={`mr-2 font-semibold ${darkMode ? 'text-white' : 'text-gray-700'}`}>Month:</label>
                                <select
                                    id="month-filter"
                                    value={selectedMonth === null ? "all" : selectedMonth.toString()}
                                    onChange={this.handleMonthChange}
                                    className="form-select"
                                >
                                    <option value="all">All Months</option>
                                    {availableMonths.map(month => (
                                        <option key={month} value={month.toString()}>
                                            {monthNames[month - 1] || `Month ${month}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`housing-bar-chart-panel max-w-[900px] mx-auto rounded-2xl border p-5 md:p-6 ${
                            darkMode
                                ? 'border-white/[0.08] bg-[linear-gradient(165deg,rgba(255,255,255,0.04)_0%,transparent_45%)] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.65)]'
                                : 'border-[var(--color-border)] bg-white/60 shadow-[0_20px_40px_-28px_rgba(30,58,74,0.18)]'
                        }`}
                        style={{ height: '460px', width: '100%' }}
                    >
                        <Bar
                            key={chartKey}
                            data={this.getChartData()}
                            options={this.getBarOptions()}
                            id="chart-container"
                        />
                    </div>

                    <div className="mt-5 max-w-[900px] mx-auto">
                        <label
                            htmlFor="chart-description"
                            className={`chart-section-label block font-semibold mb-2 text-lg tracking-tight ${darkMode ? 'text-white' : 'text-[var(--color-primary-dark)]'}`}
                            style={{ fontFamily: CHART_DISPLAY_SANS }}
                        >
                            Data summary
                        </label>
                        <div
                            id="chart-description"
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

export default HousingChart;
