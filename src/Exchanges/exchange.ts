import { KUCOIN_EXCHANGE_NAME } from "../utils/constants";
import { Budget, DailySchedule, OrderListElement, Trade } from "../utils/types";
import { KuCoinAdapter } from "./KuCoin/KuCoinAdapter";
export interface ExchangeAdapter {
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

  processTrades(tracker: Budget, isBotRunning: boolean): Promise<void>;

  generateSchedule(): { trades: Trade[][]; exchange: string };
}

export class ExchangeFactory {
  static getAdapter(name: string): ExchangeAdapter {
    switch (name) {
      case KUCOIN_EXCHANGE_NAME:
        return new KuCoinAdapter();
      default:
        throw new Error(`Exchange ${name} not supported`);
    }
  }
}
