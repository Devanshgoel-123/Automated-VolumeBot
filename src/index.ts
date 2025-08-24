import "reflect-metadata";
import { generateDailySchedule } from "./utils/functions";
import cron from 'node-cron';
import { GetOrderBook } from "./KuCoinService/KuCoinOrderFunction";
import { StartKuCoinVolumeBot } from "./KuCoinService/MainBot";
// const schedule=generateDailySchedule()
// console.log(schedule.trades[0]);
const KuCoinVolumeBot=StartKuCoinVolumeBot();
console.log(KuCoinVolumeBot);
// cron.schedule('5 * * * *', async () => {
//     // resetDailyCounter(KuCoinTracker);
//     // await GetOrderBook();
//     console.log('running a task every minute');
// });