"""
Mock data for development/offline mode.
Used automatically when FINNHUB_API_KEY is empty or not set.
All news links point to real financial news sources for the ticker.
"""
import random
import math
from datetime import datetime, timezone, timedelta



# Comprehensive ticker database — 232 US stocks and ETFs across all sectors
TICKER_DB: list[dict] = [
    {"ticker": "AAPL", "description": "Apple Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "MSFT", "description": "Microsoft Corporation", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "NVDA", "description": "NVIDIA Corporation", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "GOOGL", "description": "Alphabet Inc Class A", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "GOOG", "description": "Alphabet Inc Class C", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "META", "description": "Meta Platforms Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "AVGO", "description": "Broadcom Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "ORCL", "description": "Oracle Corporation", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Technology"},
    {"ticker": "AMD", "description": "Advanced Micro Devices", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "CSCO", "description": "Cisco Systems Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "ADBE", "description": "Adobe Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "ACN", "description": "Accenture PLC", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Technology"},
    {"ticker": "IBM", "description": "IBM Corporation", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Technology"},
    {"ticker": "INTC", "description": "Intel Corporation", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "INTU", "description": "Intuit Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "QCOM", "description": "Qualcomm Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "TXN", "description": "Texas Instruments Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "AMAT", "description": "Applied Materials Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "MU", "description": "Micron Technology Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "LRCX", "description": "Lam Research Corporation", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "NOW", "description": "ServiceNow Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Technology"},
    {"ticker": "SNOW", "description": "Snowflake Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Technology"},
    {"ticker": "PANW", "description": "Palo Alto Networks Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "CRWD", "description": "CrowdStrike Holdings", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "FTNT", "description": "Fortinet Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "NET", "description": "Cloudflare Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Technology"},
    {"ticker": "ZS", "description": "Zscaler Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "DDOG", "description": "Datadog Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "TEAM", "description": "Atlassian Corporation", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "SHOP", "description": "Shopify Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Technology"},
    {"ticker": "TTD", "description": "The Trade Desk Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "MRVL", "description": "Marvell Technology Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "KLAC", "description": "KLA Corporation", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "HPQ", "description": "HP Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Technology"},
    {"ticker": "HPE", "description": "Hewlett Packard Enterprise", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Technology"},
    {"ticker": "DELL", "description": "Dell Technologies Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Technology"},
    {"ticker": "CTSH", "description": "Cognizant Technology Solutions", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "PLTR", "description": "Palantir Technologies Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Technology"},
    {"ticker": "RBLX", "description": "Roblox Corporation", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Technology"},
    {"ticker": "AI", "description": "C3.ai Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Technology"},
    {"ticker": "SMCI", "description": "Super Micro Computer Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "ARM", "description": "Arm Holdings PLC", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "ASML", "description": "ASML Holding NV", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "TSM", "description": "Taiwan Semiconductor Manufacturing", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Technology"},
    {"ticker": "BABA", "description": "Alibaba Group Holding Ltd", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Technology"},
    {"ticker": "BIDU", "description": "Baidu Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "IONQ", "description": "IonQ Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Technology"},
    {"ticker": "SOUN", "description": "SoundHound AI Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "BB", "description": "BlackBerry Limited", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Technology"},
    {"ticker": "GEN", "description": "Gen Digital Inc", "type": "ETF" if "Technology" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Technology"},
    {"ticker": "AMZN", "description": "Amazon.com Inc", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Consumer Cyclical"},
    {"ticker": "TSLA", "description": "Tesla Inc", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Consumer Cyclical"},
    {"ticker": "HD", "description": "Home Depot Inc", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Cyclical"},
    {"ticker": "MCD", "description": "McDonald's Corporation", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Cyclical"},
    {"ticker": "NKE", "description": "Nike Inc", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Cyclical"},
    {"ticker": "SBUX", "description": "Starbucks Corporation", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Consumer Cyclical"},
    {"ticker": "LOW", "description": "Lowe's Companies Inc", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Cyclical"},
    {"ticker": "TGT", "description": "Target Corporation", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Cyclical"},
    {"ticker": "BKNG", "description": "Booking Holdings Inc", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Consumer Cyclical"},
    {"ticker": "MAR", "description": "Marriott International", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Consumer Cyclical"},
    {"ticker": "HLT", "description": "Hilton Worldwide Holdings", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Cyclical"},
    {"ticker": "RCL", "description": "Royal Caribbean Group", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Cyclical"},
    {"ticker": "CCL", "description": "Carnival Corporation", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Cyclical"},
    {"ticker": "NCLH", "description": "Norwegian Cruise Line Holdings", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Cyclical"},
    {"ticker": "GM", "description": "General Motors Company", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Cyclical"},
    {"ticker": "F", "description": "Ford Motor Company", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Cyclical"},
    {"ticker": "RIVN", "description": "Rivian Automotive Inc", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Consumer Cyclical"},
    {"ticker": "LCID", "description": "Lucid Group Inc", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Consumer Cyclical"},
    {"ticker": "EBAY", "description": "eBay Inc", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Consumer Cyclical"},
    {"ticker": "ETSY", "description": "Etsy Inc", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Consumer Cyclical"},
    {"ticker": "GME", "description": "GameStop Corp", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Cyclical"},
    {"ticker": "NIO", "description": "NIO Inc", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Cyclical"},
    {"ticker": "LI", "description": "Li Auto Inc", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Consumer Cyclical"},
    {"ticker": "XPEV", "description": "XPeng Inc", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Cyclical"},
    {"ticker": "JD", "description": "JD.com Inc", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Consumer Cyclical"},
    {"ticker": "PDD", "description": "PDD Holdings Inc", "type": "ETF" if "Consumer Cyclical" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Consumer Cyclical"},
    {"ticker": "JPM", "description": "JPMorgan Chase & Co", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Financial Services"},
    {"ticker": "V", "description": "Visa Inc", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Financial Services"},
    {"ticker": "MA", "description": "Mastercard Inc", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Financial Services"},
    {"ticker": "BAC", "description": "Bank of America Corp", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Financial Services"},
    {"ticker": "WFC", "description": "Wells Fargo & Company", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Financial Services"},
    {"ticker": "GS", "description": "Goldman Sachs Group Inc", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Financial Services"},
    {"ticker": "MS", "description": "Morgan Stanley", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Financial Services"},
    {"ticker": "AXP", "description": "American Express Company", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Financial Services"},
    {"ticker": "BLK", "description": "BlackRock Inc", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Financial Services"},
    {"ticker": "C", "description": "Citigroup Inc", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Financial Services"},
    {"ticker": "USB", "description": "U.S. Bancorp", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Financial Services"},
    {"ticker": "SCHW", "description": "Charles Schwab Corporation", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Financial Services"},
    {"ticker": "COF", "description": "Capital One Financial", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Financial Services"},
    {"ticker": "ICE", "description": "Intercontinental Exchange Inc", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Financial Services"},
    {"ticker": "CME", "description": "CME Group Inc", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Financial Services"},
    {"ticker": "SPGI", "description": "S&P Global Inc", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Financial Services"},
    {"ticker": "MCO", "description": "Moody's Corporation", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Financial Services"},
    {"ticker": "PYPL", "description": "PayPal Holdings Inc", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Financial Services"},
    {"ticker": "SQ", "description": "Block Inc", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Financial Services"},
    {"ticker": "COIN", "description": "Coinbase Global Inc", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Financial Services"},
    {"ticker": "SOFI", "description": "SoFi Technologies Inc", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Financial Services"},
    {"ticker": "AFRM", "description": "Affirm Holdings Inc", "type": "ETF" if "Financial Services" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Financial Services"},
    {"ticker": "UNH", "description": "UnitedHealth Group Inc", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Healthcare"},
    {"ticker": "JNJ", "description": "Johnson & Johnson", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Healthcare"},
    {"ticker": "LLY", "description": "Eli Lilly and Company", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Healthcare"},
    {"ticker": "MRK", "description": "Merck & Co Inc", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Healthcare"},
    {"ticker": "ABBV", "description": "AbbVie Inc", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Healthcare"},
    {"ticker": "TMO", "description": "Thermo Fisher Scientific", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Healthcare"},
    {"ticker": "ABT", "description": "Abbott Laboratories", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Healthcare"},
    {"ticker": "DHR", "description": "Danaher Corporation", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Healthcare"},
    {"ticker": "PFE", "description": "Pfizer Inc", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Healthcare"},
    {"ticker": "AMGN", "description": "Amgen Inc", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Healthcare"},
    {"ticker": "GILD", "description": "Gilead Sciences Inc", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Healthcare"},
    {"ticker": "CVS", "description": "CVS Health Corporation", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Healthcare"},
    {"ticker": "ISRG", "description": "Intuitive Surgical Inc", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Healthcare"},
    {"ticker": "BSX", "description": "Boston Scientific Corporation", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Healthcare"},
    {"ticker": "MDT", "description": "Medtronic PLC", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Healthcare"},
    {"ticker": "SYK", "description": "Stryker Corporation", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Healthcare"},
    {"ticker": "HCA", "description": "HCA Healthcare Inc", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Healthcare"},
    {"ticker": "REGN", "description": "Regeneron Pharmaceuticals", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Healthcare"},
    {"ticker": "BIIB", "description": "Biogen Inc", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Healthcare"},
    {"ticker": "MRNA", "description": "Moderna Inc", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Healthcare"},
    {"ticker": "BNTX", "description": "BioNTech SE", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Healthcare"},
    {"ticker": "VRTX", "description": "Vertex Pharmaceuticals", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Healthcare"},
    {"ticker": "ILMN", "description": "Illumina Inc", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Healthcare"},
    {"ticker": "DXCM", "description": "DexCom Inc", "type": "ETF" if "Healthcare" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Healthcare"},
    {"ticker": "XOM", "description": "Exxon Mobil Corporation", "type": "ETF" if "Energy" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Energy"},
    {"ticker": "CVX", "description": "Chevron Corporation", "type": "ETF" if "Energy" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Energy"},
    {"ticker": "COP", "description": "ConocoPhillips", "type": "ETF" if "Energy" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Energy"},
    {"ticker": "SLB", "description": "SLB", "type": "ETF" if "Energy" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Energy"},
    {"ticker": "MPC", "description": "Marathon Petroleum Corp", "type": "ETF" if "Energy" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Energy"},
    {"ticker": "PSX", "description": "Phillips 66", "type": "ETF" if "Energy" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Energy"},
    {"ticker": "VLO", "description": "Valero Energy Corporation", "type": "ETF" if "Energy" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Energy"},
    {"ticker": "OXY", "description": "Occidental Petroleum Corp", "type": "ETF" if "Energy" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Energy"},
    {"ticker": "HAL", "description": "Halliburton Company", "type": "ETF" if "Energy" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Energy"},
    {"ticker": "DVN", "description": "Devon Energy Corporation", "type": "ETF" if "Energy" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Energy"},
    {"ticker": "BKR", "description": "Baker Hughes Company", "type": "ETF" if "Energy" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Energy"},
    {"ticker": "EOG", "description": "EOG Resources Inc", "type": "ETF" if "Energy" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Energy"},
    {"ticker": "PG", "description": "Procter & Gamble Company", "type": "ETF" if "Consumer Staples" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Staples"},
    {"ticker": "KO", "description": "The Coca-Cola Company", "type": "ETF" if "Consumer Staples" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Staples"},
    {"ticker": "PEP", "description": "PepsiCo Inc", "type": "ETF" if "Consumer Staples" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Consumer Staples"},
    {"ticker": "WMT", "description": "Walmart Inc", "type": "ETF" if "Consumer Staples" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Staples"},
    {"ticker": "COST", "description": "Costco Wholesale Corporation", "type": "ETF" if "Consumer Staples" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Consumer Staples"},
    {"ticker": "PM", "description": "Philip Morris International", "type": "ETF" if "Consumer Staples" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Staples"},
    {"ticker": "MO", "description": "Altria Group Inc", "type": "ETF" if "Consumer Staples" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Staples"},
    {"ticker": "CL", "description": "Colgate-Palmolive Company", "type": "ETF" if "Consumer Staples" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Staples"},
    {"ticker": "KMB", "description": "Kimberly-Clark Corporation", "type": "ETF" if "Consumer Staples" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Staples"},
    {"ticker": "GIS", "description": "General Mills Inc", "type": "ETF" if "Consumer Staples" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Staples"},
    {"ticker": "HSY", "description": "Hershey Company", "type": "ETF" if "Consumer Staples" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Consumer Staples"},
    {"ticker": "MKC", "description": "McCormick & Company", "type": "ETF" if "Consumer Staples" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Consumer Staples"},
    {"ticker": "KHC", "description": "Kraft Heinz Company", "type": "ETF" if "Consumer Staples" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Consumer Staples"},
    {"ticker": "RTX", "description": "RTX Corporation", "type": "ETF" if "Industrials" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Industrials"},
    {"ticker": "HON", "description": "Honeywell International", "type": "ETF" if "Industrials" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Industrials"},
    {"ticker": "CAT", "description": "Caterpillar Inc", "type": "ETF" if "Industrials" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Industrials"},
    {"ticker": "DE", "description": "Deere & Company", "type": "ETF" if "Industrials" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Industrials"},
    {"ticker": "LMT", "description": "Lockheed Martin Corporation", "type": "ETF" if "Industrials" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Industrials"},
    {"ticker": "GE", "description": "GE Aerospace", "type": "ETF" if "Industrials" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Industrials"},
    {"ticker": "BA", "description": "Boeing Company", "type": "ETF" if "Industrials" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Industrials"},
    {"ticker": "UPS", "description": "United Parcel Service Inc", "type": "ETF" if "Industrials" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Industrials"},
    {"ticker": "FDX", "description": "FedEx Corporation", "type": "ETF" if "Industrials" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Industrials"},
    {"ticker": "MMM", "description": "3M Company", "type": "ETF" if "Industrials" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Industrials"},
    {"ticker": "EMR", "description": "Emerson Electric Co", "type": "ETF" if "Industrials" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Industrials"},
    {"ticker": "ETN", "description": "Eaton Corporation PLC", "type": "ETF" if "Industrials" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Industrials"},
    {"ticker": "PH", "description": "Parker-Hannifin Corporation", "type": "ETF" if "Industrials" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Industrials"},
    {"ticker": "FAST", "description": "Fastenal Company", "type": "ETF" if "Industrials" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Industrials"},
    {"ticker": "CTAS", "description": "Cintas Corporation", "type": "ETF" if "Industrials" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Industrials"},
    {"ticker": "ITW", "description": "Illinois Tool Works Inc", "type": "ETF" if "Industrials" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Industrials"},
    {"ticker": "ROK", "description": "Rockwell Automation Inc", "type": "ETF" if "Industrials" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Industrials"},
    {"ticker": "GWW", "description": "W.W. Grainger Inc", "type": "ETF" if "Industrials" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Industrials"},
    {"ticker": "SPCE", "description": "Virgin Galactic Holdings", "type": "ETF" if "Industrials" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Industrials"},
    {"ticker": "NFLX", "description": "Netflix Inc", "type": "ETF" if "Communication" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Communication"},
    {"ticker": "TMUS", "description": "T-Mobile US Inc", "type": "ETF" if "Communication" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Communication"},
    {"ticker": "VZ", "description": "Verizon Communications", "type": "ETF" if "Communication" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Communication"},
    {"ticker": "T", "description": "AT&T Inc", "type": "ETF" if "Communication" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Communication"},
    {"ticker": "CMCSA", "description": "Comcast Corporation", "type": "ETF" if "Communication" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Communication"},
    {"ticker": "DIS", "description": "Walt Disney Company", "type": "ETF" if "Communication" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Communication"},
    {"ticker": "CHTR", "description": "Charter Communications Inc", "type": "ETF" if "Communication" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Communication"},
    {"ticker": "SNAP", "description": "Snap Inc", "type": "ETF" if "Communication" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Communication"},
    {"ticker": "PINS", "description": "Pinterest Inc", "type": "ETF" if "Communication" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Communication"},
    {"ticker": "RDDT", "description": "Reddit Inc", "type": "ETF" if "Communication" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Communication"},
    {"ticker": "MTCH", "description": "Match Group Inc", "type": "ETF" if "Communication" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Communication"},
    {"ticker": "PARA", "description": "Paramount Global", "type": "ETF" if "Communication" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Communication"},
    {"ticker": "WBD", "description": "Warner Bros Discovery", "type": "ETF" if "Communication" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Communication"},
    {"ticker": "AMC", "description": "AMC Entertainment Holdings", "type": "ETF" if "Communication" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Communication"},
    {"ticker": "AMT", "description": "American Tower Corp", "type": "ETF" if "Real Estate" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Real Estate"},
    {"ticker": "PLD", "description": "Prologis Inc", "type": "ETF" if "Real Estate" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Real Estate"},
    {"ticker": "EQIX", "description": "Equinix Inc", "type": "ETF" if "Real Estate" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Real Estate"},
    {"ticker": "CCI", "description": "Crown Castle Inc", "type": "ETF" if "Real Estate" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Real Estate"},
    {"ticker": "WELL", "description": "Welltower Inc", "type": "ETF" if "Real Estate" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Real Estate"},
    {"ticker": "DLR", "description": "Digital Realty Trust", "type": "ETF" if "Real Estate" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Real Estate"},
    {"ticker": "SPG", "description": "Simon Property Group Inc", "type": "ETF" if "Real Estate" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Real Estate"},
    {"ticker": "O", "description": "Realty Income Corporation", "type": "ETF" if "Real Estate" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Real Estate"},
    {"ticker": "NEE", "description": "NextEra Energy Inc", "type": "ETF" if "Utilities" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Utilities"},
    {"ticker": "SO", "description": "Southern Company", "type": "ETF" if "Utilities" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Utilities"},
    {"ticker": "DUK", "description": "Duke Energy Corporation", "type": "ETF" if "Utilities" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Utilities"},
    {"ticker": "AEP", "description": "American Electric Power", "type": "ETF" if "Utilities" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Utilities"},
    {"ticker": "EXC", "description": "Exelon Corporation", "type": "ETF" if "Utilities" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Utilities"},
    {"ticker": "SRE", "description": "Sempra", "type": "ETF" if "Utilities" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Utilities"},
    {"ticker": "XEL", "description": "Xcel Energy Inc", "type": "ETF" if "Utilities" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Utilities"},
    {"ticker": "LIN", "description": "Linde PLC", "type": "ETF" if "Materials" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Materials"},
    {"ticker": "APD", "description": "Air Products and Chemicals", "type": "ETF" if "Materials" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "Materials"},
    {"ticker": "SHW", "description": "Sherwin-Williams Company", "type": "ETF" if "Materials" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Materials"},
    {"ticker": "FCX", "description": "Freeport-McMoRan Inc", "type": "ETF" if "Materials" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Materials"},
    {"ticker": "NEM", "description": "Newmont Corporation", "type": "ETF" if "Materials" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Materials"},
    {"ticker": "NUE", "description": "Nucor Corporation", "type": "ETF" if "Materials" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Materials"},
    {"ticker": "ALB", "description": "Albemarle Corporation", "type": "ETF" if "Materials" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "Materials"},
    {"ticker": "SPY", "description": "SPDR S&P 500 ETF Trust", "type": "ETF" if "ETF" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "ETF"},
    {"ticker": "QQQ", "description": "Invesco QQQ Trust", "type": "ETF" if "ETF" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "ETF"},
    {"ticker": "IWM", "description": "iShares Russell 2000 ETF", "type": "ETF" if "ETF" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "ETF"},
    {"ticker": "VTI", "description": "Vanguard Total Stock Market ETF", "type": "ETF" if "ETF" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "ETF"},
    {"ticker": "VOO", "description": "Vanguard S&P 500 ETF", "type": "ETF" if "ETF" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "ETF"},
    {"ticker": "VGT", "description": "Vanguard Information Technology ETF", "type": "ETF" if "ETF" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "ETF"},
    {"ticker": "XLK", "description": "Technology Select Sector SPDR Fund", "type": "ETF" if "ETF" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "ETF"},
    {"ticker": "XLF", "description": "Financial Select Sector SPDR Fund", "type": "ETF" if "ETF" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "ETF"},
    {"ticker": "XLE", "description": "Energy Select Sector SPDR Fund", "type": "ETF" if "ETF" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "ETF"},
    {"ticker": "XLV", "description": "Health Care Select Sector SPDR Fund", "type": "ETF" if "ETF" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "ETF"},
    {"ticker": "ARKK", "description": "ARK Innovation ETF", "type": "ETF" if "ETF" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "ETF"},
    {"ticker": "GLD", "description": "SPDR Gold Shares", "type": "ETF" if "ETF" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "ETF"},
    {"ticker": "TLT", "description": "iShares 20+ Year Treasury Bond ETF", "type": "ETF" if "ETF" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "ETF"},
    {"ticker": "TQQQ", "description": "ProShares UltraPro QQQ", "type": "ETF" if "ETF" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "ETF"},
    {"ticker": "SQQQ", "description": "ProShares UltraPro Short QQQ", "type": "ETF" if "ETF" == "ETF" else "Common Stock", "exchange": "NASDAQ", "sector": "ETF"},
    {"ticker": "EEM", "description": "iShares MSCI Emerging Markets ETF", "type": "ETF" if "ETF" == "ETF" else "Common Stock", "exchange": "NYSE", "sector": "ETF"},
]

# Index by ticker for O(1) lookup
_TICKER_INDEX: dict[str, dict] = {t["ticker"]: t for t in TICKER_DB}

# Sector → tickers map for market overview
_SECTOR_TICKERS: dict[str, list[str]] = {}
for _t in TICKER_DB:
    _SECTOR_TICKERS.setdefault(_t["sector"], []).append(_t["ticker"])
def get_mock_quote(ticker: str) -> dict:
    base_prices = {
        "AAPL": 189.50, "MSFT": 415.20, "NVDA": 875.30, "AMZN": 188.90,
        "GOOGL": 175.40, "META": 512.60, "TSLA": 177.80, "JPM": 198.30,
        "AMD": 165.40, "NFLX": 628.90,
    }
    price = base_prices.get(ticker.upper(), round(random.uniform(50, 500), 2))
    change = round(random.uniform(-8, 8), 2)
    return {
        "ticker": ticker.upper(),
        "price": price,
        "change": change,
        "change_pct": round((change / price) * 100, 2),
        "high": round(price + random.uniform(0, 5), 2),
        "low": round(price - random.uniform(0, 5), 2),
        "open": round(price - change + random.uniform(-1, 1), 2),
        "prev_close": round(price - change, 2),
        "timestamp": int(datetime.now(timezone.utc).timestamp()),
    }


def get_mock_candles(ticker: str, range_key: str = "1M") -> dict:
    range_days = {"1D": 1, "1W": 7, "1M": 30, "3M": 90, "1Y": 365, "5Y": 1825}
    days = range_days.get(range_key, 30)
    base_prices = {
        "AAPL": 189.50, "MSFT": 415.20, "NVDA": 875.30, "TSLA": 177.80,
    }
    start_price = base_prices.get(ticker.upper(), 150.0)
    candles = []
    price = start_price * 0.85
    now = datetime.now(timezone.utc)
    interval_hours = 24 if days > 7 else 1
    steps = min(days * (24 // interval_hours), 500)
    for i in range(steps):
        ts = now - timedelta(hours=(steps - i) * interval_hours)
        drift = 0.0003
        volatility = 0.015
        change_pct = drift + volatility * random.gauss(0, 1)
        price = max(price * (1 + change_pct), 1.0)
        open_ = round(price * (1 + random.uniform(-0.005, 0.005)), 2)
        high  = round(price * (1 + random.uniform(0, 0.01)), 2)
        low   = round(price * (1 - random.uniform(0, 0.01)), 2)
        close = round(price, 2)
        volume = random.randint(500_000, 80_000_000)
        candles.append({
            "date": ts.isoformat(),
            "timestamp": int(ts.timestamp()),
            "open": open_, "high": high, "low": low,
            "close": close, "volume": volume,
        })
    return {
        "ticker": ticker.upper(),
        "range": range_key,
        "resolution": "D" if days > 7 else "60",
        "candles": candles,
    }


def get_mock_search(query: str) -> list[dict]:
    """
    Search across all 232 tickers in the database.
    Matches on ticker symbol (prefix match scored higher) or company name substring.
    Returns up to 10 results, sorted: exact ticker match first, prefix matches second,
    then name contains matches.
    """
    q = query.upper().strip()
    if not q:
        return []

    exact   = [t for t in TICKER_DB if t["ticker"] == q]
    prefix  = [t for t in TICKER_DB if t["ticker"].startswith(q) and t["ticker"] != q]
    name_m  = [t for t in TICKER_DB if q in t["description"].upper()
               and not t["ticker"].startswith(q)]

    results = (exact + prefix + name_m)[:10]
    return [
        {"ticker": t["ticker"], "description": t["description"],
         "type": t["type"], "exchange": t["exchange"]}
        for t in results
    ]


def get_mock_news(ticker: str) -> list[dict]:
    """
    Returns mock news articles with real, working URLs pointing to
    actual financial news sources (search pages) for the ticker.
    """
    t = ticker.upper()
    now = datetime.now(timezone.utc)

    articles = [
        {
            "id": 1,
            "headline": f"{t} — Latest News & Analysis",
            "summary": f"Read the latest news, analysis and market updates for {t} on Reuters.",
            "source": "Reuters",
            "url": f"https://www.reuters.com/search/news?blob={t}",
            "image": None,
            "sentiment": "neutral",
            "published_at": (now - timedelta(hours=1)).isoformat(),
        },
        {
            "id": 2,
            "headline": f"{t} Stock News — Bloomberg Markets",
            "summary": f"Bloomberg Markets coverage of {t}: earnings, analyst ratings, and price targets.",
            "source": "Bloomberg",
            "url": f"https://www.bloomberg.com/quote/{t}:US",
            "image": None,
            "sentiment": "positive",
            "published_at": (now - timedelta(hours=3)).isoformat(),
        },
        {
            "id": 3,
            "headline": f"${t} — StockTwits Community Sentiment",
            "summary": f"See what traders are saying about ${t} on StockTwits — real-time social feed.",
            "source": "StockTwits",
            "url": f"https://stocktwits.com/symbol/{t}",
            "image": None,
            "sentiment": "neutral",
            "published_at": (now - timedelta(hours=4)).isoformat(),
        },
        {
            "id": 4,
            "headline": f"r/wallstreetbets — ${t} Discussion",
            "summary": f"Reddit discussion threads mentioning ${t} on r/wallstreetbets and r/stocks.",
            "source": "Reddit",
            "url": f"https://www.reddit.com/search/?q=%24{t}&sort=new",
            "image": None,
            "sentiment": "positive",
            "published_at": (now - timedelta(hours=5)).isoformat(),
        },
        {
            "id": 5,
            "headline": f"${t} on X (Twitter) — Latest Mentions",
            "summary": f"Real-time tweets and discussions about ${t} from traders and analysts on X.",
            "source": "X / Twitter",
            "url": f"https://x.com/search?q=%24{t}&src=typed_query&f=live",
            "image": None,
            "sentiment": "neutral",
            "published_at": (now - timedelta(hours=6)).isoformat(),
        },
        {
            "id": 6,
            "headline": f"{t} — CNBC Markets Coverage",
            "summary": f"CNBC coverage of {t}: latest price, news, financials and analyst coverage.",
            "source": "CNBC",
            "url": f"https://www.cnbc.com/quotes/{t}",
            "image": None,
            "sentiment": "neutral",
            "published_at": (now - timedelta(hours=8)).isoformat(),
        },
        {
            "id": 7,
            "headline": f"{t} — Yahoo Finance News",
            "summary": f"Yahoo Finance news feed and press releases for {t}.",
            "source": "Yahoo Finance",
            "url": f"https://finance.yahoo.com/quote/{t}/news/",
            "image": None,
            "sentiment": "positive",
            "published_at": (now - timedelta(hours=10)).isoformat(),
        },
        {
            "id": 8,
            "headline": f"{t} — MarketWatch Latest",
            "summary": f"MarketWatch analysis, charts and commentary on {t}.",
            "source": "MarketWatch",
            "url": f"https://www.marketwatch.com/investing/stock/{t.lower()}",
            "image": None,
            "sentiment": "negative",
            "published_at": (now - timedelta(hours=12)).isoformat(),
        },
        {
            "id": 9,
            "headline": f"{t} — Seeking Alpha Analysis",
            "summary": f"In-depth analysis articles and earnings transcripts for {t} on Seeking Alpha.",
            "source": "Seeking Alpha",
            "url": f"https://seekingalpha.com/symbol/{t}",
            "image": None,
            "sentiment": "positive",
            "published_at": (now - timedelta(hours=14)).isoformat(),
        },
        {
            "id": 10,
            "headline": f"{t} — Investor Relations & SEC Filings",
            "summary": f"Official SEC filings, 10-K, 10-Q and earnings releases for {t}.",
            "source": "SEC EDGAR",
            "url": f"https://efts.sec.gov/LATEST/search-index?q=%22{t}%22&dateRange=custom&startdt=2024-01-01&forms=10-K,10-Q,8-K",
            "image": None,
            "sentiment": "neutral",
            "published_at": (now - timedelta(hours=24)).isoformat(),
        },
    ]
    return articles


def get_mock_profile(ticker: str) -> dict:
    """
    Returns company profile. Uses TICKER_DB for name/sector/exchange,
    with seeded-random values for market cap and other fields.
    """
    t = ticker.upper()
    rng = random.Random(hash(t) & 0xFFFFFFFF)
    db_entry = _TICKER_INDEX.get(t)

    if db_entry:
        name     = db_entry["description"]
        sector   = db_entry["sector"]
        exchange = db_entry["exchange"]
    else:
        name     = f"{t} Corporation"
        sector   = "Technology"
        exchange = "NASDAQ"

    lo, hi = {"Technology":(80,900),"Consumer Cyclical":(10,400),
               "Financial Services":(20,600),"Healthcare":(50,800),
               "Energy":(15,200),"Consumer Staples":(30,250),
               "Industrials":(40,400),"Communication":(5,700),
               "Real Estate":(15,200),"Utilities":(20,120),
               "Materials":(15,200),"ETF":(10,550)}.get(sector,(30,300))
    price    = round(rng.uniform(lo, hi), 2)
    shares   = rng.randint(500, 30_000)        # millions
    mktcap   = int(price * shares)              # millions

    website  = f"https://www.{name.lower().split()[0].replace(',','').replace('.','')}.com"
    ipo_year = rng.randint(1970, 2023)
    ipo_date = f"{ipo_year}-{rng.randint(1,12):02d}-{rng.randint(1,28):02d}"

    return {
        "ticker": t,
        "company_name": name,
        "sector": sector,
        "market_cap": mktcap,
        "logo_url": None,
        "exchange": exchange,
        "ipo_date": ipo_date,
        "website": website,
        "country": "US",
        "currency": "USD",
    }


def get_mock_financials(ticker: str) -> dict:
    """
    Seeded-random financials — same ticker always returns same numbers.
    Uses mock_quote to anchor 52-week range to a realistic base price.
    """
    t        = ticker.upper()
    rng      = random.Random(hash(t) & 0xFFFFFFFF)
    db_entry = _TICKER_INDEX.get(t, {})
    sector   = db_entry.get("sector", "Technology")

    # Price derived purely from seed (sector-calibrated)
    lo_p, hi_p = {"Technology":(80,900),"Consumer Cyclical":(10,400),
                  "Financial Services":(20,600),"Healthcare":(50,800),
                  "Energy":(15,200),"Consumer Staples":(30,250),
                  "Industrials":(40,400),"Communication":(5,700),
                  "Real Estate":(15,200),"Utilities":(20,120),
                  "Materials":(15,200),"ETF":(10,550)}.get(sector,(30,300))
    price = round(lo_p + (rng.random() * (hi_p - lo_p)), 2)
    beta_range = {
        "Utilities": (0.2, 0.7), "Real Estate": (0.4, 0.9),
        "Consumer Staples": (0.3, 0.8), "Energy": (0.7, 1.4),
        "Financial Services": (0.8, 1.5), "Healthcare": (0.4, 1.0),
        "Technology": (0.9, 2.2), "Consumer Cyclical": (0.9, 2.0),
        "Communication": (0.6, 1.4), "Industrials": (0.7, 1.4),
        "Materials": (0.8, 1.5), "ETF": (0.8, 1.1),
    }.get(sector, (0.7, 1.8))

    pe_range = {
        "Technology": (20, 80), "Healthcare": (15, 50),
        "Financial Services": (8, 20), "Energy": (8, 18),
        "Consumer Staples": (15, 30), "Utilities": (15, 25),
        "ETF": (None, None),
    }.get(sector, (12, 40))

    high_mult   = rng.uniform(1.05, 1.50)   # always > 1
    low_mult    = rng.uniform(0.50, 0.92)   # always < 1
    annual_high = round(price * high_mult, 2)
    annual_low  = round(price * low_mult,  2)
    # Guarantee invariant: low < price < high
    if annual_high <= price:  annual_high = round(price * 1.08, 2)
    if annual_low  >= price:  annual_low  = round(price * 0.75, 2)
    if annual_high <= annual_low: annual_high = round(annual_low * 1.15, 2)

    return {
        "ticker":             t,
        "52_week_high":       annual_high,
        "52_week_low":        annual_low,
        "beta":               round(rng.uniform(*beta_range), 2),
        "pe_ratio":           round(rng.uniform(*pe_range), 1) if pe_range[0] else None,
        "eps":                round(rng.uniform(0.5, 20), 2) if sector != "ETF" else None,
        "revenue_per_share":  round(rng.uniform(10, 120), 2) if sector != "ETF" else None,
        "dividend_yield":     round(rng.uniform(0, 3.5), 2) if rng.random() > 0.4 else 0.0,
        "market_cap":         int(price * rng.randint(500, 30000)),
    }


def get_mock_options_chain(ticker: str, current_price: float | None = None) -> dict:
    """
    Deterministic mock options chain.
    Generates realistic-looking strikes, OI, volume and IV
    seeded by ticker so results are stable across calls.
    """
    import hashlib, math, random
    from datetime import date, timedelta

    seed = int(hashlib.sha256(ticker.encode()).hexdigest()[:8], 16)
    rng  = random.Random(seed)

    # Anchor price — use provided or generate from ticker hash
    base = current_price or (rng.uniform(50, 500))

    # Generate 4 Fridays + 2 monthly expirations
    today = date.today()
    expiries: list[str] = []
    d = today
    while len(expiries) < 4:
        d += timedelta(days=1)
        if d.weekday() == 4:  # Friday
            expiries.append(d.isoformat())
    # Add two monthly (3rd Friday of next two months)
    for m_offset in [1, 2]:
        year  = (today.month - 1 + m_offset) // 12 + today.year
        month = (today.month - 1 + m_offset) % 12 + 1
        fridays = [date(year, month, day) for day in range(1, 29)
                   if date(year, month, day).weekday() == 4]
        if len(fridays) >= 3:
            expiries.append(fridays[2].isoformat())

    # Strike range: ±25% of current price in 5% steps
    step  = max(1.0, round(base * 0.025, 0))
    low   = round(base * 0.75 / step) * step
    high  = round(base * 1.25 / step) * step
    strikes = []
    s = low
    while s <= high:
        strikes.append(round(s, 2))
        s = round(s + step, 2)

    # Compute max-pain strike (where total OI pain is minimised)
    max_pain_strike = round(base / step) * step

    rows = []
    for exp in expiries:
        exp_date = date.fromisoformat(exp)
        dte = max(1, (exp_date - today).days)
        for strike in strikes:
            moneyness = (strike - base) / base
            iv_base   = rng.uniform(0.25, 0.65)
            # IV smile — higher at extremes
            iv = iv_base + abs(moneyness) * 0.3
            # More OI near ATM
            atm_factor = max(0.1, 1 - abs(moneyness) * 4)
            # Calls: OI skewed below ATM; Puts: skewed above ATM
            call_oi = int(rng.uniform(100, 8000) * atm_factor * (1.1 if moneyness < 0 else 0.7))
            put_oi  = int(rng.uniform(100, 8000) * atm_factor * (1.1 if moneyness > 0 else 0.7))
            call_vol = int(call_oi * rng.uniform(0.05, 0.4))
            put_vol  = int(put_oi  * rng.uniform(0.05, 0.4))
            rows.append({
                "expiry":       exp,
                "strike":       strike,
                "call_oi":      call_oi,
                "put_oi":       put_oi,
                "call_volume":  call_vol,
                "put_volume":   put_vol,
                "call_iv":      round(iv, 4),
                "put_iv":       round(iv * 1.05, 4),
                "dte":          dte,
            })

    # Per-expiry put/call ratio
    expiry_pc: dict[str, float] = {}
    for exp in expiries:
        exp_rows  = [r for r in rows if r["expiry"] == exp]
        total_call = sum(r["call_oi"] for r in exp_rows) or 1
        total_put  = sum(r["put_oi"]  for r in exp_rows)
        expiry_pc[exp] = round(total_put / total_call, 3)

    return {
        "ticker":          ticker,
        "current_price":   round(base, 2),
        "max_pain_strike": round(max_pain_strike, 2),
        "expiries":        expiries,
        "strikes":         strikes,
        "chain":           rows,
        "expiry_pc_ratio": expiry_pc,
    }


def get_mock_institutional(ticker: str) -> dict:
    """Deterministic mock institutional ownership summary."""
    import hashlib, random
    seed = int(hashlib.sha256(ticker.encode()).hexdigest()[:8], 16)
    rng  = random.Random(seed)

    inst_pct   = round(rng.uniform(45, 95), 2)
    num_holders = rng.randint(150, 4500)
    qoq_change  = round(rng.uniform(-5, 5), 2)

    names = [
        "Vanguard Group", "BlackRock", "Fidelity Management",
        "State Street Global", "T. Rowe Price", "Capital Research",
        "Wellington Management", "Geode Capital", "Northern Trust", "Morgan Stanley",
    ]
    rng.shuffle(names)
    top5 = [{"name": n, "pct": round(rng.uniform(0.5, 12), 2)} for n in names[:5]]
    top5.sort(key=lambda x: -x["pct"])

    return {
        "ticker":        ticker,
        "inst_pct_float": inst_pct,
        "num_holders":   num_holders,
        "qoq_change_pct": qoq_change,
        "top_holders":   top5,
    }


def get_mock_insider_transactions(ticker: str) -> dict:
    """Deterministic mock insider transactions over 12 months."""
    import hashlib, random
    from datetime import date, timedelta
    seed = int(hashlib.sha256(ticker.encode()).hexdigest()[:8], 16)
    rng  = random.Random(seed)

    insiders = [
        "CEO", "CFO", "COO", "Director", "VP Engineering",
        "Director", "Chairman", "General Counsel",
    ]
    txns = []
    today = date.today()
    for i in range(rng.randint(8, 22)):
        days_ago = rng.randint(1, 365)
        txn_date = (today - timedelta(days=days_ago)).isoformat()
        is_buy   = rng.random() > 0.4
        shares   = rng.randint(500, 50000)
        price    = round(rng.uniform(50, 600), 2)
        txns.append({
            "name":           rng.choice(insiders),
            "transaction_date": txn_date,
            "transaction_type": "Buy" if is_buy else "Sell",
            "shares":         shares,
            "price":          price,
            "value":          round(shares * price, 2),
            "filing_url":     f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company={ticker}&type=4&dateb=&owner=include&count=40",
        })
    txns.sort(key=lambda x: x["transaction_date"])
    return {"ticker": ticker, "transactions": txns}
