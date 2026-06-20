export interface DailyWeather {
  date: string;
  weekday: string;

  minTemperature: number | null;
  maxTemperature: number | null;

  morningCondition: string | null;
  afternoonCondition: string | null;

  morningRainProbability: number | null;
  afternoonRainProbability: number | null;

  source: "short" | "mid";
}