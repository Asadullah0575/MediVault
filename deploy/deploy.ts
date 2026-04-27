import hre from "hardhat";

async function main() {
  const ethers = hre.ethers;
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying MediVault with:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  const Factory = await ethers.getContractFactory("ConfidentialHealthRecords");
  console.log("Deploying contract...");
  
  const contract = await Factory.deploy();
  console.log("Waiting for deployment...");
  
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  
  console.log("✅ ConfidentialHealthRecords deployed to:", address);
  console.log("Network: Sepolia");
  console.log("\nSave this address! Add to frontend/.env:");
  console.log(`VITE_CONTRACT_ADDRESS=${address}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});