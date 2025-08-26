import "reflect-metadata";
import express from "express";
const app = express();
import { ExchangeFactory } from "./Exchanges/exchange";
import { KUCOIN_EXCHANGE_NAME, GATEX_EXCHANGE_NAME } from "./utils/constants";
import { VolumeBot } from "./Bot/VolumeBot";
import { TelegramService } from "./TelegramBot/index";


// Initialize Telegram service
const telegramService = new TelegramService();

// Initialize bot instances for all exchanges
const kuCoinAdapter = ExchangeFactory.getAdapter(KUCOIN_EXCHANGE_NAME);
const kuCoinBot = new VolumeBot(kuCoinAdapter, telegramService);

const gateXAdapter = ExchangeFactory.getAdapter(GATEX_EXCHANGE_NAME);
const gateXBot = new VolumeBot(gateXAdapter, telegramService);

// Store bot instances for termination
const activeBots:VolumeBot[] = [];
gateXBot.start()

// Track bot running state

// Example of fetching prices (keeping existing functionality)
// const FetchPrices = async () => {
//   const client = await InitializeGateXService();
//   if (client === null || client === undefined) {
//     throw new Error("Error fetching prices for GateX");
//   }
//   // const result=await FetchBestOrderBookPrices(client);
//   const result = await GetOrderBook(client);
//   console.log(result);
//   // const client = await InitializeMexcService();
//   // if (client === null || client === undefined) {
//   //   throw new Error("Error fetching prices");
//   // }
//   // const result = await FetchBestOrderBookPrices(client);
//   // console.log(result);
// };
// FetchPrices();

app.get("/", (req, res) => {
  res.send("Volume Bot with Telegram Integration");
});

/**
 * Start the bot
 * 1. Start the bot
 * 2. Add the bot to the active bots list
 * 3. Send a Telegram message to notify the user that the bot has been started
 * 4. Return a success message
 */
app.post("/startBot", async (req, res) => {
  try {
    await telegramService.sendAlert("🤖 Bot starting via API request");
    await kuCoinBot.start();
    activeBots.push(kuCoinBot);
    await gateXBot.start();
    activeBots.push(gateXBot);
    res.status(200).send("Bot started successfully");
  } catch (err) {
    console.error("Error starting bot", err);
    await telegramService.sendErrorAlert(`Failed to start bot: ${err}`);
    res.status(500).send("Error starting bot");
  }
});


/** 
 * Terminate the bot
 * 1. Stop the bot from processing new trade
 * 2. Remove the bot from the active bots list
 * 3. Send a Telegram message to notify the user that the bot has been terminated
 * 4. Return a success message
 */
app.post("/terminate", async (req, res) => {
  try {
    console.log("🛑 Terminating bot via API request...");
    await telegramService.sendAlert(
      "🛑 Bot termination initiated via API request"
    );

    // Stop the bot from processing new trade
    await kuCoinAdapter.stopBot();
    activeBots.splice(activeBots.indexOf(kuCoinBot), 1);
    await gateXAdapter.stopBot();
    activeBots.splice(activeBots.indexOf(gateXBot), 1);

    await telegramService.sendAlert(
      "Bot terminated successfully - all pending orders cancelled"
    );
    res.status(200).json({
      message: "Bot terminated successfully",
      status: "terminated",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error terminating bot", err);
    await telegramService.sendErrorAlert(`Failed to terminate bot: ${err}`);
    res.status(500).json({
      error: "Error terminating bot",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

/**
 * Test the Telegram bot
 * 1. Send a test message to the Telegram bot
 * 2. Return a success message
 */
app.post("/testTelegram", async (req, res) => {
  try {
    await telegramService.sendAlert("🧪 Test message from API");
    res.status(200).send("Test message sent");
  } catch (err) {
    console.error("Error sending test message", err);
    res.status(500).send("Error sending test message");
  }
});

/**
 * Get the status of the bot
 * 1. Get the status of the bot
 * 2. Return a success message
 */
app.get("/status", (req, res) => {
  res.json({
    status: "running",
    botRunning: activeBots.map((bot) =>{
      return {
        exchange: bot.adapter.exchangeName,
        isRunning: bot.adapter.isBotRunning,
      }
    }),
    activeExchanges: activeBots.map((bot) => bot.adapter.exchangeName),
    timestamp: new Date().toISOString(),
    endpoints: {
      start: "POST /startBot",
      terminate: "POST /terminate",
      status: "GET /status",
      restart: "POST /restart",
      testTelegram: "POST /testTelegram",
    },
  });
});

/**
 * Restart the bot
 * 1. Stop the bot
 * 2. Wait for a moment for cleanup
 * 3. Restart the bot
 * 4. Add the bot to the active bots list
 * 5. Send a Telegram message to notify the user that the bot has been restarted
 * 6. Return a success message
 */
app.post("/restart", async (req, res) => {
  try {
    console.log("🔄 Restarting bot via API request...");
    await telegramService.sendAlert("🔄 Bot restart initiated via API request");

    // First Stop the bot 
    await Promise.all(activeBots.map(async (bot) => {
      bot.adapter.isBotRunning = false;
    }));

    // Wait a moment for cleanup
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Then restart
    await gateXBot.start();
    activeBots.push(gateXBot);
    await kuCoinBot.start();
    activeBots.push(kuCoinBot);
    await telegramService.sendAlert("✅ Bot restarted successfully");
    res.status(200).json({
      message: "Bot restarted successfully",
      status: "restarted",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error restarting bot", err);
    await telegramService.sendErrorAlert(`Failed to restart bot: ${err}`);
    res.status(500).json({
      error: "Error restarting bot",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
  console.log("Available endpoints:");
  console.log("  GET  / - Health check");
  console.log("  GET  /status - Check bot status");
  console.log("  POST /startBot - Start the volume bot");
  console.log("  POST /terminate - Terminate the bot");
  console.log("  POST /restart - Restart the bot");
  console.log("  POST /testTelegram - Send test Telegram message");
});
