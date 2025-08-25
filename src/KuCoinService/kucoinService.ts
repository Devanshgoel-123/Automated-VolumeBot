import {
    ClientOptionBuilder,
    DefaultClient,
    GlobalApiEndpoint,
    GlobalBrokerApiEndpoint,
    GlobalFuturesApiEndpoint,
    TransportOptionBuilder
} from 'kucoin-universal-sdk';
import { KUCOIN_API_KEY, KUCOIN_API_SECRET, KUCOIN_API_PASSPHRASE } from "../utils/constants";

// Add server time synchronization
let serverTimeOffset = 0;

/**
 * Synchronize with KuCoin server time to prevent timestamp errors
 * @returns The server time offset in milliseconds
 */
export const synchronizeServerTime = async () => {
    try {
        const client = await InitializeKuCoinClientMarket();
        if (!client) {
            console.warn("Failed to initialize client for time sync");
            return;
        }
        
        const startTime = Date.now();
        // Use server time endpoint to get accurate server time
        const response = await fetch('https://api.kucoin.com/api/v1/timestamp');
        const endTime = Date.now();
        
        if (response.ok) {
            const data = await response.json();
            const serverTime = data.data; // KuCoin returns timestamp in milliseconds
            const networkDelay = (endTime - startTime) / 2;
            const localTime = startTime + networkDelay;
            
            serverTimeOffset = serverTime - localTime;
            console.log(`Server time synchronized. Offset: ${serverTimeOffset}ms`);
        }
    } catch (error) {
        console.error("Failed to synchronize server time:", error);
        serverTimeOffset = 0; // Reset to 0 if sync fails
    }
};

/**
 * Get synchronized timestamp
 * @returns Current timestamp synchronized with KuCoin server
 */
export const getSynchronizedTimestamp = (): number => {
    return Date.now() + serverTimeOffset;
};

/**
 * Initialize the KuCoin client for market Data
 * @returns The market api
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
 * Initialize the KuCoin client for order Data
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
