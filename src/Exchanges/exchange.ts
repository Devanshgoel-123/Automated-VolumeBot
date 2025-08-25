import { KUCOIN_EXCHANGE_NAME } from "../utils/constants";
import { Budget, OrderListElement, Trade } from "../utils/types";
import { TelegramService } from "../TelegramBot/index";
import { KuCoinAdapter } from "./KuCoin/KuCoinAdapter";
// import { GateAdapter } from "./Gate/GateAdapter";
// import { MexcAdapter } from "./MexC/MexcAdapter";
export interface ExchangeAdapter {
  exchangeName: string;
  initializeClients(): Promise<void>;

  createBatchOrder(
    orders: OrderListElement[],
    tracker: Budget
  ): Promise<boolean>;

  createLimitOrder(
    size: number,
    price: number,
    side: "BUY" | "SELL",
    symbol: string
  ): Promise<OrderListElement | null>;

  fetchBestPrices(): Promise<{ bid: string; ask: string } | null>;

  validateTrade(size: number, price: number): Promise<boolean>;

  cancelOrder(orderId: string): Promise<boolean>;

  processTrades(tracker: Budget, isBotRunning: boolean, telegramService?: TelegramService): Promise<void>;

  generateSchedule(): { trades: Trade[][]; exchange: string };
}

export class ExchangeFactory {
  static getAdapter(name: string): ExchangeAdapter {
    switch (name) {
      case KUCOIN_EXCHANGE_NAME:
        return new KuCoinAdapter();
      // case "GATE":
      //   return new GateAdapter();
      // case "MEXC":
      //   return new MexcAdapter();
      default:
        throw new Error(`Exchange ${name} not supported`);
    }
  }
}
