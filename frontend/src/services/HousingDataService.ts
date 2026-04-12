import { HousingData } from "../types/HousingData";

const API_URL = '/api/housingStats';
console.log('API_URL:', API_URL);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
export const getAllData = async (): Promise<HousingData[]> => {
  console.log('Fetching all data from:', `${API_URL}`);
  const url = `${API_BASE_URL}${API_URL}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    console.log('API response:', data);
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    return [];
  }
};

export const getData = async (id: number): Promise<HousingData> => {
  console.log(`Fetching data with id ${id} from:`, `${API_URL}/id/${id}`);  // Log the full endpoint
  try {
    const response = await fetch(`${API_URL}/id/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};

export const getStartsByCensusArea = async (censusArea: string) :Promise<number> => {
  const url = `${API_BASE_URL}${API_URL}/starts/${censusArea}`;
  console.log(`Fetching data for the city ${censusArea} from:`, `${API_URL}/starts/${censusArea}`);  // Log the full endpoint
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};

export const getCompletionsByCensusArea = async (censusArea: string): Promise<number> => {
  console.log(`Fetching completions data for the city ${censusArea} from:`, `${API_URL}/completions/${censusArea}`);
  try {
    const response = await fetch(`${API_URL}/completions/${censusArea}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching completions data:', error);
    throw error;
  }
};

export interface MonthlyData {
  month: number;
  toronto: number;
  hamilton: number;
}

export interface ProcessedHousingData {
  startsData: MonthlyData[];
  completionsData: MonthlyData[];
  availableMonths: number[];
  availableYears: number[];
}

export const fetchProcessedHousingData = async (selectedYear?: number): Promise<ProcessedHousingData> => {
  try {
    const response = await fetch(`${API_URL}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const allData = await response.json();
    const yearsSet = new Set<number>();
    const monthsSet = new Set<number>();

    allData.forEach((item: any) => {
      if (item.year) yearsSet.add(item.year);
    });

    const availableYears = Array.from(yearsSet).sort((a, b) => b - a);
    const filterYear = selectedYear ?? availableYears[0];

    const startsDataMap = new Map<number, MonthlyData>();
    const completionsDataMap = new Map<number, MonthlyData>();

    allData.forEach((item: any) => {
      const year = item.year ?? 0;
      if (year !== filterYear) return;

      const month = item.month ?? 1;
      monthsSet.add(month);

      if (!startsDataMap.has(month)) {
        startsDataMap.set(month, { month, toronto: 0, hamilton: 0 });
      }
      if (!completionsDataMap.has(month)) {
        completionsDataMap.set(month, { month, toronto: 0, hamilton: 0 });
      }

      if (item.censusArea === "Toronto") {
        startsDataMap.get(month)!.toronto += item.totalStarts || 0;
        completionsDataMap.get(month)!.toronto += item.totalComplete || 0;
      } else if (item.censusArea === "Hamilton") {
        startsDataMap.get(month)!.hamilton += item.totalStarts || 0;
        completionsDataMap.get(month)!.hamilton += item.totalComplete || 0;
      }
    });

    return {
      startsData: Array.from(startsDataMap.values()).sort((a, b) => a.month - b.month),
      completionsData: Array.from(completionsDataMap.values()).sort((a, b) => a.month - b.month),
      availableMonths: Array.from(monthsSet).sort((a, b) => a - b),
      availableYears
    };
  } catch (error) {
    console.error('Error in fetchProcessedHousingData:', error);
    return { startsData: [], completionsData: [], availableMonths: [], availableYears: [] };
  }
};
