import { DailyStatsTable } from "./schema";
import { db } from "./db";
import { and, eq, sql } from "drizzle-orm";

interface DailyStats{
    date:string;
    totalVolume:number;
    totalTrades:number;
    totalFees:number;
    exchangeName:string;
}

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

    return stats;
    }catch(error){
        console.error("Error getting today's stats", error);
    }
}