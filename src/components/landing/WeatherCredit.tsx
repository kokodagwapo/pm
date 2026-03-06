"use client";

import { useState, useEffect } from "react";

// Naples, FL coordinates
const NAPLES_LAT = 26.142;
const NAPLES_LON = -81.7948;

export function WeatherCredit() {
  const [weather, setWeather] = useState<{ temp: number; condition: string } | null>(null);

  useEffect(() => {
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${NAPLES_LAT}&longitude=${NAPLES_LON}&current=temperature_2m,weather_code&timezone=America/New_York&temperature_unit=fahrenheit`
    )
      .then((res) => res.json())
      .then((data) => {
        const code = data?.current?.weather_code ?? 0;
        const conditions: Record<number, string> = {
          0: "Clear",
          1: "Partly Cloudy",
          2: "Partly Cloudy",
          3: "Cloudy",
          45: "Foggy",
          48: "Foggy",
          51: "Drizzle",
          61: "Rain",
          80: "Showers",
          95: "Storm",
        };
        const condition =
          conditions[code] ??
          (code < 4 ? "Cloudy" : code < 60 ? "Rain" : "Storm");
        setWeather({
          temp: Math.round(data?.current?.temperature_2m ?? 82),
          condition: code === 0 ? "Sunny" : condition,
        });
      })
      .catch(() => setWeather({ temp: 82, condition: "Sunny" }));
  }, []);

  const display = weather ? `${weather.temp}°F · ${weather.condition}` : "82°F · Sunny";

  return (
    <div
      className="px-3 py-1.5 rounded-lg text-white/60 text-[10px] font-thin tracking-widest"
      style={{
        background: "rgba(0,0,0,0.3)",
        backdropFilter: "blur(8px)",
      }}
    >
      Video: Mixkit · Naples {display}
    </div>
  );
}
