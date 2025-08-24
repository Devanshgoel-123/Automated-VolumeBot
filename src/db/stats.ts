import { DailyStatsTable } from "./schema";
import { db } from "./db";


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
        }).returning();
        return dailyStats[0];
    }catch(error){
        console.error("Error updating daily stats", error);
    }
}