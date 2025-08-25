import { Spot, UserData } from "mexc-api-sdk";
import { config } from "dotenv";
config();

/**
 *
 */
export const InitializeMexcService = async (): Promise<Spot | null> => {
  try {
    const apiKey = process.env.MEXC_ACCESS_KEY;
    const apiSecret = process.env.MEXC_SECRET_KEY;
    const client = new Spot(apiKey, apiSecret);
    return client;
  } catch (error) {
    console.log("The error initializing the mexc Client", error);
    return null;
  }
};
