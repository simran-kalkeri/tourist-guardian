const { ethers } = require("ethers")
const fs = require("fs")
const path = require("path")

async function deployContract() {
  try {
    // Connect to Ganache
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545")

    // Get accounts from Ganache
    const accounts = await provider.listAccounts()
    const deployer = await provider.getSigner(accounts[0])

    console.log("Deploying contract with account:", await deployer.getAddress())
    console.log("Account balance:", ethers.formatEther(await provider.getBalance(await deployer.getAddress())))

    // Read contract bytecode and ABI
    const contractPath = path.join(__dirname, "../build/contracts/TouristRegistry.json")
    const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"))

    // Create contract factory
    const contractFactory = new ethers.ContractFactory(contractJson.abi, contractJson.bytecode, deployer)

    // Deploy contract
    console.log("Deploying TouristRegistry contract...")
    const contract = await contractFactory.deploy()
    await contract.waitForDeployment()

    const contractAddress = await contract.getAddress()
    console.log("Contract deployed to:", contractAddress)

    // Save deployment info
    const deploymentInfo = {
      contractAddress,
      deployerAddress: await deployer.getAddress(),
      deploymentTime: new Date().toISOString(),
      network: "ganache",
      abi: contractJson.abi,
    }

    fs.writeFileSync(path.join(__dirname, "deployment.json"), JSON.stringify(deploymentInfo, null, 2))

    // Update backend .env file
    const envPath = path.join(__dirname, "../backend/.env")
    let envContent = fs.readFileSync(envPath, "utf8")

    envContent = envContent.replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${contractAddress}`)

    if (!envContent.includes("ADMIN_PRIVATE_KEY=")) {
      // Get private key from Ganache (first account)
      const wallet = ethers.Wallet.createRandom()
      envContent += `\nADMIN_PRIVATE_KEY=${wallet.privateKey}`
    }

    fs.writeFileSync(envPath, envContent)

    console.log("Deployment completed successfully!")
    console.log("Contract address saved to deployment.json")
    console.log("Backend .env file updated")

    return contractAddress
  } catch (error) {
    console.error("Deployment failed:", error)
    process.exit(1)
  }
}

if (require.main === module) {
  deployContract()
}

module.exports = { deployContract }
