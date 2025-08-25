import { Spot } from "mexc-api-sdk";
import { OrderListElement } from "../utils/types";
export const MEXC_BASE_URL = "https://api.mexc.com";
export const MEXC_TOKEN_PAIR = "LOGXUSDT";

export const CreateLimitOrderStruct = async (
  size: number,
  price: number,
  side: "BUY" | "SELL",
  symbol: string
): Promise<OrderListElement | null> => {
  try {
    const orderParams: OrderListElement = {
      symbol: symbol,
      side: side.toUpperCase(),
      type: "LIMIT",
      size: size.toString(),
      price: price.toString(),
      clientOid: `M-${side.charAt(0).toUpperCase()}-${Date.now()}`,
      selfTradePrevention: "NO_STP",
    };
    return orderParams;
  } catch (error) {
    console.error("Error creating limit order struct", error);
    return null;
  }
};

export const FetchBestOrderBookPrices = async (client: Spot) => {
  try {
    // const data = await client.tickerPrice(MEXC_TOKEN_PAIR);
    const data = await client.ticker24hr(MEXC_TOKEN_PAIR);
    console.log(data);
    const bestPriceObject = {
      bid: data.price,
      ask: data.price,
    };
    return bestPriceObject;
  } catch (error) {
    console.log("Error fetching the Order book", error);
    return null;
  }
};
