import { ApiClient, SpotApi } from "gate-api";
import { config } from "dotenv";

config();

const API_KEY_GATE = process.env.GATE_API_KEY;
const API_SECRET_GATE = process.env.GATE_API_SECRET;
const GATE_API_URL = "https://api.gateio.ws/api/v4";

/**
 * Initialize the GateX service
 * @returns The GateX service
 */
export const InitializeGateXService = async ():Promise<SpotApi | null> => {
  try {
    if (!API_KEY_GATE || !API_SECRET_GATE) {
      throw new Error("API_KEY_GATE or API_SECRET_GATE is not set");
    }
    const client = new ApiClient();
    client.basePath = GATE_API_URL;
    client.setApiKeySecret(API_KEY_GATE, API_SECRET_GATE);
    const SpotClient= new SpotApi(client);
    return SpotClient;
  } catch (err) {
    console.error("Error initializing GateX service", err);
    return null
  }
};
