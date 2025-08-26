import { ExchangeFactory } from "../src/Exchanges/exchange";
import { VolumeBot } from "../src/Bot/VolumeBot";
import { TelegramService } from "../src/TelegramBot/index";

/**
 * Example: How to integrate Telegram service with multiple exchanges
 */
async function runTelegramIntegrationExample() {
  console.log("Starting Telegram Integration Example...");

  // Initialize Telegram service
  const telegramService = new TelegramService();

  try {
    // Test Telegram connection
    await telegramService.sendAlert("🧪 Starting Telegram integration test...");

    // Example 1: KuCoin Bot with Telegram
    console.log("📊 Setting up KuCoin bot...");
    const kuCoinAdapter = ExchangeFactory.getAdapter("KUCOIN");
    const kuCoinBot = new VolumeBot(kuCoinAdapter, telegramService);

    // Example 2: Gate.io Bot with Telegram (template)
    console.log("📊 Setting up Gate.io bot...");
    const gateAdapter = ExchangeFactory.getAdapter("GATE");
    const gateBot = new VolumeBot(gateAdapter, telegramService);

    // Example 3: MexC Bot with Telegram (template)
    console.log("📊 Setting up MexC bot...");
    const mexcAdapter = ExchangeFactory.getAdapter("MEXC");
    const mexcBot = new VolumeBot(mexcAdapter, telegramService);

    // Send status update
    await telegramService.sendAlert("✅ All bots initialized successfully!");

    // await telegramService.sendMarketData(
    //   "KuCoin",
    //   "LOGX-USDT",
    //   "0.1500",
    //   "0.1505",
    //   0.33
    // );

    // Example: Budget alert
    const sampleBudget = {
      dailySpent: 15.5,
      dailyVolume: 150.0,
      dailyTrades: 45,
      monthlySpent: 450.0,
      monthlyTrades: 1200,
      dailyLimit: 16.67,
      monthlyLimit: 500,
      schedule: { trades: [], exchange: "KuCoin" },
    };
    await telegramService.sendBudgetAlert(sampleBudget);

    // Example: Daily stats
    // await telegramService.sendDailyStats({
    //   totalTrades: 48,
    //   totalVolume: 720.0,
    //   totalFees: 0.43,
    // });

    console.log("✅ Telegram integration example completed successfully!");
  } catch (error) {
    console.error("❌ Error in Telegram integration example:", error);
    await telegramService.sendErrorAlert(
      `Integration example failed: ${error}`
    );
  }
}

/**
 * Example: How to run multiple bots simultaneously
 */
async function runMultipleBotsExample() {
  console.log("🤖 Starting Multiple Bots Example...");

  const telegramService = new TelegramService();

  try {
    // Initialize multiple exchange adapters
    const exchanges = ["KUCOIN", "GATE", "MEXC"];
    const bots: VolumeBot[] = [];

    for (const exchange of exchanges) {
      try {
        const adapter = ExchangeFactory.getAdapter(exchange);
        const bot = new VolumeBot(adapter, telegramService);
        bots.push(bot);

        await telegramService.sendAlert(`✅ ${exchange} bot initialized`);
      } catch (error) {
        await telegramService.sendErrorAlert(
          `Failed to initialize ${exchange} bot: ${error}`
        );
      }
    }

    // Start all bots (commented out to prevent actual trading)
    // for (const bot of bots) {
    //   await bot.start();
    // }

    await telegramService.sendAlert(
      `🤖 All ${bots.length} bots ready for deployment!`
    );
  } catch (error) {
    console.error("❌ Error in multiple bots example:", error);
    await telegramService.sendErrorAlert(
      `Multiple bots example failed: ${error}`
    );
  }
}

/**
 * Example: Custom notification patterns
 */
async function customNotificationExample() {
  console.log("🎨 Starting Custom Notifications Example...");

  const telegramService = new TelegramService();

  try {
    // Custom trading session notification
    await telegramService.sendAlert(
      `
🎯 <b>Trading Session Started</b>

⏰ <b>Time:</b> ${new Date().toLocaleString()}
🌍 <b>Timezone:</b> ${Intl.DateTimeFormat().resolvedOptions().timeZone}
📊 <b>Status:</b> Active

<i>Ready to execute trades! 🚀</i>
    `.trim()
    );

    // Custom market analysis
    await telegramService.sendAlert(
      `
📈 <b>Market Analysis</b>

🏢 <b>Exchange:</b> KuCoin
📊 <b>Symbol:</b> LOGX-USDT
📊 <b>24h Volume:</b> $1,234,567
📈 <b>24h Change:</b> +5.67%
📊 <b>Market Cap:</b> $45,678,901

💡 <b>Analysis:</b> Strong upward momentum with increasing volume
🎯 <b>Recommendation:</b> Continue with current strategy
    `.trim()
    );

    // Custom error with context
    await telegramService.sendErrorAlert(
      `
🚨 <b>API Rate Limit Exceeded</b>

🏢 <b>Exchange:</b> KuCoin
⏰ <b>Time:</b> ${new Date().toLocaleString()}
🔄 <b>Retry After:</b> 60 seconds
📊 <b>Current Rate:</b> 45 requests/minute
📊 <b>Limit:</b> 50 requests/minute

💡 <b>Action:</b> Implementing exponential backoff
    `.trim()
    );

    console.log("✅ Custom notifications example completed!");
  } catch (error) {
    console.error("❌ Error in custom notifications example:", error);
    await telegramService.sendErrorAlert(
      `Custom notifications example failed: ${error}`
    );
  }
}

// Run examples
async function main() {
  console.log("🎬 Running Telegram Integration Examples...\n");

  await runTelegramIntegrationExample();
  console.log("\n" + "=".repeat(50) + "\n");

  await runMultipleBotsExample();
  console.log("\n" + "=".repeat(50) + "\n");

  await customNotificationExample();

  console.log("\n🎉 All examples completed successfully!");
}

// Export for use in other files
export {
  runTelegramIntegrationExample,
  runMultipleBotsExample,
  customNotificationExample,
};

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
