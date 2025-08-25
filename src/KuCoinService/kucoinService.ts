import {
    ClientOptionBuilder,
    DefaultClient,
    GlobalApiEndpoint,
    GlobalBrokerApiEndpoint,
    GlobalFuturesApiEndpoint,
    TransportOptionBuilder
} from 'kucoin-universal-sdk';
import { KUCOIN_API_KEY, KUCOIN_API_SECRET, KUCOIN_API_PASSPHRASE } from "../utils/constants";


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


