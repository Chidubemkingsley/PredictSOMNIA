/**
 * Weather Data Adapter
 * Fetches real weather data for weather-related predictions
 */

import { BaseAdapter } from './base-adapter';
import { SourceData, MarketCategory, ResolutionQuery } from '../types';

interface WeatherData {
  location: string;
  temperature: number;
  temperatureUnit: string;
  conditions: string;
  humidity: number;
  windSpeed: number;
  forecast: ForecastDay[];
}

interface ForecastDay {
  date: string;
  tempHigh: number;
  tempLow: number;
  conditions: string;
  precipitation: number;
}

export class WeatherAdapter extends BaseAdapter {
  public readonly name = 'Weather Data';
  public readonly category = [MarketCategory.WEATHER];
  public readonly priority = 1;

  // Free weather APIs
  private readonly OPENMETEO_API = 'https://api.open-meteo.com/v1';
  private readonly WTTR_API = 'https://wttr.in';

  async fetchData(query: ResolutionQuery): Promise<SourceData> {
    const question = query.market.question;
    const description = query.market.description || '';

    try {
      // Extract location from question
      const location = this.extractLocation(question + ' ' + description);
      
      if (!location) {
        return this.getFallbackData(question, 'No location detected in question');
      }

      // Get coordinates for location
      const coords = await this.geocodeLocation(location);
      
      if (!coords) {
        return this.getFallbackData(question, `Could not geocode location: ${location}`);
      }

      // Fetch weather data
      const weatherData = await this.fetchOpenMeteo(coords.lat, coords.lon, location);
      const analysis = this.analyzeWeatherForMarket(weatherData, question);

      return {
        source: this.name,
        category: MarketCategory.WEATHER,
        fetchedAt: new Date(),
        data: {
          question,
          location,
          coordinates: coords,
          current: weatherData,
          analysis,
        },
        confidence: 8500, // Weather APIs are generally reliable
        metadata: {
          location,
          forecastDays: weatherData.forecast?.length || 0,
        },
      };
    } catch (error) {
      console.error('[Weather Adapter] Error:', error);
      return this.getFallbackData(question, String(error));
    }
  }

