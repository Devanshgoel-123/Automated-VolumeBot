import { setTimeout as wait } from "timers/promises";
import { generateDailySchedule, ResetDailyCounter } from "../utils/functions";
import { Budget, Trade } from "../utils/types";
import {
  CanExecuteTrade,
  FetchBestOrderBookPrices,
} from "./KuCoinOrderFunction";
import { BatchAddOrdersOrderList } from "kucoin-universal-sdk/dist/generate/spot/order";
import { CreateLimitOrderStruct, PlaceBatchOrder } from "./KuCoinOrderFunction";
import { TRADE_PAIR, LOGX_TICK_SIZE } from "../utils/constants";
import { OrderListElement } from "../utils/types";
import { SYMBOL_DETAILS } from "../utils/constants";
import { OrderAPI } from "kucoin-universal-sdk/dist/generate/spot/order";
import { InitializeKuCoinClientSpot, synchronizeServerTime } from "./kucoinService";
import { ValidateTrade } from "./KuCoinOrderFunction";
import cron from "node-cron";
import { UpdateDailyStats, GetTodaysStats } from "../db/stats";

let isBotRunning: boolean = true;

/**
 * Set the bot running signal
 * @param value - The signal value (true/1 to run, false/0 to stop)
 */
export const setBotRunning = (value: boolean | number) => {
  isBotRunning = value === true || value === 1;
  console.log(`Bot running signal set to: ${isBotRunning}`);
};

/**
 * Get the current bot running signal
 * @returns The current signal value
 */
export const getBotRunning = (): boolean => {
  return isBotRunning;
};

/**
 * Start the KuCoin Volume Bot
 * @returns The KuCoin Volume Bot
 */
export const StartKuCoinVolumeBot = async () => {
  console.log("Starting KuCoin Volume Bot...");
  isBotRunning = true; // Set signal to true when starting
  
  // Synchronize with KuCoin server time to prevent timestamp errors
  await synchronizeServerTime();
  
  const { trades, exchange } = generateDailySchedule();
  var KuCoinTracker: Budget = {
    dailySpent: 0,
    dailyVolume: 0,
    dailyTrades: 0,
    monthlySpent: 0,
    monthlyTrades: 0,
    dailyLimit: 16.67,
    monthlyLimit: 500,
    schedule: {
      trades,
      exchange,
    },
  };
  const client = await InitializeKuCoinClientSpot();
  if (client === null) {
    console.error("Failed to initialize KuCoin client");
    return;
  }
  for (const tradePair of KuCoinTracker.schedule.trades) {
    const now = new Date();
    const delay = tradePair[0].time.getTime() - now.getTime();
    if (delay < 0) {
      console.warn(
        `Trade pair at ${tradePair[0].time.toISOString()} scheduled in the past, skipping`
      );
      continue;
    }
    setTimeout(async () => {
      if (!isBotRunning) {
        console.log("Bot is stopped, skipping trade execution");
        return;
      }
      await ProcessEachTradePair(tradePair, client, KuCoinTracker);
    }, delay-100000);
  }
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        const yesterday = new Date();
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const utcDate = yesterday.toISOString().split("T")[0];
        const exchangeName = "KUCOIN";
        console.log(`[CRON] Closing stats for ${utcDate}`);
        const updateStats = await UpdateDailyStats({
          date: utcDate,
          totalVolume: KuCoinTracker.dailyVolume,
          totalFees: KuCoinTracker.dailySpent,
          totalTrades: KuCoinTracker.dailyTrades,
          exchangeName,
        });
        if (updateStats) {
          console.log(`[CRON] Stats saved for ${utcDate}`);
        } else {
          console.warn(`[CRON] No stats found for ${utcDate}`);
        }
        ResetDailyCounter(KuCoinTracker);
      } catch (error) {
        console.error("[CRON] Error inserting daily stats:", error);
      }
    },
    {
      timezone: "UTC",
    }
  );
  console.log("Daily schedule complete, restarting for next day...");
};

/**
 * Process each trade pair
 * @param tradePair - The trade pair to process
 * @param client - The KuCoin client
 * @param tracker - The tracker for the trade
 * @returns The result of the trade
 */
const ProcessEachTradePair = async (
  tradePair: Trade[],
  client: OrderAPI,
  tracker: Budget
) => {
  console.log("The Budget Status is", tracker);
  if (!isBotRunning) {
    console.log("Bot is stopped, skipping trade pair execution");
    return;
  }
  try {
    console.log("Executing trade pair", tradePair);
    const book = await FetchBestOrderBookPrices();
    if (!book) {
      console.error("⚠️ Failed to fetch order book, skipping trade");
      return;
    }
    // Target Volume is distributed into multiple sub orders volume
    const usdtSize = tradePair[0].size;
    const bestBid = parseFloat(book.bid);
    const buyPrice = bestBid + LOGX_TICK_SIZE;
    const sellPrice = buyPrice;

    //Amount of LOGX tokens to buy and sell
    const logxSize =
      Math.round(usdtSize / buyPrice / SYMBOL_DETAILS.sizeIncrement) *
      SYMBOL_DETAILS.sizeIncrement;
    const orderList: OrderListElement[] = [];
    const isValid = await ValidateTrade(logxSize, buyPrice);
    console.log("isValid", isValid);
    if (!isValid) {
      console.log("Trade is invalid, skipping");
      return;
    }
    const buyOrder = await CreateLimitOrderStruct(
      logxSize,
      buyPrice,
      BatchAddOrdersOrderList.SideEnum.BUY,
      TRADE_PAIR
    );

    const sellOrder = await CreateLimitOrderStruct(
      logxSize,
      sellPrice,
      BatchAddOrdersOrderList.SideEnum.SELL,
      TRADE_PAIR
    );

    if (!buyOrder || !sellOrder) {
      console.error("Failed to create orders, skipping");
      return;
    }
    if (
      (await CanExecuteTrade(buyOrder, tracker)) &&
      (await CanExecuteTrade(sellOrder, tracker))
    ) {
      console.log("Maker and Taker Trades are valid, creating orders");
    } else {
      console.error("Maker and Taker Trades are not valid, skipping");
      return;
    }
    orderList.push(buyOrder);
    orderList.push(sellOrder);

    if (orderList.length === 2) {
      console.log("Placing batched orders", orderList);
      // 3. Place both together as a batch
      const result = await PlaceBatchOrder(orderList, client, tracker);
      if (result) {
        console.log("✅ Successfully placed batched orders");
      } else {
        console.error("Failed to place batched orders");
        return;
      }
    } else {
      console.warn(
        `⚠️ Skipping trade pair - only ${orderList.length} valid orders created`
      );
    }
  } catch (err) {
    console.error("Error executing trade:", err);
  }
};
