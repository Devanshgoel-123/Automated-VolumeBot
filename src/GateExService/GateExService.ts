import { GateApiV4Auth, ApiClient } from "gate-api";
export const InitializeGateXService = async () => {
  try {
    const client = new ApiClient();
    client.basePath = "https://some-other-host";
    client.setApiKeySecret("YOUR_API_KEY", "YOUR_API_SECRET");
  } catch (err) {}
};
