import { DailyStatsTable } from "./schema";
import { db } from "./db";
import { and, eq, sql } from "drizzle-orm";
import { DailyStats } from "../utils/types";


/**
 * Update the daily stats
 * @param param0 - The daily stats to update
 * @returns The updated daily stats
 */
export const UpdateDailyStats=async({
    date,
    totalVolume,
    totalTrades,
    totalFees,
    exchangeName
}:DailyStats)=>{
    try{
        const dailyStats=await db.insert(DailyStatsTable).values({
            date:date,
            totalVolume:totalVolume.toString(),
            totalFees:totalFees.toString(),
            totalTrades:totalTrades,
            exchangeName:exchangeName
        })
        .onConflictDoUpdate({
            target: [DailyStatsTable.date, DailyStatsTable.exchangeName], // unique key
            set: {
              totalVolume: totalVolume.toString(),
              totalFees: totalFees.toString(),
              totalTrades,
            },
        })
        .returning();
        return dailyStats[0];
    }catch(error){
        console.error("Error updating daily stats", error);
    }
}

/**
 * Get the today's stats
 * @param date - The date to get the stats for
 * @param exchangeName - The exchange name to get the stats for
 * @returns The today's stats
 */
export const GetTodaysStats=async(date:string,exchangeName:string)=>{
    try{
        const stats = await db
      .select({
        exchangeName: DailyStatsTable.exchangeName,
        totalFees: sql<number>`SUM(${DailyStatsTable.totalFees}::numeric)`,
        totalTrades: sql<number>`SUM(${DailyStatsTable.totalTrades})`,
        totalVolume: sql<number>`SUM(${DailyStatsTable.totalVolume}::numeric)`,
      })
      .from(DailyStatsTable)
      .where(and(eq(DailyStatsTable.date, date),eq(DailyStatsTable.exchangeName,exchangeName)))
      .groupBy(DailyStatsTable.exchangeName);
      
    const statsDaily=stats[0];
    return statsDaily;
    }catch(error){
        console.error("Error getting today's stats", error);
    }
}

/**
 * Get the monthly fees for an exchange
 * @param exchangeName - The exchange name to get the monthly fees for
 * @returns The monthly fees for the exchange
 */
export const GetMonthlyFeesForExchange = async (exchangeName: string) => {
    try {
      const stats = await db
        .select({
          exchangeName: DailyStatsTable.exchangeName,
          totalMonthlyFees: sql<number>`SUM(${DailyStatsTable.totalFees}::numeric)`,
        })
        .from(DailyStatsTable)
        .where(
          and(
            eq(DailyStatsTable.exchangeName, exchangeName),
            sql`date_trunc('month', ${DailyStatsTable.date}::date) = date_trunc('month', CURRENT_DATE)`
          )
        )
        .groupBy(DailyStatsTable.exchangeName);
      return stats[0] ?? null;
    } catch (error) {
      console.error("Error getting monthly fees", error);
      return null;
    }
  };