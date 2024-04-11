# supertrend

Project that monitors supertrend changes in cryptocurrency markets based on predefined configurations.

## Node.js and Worker Threads to handle concurrent processing efficiently.

<a href="https://www.tradingview.com/support/solutions/43000634738/" target="_blank">Supertrend info on TradingView</a>

User can watch supertrend changes for chosen pairs and time intervals supported on Binance. Trend changes are logged when given time interval's kline is closing. Then script is watching for opposite trend change.

Project comes with bulletproof WebSocket connection and sendHttpsRequest function that uses `https` built-in Node module.

Supported time intervals:
(m -> minutes; h -> hours; d -> days; w -> weeks; M -> months)
1m, 3m, 5m, 15m, 30m,
1h, 2h, 4h, 6h, 8h, 12h
1d, 3d,
1w,
1M.

## How to run it?

1. Clone this project
2. Install dependencies - `npm install`
3. Setup `supertrends` array inside `index.js` using one or more objects as follows:
   ```
   {
    market: `spot`, // `futures`
    pair: `BTCUSDT`, //pair that is supported on Binance
    interval: `1m`, //time intervals given before
    fromTrend: `upTrend`, // `downTrend`
    toTrend: `downTrend`, // `upTrend`
   }
   ```
4. Run - `node index.js`

## Example output (hours:minutes:seconds log)

```
11:46:18 Started watching BTCUSDT spot 1m supertrend change from upTrend to downTrend
---
11:52:59 spot BTCUSDT 1m supertrend changed from upTrend to downTrend
superTrend: 70604.00000000 | klineClosePrice: 70660.32459517116
---
11:52:59 Started watching BTCUSDT spot 1m supertrend change from downTrend to upTrend
---
```

## Tweak it how You want for personal usage!
