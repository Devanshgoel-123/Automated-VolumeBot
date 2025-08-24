import { Budget } from "../utils/types";
import {
    ClientOptionBuilder,
    DefaultClient,
    GlobalApiEndpoint,
    GlobalBrokerApiEndpoint,
    GlobalFuturesApiEndpoint,
    Spot,
    TransportOptionBuilder
} from 'kucoin-universal-sdk';
import { FetchBestOrderBookPrices } from "./KuCoinOrderFunction";
import { Trade } from "../utils/types";
import { generateDailySchedule } from "../utils/functions";
import { KUCOIN_API_KEY, KUCOIN_API_SECRET, KUCOIN_API_PASSPHRASE } from "../utils/constants";


/**
 * Initialize the KuCoin client
 * @returns The spot market api
 */
export const InitializeKuCoinClientMarket= async()=>{
    try{
        if(!KUCOIN_API_KEY || !KUCOIN_API_SECRET || !KUCOIN_API_PASSPHRASE){
            throw new Error("API Key, API Secret, and Passphrase are required");
        }
        const httpTransportOption = new TransportOptionBuilder()
        .setKeepAlive(true)
        .setMaxConnsPerHost(10)
        .setMaxIdleConns(10)
        .build();

    // Create a client using the specified options
    const clientOption = new ClientOptionBuilder()
        .setKey(KUCOIN_API_KEY)
        .setSecret(KUCOIN_API_SECRET)
        .setPassphrase(KUCOIN_API_PASSPHRASE)
        .setSpotEndpoint(GlobalApiEndpoint)
        .setFuturesEndpoint(GlobalFuturesApiEndpoint)
        .setBrokerEndpoint(GlobalBrokerApiEndpoint)
        .setTransportOption(httpTransportOption)
        .build();

        const client = new DefaultClient(clientOption);
        const kucoinRestService = client.restService();
        const spotMarketApi = kucoinRestService.getSpotService().getMarketApi();
        return spotMarketApi;
    }catch(error){
        console.error("Error initializing KuCoin client",error);
        return null;
    }
}

/**
 * Initialize the KuCoin client
 * @returns The spot market api
 */
export const InitializeKuCoinClientSpot= async()=>{
    try{
        if(!KUCOIN_API_KEY || !KUCOIN_API_SECRET || !KUCOIN_API_PASSPHRASE){
            throw new Error("API Key, API Secret, and Passphrase are required");
        }
        const httpTransportOption = new TransportOptionBuilder()
        .setKeepAlive(true)
        .setMaxConnsPerHost(10)
        .setMaxIdleConns(10)
        .build();

    // Create a client using the specified options
    const clientOption = new ClientOptionBuilder()
        .setKey(KUCOIN_API_KEY)
        .setSecret(KUCOIN_API_SECRET)
        .setPassphrase(KUCOIN_API_PASSPHRASE)
        .setSpotEndpoint(GlobalApiEndpoint)
        .setFuturesEndpoint(GlobalFuturesApiEndpoint)
        .setBrokerEndpoint(GlobalBrokerApiEndpoint)
        .setTransportOption(httpTransportOption)
        .build();

        const client = new DefaultClient(clientOption);
        const kucoinRestService = client.restService();
        const spotMarketApi = kucoinRestService.getSpotService().getOrderApi();
        return spotMarketApi;
    }catch(error){
        console.error("Error initializing KuCoin client",error);
        return null;
    }
}

export const CanExecuteTrade=async(trade:Trade, KuCoinTracker:Budget)=>{
   const result=await FetchBestOrderBookPrices();
   if(result === null){
    console.error("Failed to fetch best order book prices");
    return false;
   }
   const {ask}=result;
   const tradeCost = trade.size * Number(ask) * 0.0006; // Maker fee (0.06%)
  const canExecute = KuCoinTracker.dailySpent + tradeCost <= KuCoinTracker.dailyLimit &&
                     KuCoinTracker.monthlySpent + tradeCost <= KuCoinTracker.monthlyLimit;
  if (!canExecute) {
    console.log(`Budget limit reached, skipping trade ${trade.size}`);
    // await sendBudgetAlert();
  }
  
}
