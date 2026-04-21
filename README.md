# astro-agent

Astro Fortune Agent on Arc Testnet.

## How it works

User picks Zodiac sign -> Nous AI generates fortune -> user mints it as NFT on Arc Testnet.

## Network

- Arc Testnet Chain ID: 5042002
- Arc RPC: https://rpc.testnet.arc.network
- Explorer: https://testnet.arcscan.app

## Deployment (Netlify)

This app uses a React/Vite frontend and an Express/Serverless backend, engineered for zero-config deployment on **Netlify** via `netlify.toml`.

1. Connect this repository to Netlify.
2. In the Netlify dashboard, add the following Environment Variables:
   - `NOUS_API_KEY`, `PRIVATE_KEY`
   - `ARC_RPC_URL`, `ARC_CHAIN_ID`
   - `VITE_CONTRACT_ADDRESS`
3. **Important**: Leave `VITE_BACKEND_URL` completely blank in your Netlify settings so the frontend natively queries the serverless functions.
