import { SpotApi } from "gate-api";
import {
  GATE_FEE,
  GATE_PRECISION,
  GATEX_LOGX_TICK_SIZE,
  SYMBOL_DETAILS_GATE,
} from "../utils/constants";
import { OrderListElement } from "../utils/types";
import { Order } from "gate-api";
import { Budget } from "../utils/types";
import { TelegramService } from "../TelegramBot";
import { Trade } from "../utils/types";
import { BatchOrder } from "gate-api";
import { toTwoDecimals } from "../utils/functions";
/**
 * Create a limit order
 * @param size - The size of the order
 * @param price - The price of the order
 * @param side - The side of the order
 * @param symbol - The symbol of the order
 * @returns THe order Element which can be passed into the Batch Order Function
 */
export const CreateLimitOrderStruct = async (
  size: number,
  price: number,
  side: "BUY" | "SELL",
  symbol: string
) => {
  try {
    // Check if the order size is above the minimum order size
    const isValidSize = await CheckOrderSize(size, symbol);
    if (!isValidSize) {
      return null;
    }
    // Check if the notional value is above the minimum funds
    const isValidNotional = await CheckNotionalValue(size, price);
    if (!isValidNotional) {
      return null;
    }
    const currentTime = new Date().getTime();
    const clientOid = `${currentTime}_${side}_maker`;
    const orderList: OrderListElement = {
      clientOid,
      symbol,
      type: "LIMIT",
      side: side,
      price: price.toString(),
      size: size.toFixed(GATE_PRECISION),
      selfTradePrevention: "NO_STP",
    };
    return orderList;
  } catch (error) {
    console.error("Error placing limit order", error);
    return null;
  }
};

/**
 * Place a batch of orders
 * @param orderList - The list of orders to place
 * @param client - The Gatex client
 * @param tracker - The budget tracker
 * @param telegramService - The telegram service for notifications
 * @returns The result of the batch order placement
 */
export const PlaceBatchOrder = async (
  orderList: OrderListElement[],
  client: SpotApi,
  tracker: Budget,
  telegramService?: TelegramService
): Promise<boolean> => {
  try {
    let success = true;
    if (!client) {
      throw new Error("Failed to initialize GateX client");
    }
    const cancelOpenOrders = await client.cancelOrders({
      currencyPair: SYMBOL_DETAILS_GATE.symbol
    })

    if(cancelOpenOrders.response.status === 200){
      cancelOpenOrders.body.map(async (item:Order)=>{
        await telegramService?.sendAlert(`GateX: Cancelled open order ${item.side} ${item.amount} ${item.price}`)
        tracker.dailyVolume -= Number(item.amount) * Number(item.price);
        tracker.dailyTrades -= 1;
        tracker.dailySpent -= Number(item.amount) * Number(item.price) * Number(GATE_FEE);
        tracker.monthlySpent -= Number(item.amount) * Number(item.price) * Number(GATE_FEE);
        tracker.monthlyTrades -= 1;
      })
    }else{
      console.error("Failed to cancel open orders");
      await telegramService?.sendErrorAlert(
        "GateX: Failed to cancel open orders"
      );
    }
    const orderListGateX: Order[] = orderList.map((order, index) => {
      const side = order.side === "BUY" ? Order.Side.Buy : Order.Side.Sell;
      return {
        currencyPair: SYMBOL_DETAILS_GATE.symbol,
        side: side,
        type: Order.Type.Limit,
        amount: Number(order.size).toFixed(SYMBOL_DETAILS_GATE.sizePrecision),
        price:  Number(order.price).toFixed(SYMBOL_DETAILS_GATE.pricePrecision),
        text: `t-${order.clientOid}`,
        postOnly: index === 0 ? true : false,
        timeInForce: Order.TimeInForce.Gtc, 
      };
    });

    const batchOrderResult = await client.createBatchOrders(orderListGateX, {
      xGateExptime: ((new Date().getTime()) + 60000).toString(),
    });
   await new Promise(resolve => setTimeout(resolve, 10000));
    if (batchOrderResult.response.status === 200) {
      const opts = {};
      batchOrderResult.body.forEach(async (order:BatchOrder) => {
        try {
          if(order.message === "Not enough balance"){
            await telegramService?.sendErrorAlert(
              `GateX: Not enough balance for ${order.id}`
            );
            return;
          }
          if(!order.succeeded){
            await telegramService?.sendErrorAlert(
              `GateX: Batch order failed, order status failed`
            );
            return;
          }
        
          const orderStatus = await client.getOrder(
            order.id as string,
            SYMBOL_DETAILS_GATE.symbol,
            opts
          );
          if (
            orderStatus.response.status === 200
          ) {
            const volume = Number(orderStatus.body.price) * Number(orderStatus.body.filledAmount);
            tracker.dailyVolume += toTwoDecimals(volume);
            tracker.dailyTrades +=1;
            const feeCurrencyMultiplier= orderStatus.body.feeCurrency === "LOGX" ? Number(orderStatus.body.avgDealPrice) : 1;
            const OrderFees = Number(orderStatus.body.fee) * Number(feeCurrencyMultiplier);
            tracker.dailySpent += toTwoDecimals(OrderFees);
            tracker.monthlySpent  += toTwoDecimals(OrderFees);
            tracker.monthlyTrades += 1;
          }

        } catch (error) {
          console.error("Error getting order status");
          await telegramService?.sendErrorAlert(
            `GateX: Failed to get order status for ${order.id}`
          );
        }
      });  
      success = true;
    } else {
      success = false;
      await telegramService?.sendErrorAlert(
        "Failed to place batch order on Gatex"
      );
    }
    return success;
  } catch (error) {
    console.error("Error placing batch order on Gatex", error);
    await telegramService?.sendErrorAlert(
      "Failed to place batch order on Gatex"
    );
    return false;
  }
};

