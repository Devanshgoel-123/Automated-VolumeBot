import { setTimeout as wait } from "timers/promises";
import { generateDailySchedule } from "../utils/functions";
import { Budget } from "../utils/types";
import { FetchBestOrderBookPrices } from "./KuCoinOrderFunction";
import { BatchAddOrdersOrderList } from "kucoin-universal-sdk/dist/generate/spot/order";
import { CreateLimitOrderStruct, PlaceBatchOrder } from "./KuCoinOrderFunction";
import { TRADE_PAIR, LOGX_TICK_SIZE } from "../utils/constants";
import { OrderListElement } from "../utils/types";
import { SYMBOL_DETAILS } from "../utils/constants";

export const StartKuCoinVolumeBot = async () => {
  console.log("📈 Starting KuCoin Volume Bot...");
  const { trades, exchange } = generateDailySchedule();
  var KuCoinTracker: Budget = {
    dailySpent: 0,
    monthlySpent: 0,
    dailyLimit: 16.67,
    monthlyLimit: 500,
    schedule: {
      trades,
      exchange,
    },
  };

  for (const tradePair of trades) {
    const now = new Date();
    const delay = tradePair[0].time.getTime() - now.getTime();

    if (delay < 0) {
      console.warn(`Trade pair at ${tradePair[0].time.toISOString()} scheduled in the past, skipping`);
      continue;
    }
    setTimeout(async () => {
      try {
        console.log("Executing trade pair", tradePair);
        // 1. Fetch best order book prices
        const book = await FetchBestOrderBookPrices();
        console.log("Book", book);
        if (!book) {
          console.error("⚠️ Failed to fetch order book, skipping trade");
          return
        }
        const usdtSize = tradePair[0].size; // Size in USDT
        const bestBid = parseFloat(book.bid); // e.g., 0.0045
        const buyPrice = bestBid + LOGX_TICK_SIZE; // e.g., 0.00451
        const sellPrice = buyPrice;
        const logxSize =
          Math.round(usdtSize / buyPrice / SYMBOL_DETAILS.sizeIncrement) *
          SYMBOL_DETAILS.sizeIncrement;
        const orderList: OrderListElement[] = [];
        if (
          logxSize < SYMBOL_DETAILS.minOrderSize ||
          logxSize * buyPrice < SYMBOL_DETAILS.minFunds
        ) {
          console.error(
            `Invalid size ${logxSize} or notional ${
              logxSize * buyPrice
            } for ${TRADE_PAIR}`
          );
          return
        }
        const buyOrder = await CreateLimitOrderStruct(
          logxSize,
          buyPrice,
          BatchAddOrdersOrderList.SideEnum.BUY,
          TRADE_PAIR
        );
        if (buyOrder) orderList.push(buyOrder);
        const sellOrder = await CreateLimitOrderStruct(
          logxSize,
          sellPrice,
          BatchAddOrdersOrderList.SideEnum.SELL,
          TRADE_PAIR
        );
        if (sellOrder) orderList.push(sellOrder);
  
        if (orderList.length === 2) {
          console.log("Placing batched orders", orderList);
          // 3. Place both together as a batch
          const result=await PlaceBatchOrder(orderList);
          if(result){
              // console.log("✅ Successfully placed batched orders");
              // KuCoinTracker.dailySpent+=size*Number(buyPrice)*0.0006;
              // KuCoinTracker.monthlySpent+=size*Number(buyPrice)*0.0006;
              console.log(
                `✅ Placed batched orders: [${orderList
                  .map(o => `${o.side} ${o.size}@${o.price}`)
                  .join(", ")}]`
              );
          }else{
              console.error("Failed to place batched orders");
              return
          }
        } else {
          console.warn(
            `⚠️ Skipping trade pair - only ${orderList.length} valid orders created`
          );
        }
      } catch (err) {
        console.error("Error executing trade:", err);
      }
    }, delay);
  }

  console.log("🎯 Daily schedule complete, restarting for next day...");
};
