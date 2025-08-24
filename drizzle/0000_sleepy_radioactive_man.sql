CREATE TABLE "daily_stats" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "daily_stats_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"date" text NOT NULL,
	"totalVolume" numeric NOT NULL,
	"totalTrades" integer NOT NULL,
	"totalFees" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"clientOid" text NOT NULL,
	"symbol" text NOT NULL,
	"type" text NOT NULL,
	"side" text NOT NULL,
	"price" text NOT NULL,
	"size" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"exchangeName" text NOT NULL
);