/**
 * Get the order book for the LOGX-USDT pair
 * @param client - The GateX client
 * @returns The order book for the LOGX-USDT pair
 */
export const GetOrderBook = async (client: SpotApi) => {
  try {
    if (!client) {
      throw new Error("Failed to initialize GateX client");
    }
    const opts = {};
    const result = await client.listOrderBook(SYMBOL_DETAILS_GATE.symbol, opts);
  } catch (error) {
    console.error("Error fetching order book on Gatex", error);
    return null;
  }
};

/**
 * Fetches the best {bid, ask} prices for the LOGX-USDT pair
 * @returns The best order book prices
 */
export const FetchBestOrderBookPrices = async (
  client: SpotApi
): Promise<{
  ask: string;
  bid: string;
} | null> => {
  try {
    if (!client) {
      throw new Error("Failed to initialize GateX client");
    }
    const opts = {
      interval: "0", // string | Price precision for depth aggregation, 0 means no aggregation, defaults to 0 if not specified
      limit: 10, // number | Number of depth levels
      withId: false, // boolean | Return order book update ID
    };
    const result = await client.listOrderBook(SYMBOL_DETAILS_GATE.symbol, opts);

    const ask = result.body.asks[0];
    const bid = result.body.bids[0];
    return {
      ask: ask[0],
      bid: bid[0],
    };
  } catch (error) {
    console.error("Error fetching best order book prices", error);
    return null;
  }
};

/**
 * Check if the notional value is above the minimum funds
 * @param logxSize - The size of the trade
 * @param buyPrice - The price of the trade
 * @returns True if the notional value is above the minimum funds, false otherwise
 */
export const CheckNotionalValue = async (
  logxSize: number,
  buyPrice: number
) => {
  const notional = logxSize * buyPrice;
  if (notional < SYMBOL_DETAILS_GATE.minFunds) {
    console.log(
      `Notional value ${notional.toFixed(3)} is below minimum ${
        SYMBOL_DETAILS_GATE.minFunds
      }`
    );
    return false;
  }
  return true;
};

/**
 * Check if the order size is above the minimum order size
 * @param size - The size of the order
 * @param symbol - The symbol of the order
 * @returns True if the order size is above the minimum order size, false otherwise
 */
export const CheckOrderSize = async (size: number, symbol: string) => {
  if (size < SYMBOL_DETAILS_GATE.minOrderSize) {
    console.log(
      `Size ${size} is below minimum ${SYMBOL_DETAILS_GATE.minOrderSize} for ${symbol}`
    );
    return false;
  }
  return true;
};

export const CanExecuteTrade = async (
  trade: OrderListElement,
  GateXTracker: Budget,
  client: SpotApi,
  telegramService?: TelegramService
) => {
  const result = await FetchBestOrderBookPrices(client);
  if (result === null) {
    console.log("Failed to fetch best order book prices");
    return false;
  }
  const { ask } = result;
  const tradeCost = Number(trade.size) * Number(ask) * GATE_FEE; // Maker fee (0.06%)
  const canExecute =
    Number(GateXTracker.monthlySpent.toFixed(5)) + Number(tradeCost.toFixed(5)) <= Number(GateXTracker.monthlyLimit.toFixed(5));
  if (!canExecute) {
    if (telegramService) {
      await telegramService.sendBudgetAlert(GateXTracker);
    }
    return false;
  }
  return true;
};

