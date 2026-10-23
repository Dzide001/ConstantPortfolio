// Minimal typings for the Google Identity Services token client we use.
interface GisTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}
interface GisTokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}
interface Window {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient(config: {
          client_id: string;
          scope: string;
          callback: (r: GisTokenResponse) => void;
          error_callback?: (e: { type: string; message?: string }) => void;
        }): GisTokenClient;
        revoke(token: string, done?: () => void): void;
      };
    };
  };
}
