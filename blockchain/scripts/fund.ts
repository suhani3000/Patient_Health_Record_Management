import { ethers } from "hardhat"

async function main() {
  const targetAddress = "0x9b5a2641eaa12826e112e6de255c247c68e022a2"

  const [deployer] = await ethers.getSigners()

  console.log("\n--- Local ETH funding script ---")
  console.log(`Deployer (sender): ${deployer.address}`)
  console.log(`Target wallet:     ${targetAddress}`)
  console.log(`Amount:            10.0 ETH (testnet / local fake ETH)\n`)

  const tx = await deployer.sendTransaction({
    to: targetAddress,
    value: ethers.parseEther("10.0"),
  })

  console.log(`Transaction submitted: ${tx.hash}`)
  const receipt = await tx.wait()

  console.log(`\nFake ETH transfer successful.`)
  console.log(`Block: ${receipt?.blockNumber}`)
  console.log(`10.0 ETH sent to ${targetAddress} (local Hardhat network).`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
