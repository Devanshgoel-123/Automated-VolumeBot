import { pgTable } from "drizzle-orm/pg-core";
import { integer } from "drizzle-orm/pg-core";
import { text, timestamp, numeric, date } from "drizzle-orm/pg-core";


export const ordersTable=pgTable("orders",{
    id:integer().primaryKey().generatedAlwaysAsIdentity(),
    clientOid:text().notNull(),
    symbol:text().notNull(),
    type:text().notNull(),
    side:text().notNull(),
    price:text().notNull(),
    size:text().notNull(),
    createdAt:timestamp().notNull().defaultNow(),
    exchangeName:text().notNull(),
})

export const DailyStatsTable=pgTable("daily_stats",{
    id:integer().primaryKey().generatedAlwaysAsIdentity(),
    date:text().notNull(),
    totalVolume:numeric().notNull(),
    totalTrades:integer().notNull(),
    totalFees:numeric().notNull(),
    exchangeName:text().notNull(),
})