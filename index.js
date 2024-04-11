const { Worker } = require("worker_threads");

const { getCurrentTime } = require("./utils/utils");

const supertrends = [
  {
    market: `spot`,
    pair: `BTCUSDT`,
    interval: `1m`,
    fromTrend: `upTrend`,
    toTrend: `downTrend`,
  },
];

function watchStChange(market, pair, interval, fromTrend, toTrend) {
  let msg = `${getCurrentTime()} Started watching ${pair} ${market} ${interval} supertrend change from ${fromTrend} to ${toTrend}\n---`;
  console.log(msg);

  const stWorker = new Worker("./workers/stWorker.js");

  stWorker.postMessage({
    command: `watchStChange`,
    data: {
      market,
      pair,
      interval,
      fromTrend,
      toTrend,
    },
  });

  stWorker.on("message", async (data) => {
    try {
      const { market, pair, fromTrend, toTrend, klineClosePrice, supertrend } =
        data;

      let msg = `${getCurrentTime()} ${pair} ${market} ${interval} supertrend changed from ${fromTrend} to ${toTrend}\nsuperTrend: ${supertrend} | klineClosePrice: ${klineClosePrice}\n---`;
      console.log(msg);
    } catch (e) {
      console.log(`Error while processing worker MESSAGE on main thread`, e);
    }
  });

  stWorker.on("exit", async (data) => {
    try {
      watchStChange(market, pair, interval, toTrend, fromTrend);
    } catch (e) {
      console.log(`Error while processing worker EXIT on main thread`, e);
    }
  });
}

async function run() {
  for (let st of supertrends) {
    try {
      const { market, pair, interval, fromTrend, toTrend } = st;
      watchStChange(market, pair, interval, fromTrend, toTrend);
    } catch (e) {
      console.log(`Error while processing RUN on main thread`, e);
    }
  }
}

run();
