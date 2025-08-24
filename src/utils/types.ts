import { BatchAddOrdersOrderList } from "kucoin-universal-sdk/dist/generate/spot/order";
export interface OrderListElement {
  clientOid: string;
  symbol: string;
  type: BatchAddOrdersOrderList.TypeEnum;
  side: BatchAddOrdersOrderList.SideEnum;
  price: string;
  size: string;
  selfTradePrevention: string;
}

export interface Budget {
  dailySpent: number;
  monthlySpent: number;
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
  type: BatchAddOrdersOrderList.SideEnum;
  orderType: BatchAddOrdersOrderList.TypeEnum;
}
