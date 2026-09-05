/**
 * Data Source Adapters Index
 * Export all adapters for easy importing
 * 
 * Available Adapters:
 * - CoinGecko/Binance: Crypto price data
 * - Sports: ESPN, TheSportsDB for sports results
 * - News: GNews, MediaStack, DuckDuckGo for news/general
 * - Weather: Open-Meteo for weather predictions
 */

export { BaseAdapter, type AdapterConfig } from './base-adapter';
export { CoinGeckoAdapter } from './coingecko-adapter';
export { BinanceAdapter } from './binance-adapter';
export { SportsAdapter } from './sports-adapter';
export { NewsAdapter } from './news-adapter';
export { WeatherAdapter } from './weather-adapter';
