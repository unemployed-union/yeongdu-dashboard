// components/weather/WeatherIcon.tsx

import type { IconType } from "react-icons";
import {
  WiCloudy,
  WiDayCloudy,
  WiDaySunny,
  WiFog,
  WiNa,
  WiNightAltCloudy,
  WiNightClear,
  WiRain,
  WiRainMix,
  WiShowers,
  WiSnow,
  WiThunderstorm,
} from "react-icons/wi";

export type WeatherIconCode =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "rain"
  | "shower"
  | "sleet"
  | "snow"
  | "thunderstorm"
  | "fog"
  | "unknown";

const DAY_ICONS: Record<WeatherIconCode, IconType> = {
  clear: WiDaySunny,
  "partly-cloudy": WiDayCloudy,
  cloudy: WiCloudy,
  rain: WiRain,
  shower: WiShowers,
  sleet: WiRainMix,
  snow: WiSnow,
  thunderstorm: WiThunderstorm,
  fog: WiFog,
  unknown: WiNa,
};

const NIGHT_ICONS: Record<WeatherIconCode, IconType> = {
  clear: WiNightClear,
  "partly-cloudy": WiNightAltCloudy,
  cloudy: WiCloudy,
  rain: WiRain,
  shower: WiShowers,
  sleet: WiRainMix,
  snow: WiSnow,
  thunderstorm: WiThunderstorm,
  fog: WiFog,
  unknown: WiNa,
};

interface WeatherIconProps {
  code: WeatherIconCode;
  isDaytime?: boolean;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export function WeatherIcon({
  code,
  isDaytime = true,
  size = 64,
  className,
  ariaLabel,
}: WeatherIconProps) {
  const iconMap = isDaytime
    ? DAY_ICONS
    : NIGHT_ICONS;

  const Icon = iconMap[code] ?? WiNa;

  return (
    <Icon
      size={size}
      className={className}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
    />
  );
}