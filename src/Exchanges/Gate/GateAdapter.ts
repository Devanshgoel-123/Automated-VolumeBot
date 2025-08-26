import { InitializeGateXService } from "../../GateExService/GateExService";
import {
  GATEX_EXCHANGE_NAME,
  SYMBOL_DETAILS_GATE,
} from "../../utils/constants";
import { ExchangeAdapter } from "../exchange";
import { SpotApi } from "gate-api";
import { OrderListElement, Budget } from "../../utils/types";
import { PlaceBatchOrder } from "../../GateExService/GateExOrderFunction";
import {
  CreateLimitOrderStruct,
  FetchBestOrderBookPrices,
  ValidateTrade,
  ProcessEachTradePair,
} from "../../GateExService/GateExOrderFunction";
import { generateDailySchedule } from "../../utils/functions";
import { TelegramService } from "../../TelegramBot/index";
import { UpdateDailyStats } from "../../db/stats";
import { GetTodaysStats } from "../../db/stats";

export class GateXAdapter implements ExchangeAdapter {
  private client!: SpotApi | null;
  exchangeName: string;
  public tracker: Budget;
  public isBotRunning: boolean;

  constructor() {
    this.exchangeName = GATEX_EXCHANGE_NAME;
    this.isBotRunning = false;
    this.tracker = {
      dailySpent: 0,
      dailyVolume: 0,
      dailyTrades: 0,
      monthlySpent: 0,
      monthlyTrades: 0,
      dailyLimit: 8.5,
      monthlyLimit: 250,
      schedule: { trades: [], exchange: "" },
    };
  }

  async initializeStats(): Promise<void> {
    const schedule = this.generateSchedule();
    const result = await GetTodaysStats(
      new Date().toString(),
      this.exchangeName
    );
    this.tracker.schedule.trades = schedule.trades;
    this.tracker.schedule.exchange = schedule.exchange;
    if (result) {
      this.tracker.dailyVolume = result.totalVolume;
      this.tracker.dailyTrades = result.totalTrades;
      this.tracker.dailySpent = result.totalFees;
    }
  }

  async initializeClients(): Promise<void> {
    this.client = await InitializeGateXService();
    this.isBotRunning = true;
    console.log("The client is initialized");
  }

  async createBatchOrder(
    orders: OrderListElement[],
    tracker: Budget
  ): Promise<boolean> {
    if (this.client === null || this.isBotRunning === false) return false;
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

  async processTrades(telegramService?: TelegramService): Promise<void> {
    console.log("Started processing trades");
    const spotClient = this.client;
    if (
      spotClient === null ||
      spotClient === undefined ||
      this.isBotRunning === false
    ) {
      console.log("Error 2");
      throw new Error("The spot client is not initialized returning null");
    }

    if (telegramService) {
      await telegramService.sendAlert(
        `KuCoin: Starting to process ${this.tracker.schedule.trades.length} trade pairs`
      );
    }
    console.log("The trades are", this.tracker.schedule.trades);
    for (const tradePair of this.tracker.schedule.trades) {
      const now = new Date();
      const delay = tradePair[0].time.getTime() - now.getTime();

      if (delay < 0) {
        console.log(`The time has passed for interval ${tradePair[0].time}`);
        continue;
      }
      setTimeout(async () => {
        if (!this.isBotRunning) return;
        await ProcessEachTradePair(
          tradePair,
          spotClient,
          this.tracker,
          this.isBotRunning,
          telegramService
        );
      }, delay);
    }
  }

  generateSchedule() {
    return generateDailySchedule();
  }

  async stopBot(): Promise<void> {
    console.log("Stopping the bot");
    const result = await UpdateDailyStats({
      date: new Date().toString(),
      exchangeName: this.exchangeName,
      totalVolume: this.tracker.dailyVolume,
      totalTrades: this.tracker.dailyTrades,
      totalFees: this.tracker.dailySpent,
    });
    this.isBotRunning = false;
    return Promise.resolve();
  }
}
