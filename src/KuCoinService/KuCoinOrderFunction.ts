import { OrderListElement } from "../utils/types";
import { config } from "dotenv";
import { KUCOIN_FEE, SYMBOL_DETAILS_KUCOIN } from "../utils/constants";
import { InitializeKuCoinClientMarket } from "./kucoinService";
import { Spot } from "kucoin-universal-sdk";
import { KUCOIN_EXCHANGE_NAME } from "../utils/constants";
import {
  BatchAddOrdersData,
  BatchAddOrdersOrderList,
  OrderAPI,
} from "kucoin-universal-sdk/dist/generate/spot/order";
import { TRADE_PAIR, ORDER_BOOK_SIZE, LOGX_MIN_SIZE } from "../utils/constants";
import { KUCOIN_SIZE_POINTS, KUCOIN_PRICE_POINTS } from "../utils/constants";
import { Budget, Trade } from "../utils/types";
import { InsertOrder } from "../db/orders";
import { MarketAPI } from "kucoin-universal-sdk/dist/generate/spot/market";
import { LOGX_TICK_SIZE } from "../utils/constants";
import { TelegramService } from "../TelegramBot/index";
config();

/**
 * Validate order size meets minimum requirements
 * @param size - The order size in LOGX
 * @param price - The order price
 * @returns Whether the order meets minimum requirements
 */
