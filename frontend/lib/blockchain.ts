import { BrowserProvider, Contract } from "ethers";

// 1️⃣ Import ONLY ABI (not full artifact)
import EHRRegistryArtifact from "../docs/abis/EHRRegistry.json";
import EHRAccessArtifact from "../docs/abis/EHRAccess.json";

// 2️⃣ Contract addresses (update when you deploy)
export const EHR_REGISTRY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const EHR_ACCESS_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

// 3️⃣ Extract ABI explicitly
const EHRRegistryABI = EHRRegistryArtifact.abi;
const EHRAccessABI = EHRAccessArtifact.abi;

// 4️⃣ Get provider (MetaMask / injected wallet)
export async function getProvider() {
  if (!window.ethereum) {
    throw new Error("Wallet not found");
  }
  return new BrowserProvider(window.ethereum);
}

export async function registerFile(category: string) {
  const contract = await getEHRRegistryContract();
  const tx = await contract.registerFile(category);
  await tx.wait();
}

export async function getMyFiles(patientAddress: string) {
  const contract = await getEHRRegistryContract();
  return await contract.getFiles(patientAddress);
}


export async function grantFileAccess(
  doctor: string,
  fileId: number,
  accessType: number
) {
  const contract = await getEHRAccessContract();
  const tx = await contract.grantAccess(doctor, fileId, accessType);
  await tx.wait();
}


export async function checkFileAccess(
  patient: string,
  doctor: string,
  fileId: number
) {
  const contract = await getEHRAccessContract();
  return await contract.checkAccess(patient, doctor, fileId);
}


// export async function checkDoctorAccess(
//   patient: string,
//   doctor: string,
//   fileId: number
// ) {
//   const contract = await getEHRAccessContract();
//   return await contract.checkAccess(patient, doctor, fileId);
// }

// export async function getEHRAccessContract(): Promise<Contract> {
//   const signer = await getSigner();
//   return new Contract(EHR_ACCESS_ADDRESS, EHRAccessABI, signer);
// }



// 5️⃣ Get signer (current logged-in wallet)
export async function getSigner() {
  const provider = await getProvider();
  return provider.getSigner();
}

// 6️⃣ Registry contract instance
export async function getEHRRegistryContract() {
  const signer = await getSigner();
  return new Contract(
    EHR_REGISTRY_ADDRESS,
    EHRRegistryABI,
    signer
  );
}

// 7️⃣ Access contract instance
export async function getEHRAccessContract() {
  const signer = await getSigner();
  return new Contract(
    EHR_ACCESS_ADDRESS,
    EHRAccessABI,
    signer
  );

  
}
