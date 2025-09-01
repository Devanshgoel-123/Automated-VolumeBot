import { ExchangeAdapter } from "../exchange";
import {
  InitializeKuCoinClientMarket,
  InitializeKuCoinClientSpot,
} from "../../KuCoinService/kucoinService";
import {
  CreateLimitOrderStruct,
  FetchBestOrderBookPrices,
  ValidateTrade,
  PlaceBatchOrder,
} from "../../KuCoinService/KuCoinOrderFunction";
import { UpdateDailyStats } from "../../db/stats";
import { OrderListElement, Budget, Trade } from "../../utils/types";
import { ProcessEachTradePair } from "../../KuCoinService/KuCoinOrderFunction";
import { generateDailySchedule } from "../../utils/functions";
import { OrderAPI } from "kucoin-universal-sdk/dist/generate/spot/order";
import { MarketAPI } from "kucoin-universal-sdk/dist/generate/spot/market";
import { TelegramService } from "../../TelegramBot/index";
import { KUCOIN_EXCHANGE_NAME, TRADE_PAIR_KUCOIN } from "../../utils/constants";
import { GetTodaysStats } from "../../db/stats";
import { GetMonthlyFeesForExchange } from "../../db/stats";


export class KuCoinAdapter implements ExchangeAdapter {
  private marketClient!: MarketAPI | null;
  private orderClient!: OrderAPI | null;
  public tracker: Budget;
  public isBotRunning: boolean;
  
  exchangeName: string;

  constructor() {
    this.exchangeName = KUCOIN_EXCHANGE_NAME;
    this.isBotRunning = false; //while intializing the bot keep it false
    this.tracker={
        dailySpent: 0,
        dailyVolume: 0,
        dailyTrades: 0,
        monthlySpent: 0,
        monthlyTrades: 0,
        dailyLimit: 8.5,
        monthlyLimit: 250,
        schedule: { trades: [], exchange: KUCOIN_EXCHANGE_NAME },
      };
     this.initializeStats();
  }


   async initializeStats(): Promise<void> {
      const schedule=this.generateSchedule();
      console.log("Getting todays stats", (new Date().toISOString().split("T")[0]));
      console.log("Getting todays stats", (new Date().toUTCString().split("T")[0]));
      const result=await GetTodaysStats((new Date().toISOString().split("T")[0]),this.exchangeName);
      const monthlyFees=await GetMonthlyFeesForExchange(this.exchangeName);
      console.log("Monthly fees", monthlyFees?.totalMonthlyFees);
      this.tracker.schedule.trades = schedule.trades;
      this.tracker.monthlySpent=Number(monthlyFees?.totalMonthlyFees || 0);
      this.tracker.schedule.exchange = schedule.exchange;
      if(result){
        this.tracker.dailyVolume=Number(result.totalVolume);
        this.tracker.dailyTrades=Number(result.totalTrades);
        this.tracker.dailySpent=Number(result.totalFees);
      }
    }

  async initializeClients(): Promise<void> {
    this.marketClient = await InitializeKuCoinClientMarket();
    this.orderClient = await InitializeKuCoinClientSpot();
    this.isBotRunning = true;
  }

  async createBatchOrder(
    orders: OrderListElement[],
    tracker: Budget
  ): Promise<boolean> {
    if (this.orderClient === null) return false;
    return await PlaceBatchOrder(orders, this.orderClient, tracker);
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
    const marketClient = this.marketClient;
    if (marketClient === null) {
      throw new Error("Error initializing the marekt clinet KUCoin");
    }
    return FetchBestOrderBookPrices(marketClient);
  }

  async validateTrade(size: number, price: number): Promise<boolean> {
    return await ValidateTrade(size, price);
  }


  async processTrades(telegramService?: TelegramService): Promise<void> {
    const marketClient = this.marketClient;
    if (marketClient === null || marketClient === undefined || this.isBotRunning === false) {
      console.log("Error 1");
      throw new Error("Error initializing the market client KUCoin");
    }
    const spotClient = this.orderClient;
    if (spotClient === null || spotClient === undefined || !this.isBotRunning) {
      console.log("Error 2");
      throw new Error("The spot client is not initialized returning null");
    }

    if (telegramService) {
      await telegramService.sendAlert(`🔄 KuCoin: Starting to process ${this.tracker.schedule.trades.length} trade pairs`);
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
          marketClient,
          telegramService
        );
      }, delay);
    }
  }

  generateSchedule() {
    return generateDailySchedule(this.exchangeName);
  }

  async stopBot(): Promise<void> {
    console.log("Stopping the bot for KuCoin");
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
