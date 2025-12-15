import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("EHRRegistryModule", (m) => {
  const ehrRegistry = m.contract("EHRRegistry");
  return { ehrRegistry };
});
