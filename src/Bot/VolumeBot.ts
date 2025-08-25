// src/bot/VolumeBot.ts
import { Budget, OrderListElement, Trade } from "../utils/types";
import { ExchangeAdapter } from "../Exchanges/exchange";
import cron from "node-cron";
import { ResetDailyCounter } from "../utils/functions";

let isBotRunning = true;

export const setBotRunning = (value: boolean) => {
  isBotRunning = value;
};

export class VolumeBot {
  private adapter: ExchangeAdapter;
  private tracker: Budget;

  constructor(adapter: ExchangeAdapter) {
    this.adapter = adapter;
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
    console.log("🚀 Starting Volume Bot...");
    await this.adapter.initializeClients();
    this.tracker.schedule = this.adapter.generateSchedule();
    await this.adapter.processTrades(this.tracker, isBotRunning);

    cron.schedule("0 0 * * *", () => {
      console.log("Resetting daily counter");
      ResetDailyCounter(this.tracker);
    });
  }
}
