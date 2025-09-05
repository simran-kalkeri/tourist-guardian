#!/usr/bin/env node

const { spawn } = require("child_process")
const path = require("path")

console.log("📦 Installing all dependencies...\n")

function runCommand(command, args, cwd, label) {
  return new Promise((resolve, reject) => {
    console.log(`\x1b[36m[${label}]\x1b[0m Installing dependencies...`)

    const process = spawn(command, args, {
      cwd: path.join(__dirname, "..", cwd),
      stdio: "inherit",
      shell: true,
    })

    process.on("close", (code) => {
      if (code === 0) {
        console.log(`\x1b[32m[${label}]\x1b[0m Dependencies installed successfully\n`)
        resolve()
      } else {
        console.log(`\x1b[31m[${label}]\x1b[0m Installation failed with code ${code}\n`)
        reject(new Error(`${label} installation failed`))
      }
    })

    process.on("error", (error) => {
      console.error(`\x1b[31m[${label}]\x1b[0m Error: ${error.message}`)
      reject(error)
    })
  })
}

async function installAll() {
  try {
    // Install root dependencies
    await runCommand("npm", ["install"], ".", "Root")

    // Install backend dependencies
    await runCommand("npm", ["install"], "backend", "Backend")

    // Install frontend dependencies
    await runCommand("npm", ["install"], "frontend", "Frontend")

    // Install blockchain dependencies
    await runCommand("npm", ["install"], "blockchain", "Blockchain")

    console.log("🎉 All dependencies installed successfully!")
    console.log("\n📋 Next steps:")
    console.log("1. Start Ganache: ganache-cli -p 7545")
    console.log("2. Run the system: npm start")
  } catch (error) {
    console.error("\n❌ Installation failed:", error.message)
    process.exit(1)
  }
}

installAll()
