import "reflect-metadata";
import express from "express";
const app = express();
import { ExchangeFactory } from "./Exchanges/exchange";
import { KUCOIN_EXCHANGE_NAME } from "./utils/constants";
import { VolumeBot } from "./Bot/VolumeBot";
const kuCoinAdapter = ExchangeFactory.getAdapter(KUCOIN_EXCHANGE_NAME);
const bot= new VolumeBot(kuCoinAdapter);
bot.start();
// cron.schedule('5 * * * *', async () => {
//     // resetDailyCounter(KuCoinTracker);
//     // await GetOrderBook();
//     console.log('running a task every minute');
// });

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/terminate", (req, res) => {
  try {
    res.status(200).send("Bot terminated");
  } catch (err) {
    console.error("Error terminating bot", err);
    res.status(500).send("Error terminating bot");
  }
});


app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
