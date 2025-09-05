# TouristGuardian — Smart Tourist Safety & Incident Response (SIH)

A full-stack system for tourist safety monitoring, SOS handling, and on-chain identity, built for Smart India Hackathon (SIH).

Stack: React + Node/Express + MongoDB + Solidity (Truffle/Ganache) + Leaflet with an IoT simulation for live movement.

## Overview
- Blockchain identity: Every tourist gets a tamper-proof on-chain ID
- Live map: Real-time location tracking via IoT simulation
- SOS flow: Trigger, visualize, and resolve emergencies
- Admin console: Monitor tourists, filter/search, manage alerts
- Analytics: Basic KPIs, density heatmaps, SOS timelines

## Architecture
- Frontend: React (CRA) + Tailwind + Leaflet
- Backend: Node/Express + MongoDB
- Blockchain: Solidity + Truffle + Ganache (local dev)
- Data: MongoDB Atlas (or local MongoDB)
- Real-time: IoT simulator (server-side, 5s updates)

```
├── backend/           # Express API & services
├── frontend/          # React UI (Admin dashboard + map)
├── blockchain/        # Truffle project (contracts, migrations)
├── contracts/         # Solidity source
└── migrations/        # Truffle deployment scripts
```

## Prerequisites
- Node.js ≥ 16
- npm ≥ 8
- MongoDB Atlas (or local MongoDB)
- Ganache (v7+): `npm i -g ganache`
- Truffle: `npm i -g truffle`

> Never commit real secrets. Use .env files locally and commit only .env.example.

## Quick Start (Local Dev)
### 1) Clone & install
```
git clone <your-repo-url>
cd tourist-safety-system

npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd blockchain && npm install && cd ..
```

### 2) Start Ganache (deterministic, local-only)
Use the same mnemonic across restarts so addresses/private keys stay stable.
```
ganache \
  --wallet.mnemonic "bonus predict custom timber never advice casual glove predict hand burger away" \
  --wallet.totalAccounts 10 \
  --chain.chainId 1337 \
  --port 8545 \
  --host 127.0.0.1
```
> Do not use this mnemonic in production.

### 3) Deploy the smart contract (Truffle)
```
cd blockchain
truffle migrate --reset --network development
```
Note the deployed contract address printed here.

### 4) Configure environment (backend)
Create `backend/.env` from the example and edit values:
```
cd backend
cp .env.example .env
```
Set:
- `MONGODB_URI`
- `ADMIN_PRIVATE_KEY` (Ganache account[0] PK printed by Ganache)
- `CONTRACT_ADDRESS` (from truffle migrate)
- `BLOCKCHAIN_RPC_URL` (http://127.0.0.1:8545)

### 5) Start the services
Backend
```
cd backend
npm start
```
Frontend
```
cd frontend
npm run dev
```
Open http://localhost:3000

## Configuration
### Backend .env (see .env.example)
- `PORT` (default 5000)
- `MONGODB_URI`
- `BLOCKCHAIN_RPC_URL` (e.g., http://127.0.0.1:8545)
- `ADMIN_PRIVATE_KEY` (Ganache account[0] private key)
- `CONTRACT_ADDRESS` (from Truffle deploy)

### Contract sync
Each time you run `truffle migrate --reset`, update:
- `CONTRACT_ADDRESS` in `.env`
- If your backend uses a `deployment.json`, sync address + ABI there as well

## Admin
Demo creds (dev only) — change in production:
- Username: `admin`
- Password: `admin123`

## API Endpoints (sample)
| Method | Endpoint                      | Description               |
|-------:|-------------------------------|---------------------------|
|   POST | /api/tourists/register        | Register new tourist      |
|    GET | /api/tourists                 | List all tourists (admin) |
|   POST | /api/tourists/:id/location    | Update tourist location   |
|   POST | /api/tourists/:id/sos         | Trigger SOS               |
|   POST | /api/tourists/:id/reset-sos   | Reset SOS (admin)         |
|    GET | /api/wallet-queue/status      | Wallet queue status       |

## Smart Contract (key functions)
- `registerTourist(...)` → emits `TouristRegistered(id, ...)`
- `updateLocation(uint id, int256 lat, int256 long)`
- `triggerSOS(uint id)`
- `resetSOS(uint id)` (admin)
- `getTourist(uint id) view` (admin)
- `getAllTourists() view` (admin)
- `deleteTourist(uint id)` (admin, post-trip)

## Map & Analytics
- Live Map: 5s location updates, SOS markers, popups
- Heatmap: density visualization
- Analytics: active tourists, SOS count, areas

## Testing & IoT Simulation
- IoT simulation runs server-side and updates locations every 5 seconds.
- SOS events can be simulated randomly or via API.

## Security Notes
- Do not commit real .env files or private keys.
- Ganache mnemonic/keys are dev-only.
- Validate inputs on both client & server.
- Use role checks on admin-only endpoints.

## Troubleshooting
1) Admin wallet has 0 ETH
- Start Ganache with the stable mnemonic above
- Use Ganache account[0] private key in `ADMIN_PRIVATE_KEY`
- Ensure `BLOCKCHAIN_RPC_URL` points to 127.0.0.1:8545

2) BAD_DATA / could not decode result data (value="0x")
- The backend is talking to a wrong address or ABI
- Re-deploy, then update `CONTRACT_ADDRESS` and ABI where used

3) Mongo error: E11000 duplicate key ... tokenId/digitalID: null
- Legacy unique indexes exist from older schema
- The backend now drops `tokenId_1`/`digitalID_1` on boot and enforces
  unique indexes on `blockchainId` and `walletAddress`

4) “Tourist X not registered on blockchain, skipping update”
- Mongo entry exists, but not on-chain
- Register on-chain or let the backend re-register and persist the id

## Roadmap
- AuthN/AuthZ with JWT & RBAC
- WebSocket live updates (replace polling)
- On-chain event indexing for analytics
- Geo-fencing & automated alerts
- Offline-first mobile client

## Contributing
PRs welcome. Please open an issue first for major changes.

Built for Smart India Hackathon (SIH) 🏆

