#!/usr/bin/env node

const { spawn } = require("child_process")
const path = require("path")

console.log("🚀 Starting Smart Tourist Safety System...\n")

// Function to run a command in a specific directory
function runCommand(command, args, cwd, label, color = "\x1b[36m") {
  return new Promise((resolve, reject) => {
    console.log(`${color}[${label}]\x1b[0m Starting: ${command} ${args.join(" ")}`)

    const process = spawn(command, args, {
      cwd: path.join(__dirname, cwd),
      stdio: "pipe",
      shell: true,
    })

    process.stdout.on("data", (data) => {
      const output = data.toString().trim()
      if (output) {
        console.log(`${color}[${label}]\x1b[0m ${output}`)
      }
    })

    process.stderr.on("data", (data) => {
      const output = data.toString().trim()
      if (output && !output.includes("Warning")) {
        console.log(`${color}[${label}]\x1b[0m ${output}`)
      }
    })

    process.on("close", (code) => {
      if (code === 0) {
        console.log(`${color}[${label}]\x1b[0m Process completed successfully`)
        resolve()
      } else {
        console.log(`${color}[${label}]\x1b[0m Process exited with code ${code}`)
        reject(new Error(`${label} failed with code ${code}`))
      }
    })

    process.on("error", (error) => {
      console.error(`${color}[${label}]\x1b[0m Error: ${error.message}`)
      reject(error)
    })
  })
}

// Function to check if a port is in use
function checkPort(port) {
  return new Promise((resolve) => {
    const net = require("net")
    const server = net.createServer()

    server.listen(port, () => {
      server.once("close", () => resolve(false))
      server.close()
    })

    server.on("error", () => resolve(true))
  })
}

async function main() {
  try {
    // Check if required ports are available
    console.log("🔍 Checking system requirements...\n")

    const backendPortInUse = await checkPort(5000)
    const frontendPortInUse = await checkPort(3000)
    const ganachePortInUse = await checkPort(8545)

    if (backendPortInUse) {
      console.log("⚠️  Port 5000 is already in use. Please stop the process using this port.")
      process.exit(1)
    }

    if (frontendPortInUse) {
      console.log("⚠️  Port 3000 is already in use. Please stop the process using this port.")
      process.exit(1)
    }

    if (!ganachePortInUse) {
      console.log("⚠️  Ganache is not running on port 7545. Please start Ganache first.")
      console.log("   You can start Ganache CLI with: ganache-cli -p 7545")
      process.exit(1)
    }

    console.log("✅ All ports are available\n")

    // Install dependencies if needed
    console.log("📦 Installing dependencies...\n")

    try {
      await runCommand("npm", ["install"], "backend", "Backend Install", "\x1b[33m")
      await runCommand("npm", ["install"], "frontend", "Frontend Install", "\x1b[34m")
      await runCommand("npm", ["install"], "blockchain", "Blockchain Install", "\x1b[35m")
    } catch (error) {
      console.log("⚠️  Some dependencies might already be installed, continuing...\n")
    }

    // Deploy smart contract
    console.log("🔗 Deploying smart contract...\n")
    await runCommand("npm", ["run", "deploy"], "blockchain", "Contract Deploy", "\x1b[35m")

    // Clean up database
    console.log("🗄️  Cleaning up database...\n")
    await runCommand("node", ["scripts/cleanup-database.js"], ".", "Database Cleanup", "\x1b[36m")

    console.log("\n🎉 Setup completed successfully!")
    console.log("\n📋 Starting all services...\n")

    // Start all services concurrently
    const services = [
      { command: "npm", args: ["start"], cwd: "backend", label: "Backend", color: "\x1b[33m" },
      { command: "npm", args: ["start"], cwd: "frontend", label: "Frontend", color: "\x1b[34m" },
    ]

    const processes = services.map((service) =>
      runCommand(service.command, service.args, service.cwd, service.label, service.color),
    )

    // Wait for all processes (they should run indefinitely)
    await Promise.all(processes)
  } catch (error) {
    console.error("\n❌ Error starting system:", error.message)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n🛑 Shutting down Smart Tourist Safety System...")
  process.exit(0)
})

process.on("SIGTERM", () => {
  console.log("\n\n🛑 Shutting down Smart Tourist Safety System...")
  process.exit(0)
})

main()
