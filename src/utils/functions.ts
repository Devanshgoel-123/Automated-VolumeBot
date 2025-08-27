import { KUCOIN_TARGET_VOLUME } from "./constants";
import { Budget } from "./types";
import { Trade } from "./types";
import { KUCOIN_EXCHANGE_NAME } from "./constants";
import { GATEX_TARGET_VOLUME } from "./constants";
import { BatchAddOrdersOrderList } from "kucoin-universal-sdk/dist/generate/spot/order";
/**
 * Reset the daily counter and log the previous day's data
 * @param budget - The budget object
 */
export const ResetDailyCounter = async (budget: Budget): Promise<void> => {
  const { trades } = generateDailySchedule(budget.schedule.exchange);
  budget.dailySpent = 0;
  budget.dailyVolume = 0;
  budget.dailyTrades = 0;
  budget.schedule.trades = trades;
};

export const generateDailySchedule = (exchangeName: string) => {
  const numPairs = Math.floor(Math.random() * (580 - 575 + 1)) + 580; 
  const totalValue = exchangeName === KUCOIN_EXCHANGE_NAME ? KUCOIN_TARGET_VOLUME : GATEX_TARGET_VOLUME;
  const trades: Trade[][] = [];
  const intervals = Array.from({ length: numPairs }, (_, i) => i * 2.5);

  for (let i = intervals.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [intervals[i], intervals[j]] = [intervals[j]!, intervals[i]!];
  }

  const selectedIntervals = intervals.slice(0, numPairs).sort((a, b) => a - b);
  const tradeUsdtSizes = Array(numPairs)
    .fill(0)
    .map(() => Math.random() * (totalValue / numPairs) * 2);
  const sumUsdt = tradeUsdtSizes.reduce((a, b) => a + b, 0);
  let normalizedUsdtSizes = tradeUsdtSizes.map((size) =>
    Number(((size / sumUsdt) * totalValue).toFixed(2))
  );

  const MIN_SIZE = 15;
  normalizedUsdtSizes = normalizedUsdtSizes.map((s) => (s < MIN_SIZE ? MIN_SIZE : s));

  // Renormalize after enforcing minimums
  const adjustedSum = normalizedUsdtSizes.reduce((a, b) => a + b, 0);
  normalizedUsdtSizes = normalizedUsdtSizes.map((s) =>
    Number(((s / adjustedSum) * totalValue).toFixed(2))
  );

  const normalizedUsdtValues = normalizedUsdtSizes.reduce((a, b) => a + b, 0);

  selectedIntervals.forEach((intervalStart, index) => {
    const randomSeconds = intervalStart * 60 + Math.floor(Math.random() * 150);
    const time = new Date();
    time.setUTCHours(0, 0, 0, 0);
    time.setUTCSeconds(randomSeconds);
    const usdtValue = normalizedUsdtSizes[index] || 0;
    const isLimitBuy = Math.random() > 0.5;

    const firstTrade: Trade = {
      time,
      size: usdtValue,
      type: isLimitBuy ? "BUY" : "SELL",
      orderType: "LIMIT",
    };

    const compensatingTrade: Trade = {
      time,
      size: usdtValue,
      type: isLimitBuy ? "SELL" : "BUY",
      orderType: "MARKET",
    };

    trades.push([firstTrade, compensatingTrade]);
  });

  return {
    exchange: exchangeName,
    trades,
    totalValue,
    sumUsdt,
    normalizedUsdtValues,
  };
};
