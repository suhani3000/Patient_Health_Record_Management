import { ethers } from "hardhat"

async function main() {
  // 1. OPEN MONGODB COMPASS
  // 2. COPY YOUR PATIENT'S BLOCKCHAIN ADDRESS HERE:
  const patientAddress = "0x9b5a2641eaa12826e112e6de255c247c68e022a2"
  
  // 3. COPY YOUR DOCTOR'S BLOCKCHAIN ADDRESS HERE:
  const doctorAddress = "0x182d67ca6e1eda7fc3e879117e1e70627b4a5bd5"

  // 4. COPY YOUR LAB'S BLOCKCHAIN ADDRESS HERE:
  const labAddress = "0x5aaebabff3ac7a1bfdacaaaea8ff2f3134327b25"

  const [deployer] = await ethers.getSigners()

  console.log("\n--- Local ETH funding script ---")
  console.log(`Deployer (Bank): ${deployer.address}\n`)

  // Fund Patient
  if (patientAddress.startsWith("0x") && patientAddress.length === 42) {
    await deployer.sendTransaction({ to: patientAddress, value: ethers.parseEther("10.0") })
    console.log(`✅ Sent 10 ETH to Patient: ${patientAddress}`)
  }

  // Fund Doctor
  if (doctorAddress.startsWith("0x") && doctorAddress.length === 42) {
    await deployer.sendTransaction({ to: doctorAddress, value: ethers.parseEther("10.0") })
    console.log(`✅ Sent 10 ETH to Doctor: ${doctorAddress}`)
  }

  // Fund Lab
  if (labAddress.startsWith("0x") && labAddress.length === 42) {
    await deployer.sendTransaction({ to: labAddress, value: ethers.parseEther("10.0") })
    console.log(`✅ Sent 10 ETH to Lab: ${labAddress}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})