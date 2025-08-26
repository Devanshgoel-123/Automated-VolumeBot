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
    console.log("Creating limit order struct", size, price, side, symbol);
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
    console.log("The Order list", orderList);
    return orderList;
  } catch (error) {
    console.error("Error placing limit order", error);
    return null;
  }
};

/**
 * Place a batch of orders
 * @param orderList - The list of orders to place
 * @param client - The KuCoin client
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
    let success = false;
    if (!client) {
      throw new Error("Failed to initialize GateX client");
    }
    const orderListGateX: Order[] = orderList.map((order,index) => {
      const type =
        order.type === "LIMIT" ? Order.Type.Limit : Order.Type.Market;
      const side = order.side === "BUY" ? Order.Side.Buy : Order.Side.Sell;
      return {
        currencyPair: SYMBOL_DETAILS_GATE.symbol,
        side: side,
        type: type,
        amount: Number(order.size).toFixed(SYMBOL_DETAILS_GATE.sizePrecision),
        price: Number(order.price).toFixed(SYMBOL_DETAILS_GATE.pricePrecision),
        text: `t-${order.clientOid}`,
        timeInForce:Order.TimeInForce.Gtc,
        stpId: index === 0 ? 1 : 2,
      };
    });
    console.log("Order list", orderListGateX);
    const batchOrderResult = await client.createBatchOrders(orderListGateX, {
      xGateExptime: undefined,
    });
    console.log("Batch order result", batchOrderResult.response.data);
    console.log("Batch order result body is", batchOrderResult.body);
    return true;
  } catch (error) {
    console.error("Error placing batch order on Gatex", error);
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
    console.log(result.body);
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
    console.log("The ask is", ask);
    console.log("The bid is", bid);
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
  client: SpotApi
) => {
  const result = await FetchBestOrderBookPrices(client);
  if (result === null) {
    console.log("Failed to fetch best order book prices");
    return false;
  }
  const { ask } = result;
  const tradeCost = Number(trade.size) * Number(ask) * GATE_FEE; // Maker fee (0.06%)
  const canExecute =
    GateXTracker.dailySpent + tradeCost <= GateXTracker.dailyLimit &&
    GateXTracker.monthlySpent + tradeCost <= GateXTracker.monthlyLimit;
  if (!canExecute) {
    console.log(`Budget limit reached, skipping trade ${trade.size}`);
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
  console.log("The Budget Status is", tracker);

  if (!isBotRunning) {
    console.log("Bot is stopped, skipping trade pair execution");
    return;
  }
  try {
    console.log("Executing trade pair", tradePair);
    const book = await FetchBestOrderBookPrices(client);
    if (!book) {
      console.error("⚠️ Failed to fetch order book, skipping trade");
      if (telegramService) {
        await telegramService.sendErrorAlert(
          "KuCoin: Failed to fetch order book, skipping trade"
        );
      }
      return;
    }

    // Target Volume is distributed into multiple sub orders volume
    const usdtSize = tradePair[0].size;
    const bestBid = parseFloat(book.bid);
    const buyPrice = bestBid + GATEX_LOGX_TICK_SIZE;
    const sellPrice = buyPrice;
    console.log("The best bid is", bestBid);
    console.log("The buy price is", buyPrice);
    console.log("The sell price is", sellPrice);
    //Amount of LOGX tokens to buy and sell
    const logxSize = Math.round(usdtSize / buyPrice);
    const orderList: OrderListElement[] = [];
    const isValid = await ValidateTrade(logxSize, buyPrice);
    console.log("isValid", isValid);
    if (!isValid) {
      console.log("Trade is invalid, skipping");
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
      "BUY",
      SYMBOL_DETAILS_GATE.symbol
    );

    const sellOrder = await CreateLimitOrderStruct(
      logxSize,
      sellPrice,
      "SELL",
      SYMBOL_DETAILS_GATE.symbol
    );

    if (!buyOrder || !sellOrder) {
      console.error("Failed to create orders, skipping");
      if (telegramService) {
        await telegramService.sendErrorAlert(
          "KuCoin: Failed to create buy/sell orders"
        );
      }
      return;
    }

    if (
      (await CanExecuteTrade(buyOrder, tracker, client)) &&
      (await CanExecuteTrade(sellOrder, tracker, client))
    ) {
      console.log("Maker and Taker Trades are valid, creating orders");
    } else {
      console.error("Maker and Taker Trades are not valid, skipping");
      if (telegramService) {
        await telegramService.sendBudgetAlert(tracker);
      }
      return;
    }

    orderList.push(buyOrder);
    orderList.push(sellOrder);

    if (orderList.length === 2) {
      console.log("Placing batched orders", orderList);
      // 3. Place both together as a batch
      const result = await PlaceBatchOrder(
        orderList,
        client,
        tracker,
        telegramService
      );
      if (result) {
        console.log("✅ Successfully placed batched orders");
      } else {
        console.error("Failed to place batched orders");
        if (telegramService) {
          await telegramService.sendErrorAlert(
            "KuCoin: Failed to place batched orders"
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
          `KuCoin: Only ${orderList.length} valid orders created, skipping trade pair`
        );
      }
    }
  } catch (err: any) {
    console.error("Error executing trade:", JSON.stringify(err.data));
    if (telegramService) {
      await telegramService.sendErrorAlert(
        `KuCoin: Error executing trade - ${err.message || "Unknown error"}`
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
