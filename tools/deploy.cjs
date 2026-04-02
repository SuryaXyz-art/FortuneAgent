const ethersPkg = require('ethers');
const { JsonRpcProvider, Wallet, ContractFactory } = ethersPkg.ethers ? ethersPkg.ethers : ethersPkg;
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = {};
const lines = envFile.split('\n');
for (const line of lines) {
    if (line.trim() && !line.startsWith('#')) {
        const parts = line.split('=');
        if (parts.length >= 2) {
            envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    }
}

const rpcUrl = envVars['ARC_RPC_URL'];
const privateKey = envVars['PRIVATE_KEY'];

if (!rpcUrl || !privateKey) {
  console.error("Missing RPC URL or Private Key in .env");
  process.exit(1);
}

const provider = new JsonRpcProvider(rpcUrl);
const wallet = new Wallet(privateKey, provider);

const artifactPath = path.resolve(__dirname, '../contracts/out/FortuneNFT.sol/FortuneNFT.json');
const artifactJson = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

const abi = artifactJson.abi;
const bytecode = artifactJson.bytecode.object || artifactJson.bytecode; 

async function main() {
  console.log("Deploying FortuneNFT to Arc Testnet...");
  
  const factory = new ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();
  
  console.log("Tx hash:", contract.deploymentTransaction().hash);
  
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  
  console.log("FortuneNFT deployed to:", address);
  
  const updatedEnv = lines.map(line => {
      if (line.startsWith('CONTRACT_ADDRESS=')) {
          return `CONTRACT_ADDRESS=${address}`;
      }
      return line;
  }).join('\n');
  
  fs.writeFileSync(envPath, updatedEnv);
  console.log("Updated .env with new CONTRACT_ADDRESS");
}

main().catch(console.error);
