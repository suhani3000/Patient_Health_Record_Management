import  {ethers}  from "hardhat";


async function main() {
 

  const EHRRegistry = await ethers.getContractFactory("EHRRegistry");
  const registry = await EHRRegistry.deploy();
  await registry.waitForDeployment();

  const EHRAccess = await ethers.getContractFactory("EHRAccess");
  const access = await EHRAccess.deploy();
  await access.waitForDeployment();

  console.log("EHRRegistry:", await registry.getAddress());
  console.log("EHRAccess:", await access.getAddress());

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