  private extractLocation(text: string): string | null {
    const textLower = text.toLowerCase();

    // Common city patterns
    const cityPatterns = [
      /in\s+([A-Z][a-zA-Z\s]+?)(?:\s+(?:will|be|reach|exceed|drop))/i,
      /(?:temperature|weather|rain|snow|cold|hot|warm)\s+in\s+([A-Z][a-zA-Z\s,]+)/i,
      /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s+(?:temperature|weather)/i,
    ];

    for (const pattern of cityPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Major cities detection
    const majorCities = [
      'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Miami', 'Seattle',
      'London', 'Paris', 'Tokyo', 'Sydney', 'Dubai', 'Singapore', 'Hong Kong',
      'Berlin', 'Madrid', 'Rome', 'Amsterdam', 'Toronto', 'Vancouver',
    ];

    for (const city of majorCities) {
      if (textLower.includes(city.toLowerCase())) {
        return city;
      }
    }

    return null;
  }

  private async geocodeLocation(location: string): Promise<{ lat: number; lon: number } | null> {
    try {
      // Use Open-Meteo's geocoding API (free, no key required)
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
      
      const response = await fetch(url);
      if (!response.ok) return null;

      const data = await response.json();
      if (data.results && data.results.length > 0) {
        return {
          lat: data.results[0].latitude,
          lon: data.results[0].longitude,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private async fetchOpenMeteo(lat: number, lon: number, location: string): Promise<WeatherData> {
    // Fetch current weather and 14-day forecast (free, no API key)
    const url = `${this.OPENMETEO_API}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=auto&forecast_days=14`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Parse current weather
    const current = data.current || {};
    const daily = data.daily || {};

    // Map weather code to conditions
    const conditions = this.weatherCodeToCondition(current.weather_code);

    // Build forecast
    const forecast: ForecastDay[] = [];
    if (daily.time) {
      for (let i = 0; i < Math.min(daily.time.length, 14); i++) {
        forecast.push({
          date: daily.time[i],
          tempHigh: daily.temperature_2m_max?.[i] || 0,
          tempLow: daily.temperature_2m_min?.[i] || 0,
          conditions: this.weatherCodeToCondition(daily.weather_code?.[i]),
          precipitation: daily.precipitation_probability_max?.[i] || 0,
        });
      }
    }

    return {
      location,
      temperature: current.temperature_2m || 0,
      temperatureUnit: '°C',
      conditions,
      humidity: current.relative_humidity_2m || 0,
      windSpeed: current.wind_speed_10m || 0,
      forecast,
    };
  }

  private weatherCodeToCondition(code: number): string {
    const conditions: Record<number, string> = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail',
    };
    return conditions[code] || 'Unknown';
  }

  private analyzeWeatherForMarket(weather: WeatherData, question: string): string {
    const questionLower = question.toLowerCase();
    const lines: string[] = [];

    lines.push(`📍 Location: ${weather.location}`);
    lines.push(`🌡️ Current: ${weather.temperature}${weather.temperatureUnit}, ${weather.conditions}`);
    lines.push(`💧 Humidity: ${weather.humidity}%`);
    lines.push(`💨 Wind: ${weather.windSpeed} km/h`);

    // Check for temperature-related questions
    if (questionLower.includes('temperature') || questionLower.includes('degree') || questionLower.includes('cold') || questionLower.includes('hot')) {
      // Extract target temperature if present
      const tempMatch = question.match(/(\d+)\s*(?:°?[CF]|degrees?|celsius|fahrenheit)/i);
      if (tempMatch) {
        const targetTemp = parseInt(tempMatch[1]);
        const _isCelsius = !questionLower.includes('fahrenheit') && !questionLower.includes('°f');
        const currentTemp = weather.temperature;

        lines.push(`\n📊 Target: ${targetTemp}° vs Current: ${currentTemp}°C`);
        
        // Check forecast for temperature trends
        const willReachTemp = weather.forecast.some(day => 
          (questionLower.includes('above') || questionLower.includes('exceed') || questionLower.includes('reach')) 
            ? day.tempHigh >= targetTemp 
            : day.tempLow <= targetTemp
        );
        lines.push(`📅 Forecast suggests: ${willReachTemp ? 'LIKELY' : 'UNLIKELY'} to reach target`);
      }
    }

    // Check for precipitation questions
    if (questionLower.includes('rain') || questionLower.includes('snow') || questionLower.includes('precipitation')) {
      const rainyDays = weather.forecast.filter(day => day.precipitation > 50).length;
      lines.push(`\n🌧️ Days with >50% precipitation chance: ${rainyDays}/${weather.forecast.length}`);
    }

    // Add 3-day summary
    if (weather.forecast.length >= 3) {
      lines.push('\n📆 3-Day Outlook:');
      for (const day of weather.forecast.slice(0, 3)) {
        lines.push(`  ${day.date}: ${day.tempLow}°-${day.tempHigh}°C, ${day.conditions}`);
      }
    }

    return lines.join('\n');
  }

  private getFallbackData(question: string, reason: string): SourceData {
    return {
      source: this.name,
      category: MarketCategory.WEATHER,
      fetchedAt: new Date(),
      data: {
        question,
        error: reason,
        suggestion: 'Check weather.com, Open-Meteo, or local meteorological services for accurate data.',
        manualVerificationRequired: true,
      },
      confidence: 3000,
      metadata: { fallback: true, reason },
    };
  }

  canHandle(query: ResolutionQuery): boolean {
    const question = query.market.question.toLowerCase();
    const weatherKeywords = [
      'temperature', 'weather', 'rain', 'snow', 'cold', 'hot', 'warm', 'freeze',
      'celsius', 'fahrenheit', 'degree', 'forecast', 'storm', 'hurricane', 'tornado',
      'wind', 'humidity', 'precipitation', 'sunny', 'cloudy', 'climate',
    ];
    return weatherKeywords.some(kw => question.includes(kw));
  }

  validate(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return typeof d.temperature === 'number' || typeof d.location === 'string';
  }
}
