import { boolean } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { integer } from "drizzle-orm/pg-core";
import { text, timestamp, numeric, date } from "drizzle-orm/pg-core";
import { unique } from "drizzle-orm/pg-core";
export const ordersTable = pgTable("orders", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  clientOid: text().notNull(),
  symbol: text().notNull(),
  type: text().notNull(),
  side: text().notNull(),
  price: text().notNull(),
  size: text().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  exchangeName: text().notNull(),
  status: boolean().notNull().default(true),
});

export const DailyStatsTable = pgTable("daily_stats", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  date: date().notNull(),
  totalVolume: numeric().notNull(),
  totalTrades: integer().notNull(),
  totalFees: numeric().notNull(),
  exchangeName: text().notNull(),
},
(table) => ({
  // composite unique constraint
  dateExchangeUnique: unique().on(table.date, table.exchangeName),
})
);

// daily alerts -> fees, order cancel
// make random price fluctuations, full body candles
