import "reflect-metadata";
import cron from "node-cron";
import express from "express";
const app = express();
import { StartKuCoinVolumeBot } from "./KuCoinService/MainBot";
import { setBotRunning } from "./KuCoinService/MainBot";


const KuCoinVolumeBot = StartKuCoinVolumeBot();
console.log(KuCoinVolumeBot);
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
    setBotRunning(false);
    res.status(200).send("Bot terminated");
  } catch (err) {
    console.error("Error terminating bot", err);
    res.status(500).send("Error terminating bot");
  }
});


app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
