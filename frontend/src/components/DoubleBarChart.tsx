import React, { Component } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { MonthlyData, fetchProcessedHousingData } from '../services/HousingDataService';
import { CHART_FONT_FAMILY, chartGridColor, chartTextColor, chartTitleColor } from '../chartTheme';

// Register required Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);


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
                    backgroundColor: 'rgba(0, 255, 247, 0.5)',
                    borderColor: 'rgba(0, 255, 247, 1)',
                    borderWidth: 1,
                },
                {
                    label: 'Hamilton',
                    data: data.map(item => item.hamilton || 0),
                    backgroundColor: 'rgba(0, 65, 187, 0.5)',
                    borderColor: 'rgba(0, 65, 187, 1)',
                    borderWidth: 1,
                }
            ],
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
        let chartTitle;
        let yAxisTitle;

        if (showCompletions) {
            chartTitle = selectedMonth === null
                ? 'All Months Housing Completions Comparison'
                : 'Monthly Housing Completions Comparison';
            yAxisTitle = 'Number of Housing Completions';
        } else {
            chartTitle = selectedMonth === null
                ? 'All Months Housing Starts Comparison'
                : 'Monthly Housing Starts Comparison';
            yAxisTitle = 'Number of Housing Starts';
        }

        // Convert month numbers to names for the dropdown
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        return (
            <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Chart Container */}
                <div className="chart-container flex-1 w-full">
                    {error && <div className="error-banner bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>}

                    <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
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

                    <div style={{ height: '400px', width: '100%' }}>
                        <Bar
                            key={chartKey}
                            data={this.getChartData()}
                            options={{
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
                                        display: true,
                                        position: 'top',
                                        labels: {
                                            color: chartTextColor(darkMode),
                                            font: { family: CHART_FONT_FAMILY, size: 12 },
                                            usePointStyle: true,
                                            padding: 16,
                                        }
                                    }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        grid: { color: chartGridColor(darkMode), drawBorder: false },
                                        title: {
                                            display: true,
                                            text: yAxisTitle,
                                            font: { size: 14, family: CHART_FONT_FAMILY, weight: 'normal' },
                                            color: chartTextColor(darkMode),
                                        },
                                        ticks: { color: chartTextColor(darkMode), font: { family: CHART_FONT_FAMILY, size: 11 } },
                                    },
                                    x: {
                                        grid: { color: chartGridColor(darkMode), drawBorder: false },
                                        title: {
                                            display: true,
                                            text: 'Month',
                                            font: { size: 14, family: CHART_FONT_FAMILY, weight: 'normal' },
                                            color: chartTextColor(darkMode),
                                        },
                                        ticks: { color: chartTextColor(darkMode), font: { family: CHART_FONT_FAMILY, size: 11 } },
                                    },
                                },
                            }}
                            id="chart-container"
                        />
                    </div>

                    {/* Description Box */}
                    <div className="mt-4">
                        <label htmlFor="chart-description" className={`chart-section-label block font-semibold mb-2 text-xl ${darkMode ? 'text-white' : 'text-[var(--color-primary-dark)]'}`}>
                            Data Summary
                        </label>
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

export default HousingChart;
