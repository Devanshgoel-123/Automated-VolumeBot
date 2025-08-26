import { InitializeGateXService } from "../../GateExService/GateExService";
import { GATEX_EXCHANGE_NAME } from "../../utils/constants";
import { ExchangeAdapter } from "../exchange";
import { SpotApi } from "gate-api";
import { OrderListElement, Budget } from "../../utils/types";
import { PlaceBatchOrder } from "../../GateExService/GateExOrderFunction";
import { CreateLimitOrderStruct, FetchBestOrderBookPrices, ValidateTrade, ProcessEachTradePair } from "../../GateExService/GateExOrderFunction";
import { generateDailySchedule } from "../../utils/functions";
import { TelegramService } from "../../TelegramBot/index";

export class GateXAdapter implements ExchangeAdapter {
    private client!: SpotApi | null;
    exchangeName: string;
  
    constructor() {
      this.exchangeName = GATEX_EXCHANGE_NAME;
    }
  
    async initializeClients(): Promise<void> {
      this.client = await InitializeGateXService();
      console.log("The client is initialized");
    }
  
    async createBatchOrder(
      orders: OrderListElement[],
      tracker: Budget
    ): Promise<boolean> {
      if (this.client === null) return false;
      return await PlaceBatchOrder(orders, this.client, tracker);
    }
  
    async createLimitOrder(
      size: number,
      price: number,
      side: "BUY" | "SELL",
      symbol: string
    ): Promise<OrderListElement | null> {
      return await CreateLimitOrderStruct(size, price, side, symbol);
    }
  
    async fetchBestPrices() {
      const marketClient = this.client;
      if (marketClient === null) {
        throw new Error("Error initializing the marekt clinet KUCoin");
      }
      return FetchBestOrderBookPrices(marketClient);
    }
  
    async validateTrade(size: number, price: number): Promise<boolean> {
      return await ValidateTrade(size, price);
    }
  
    async cancelOrder(orderId: string): Promise<boolean> {
      return true;
    }
  
    async processTrades(tracker: Budget, isBotRunning: boolean, telegramService?: TelegramService): Promise<void> {
      console.log("Started processing trades");
      const spotClient = this.client;
      if (spotClient === null || spotClient === undefined) {
        console.log("Error 2");
        throw new Error("The spot client is not initialized returning null");
      }
  
      if (telegramService) {
        await telegramService.sendAlert(`🔄 KuCoin: Starting to process ${tracker.schedule.trades.length} trade pairs`);
      }
  
      for (const tradePair of tracker.schedule.trades) {
        const now = new Date();
        const delay = tradePair[0].time.getTime() - now.getTime();
  
        if (delay < 0) {
          console.log(`The time has passed for interval ${tradePair[0].time}`);
          continue;
        }
        setTimeout(async () => {
          if (!isBotRunning) return;
          await ProcessEachTradePair(
            tradePair,
            spotClient,
            tracker,
            isBotRunning,
            telegramService
          );
        }, delay);
      }
    }
  
    generateSchedule() {
      return generateDailySchedule();
    }
  }
  