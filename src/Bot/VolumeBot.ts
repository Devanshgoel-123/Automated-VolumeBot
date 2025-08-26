import { ExchangeAdapter } from "../Exchanges/exchange";
import { TelegramService } from "../TelegramBot/index";
import cron from "node-cron";
import { ResetDailyCounter } from "../utils/functions";


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
     
      
      await this.telegramService.sendAlert(`📊 Bot initialized with ${this.adapter.tracker.schedule.trades.length} trade pairs scheduled`);
      
      await this.adapter.processTrades(this.telegramService);

      cron.schedule("0 0 * * *", async () => {
        console.log("Resetting daily counter");
        await this.telegramService.sendDailyStats({
          totalTrades: this.adapter.tracker.dailyTrades,
          totalVolume: this.adapter.tracker.dailyVolume,
          totalFees: this.adapter.tracker.dailySpent,
          date: new Date().toString(),
          exchangeName: this.adapter.exchangeName
        });
        ResetDailyCounter(this.adapter.tracker);
        await this.telegramService.sendAlert("🔄 Daily counters reset - new trading day started!");
      });
    } catch (error) {
      await this.telegramService.sendErrorAlert(`Failed to start Volume Bot: ${error}`);
      throw error;
    }
  }

}
