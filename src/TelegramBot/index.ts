import TelegramBot from "node-telegram-bot-api";
import { DailyStats } from "../utils/types";
import { Budget } from "../utils/types";
import { config } from "dotenv";
config();

/**
 * Telegram service class
 * @description This class is used to send messages to the telegram chat
 */
export class TelegramService {
  private bot: TelegramBot;
  private chatId: string;

  constructor() {
    const TG_TOKEN = process.env.TELEGRAM_BOT_KEY;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    if (TG_TOKEN === undefined || CHAT_ID === undefined) {
      throw new Error("Unable to get the telegram token or chat id");
    }
    const telegramBot = new TelegramBot(TG_TOKEN, {
      polling: true,
    });

    this.bot = telegramBot;
    this.chatId = CHAT_ID;
  }

  /**
   * Send a message to the telegram chat
   * @param message - The message to send
   */
  async sendAlert(message: string) {
    try {
      await this.bot.sendMessage(this.chatId, message);
    } catch (error) {
      console.error("Error sending alert", error);
    }
  }

  /**
   * Send the daily stats to the telegram chat
   * @param stats - The daily stats object
   */
  async sendDailyStats(stats: DailyStats) {
    try {
      const message = `
 <b>Daily Stats Report</b>
 <b>Total Trades:</b> ${stats.totalTrades || 0}
 <b>Total Volume:</b> ${stats.totalVolume || 0}
 <b>Total Fees:</b> $${stats.totalFees || 0}
<i>Keep staking on yourself! </i>
            `.trim();

      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: "HTML",
      });
    } catch (error) {
      console.error("Error sending daily stats", error);
    }
  }

  /**
   * Send an error alert to the telegram chat
   * @param error - The error message
   */
  async sendErrorAlert(error: string) {
    try {
      const message = `
🚨 <b>Error Alert</b>

<b>Error:</b> ${error}
 <i>Please check the logs for more details</i>
        `.trim();
      const sentMessage = await this.bot.sendMessage(this.chatId, message, {
        parse_mode: "HTML",
      });
      console.log("Error alert sent", sentMessage);
    } catch (err) {
      console.error("Error sending error alert", err);
    }
  }

  /**
   * Send a budget alert to the telegram chat
   * @param budget - The budget object
   */
  async sendBudgetAlert(budget: Budget) {
    try {
      const message = `
        <b>Budget Alert</b>
        <b>Daily Limit:</b> $${budget.dailyLimit || 0}
        <b>Monthly Limit:</b> $${budget.monthlyLimit || 0}
        `.trim();
      const sentMessage = await this.bot.sendMessage(this.chatId, message, {
        parse_mode: "HTML",
      });
      console.log("Budget alert sent", sentMessage);
    } catch (err) {
      console.error("Error sending budget alert", err);
    }
  }
}
