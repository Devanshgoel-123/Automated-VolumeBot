import "reflect-metadata";
import bodyParser from "body-parser";
import express from "express";
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import { ExchangeFactory } from "./Exchanges/exchange";
import { KUCOIN_EXCHANGE_NAME, GATEX_EXCHANGE_NAME } from "./utils/constants";
import { VolumeBot } from "./Bot/VolumeBot";
import { TelegramService } from "./TelegramBot/index";
import { checkPassword } from "./MiddleWare/middleware";
// Initialize Telegram service
const telegramService = new TelegramService();

// Initialize bot instances for all exchanges
const kuCoinAdapter = ExchangeFactory.getAdapter(KUCOIN_EXCHANGE_NAME);
const kuCoinBot = new VolumeBot(kuCoinAdapter, telegramService);

const gateXAdapter = ExchangeFactory.getAdapter(GATEX_EXCHANGE_NAME);
const gateXBot = new VolumeBot(gateXAdapter, telegramService);

// Store bot instances for termination
const activeBots:VolumeBot[] = [];



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
app.post("/startBot",checkPassword, async (req, res) => {
  try {
    const { exchangeName } = req.body;
    if (!exchangeName) {
      return res.status(400).send("Missing exchangeName in request body");
    }
    await telegramService.sendAlert("🤖 Bot starting via API request");
    if(exchangeName === KUCOIN_EXCHANGE_NAME){
      if(activeBots.find((bot) => bot.adapter.exchangeName === KUCOIN_EXCHANGE_NAME)){
        return res.status(400).send("Bot already started");
      }else{
        await kuCoinBot.start();
        activeBots.push(kuCoinBot);
      }
    }else if(exchangeName === GATEX_EXCHANGE_NAME){
      if(activeBots.find((bot) => bot.adapter.exchangeName === GATEX_EXCHANGE_NAME)){
        return res.status(400).send("Bot already started");
      }else{
        await gateXBot.start();
        activeBots.push(gateXBot);
      }
    }else{
      return res.status(400).send("Invalid exchange name");
    }
    res.status(200).send("Bot started successfully");
  } catch (err) {
    console.error("Error starting bot", err);
    await telegramService.sendErrorAlert(`Failed to start bot: ${err}`);
    res.status(500).send("Error starting bot");
  }
});


app.post("/setBudget",checkPassword, async (req, res) => {
  try {
    const {exchangeName, monthlyLimit}=req.body;
    if(!exchangeName || !monthlyLimit){
      return res.status(400).send("Missing required fields");
    }
    if(exchangeName === KUCOIN_EXCHANGE_NAME){
      await kuCoinAdapter.setBudget(Number(monthlyLimit));
    }else if(exchangeName === GATEX_EXCHANGE_NAME){
      await gateXAdapter.setBudget(Number(monthlyLimit));
    }else{
      return res.status(400).send("Invalid exchange name");
    }
    res.status(200).send("Budget set successfully");
  } catch (err) {
    console.error("Error setting budget", err);
    await telegramService.sendErrorAlert(`Failed to set budget: ${err}`);
    res.status(500).send("Error setting budget");
  }
});


/** 
 * Terminate the bot
 * 1. Stop the bot from processing new trade
 * 2. Remove the bot from the active bots list
 * 3. Send a Telegram message to notify the user that the bot has been terminated
 * 4. Return a success message
 */
app.post("/terminate",checkPassword, async (req, res) => {
  try {
    const { exchangeName } = req.body;
    if(!exchangeName){
      return res.status(400).send("Missing exchangeName in request body");
    }
    if(exchangeName === KUCOIN_EXCHANGE_NAME){
      await kuCoinAdapter.stopBot();
      activeBots.splice(activeBots.indexOf(kuCoinBot), 1);
    }else if(exchangeName === GATEX_EXCHANGE_NAME){
      await gateXAdapter.stopBot();
      activeBots.splice(activeBots.indexOf(gateXBot), 1);
    }else{
      return res.status(400).send("Invalid exchange name");
    }
    await telegramService.sendAlert(
      "🛑 Bot termination initiated via API request"
    );

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


app.get("/stats", ( req, res) => {
  try{
    res.status(200).json({
      stats: {
        kuCoin: kuCoinBot.adapter.tracker,
        gateX: gateXBot.adapter.tracker,
      },
    });
  }catch(err){
    console.error("Error fetching stats", err);
    res.status(500).send("Error fetching stats");
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
