// PARENT
const { parentPort } = require("worker_threads");

parentPort.on("message", (data) => {
  if (`command` in data) {
    if (data.command == `watchStChange`) {
      const { market, pair, interval, fromTrend, toTrend } = data.data;
      main(market, pair, interval, fromTrend, toTrend);
    }
  }
});

// UTILITIES
const listenSocket = require("../utils/listenSocket");
const sendHttpsRequest = require("../utils/sendHttpsRequest");

function finishWorkersJob(
  market,
  pair,
  fromTrend,
  toTrend,
  supertrend,
  klineClosePrice
) {
  parentPort.postMessage({
    command: `stChanged`,
    market,
    pair,
    fromTrend,
    toTrend,
    klineClosePrice,
    supertrend,
  });
  process.exit();
}

// CALCULATE ST
let historicalData = [];
let previousATR = null;
let previousTrend = null;

function calculateATR(data, atrLength) {
  const i = data.length - 1;
  const highLow = data[i][2] - data[i][3];
  const highClose = Math.abs(data[i][2] - data[i - 1][4]);
  const lowClose = Math.abs(data[i][3] - data[i - 1][4]);
  const currentTR = Math.max(highLow, highClose, lowClose);

  if (!previousATR) {
    let atr = 0;
    for (let j = 1; j <= atrLength; j++) {
      atr += Math.max(
        data[j][2] - data[j][3],
        Math.abs(data[j][2] - data[j - 1][4]),
        Math.abs(data[j][3] - data[j - 1][4])
      );
    }
    previousATR = atr / atrLength;
  } else {
    previousATR = (previousATR * (atrLength - 1) + currentTR) / atrLength;
  }

  return previousATR;
}

function calculateSt(data, atrLength, multiplier) {
  let upperBand = 0;
  let lowerBand = 0;
  let supertrend = 0;
  let trendDirection = "downTrend";
  let dataWithATR = JSON.parse(JSON.stringify(data));

  for (let i = atrLength; i < data.length; i++) {
    const atr = calculateATR(
      dataWithATR.slice(i - atrLength, i + 1),
      atrLength
    );
    dataWithATR[i].push(atr);

    const hl2 = (data[i][2] + data[i][3]) / 2;
    const basicUpperBand = hl2 + multiplier * atr;
    const basicLowerBand = hl2 - multiplier * atr;

    upperBand =
      basicUpperBand < upperBand || data[i - 1][4] > upperBand
        ? basicUpperBand
        : upperBand;
    lowerBand =
      basicLowerBand > lowerBand || data[i - 1][4] < lowerBand
        ? basicLowerBand
        : lowerBand;

    trendDirection = data[i - 1][4] <= supertrend ? "downTrend" : "upTrend";
    supertrend =
      trendDirection === "downTrend"
        ? Math.min(basicUpperBand, upperBand)
        : Math.max(basicLowerBand, lowerBand);
  }

  return { supertrend, trendDirection };
}

// MAIN
async function main(market, pair, interval, fromTrend, toTrend) {
  const baseURL =
    market.toLowerCase() === "spot"
      ? "https://api.binance.com/api/v3"
      : "https://fapi.binance.com/fapi/v1";

  const wsBaseURL =
    market.toLowerCase() === "spot"
      ? "wss://stream.binance.com:9443/ws"
      : "wss://fstream.binance.com/ws";

  const klinesUrl = `${baseURL}/klines?symbol=${pair.toUpperCase()}&interval=${interval}&limit=500`;
  const wsUrl = `${wsBaseURL}/${pair.toLowerCase()}@kline_${interval}`;

  // GET INITIAL DATA
  try {
    const klinesData = await sendHttpsRequest(`GET`, klinesUrl);
    historicalData = klinesData.map((kline) =>
      kline.map((val) => parseFloat(val))
    );
  } catch (error) {
    console.log(`stWorker: Error while getting initial data for ST:`, error);
  }

  const atrLength = 10;
  const multiplier = 3;

  // GET CURRENT DATA FROM WS
  listenSocket(wsUrl, (stream) => {
    stream.on("message", (data) => {
      let kline;
      try {
        kline = JSON.parse(data);
      } catch (e) {
        console.log(`stWorker: WS message wasn't proper JSON`);
      }

      try {
        if (kline.k.x) {
          const klineKeyMap = {
            t: "openTime",
            o: "open",
            h: "high",
            l: "low",
            c: "close",
            v: "volume",
            T: "closeTime",
            q: "quoteAssetVolume",
            n: "numberOfTrades",
            V: "takerBuyBaseAssetVolume",
            Q: "takerBuyQuoteAssetVolume",
            B: "ignore",
          };

          const parsedKline = Object.keys(klineKeyMap).map((key) =>
            parseFloat(kline.k[key])
          );

          historicalData.push(parsedKline);

          if (historicalData.length > atrLength + 1) {
            const { supertrend, trendDirection } = calculateSt(
              historicalData,
              atrLength,
              multiplier
            );

            // COMPARE TRENDS
            if (previousTrend && trendDirection) {
              // CHECK IF KLINE CROSSES SUPERTREND LINE
              if (supertrend && previousTrend == fromTrend) {
                if (previousTrend == `downTrend`) {
                  if (kline.k.c > supertrend) {
                    finishWorkersJob(
                      pair,
                      market,
                      fromTrend,
                      `upTrend`,
                      kline.k.c,
                      supertrend
                    );
                  }
                } else if (previousTrend == `upTrend`) {
                  if (kline.k.c < supertrend) {
                    finishWorkersJob(
                      pair,
                      market,
                      fromTrend,
                      `downTrend`,
                      kline.k.c,
                      supertrend
                    );
                  }
                }
              }

              if (previousTrend == fromTrend && trendDirection == toTrend) {
                finishWorkersJob(market, pair, fromTrend, toTrend);
              }
            }

            previousTrend = trendDirection;
          }
        }
      } catch (error) {
        console.log(`stWorker: Error while processing kline:`, error);
      }
    });
  });
}
