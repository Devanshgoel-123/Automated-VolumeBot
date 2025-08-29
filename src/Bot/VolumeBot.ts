import { ExchangeAdapter } from "../Exchanges/exchange";
import { TelegramService } from "../TelegramBot/index";
import cron from "node-cron";
import { ResetDailyCounter } from "../utils/functions";
import { UpdateDailyStats } from "../db/stats";

export class VolumeBot {
  public adapter: ExchangeAdapter;

  private telegramService: TelegramService;

  constructor(adapter: ExchangeAdapter, telegramService: TelegramService) {
    this.adapter = adapter;
    this.telegramService = telegramService;
  }

  async start() {
    console.log("Starting Volume Bot...");
    await this.telegramService.sendAlert("Volume Bot is starting up!");

    try {
      await this.adapter.initializeStats();
      await this.adapter.initializeClients();

      await this.telegramService.sendAlert(
        `📊 Bot initialized with ${this.adapter.tracker.schedule.trades.length} trade pairs scheduled`
      );

      await this.adapter.processTrades(this.telegramService);

      cron.schedule("0 0 * * *", async () => {
        try {
          console.log(
            "The tracker is",
            this.adapter.tracker.dailyLimit,
            this.adapter.tracker.dailyVolume,
            this.adapter.tracker.dailyTrades,
            this.adapter.tracker.dailySpent
          );

          // Send stats
          await this.telegramService.sendDailyStats({
            totalTrades: this.adapter.tracker.dailyTrades,
            totalVolume: this.adapter.tracker.dailyVolume,
            totalFees: this.adapter.tracker.dailySpent,
            date: new Date().toISOString().split("T")[0],
            exchangeName: this.adapter.exchangeName,
          });

          // Save to DB
          await UpdateDailyStats({
            date: new Date().toISOString().split("T")[0],
            totalVolume: this.adapter.tracker.dailyVolume,
            totalTrades: this.adapter.tracker.dailyTrades,
            totalFees: this.adapter.tracker.dailySpent,
            exchangeName: this.adapter.exchangeName,
          });
          const now = new Date();
          if (now.getUTCHours() === 0) {
            ResetDailyCounter(this.adapter.tracker);
            await this.telegramService.sendAlert("Daily counters reset - new trading day started!");
          }
        } catch (error) {
          console.error("Error sending daily stats", error);
        }
      });
    } catch (error) {
      await this.telegramService.sendErrorAlert(
        `Failed to start Volume Bot: ${error}`
      );
      throw error;
    }
  }
}
