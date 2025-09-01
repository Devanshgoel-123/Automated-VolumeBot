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
import { GetMonthlyFeesForExchange } from "../../db/stats";
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
    const result=await GetTodaysStats((new Date().toISOString().split("T")[0]),this.exchangeName);
      const monthlyFees=await GetMonthlyFeesForExchange(this.exchangeName);
    this.tracker.schedule.trades = schedule.trades;
    this.tracker.schedule.exchange = schedule.exchange;
    this.tracker.monthlySpent=Number(monthlyFees?.totalMonthlyFees || 0);
    if (result) {
      this.tracker.dailyVolume = Number(result.totalVolume);
      this.tracker.dailyTrades = Number(result.totalTrades);
      this.tracker.dailySpent = Number(result.totalFees);
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

  async processTrades(telegramService?: TelegramService): Promise<void> {
    console.log("Started processing trades");
    const spotClient = this.client;
    if (
      spotClient === null ||
      spotClient === undefined ||
      this.isBotRunning === false
    ) {
      await telegramService?.sendErrorAlert(
        "The spot client is not initialized returning null for GateX"
      );
      throw new Error("The spot client is not initialized returning null");
    }

    if (telegramService) {
      await telegramService.sendAlert(
        `GateX: Starting to process ${this.tracker.schedule.trades.length} trade pairs`
      );
    }
    for (const tradePair of this.tracker.schedule.trades) {
      const now = new Date();
      const delay = tradePair[0].time.getTime() - now.getTime();

      if (delay < 0) {
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
    return generateDailySchedule(this.exchangeName);
  }

  async stopBot(): Promise<void> {
    console.log("Stopping the bot for GateX");
    const result = await UpdateDailyStats({
      date: new Date().toISOString().split("T")[0],
      exchangeName: this.exchangeName,
      totalVolume: this.tracker.dailyVolume,
      totalTrades: this.tracker.dailyTrades,
      totalFees: this.tracker.dailySpent,
    });
    this.isBotRunning = false;
    return Promise.resolve();
  }

  setBudget(monthlyLimit: number): Promise<void> {
    this.tracker.monthlyLimit=monthlyLimit;
    this.tracker.dailyLimit=parseFloat(Number(monthlyLimit/30).toFixed(4));
    return Promise.resolve();
  }
}