/**
 * Process each trade pair
 * @param tradePair - The trade pair to process
 * @param client - The KuCoin client
 * @param tracker - The tracker for the trade
 * @param isBotRunning - Whether the bot is running
 * @param marketClient - The market client
 * @param telegramService - The telegram service for notifications
 * @returns The result of the trade
 */
export const ProcessEachTradePair = async (
  tradePair: Trade[],
  client: SpotApi,
  tracker: Budget,
  isBotRunning: boolean,
  telegramService?: TelegramService
) => {
  if (!isBotRunning) {
    console.log("Bot is stopped, skipping trade pair execution");
    return;
  }
  try {
    const book = await FetchBestOrderBookPrices(client);
    if (!book) {
      console.error("⚠️ Failed to fetch order book, skipping trade");
      if (telegramService) {
        await telegramService.sendErrorAlert(
          "GateX: Failed to fetch order book, skipping trade"
        );
      }
      return;
    }

    // Target Volume is distributed into multiple sub orders volume
    const usdtSize = tradePair[0].size;
    const bestBid = parseFloat(book.bid);
    const bestAsk = parseFloat(book.ask);
    const midPrice = Number(
      ((bestBid + bestAsk) / 2).toFixed(SYMBOL_DETAILS_GATE.pricePrecision)
    );
    const buyPrice = Number(
      (midPrice + GATEX_LOGX_TICK_SIZE).toFixed(
        SYMBOL_DETAILS_GATE.pricePrecision
      )
    );
    const sellPrice = Number(buyPrice);
    //Amount of LOGX tokens to buy and sell
    const logxSize = Math.round(usdtSize / buyPrice);
    const orderList: OrderListElement[] = [];
    const isValid = await ValidateTrade(logxSize, buyPrice);
    if (!isValid) {
      if (telegramService) {
        await telegramService.sendErrorAlert(
          `KuCoin: Trade validation failed - Size: ${logxSize}, Price: ${buyPrice}`
        );
      }
      return;
    }

    const buyOrder = await CreateLimitOrderStruct(
      logxSize,
      buyPrice,
      tradePair[0].type,
      SYMBOL_DETAILS_GATE.symbol
    );

    const sellOrder = await CreateLimitOrderStruct(
      logxSize,
      sellPrice,
      tradePair[1].type,
      SYMBOL_DETAILS_GATE.symbol
    );

    if (!buyOrder || !sellOrder) {
      // console.error("Failed to create orders, skipping");
      if (telegramService) {
        await telegramService.sendErrorAlert(
          "GateX: Failed to create buy/sell orders"
        );
      }
      return;
    }

    if (
      (await CanExecuteTrade(buyOrder, tracker, client, telegramService)) &&
      (await CanExecuteTrade(sellOrder, tracker, client, telegramService))
    ) {
      console.log("Maker and Taker Trades are valid, creating orders");
    } else {
      if (telegramService) {
        await telegramService.sendBudgetAlert(tracker);
      }
      return 
    }

    orderList.push(buyOrder);
    orderList.push(sellOrder);

    if (orderList.length === 2) {
      // 3. Place both together as a batch
      const result = await PlaceBatchOrder(
        orderList,
        client,
        tracker,
        telegramService
      );
      if (!result) {
        console.error("GateX: Failed to place batched orders");
        if (telegramService) {
          await telegramService.sendErrorAlert(
            "GateX: Failed to place batched orders"
          );
        }
        return;
      }
    } else {
      console.warn(
        `⚠️ Skipping trade pair - only ${orderList.length} valid orders created`
      );
      if (telegramService) {
        await telegramService.sendErrorAlert(
          `Gatex: Only ${orderList.length} valid orders created, skipping trade pair`
        );
      }
    }
  } catch (err: any) {
    console.error("Error executing trade:", JSON.stringify(err.data));
    if (telegramService) {
      await telegramService.sendErrorAlert(
        `Gatex: Error executing trade - ${err.message || "Unknown error"}`
      );
    }
  }
};

/**
 * Validate the trade size and price
 * @param logxSize - The size of the trade
 * @param buyPrice - The price of the trade
 * @returns True if the trade is valid, false otherwise
 */
export const ValidateTrade = async (logxSize: number, buyPrice: number) => {
  if (
    logxSize < SYMBOL_DETAILS_GATE.minOrderSize ||
    logxSize * buyPrice < SYMBOL_DETAILS_GATE.minFunds
  ) {
    console.log(`Invalid size ${logxSize} or notional ${logxSize * buyPrice}`);
    return false;
  }
  return true;
};
