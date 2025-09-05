# Blockchain Integration

This directory contains the blockchain integration for the Tourist Safety System.

## Setup Instructions

1. **Start Ganache**
   \`\`\`bash
   # Start Ganache CLI or use Ganache GUI
   ganache-cli --port 7545 --networkId 5777
   \`\`\`

2. **Compile Contracts**
   \`\`\`bash
   npm run compile
   \`\`\`

3. **Deploy Contracts**
   \`\`\`bash
   npm run deploy
   \`\`\`

4. **Verify Deployment**
   - Check `deployment.json` for contract address
   - Verify backend `.env` file is updated

## Files

- `deploy.js` - Contract deployment script
- `utils.js` - Blockchain service utilities
- `deployment.json` - Deployment information (generated)
- `../contracts/TouristRegistry.sol` - Smart contract
- `../truffle-config.js` - Truffle configuration

## Usage

The BlockchainService class provides methods for:
- Tourist registration
- Location updates
- SOS triggers/resets
- Tourist data retrieval
- Contract management

## Environment Variables

Required in `backend/.env`:
- `CONTRACT_ADDRESS` - Deployed contract address
- `ADMIN_PRIVATE_KEY` - Admin wallet private key