export const validateOrderSize = (size: number, price: number): boolean => {
  const orderValue = size * price;
  return size >= LOGX_MIN_SIZE && orderValue >= 0.1;
};

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
  side: BatchAddOrdersOrderList.SideEnum,
  symbol: string
) => {
  try {
    const roundedSize =
      Math.round(size / SYMBOL_DETAILS_KUCOIN.sizeIncrement) *
      SYMBOL_DETAILS_KUCOIN.sizeIncrement;

    // Check if the order size is above the minimum order size
    const isValidSize = await CheckOrderSize(roundedSize, symbol);
    if (!isValidSize) {
      return null;
    }
    // Check if the notional value is above the minimum funds
    const isValidNotional = await CheckNotionalValue(roundedSize, price);
    if (!isValidNotional) {
      return null;
    }
    // Round the price to the nearest price increment
    const roundedPrice =
      Math.round(price / SYMBOL_DETAILS_KUCOIN.priceIncrement) *
      SYMBOL_DETAILS_KUCOIN.priceIncrement;
    const formattedSize = Math.round(size / 0.1) * 0.1;
    const currentTime = new Date().getTime();
    const clientOid = `${currentTime}_${side}_maker`;
    const orderList: OrderListElement = {
      clientOid,
      symbol,
      type: BatchAddOrdersOrderList.TypeEnum.LIMIT,
      side: side,
      price: roundedPrice.toFixed(KUCOIN_PRICE_POINTS),
      size: formattedSize.toFixed(KUCOIN_SIZE_POINTS),
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
 * @param client - The KuCoin client
 * @param tracker - The budget tracker
 * @param telegramService - The telegram service for notifications
 * @returns The result of the batch order placement
 */
export const PlaceBatchOrder = async (
  orderList: OrderListElement[],
  client: OrderAPI,
  tracker: Budget,
  telegramService?: TelegramService
) => {
  try {
    let success = false;
    if (!client) {
      throw new Error("Failed to initialize KuCoin client");
    }
    
    
    const request = Spot.Order.BatchAddOrdersReq.create({
      orderList: orderList.map((order) =>
        Spot.Order.BatchAddOrdersOrderList.create({
          clientOid: order.clientOid,
          symbol: order.symbol,
          type: BatchAddOrdersOrderList.TypeEnum.LIMIT,
          side: order.side as BatchAddOrdersOrderList.SideEnum,
          price: order.price,
          size: order.size,
          cancelAfter: 60,
        })
      ),
    });
    const batchOrderResult = await client.batchAddOrders(request);
    console.log("Batch order result", batchOrderResult.data);
  
    batchOrderResult.data.map(
      async (item: BatchAddOrdersData, index: number) => {
        if (item.success) {
          success = true;
          const orderItem = orderList[index];
          const tradeCost =
            Number(orderItem.size) * Number(orderItem.price) * KUCOIN_FEE;
          tracker.dailySpent += tradeCost;
          tracker.monthlySpent += tradeCost;
          tracker.dailyTrades++;
          tracker.dailyVolume +=
            Number(orderItem.size) * Number(orderItem.price);
          const storeOrder = await InsertOrder({
            clientOid: orderItem.clientOid,
            symbol: orderItem.symbol,
            type: orderItem.type.toString() as string,
            side: orderItem.side.toString() as string,
            price: orderItem.price,
            size: orderItem.size,
            exchangeName: KUCOIN_EXCHANGE_NAME,
          });
          if (storeOrder) {
            console.log(
              "Order placed and inserted into the database successfully",
              storeOrder
            );
          } else {
            console.error("Failed to store order", item);
            if (telegramService) {
              await telegramService.sendErrorAlert(`KuCoin: Failed to store order ${orderItem.clientOid} in database`);
            }
          }
        } else {
          success = false;
          if (telegramService) {
            await telegramService.sendErrorAlert(`KuCoin: Order ${orderList[index]?.clientOid} failed to place`);
          }
        }
      }
    );
    
    return success;
  } catch (error: any) {
    console.error("Error placing limit order", JSON.stringify(error));
    if (telegramService) {
      await telegramService.sendErrorAlert(`KuCoin: Error placing batch orders - ${error.message || 'Unknown error'}`);
    }
    return false;
  }
};

/**
 * Get the order book for a given symbol
 * @param symbol - The symbol to get the order book for
 * @returns The order book for the given symbol
 */
export const GetOrderBook = async () => {
  try {
    const client = await InitializeKuCoinClientMarket();
    if (!client) {
      throw new Error("Failed to initialize KuCoin client");
    }
    const request = Spot.Market.GetPartOrderBookReq.builder()
      .setSize(ORDER_BOOK_SIZE)
      .setSymbol(TRADE_PAIR)
      .build();
    client
      .getPartOrderBook(request)
      .then((result) => {
        console.log(
          `Time: ${result.time}, Seq: ${result.sequence}, Bids: ${result.bids[0]}, Asks: ${result.asks[0]}`
        );
      })
      .catch((err) => {
        console.error("fail to get part order book", err);
      });
  } catch (error) {
    console.error("Error getting order book", error);
    return null;
  }
};

/**
 * Fetches the best {bid, ask} prices for the LOGX-USDT pair
 * @returns The best order book prices
 */
export const FetchBestOrderBookPrices = async (client:MarketAPI) => {
  try {
    if (!client) {
      throw new Error("Failed to initialize KuCoin client");
    }
    const request = Spot.Market.GetPartOrderBookReq.builder()
      .setSize(ORDER_BOOK_SIZE)
      .setSymbol(TRADE_PAIR)
      .build();
    const result = await client.getPartOrderBook(request);
    return {
      ask: result.asks[0][0],
      bid: result.bids[0][0],
    };
  } catch (error) {
    console.error("Error fetching best order book prices", error);
    return null;
  }
};

export const CanExecuteTrade = async (
  trade: OrderListElement,
  KuCoinTracker: Budget,
  client: MarketAPI
) => {
  const result = await FetchBestOrderBookPrices(client);
  if (result === null) {
    console.log("Failed to fetch best order book prices");
    return false;
  }
  const { ask } = result;
  const tradeCost = Number(trade.size) * Number(ask) * KUCOIN_FEE; // Maker fee (0.06%)
  console.log("tradeCost", tradeCost);
  console.log("KuCoinTracker.dailySpent", KuCoinTracker.dailySpent);
  console.log("KuCoinTracker.dailyLimit", KuCoinTracker.dailyLimit);
  console.log("KuCoinTracker.monthlySpent", KuCoinTracker.monthlySpent);
  console.log("KuCoinTracker.monthlyLimit", KuCoinTracker.monthlyLimit);
  const canExecute =
    KuCoinTracker.dailySpent + tradeCost <= KuCoinTracker.dailyLimit &&
    KuCoinTracker.monthlySpent + tradeCost <= KuCoinTracker.monthlyLimit;
  if (!canExecute) {
    console.log(`Budget limit reached, skipping trade ${trade.size}`);
    return false;
    // await sendBudgetAlert();
  }
  return true;
};

/**
 * Validate the trade size and price
 * @param logxSize - The size of the trade
 * @param buyPrice - The price of the trade
 * @returns True if the trade is valid, false otherwise
 */
export const ValidateTrade = async (logxSize: number, buyPrice: number) => {
  console.log("logxSize", logxSize);
  console.log("buyPrice", buyPrice);
  console.log("SYMBOL_DETAILS.minOrderSize", SYMBOL_DETAILS_KUCOIN.minOrderSize);
  console.log("SYMBOL_DETAILS.minFunds", SYMBOL_DETAILS_KUCOIN.minFunds);
  if (
    logxSize < SYMBOL_DETAILS_KUCOIN.minOrderSize ||
    logxSize * buyPrice < SYMBOL_DETAILS_KUCOIN.minFunds
  ) {
    console.log(
      `Invalid size ${logxSize} or notional ${
        logxSize * buyPrice
      } for ${TRADE_PAIR}`
    );
    return false;
  }
  return true;
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
  if (notional < SYMBOL_DETAILS_KUCOIN.minFunds) {
    console.log(
      `Notional value ${notional.toFixed(3)} is below minimum ${
        SYMBOL_DETAILS_KUCOIN.minFunds
      } for ${TRADE_PAIR}`
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
  if (size < SYMBOL_DETAILS_KUCOIN.minOrderSize) {
    console.log(
      `Size ${size} is below minimum ${SYMBOL_DETAILS_KUCOIN.minOrderSize} for ${symbol}`
    );
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
  client: OrderAPI,
  tracker: Budget,
  isBotRunning: boolean,
  marketClient: MarketAPI,
  telegramService?: TelegramService
) => {
  console.log("The Budget Status is", tracker);
  if (!isBotRunning) {
    console.log("Bot is stopped, skipping trade pair execution");
    return;
  }
  try {
    console.log("Executing trade pair", tradePair);
    const book = await FetchBestOrderBookPrices(marketClient);
    if (!book) {
      console.error("⚠️ Failed to fetch order book, skipping trade");
      if (telegramService) {
        await telegramService.sendErrorAlert("KuCoin: Failed to fetch order book, skipping trade");
      }
      return;
    }
    
    // Target Volume is distributed into multiple sub orders volume
    const usdtSize = tradePair[0].size;
    const bestBid = parseFloat(book.bid);
    const buyPrice = bestBid + LOGX_TICK_SIZE;
    const sellPrice = buyPrice;

    //Amount of LOGX tokens to buy and sell
    const logxSize =
      Math.round(usdtSize / buyPrice / SYMBOL_DETAILS_KUCOIN.sizeIncrement) *
      SYMBOL_DETAILS_KUCOIN.sizeIncrement;
    const orderList: OrderListElement[] = [];
    const isValid = await ValidateTrade(logxSize, buyPrice);
    console.log("isValid", isValid);
    if (!isValid) {
      console.log("Trade is invalid, skipping");
      if (telegramService) {
        await telegramService.sendErrorAlert(`KuCoin: Trade validation failed - Size: ${logxSize}, Price: ${buyPrice}`);
      }
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
      if (telegramService) {
        await telegramService.sendErrorAlert("KuCoin: Failed to create buy/sell orders");
      }
      return;
    }
    
    if (
      (await CanExecuteTrade(buyOrder, tracker, marketClient)) &&
      (await CanExecuteTrade(sellOrder, tracker, marketClient))
    ) {
      console.log("Maker and Taker Trades are valid, creating orders");
      if (telegramService) {
        await telegramService.sendAlert(`✅ KuCoin: Trade validation passed - Size: ${logxSize} LOGX, Price: $${buyPrice}`);
      }
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
      const result = await PlaceBatchOrder(orderList, client, tracker, telegramService);
      if (result) {
        console.log("✅ Successfully placed batched orders");
      } else {
        console.error("Failed to place batched orders");
        if (telegramService) {
          await telegramService.sendErrorAlert("KuCoin: Failed to place batched orders");
        }
        return;
      }
    } else {
      console.warn(
        `⚠️ Skipping trade pair - only ${orderList.length} valid orders created`
      );
      if (telegramService) {
        await telegramService.sendErrorAlert(`KuCoin: Only ${orderList.length} valid orders created, skipping trade pair`);
      }
    }
  } catch (err: any) {
    console.error("Error executing trade:", JSON.stringify(err.data));
    if (telegramService) {
      await telegramService.sendErrorAlert(`KuCoin: Error executing trade - ${err.message || 'Unknown error'}`);
    }
  }
};