import "reflect-metadata";
import express from "express";
const app = express();
import { ExchangeFactory } from "./Exchanges/exchange";
import { KUCOIN_EXCHANGE_NAME } from "./utils/constants";
import { VolumeBot } from "./Bot/VolumeBot";
import { TelegramService } from "./TelegramBot/index";
import { FetchBestOrderBookPrices } from "./MexCService/MexcOrderFunction";
import { InitializeMexcService } from "./MexCService/MexcService";

// Initialize Telegram service
const telegramService = new TelegramService();

const kuCoinAdapter = ExchangeFactory.getAdapter(KUCOIN_EXCHANGE_NAME);
const kuCoinBot = new VolumeBot(kuCoinAdapter, telegramService);


// Start the bot (uncomment to run)
// kuCoinBot.start();

// Example of fetching prices (keeping existing functionality)
const FetchPrices = async () => {
  const client = await InitializeMexcService();
  if (client === null || client === undefined) {
    throw new Error("Error fetching prices");
  }
  const result = await FetchBestOrderBookPrices(client);
  console.log(result);
};
FetchPrices();

app.get("/", (req, res) => {
  res.send("Volume Bot with Telegram Integration");
});

app.post("/startBot", async (req, res) => {
  try {
    await telegramService.sendAlert("🤖 Bot starting via API request");
    await kuCoinBot.start();
    res.status(200).send("Bot started successfully");
  } catch (err) {
    console.error("Error starting bot", err);
    await telegramService.sendErrorAlert(`Failed to start bot: ${err}`);
    res.status(500).send("Error starting bot");
  }
});

app.post("/terminate", async (req, res) => {
  try {
    await telegramService.sendAlert("Bot terminated via API request");
    //Implement the logic to terminate the bot
    res.status(200).send("Bot terminated");
  } catch (err) {
    console.error("Error terminating bot", err);
    res.status(500).send("Error terminating bot");
  }
});

app.post("/testTelegram", async (req, res) => {
  try {
    await telegramService.sendAlert("🧪 Test message from API");
    res.status(200).send("Test message sent");
  } catch (err) {
    console.error("Error sending test message", err);
    res.status(500).send("Error sending test message");
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
  console.log("Available endpoints:");
  console.log("  GET  / - Health check");
  console.log("  POST /start-bot - Start the volume bot");
  console.log("  POST /terminate - Terminate the bot");
  console.log("  POST /test-telegram - Send test Telegram message");
});
