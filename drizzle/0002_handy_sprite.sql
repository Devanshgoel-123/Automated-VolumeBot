-- clear table (optional, but ensures no conflicts)
TRUNCATE daily_stats;

-- change `date` column from text → date
ALTER TABLE "daily_stats" 
ALTER COLUMN "date" TYPE date 
USING ("date"::date);

-- add new column to orders
ALTER TABLE "orders" 
ADD COLUMN "status" boolean DEFAULT true NOT NULL;

-- add composite unique constraint
ALTER TABLE "daily_stats" 
ADD CONSTRAINT "daily_stats_date_exchangeName_unique" UNIQUE("date","exchangeName");
