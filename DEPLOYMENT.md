# Deployment Guide

## Quick Start Commands

### 1. Start Ganache Blockchain
\`\`\`bash
ganache-cli --deterministic --accounts 10 --host 0.0.0.0 --port 8545
\`\`\`

### 2. Deploy Smart Contracts
\`\`\`bash
cd blockchain
npm install
truffle migrate --reset
# Copy the deployed contract address to backend/.env
\`\`\`

### 3. Start Backend Server
\`\`\`bash
cd backend
npm install
npm start
# Server runs on http://localhost:5000
\`\`\`

### 4. Start Frontend Application
\`\`\`bash
cd frontend
npm install
npm start
# Application runs on http://localhost:3000
\`\`\`

## System Verification

1. **Blockchain**: Verify contract deployment in Truffle console
2. **Backend**: Test API endpoints with Postman or curl
3. **Frontend**: Access admin dashboard (admin/admin123)
4. **IoT Simulation**: Check real-time updates in dashboard

## Production Considerations

- Use environment-specific MongoDB clusters
- Configure proper blockchain networks (testnet/mainnet)
- Implement proper authentication and authorization
- Set up monitoring and logging
- Configure HTTPS and security headers
