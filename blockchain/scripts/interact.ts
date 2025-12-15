import { ethers } from "hardhat";

async function main() {
    // ----------------------------------------------------------------
    // 1. CONFIGURATION
    // ----------------------------------------------------------------
    // PASTE YOUR DEPLOYED ADDRESSES HERE FROM THE PREVIOUS STEP
    const REGISTRY_ADDR = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; 
    const ACCESS_ADDR = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; 
    
    // Enum mapping for readability in logs
    // 0: NONE, 1: VIEW, 2: UPLOAD, 3: BOTH
    const ACCESS_TYPE_VIEW = 1; 

    // ----------------------------------------------------------------
    // 2. SETUP & ACCOUNTS
    // ----------------------------------------------------------------
    const [patient, doctor] = await ethers.getSigners();
    
    // Attach to the specific contract addresses
    const registry = await ethers.getContractAt("EHRRegistry", REGISTRY_ADDR);
    const access = await ethers.getContractAt("EHRAccess", ACCESS_ADDR);

    console.log("\n--- INTERACTION SCRIPT START ---");
    console.log(`Patient (You):   ${patient.address}`);
    console.log(`Doctor (Target): ${doctor.address}`);

    // ----------------------------------------------------------------
    // 3. REGISTER A FILE (EHRRegistry)
    // ----------------------------------------------------------------
    console.log("\n[1] Registering a generic 'Lab Report'...");
    
    // Call registerFile with a string category
    const tx1 = await registry.connect(patient).registerFile("Lab Report");
    await tx1.wait();
    console.log("✅ Transaction confirmed.");

    // Verify it exists by fetching user files
    const files = await registry.getFiles(patient.address);
    const latestFile = files[files.length - 1]; // Get the last file added
    const fileId = latestFile.fileId;
    
    console.log(`   -> File Found! ID: ${fileId}`);
    console.log(`   -> Category: ${latestFile.category}`);

    // ----------------------------------------------------------------
    // 4. GRANT ACCESS (EHRAccess)
    // ----------------------------------------------------------------
    console.log(`\n[2] Granting VIEW access to Doctor for File ID ${fileId}...`);
    
    // grantAccess(address _doctor, uint256 _fileId, AccessType _access)
    const tx2 = await access.connect(patient).grantAccess(doctor.address, fileId, ACCESS_TYPE_VIEW);
    await tx2.wait();
    console.log("✅ Access Granted.");

    // ----------------------------------------------------------------
    // 5. VERIFY ACCESS
    // ----------------------------------------------------------------
    console.log("\n[3] verifying access on-chain...");

    // checkAccess(address _patient, address _doctor, uint256 _fileId)
    // Returns the Enum integer (0, 1, 2, or 3)
    const accessStatus = await access.checkAccess(patient.address, doctor.address, fileId);

    if (Number(accessStatus) === ACCESS_TYPE_VIEW) {
        console.log("✅ SUCCESS: Doctor has VIEW access (Enum Value: 1)");
    } else {
        console.log(`❌ FAILURE: Expected 1, got ${accessStatus}`);
    }

    process.exit(0);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});