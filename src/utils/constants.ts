import { Budget } from "./types";
import { config } from "dotenv";

config();

export const KUCOIN_TARGET_VOLUME = 12500;
export const KUCOIN_BASE_URL = "https://api.kucoin.com";
export const TRADE_PAIR = "LOGX-USDT";
export const ORDER_BOOK_SIZE = "20";
export const KUCOIN_API_KEY = process.env.KUCOIN_API_KEY;
export const KUCOIN_API_SECRET = process.env.KUCOIN_API_SECRET;
export const KUCOIN_API_PASSPHRASE = process.env.KUCOIN_PASSPHRASE;
export const KUCOIN_EXCHANGE_NAME = "KUCOIN";

// LOGX-USDT trading rules
export const KUCOIN_FEE = 0.0006;
export const LOGX_TICK_SIZE = 0.00001; // Minimum price increment
export const LOGX_MIN_ORDER_SIZE = 0.1; // Minimum order value in USDT
export const LOGX_MIN_SIZE = 25; // Minimum order size in LOGX (0.1 USDT / 0.004 price)
export const KUCOIN_PRICE_POINTS = 5;
export const KUCOIN_SIZE_POINTS = 1;

//MEXC LOGX_USDT PAIR
export const MEXC_FEE = 0.0002;
export const LOGX_TICK_SIZE_MEXC = 0.000001;

export const SYMBOL_DETAILS_KUCOIN = {
  symbol: "LOGX-USDT",
  minOrderSize: 10, // 10 LOGX
  sizeIncrement: 0.1, // 0.1 LOGX
  priceIncrement: 0.00001, // 0.00001 USDT
  minFunds: 0.1, // 0.1 USDT
};

export const SYMBOL_DETAILS_MEXC = {
  symbol: "LOGXUSDT",
  priceIncrement: LOGX_TICK_SIZE_MEXC, // 0.000001 USDT on MEXC
};
