// src/bot/VolumeBot.ts
import { Budget, OrderListElement, Trade } from "../utils/types";
import { ExchangeAdapter } from "../Exchanges/exchange";
import { TelegramService } from "../TelegramBot/index";
import cron from "node-cron";
import { ResetDailyCounter } from "../utils/functions";

let isBotRunning = true;

export const setBotRunning = (value: boolean) => {
  isBotRunning = value;
};

export class VolumeBot {
  private adapter: ExchangeAdapter;
  private tracker: Budget;
  private telegramService: TelegramService;

  constructor(adapter: ExchangeAdapter, telegramService: TelegramService) {
    this.adapter = adapter;
    this.telegramService = telegramService;
    this.tracker = {
      dailySpent: 0,
      dailyVolume: 0,
      dailyTrades: 0,
      monthlySpent: 0,
      monthlyTrades: 0,
      dailyLimit: 16.67,
      monthlyLimit: 500,
      schedule: { trades: [], exchange: "" },
    };
  }

  async start() {
    console.log("Starting Volume Bot...");
    await this.telegramService.sendAlert("Volume Bot is starting up!");
    
    try {
      await this.adapter.initializeClients();
      this.tracker.schedule = this.adapter.generateSchedule();
      
      await this.telegramService.sendAlert(`📊 Bot initialized with ${this.tracker.schedule.trades.length} trade pairs scheduled`);
      
      await this.adapter.processTrades(this.tracker, isBotRunning, this.telegramService);

      cron.schedule("0 0 * * *", async () => {
        console.log("Resetting daily counter");
        await this.telegramService.sendDailyStats({
          totalTrades: this.tracker.dailyTrades,
          totalVolume: this.tracker.dailyVolume,
          totalFees: this.tracker.dailySpent,
          date: new Date().getDate().toString(),
          exchangeName: this.adapter.exchangeName
        });
        ResetDailyCounter(this.tracker);
        await this.telegramService.sendAlert("🔄 Daily counters reset - new trading day started!");
      });
    } catch (error) {
      await this.telegramService.sendErrorAlert(`Failed to start Volume Bot: ${error}`);
      throw error;
    }
  }
}
