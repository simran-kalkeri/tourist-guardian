const fs = require('fs');
const path = require('path');

// Read the built contract
const contractPath = path.join(__dirname, '..', 'build', 'contracts', 'TouristRegistry.json');
const deploymentPath = path.join(__dirname, 'deployment.json');

if (!fs.existsSync(contractPath)) {
  console.error('Contract file not found at:', contractPath);
  process.exit(1);
}

const contractData = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

const deploymentData = {
  contractAddress: "0x5b1869D9A4C187F2EAa108f3062412ecf0526b24", // New contract address
  abi: contractData.abi
};

fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
console.log('✅ Updated deployment.json with new contract address and ABI');
console.log('Contract Address:', deploymentData.contractAddress);
console.log('ABI functions:', deploymentData.abi.filter(item => item.type === 'function').length);