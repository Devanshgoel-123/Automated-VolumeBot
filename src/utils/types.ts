import { BatchAddOrdersOrderList } from "kucoin-universal-sdk/dist/generate/spot/order";
export interface OrderListElement {
  clientOid: string;
  symbol: string;
  type: BatchAddOrdersOrderList.TypeEnum | "LIMIT";
  side: "BUY" | "SELL";
  price: string;
  size: string;
  selfTradePrevention: string;
}

export interface Budget {
  dailySpent: number;
  dailyVolume: number;
  dailyTrades: number;
  monthlySpent: number;
  monthlyTrades: number;
  dailyLimit: number;
  monthlyLimit: number;
  schedule: DailySchedule;
}

export interface DailySchedule {
  exchange: string;
  trades: Trade[][];
}

export interface Trade {
  time: Date;
  size: number;
  type: "BUY" | "SELL";
  orderType: BatchAddOrdersOrderList.TypeEnum;
}

export interface DailyStats{
  date:string;
  totalVolume:number;
  totalTrades:number;
  totalFees:number;
  exchangeName:string;
}