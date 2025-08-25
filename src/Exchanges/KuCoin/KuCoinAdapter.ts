import { ExchangeAdapter } from '../exchange';
import {
    InitializeKuCoinClientMarket,
    InitializeKuCoinClientSpot,
} from '../../KuCoinService/kucoinService';
import {
    CreateLimitOrderStruct,
    FetchBestOrderBookPrices,
    ValidateTrade,
    PlaceBatchOrder,
} from '../../KuCoinService/KuCoinOrderFunction';
import { OrderListElement, Budget, Trade } from '../../utils/types';
import { ProcessEachTradePair } from '../../KuCoinService/KuCoinOrderFunction';
import { generateDailySchedule } from '../../utils/functions';
import { OrderAPI } from 'kucoin-universal-sdk/dist/generate/spot/order';
import { MarketAPI } from 'kucoin-universal-sdk/dist/generate/spot/market';
import { BatchAddOrdersOrderList } from 'kucoin-universal-sdk/dist/generate/spot/order';

export class KuCoinAdapter implements ExchangeAdapter {
    private marketClient!: MarketAPI | null;
    private orderClient!: OrderAPI | null;

    async initializeClients(): Promise<void> {
        this.marketClient = await InitializeKuCoinClientMarket();
        this.orderClient = await InitializeKuCoinClientSpot();
        console.log('The clients are', this.marketClient, this.orderClient);
    }

    async createBatchOrder(
        orders: OrderListElement[],
        tracker: Budget
    ): Promise<boolean> {
        if (this.orderClient === null) return false;
        return await PlaceBatchOrder(orders, this.orderClient, tracker);
    }

    async createLimitOrder(
        size: number,
        price: number,
        side: 'BUY' | 'SELL',
        symbol: string
    ): Promise<OrderListElement | null> {
        const sideEnum =
            side === 'BUY'
                ? BatchAddOrdersOrderList.SideEnum.BUY
                : BatchAddOrdersOrderList.SideEnum.SELL;
        return await CreateLimitOrderStruct(size, price, sideEnum, symbol);
    }

    async fetchBestPrices() {
        const marketClient = this.marketClient;
        if (marketClient === null) {
            throw new Error('Error initializing the marekt clinet KUCoin');
        }
        return FetchBestOrderBookPrices(marketClient);
    }

    async validateTrade(size: number, price: number): Promise<boolean> {
        return await ValidateTrade(size, price);
    }

    async cancelOrder(orderId: string): Promise<boolean> {
        return true;
    }

    async processTrades(tracker: Budget, isBotRunning: boolean): Promise<void> {
        console.log('Started prcoessing trades');
        const marketClient = this.marketClient;
        if (marketClient === null || marketClient === undefined) {
            console.log('Error 1');
            throw new Error('Error initializing the marekt clinet KUCoin');
        }
        const spotClient = this.orderClient;
        if (spotClient === null || spotClient === undefined) {
            console.log('Error 2');
            throw new Error(
                'The spot client is not initialized returning null'
            );
        }

        for (const tradePair of tracker.schedule.trades) {
            const now = new Date();
            const delay = tradePair[0].time.getTime() - now.getTime();

            if (delay < 0) {
                console.log(
                    `The time has passed for interval ${tradePair[0].time}`
                );
                continue;
            }
            setTimeout(async () => {
                if (!isBotRunning) return;
                await ProcessEachTradePair(
                    tradePair,
                    spotClient,
                    tracker,
                    isBotRunning,
                    marketClient
                );
            }, delay - 100000);
        }
    }

    generateSchedule() {
        return generateDailySchedule();
    }
}
