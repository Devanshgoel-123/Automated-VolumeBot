import { OrderListElement } from "../utils/types";
import { config } from "dotenv";
import { SYMBOL_DETAILS } from "../utils/constants";
import {
  InitializeKuCoinClientMarket,
  InitializeKuCoinClientSpot,
} from "./kucoinService";
import { Spot } from "kucoin-universal-sdk";
import { BatchAddOrdersOrderList } from "kucoin-universal-sdk/dist/generate/spot/order";
import {
  TRADE_PAIR,
  ORDER_BOOK_SIZE,
  LOGX_TICK_SIZE,
  LOGX_MIN_SIZE,
} from "../utils/constants";
config();

/**
 * Round price to valid tick size
 * @param price - The price to round
 * @returns The rounded price
 */
export const roundToTickSize = (price: number): number => {
  return Math.round(price / LOGX_TICK_SIZE) * LOGX_TICK_SIZE;
};

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
      Math.round(size / SYMBOL_DETAILS.sizeIncrement) *
      SYMBOL_DETAILS.sizeIncrement;
    if (roundedSize < SYMBOL_DETAILS.minOrderSize) {
      console.error(
        `Size ${roundedSize} is below minimum ${SYMBOL_DETAILS.minOrderSize} for ${symbol}`
      );
      return null;
    }
    const notional = roundedSize * price;
    if (notional < SYMBOL_DETAILS.minFunds) {
      console.error(
        `Notional value ${notional.toFixed(3)} is below minimum ${
          SYMBOL_DETAILS.minFunds
        } for ${symbol}`
      );
      return null;
    }
    const roundedPrice =
      Math.round(price / SYMBOL_DETAILS.priceIncrement) *
      SYMBOL_DETAILS.priceIncrement;
    const formattedSize = Math.round(size / 0.1) * 0.1;
    const currentTime = new Date().getTime();
    const clientOid = `${currentTime}_${side}_maker`;
    const orderList: OrderListElement = {
      clientOid,
      symbol,
      type: BatchAddOrdersOrderList.TypeEnum.LIMIT,
      side: side,
      price: roundedPrice.toFixed(5),
      size: formattedSize.toFixed(1),
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
 * @returns The result of the batch order placement
 */
export const PlaceBatchOrder = async (orderList: OrderListElement[]) => {
  try {
    const client = await InitializeKuCoinClientSpot();
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
          cancelAfter: 60, //cancel after 60 seconds
        })
      ),
    });
    console.log("Request", request);
    client
      .batchAddOrders(request)
      .then((result) => {
        console.log("The result is", result);
      })
      .catch((err) => {
        console.error("fail to place batch order", err);
      });
  } catch (error) {
    console.error("Error placing limit order", error);
    return null;
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
export const FetchBestOrderBookPrices = async () => {
  try {
    const client = await InitializeKuCoinClientMarket();
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
