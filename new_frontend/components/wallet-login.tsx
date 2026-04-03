"use client";

import { createThirdwebClient } from "thirdweb";
import { ConnectButton } from "thirdweb/react";
import { inAppWallet } from "thirdweb/wallets";

// Initialize the client using your .env variable
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID as string,
});

export function WalletLogin() {
  return (
    <ConnectButton
      client={client}
      wallets={[
        inAppWallet({
          auth: {
            options: ["email", "google"], // This forces the seamless Web2-style login
          },
        }),
      ]}
      connectButton={{ label: "Sign in securely" }}
    />
  );
}