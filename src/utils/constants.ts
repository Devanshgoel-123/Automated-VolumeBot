import { Budget } from "./types";
import { config } from 'dotenv';

config();

export const KUCOIN_TARGET_VOLUME=12500;
export const KUCOIN_BASE_URL="https://api.kucoin.com"
export const TRADE_PAIR="LOGX-USDT"
export const ORDER_BOOK_SIZE="20";
export const KUCOIN_API_KEY=process.env.KUCOIN_API_KEY;
export const KUCOIN_API_SECRET=process.env.KUCOIN_API_SECRET;
export const KUCOIN_API_PASSPHRASE=process.env.KUCOIN_PASSPHRASE;

// LOGX-USDT trading rules
export const LOGX_TICK_SIZE = 0.00001; // Minimum price increment
export const LOGX_MIN_ORDER_SIZE = 0.1; // Minimum order value in USDT
export const LOGX_MIN_SIZE = 25; // Minimum order size in LOGX (0.1 USDT / 0.004 price)
export const SYMBOL_DETAILS = {
    symbol: 'LOGX-USDT',
    minOrderSize: 10, // 10 LOGX
    sizeIncrement: 0.1, // 0.1 LOGX
    priceIncrement: 0.00001, // 0.00001 USDT
    minFunds: 0.1, // 0.1 USDT
  };

export const ORDERBOOK={
  "time": 1756022813082,
  "sequence": "207321881",
  "bids": [
      [
          "0.00449",
          "40445.2"
      ],
      [
          "0.00445",
          "30933"
      ],
      [
          "0.00443",
          "191148.2"
      ],
      [
          "0.00441",
          "14587"
      ],
      [
          "0.0044",
          "7514"
      ],
      [
          "0.00439",
          "102505.6"
      ],
      [
          "0.00428",
          "2600"
      ],
      [
          "0.00427",
          "4716"
      ],
      [
          "0.00422",
          "2700"
      ],
      [
          "0.00421",
          "4761"
      ],
      [
          "0.00418",
          "7484"
      ],
      [
          "0.00415",
          "1927.7"
      ],
      [
          "0.00413",
          "2700"
      ],
      [
          "0.00412",
          "4854"
      ],
      [
          "0.00411",
          "5800"
      ],
      [
          "0.0041",
          "294512.1"
      ],
      [
          "0.00408",
          "21210.2"
      ],
      [
          "0.00407",
          "4914"
      ],
      [
          "0.00406",
          "122657.5"
      ],
      [
          "0.00404",
          "4962"
      ]
  ],
  "asks": [
      [
          "0.00453",
          "1167.7"
      ],
      [
          "0.00454",
          "32238.8"
      ],
      [
          "0.00455",
          "19864.1"
      ],
      [
          "0.00456",
          "40070.1"
      ],
      [
          "0.00457",
          "22.2"
      ],
      [
          "0.00458",
          "35609"
      ],
      [
          "0.00459",
          "31506"
      ],
      [
          "0.0046",
          "26843.2"
      ],
      [
          "0.00461",
          "22183"
      ],
      [
          "0.00462",
          "16602"
      ],
      [
          "0.00463",
          "12433.8"
      ],
      [
          "0.00464",
          "8309"
      ],
      [
          "0.00465",
          "4301"
      ],
      [
          "0.00467",
          "22.8"
      ],
      [
          "0.00502",
          "3968"
      ],
      [
          "0.00509",
          "6368"
      ],
      [
          "0.00512",
          "3906"
      ],
      [
          "0.00515",
          "3883"
      ],
      [
          "0.00519",
          "3861"
      ],
      [
          "0.00546",
          "4056.7"
      ]
  ]
}