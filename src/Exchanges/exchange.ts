import { GATEX_EXCHANGE_NAME, KUCOIN_EXCHANGE_NAME } from "../utils/constants";
import { Budget, OrderListElement, Trade } from "../utils/types";
import { TelegramService } from "../TelegramBot/index";
import { KuCoinAdapter } from "./KuCoin/KuCoinAdapter";
import { GateXAdapter } from "./Gate/GateAdapter";


export interface ExchangeAdapter {
  exchangeName: string;
  isBotRunning: boolean;
  initializeClients(): Promise<void>;
  initializeStats(): Promise<void>;
  tracker: Budget;
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

  processTrades(telegramService?: TelegramService): Promise<void>;

  generateSchedule(): { trades: Trade[][]; exchange: string };

  stopBot(): Promise<void>;
}

export class ExchangeFactory {
  static getAdapter(name: string): ExchangeAdapter {
    switch (name) {
      case KUCOIN_EXCHANGE_NAME:
        return new KuCoinAdapter();
      case GATEX_EXCHANGE_NAME:
        return new GateXAdapter();
      // case "MEXC":
      //   return new MexcAdapter();
      default:
        throw new Error(`Exchange ${name} not supported`);
    }
  }
}
