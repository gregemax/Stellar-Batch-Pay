// scripts/keeper.ts
import { 
  SorobanRpc, 
  Networks, 
  Keypair, 
  TransactionBuilder, 
  Account, 
  Contract, 
  Address,
  nativeToScVal,
  xdr
} from 'stellar-sdk';

/**
 * CONFIGURATION
 */
const RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || Networks.TESTNET;
const CONTRACT_ID = process.env.CONTRACT_ID;
const KEEPER_SECRET = process.env.KEEPER_SECRET;
const BUMP_THRESHOLD_DAYS = 7;

if (!CONTRACT_ID || !KEEPER_SECRET) {
  console.error('MISSING CONTRACT_ID or KEEPER_SECRET in environment');
  process.exit(1);
}

const server = new SorobanRpc.Server(RPC_URL);
const keeperKeypair = Keypair.fromSecret(KEEPER_SECRET);
const contract = new Contract(CONTRACT_ID);

async function main() {
  console.log('Starting Keeper Bot...');
  console.log(`Contract: ${CONTRACT_ID}`);
  console.log(`Keeper: ${keeperKeypair.publicKey()}`);

  try {
    // 1. Fetch active recipients from events (simplified: assume we have a list or indexer)
    // In a production scenario, you would use an indexer or query events.
    // For this demonstration, we'll focus on the logic for a single recipient.
    const recipients = await fetchActiveRecipients();
    
    for (const recipient of recipients) {
      await maintainRecipient(recipient);
    }

    // 2. Maintain contract instance
    await maintainInstance();

  } catch (error) {
    console.error('Keeper execution failed:', error);
  }
}

async function fetchActiveRecipients(): Promise<string[]> {
  // TODO: Replace with real event scanning or database query
  // For now, return an empty list or a test address
  return [];
}

async function maintainInstance() {
  console.log('Checking contract instance TTL...');
  const sourceAccount = await server.getAccount(keeperKeypair.publicKey());
  
  const tx = new TransactionBuilder(new Account(sourceAccount.accountId(), sourceAccount.sequenceNumber()), {
    fee: '100000',
    networkPassphrase: NETWORK_PASSPHRASE
  })
  .addOperation(contract.call('bump_instance_ttl'))
  .setTimeout(300)
  .build();

  const sim = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    console.log('Instance TTL bump not needed or failed simulation.');
    return;
  }

  const preparedTx = SorobanRpc.assembleTransaction(tx, sim).build();
  preparedTx.sign(keeperKeypair);
  
  const result = await server.sendTransaction(preparedTx);
  console.log(`Instance TTL bumped: ${result.hash}`);
}

async function maintainRecipient(recipient: string) {
  console.log(`Checking TTL for recipient: ${recipient}`);
  
  // Logic: Call 'maintenance' which bumps everything for this recipient
  const sourceAccount = await server.getAccount(keeperKeypair.publicKey());
  
  const tx = new TransactionBuilder(new Account(sourceAccount.accountId(), sourceAccount.sequenceNumber()), {
    fee: '100000',
    networkPassphrase: NETWORK_PASSPHRASE
  })
  .addOperation(contract.call('maintenance', new Address(recipient).toScVal()))
  .setTimeout(300)
  .build();

  const sim = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    console.log(`Maintenance for ${recipient} not needed or failed.`);
    return;
  }

  const preparedTx = SorobanRpc.assembleTransaction(tx, sim).build();
  preparedTx.sign(keeperKeypair);
  
  const result = await server.sendTransaction(preparedTx);
  console.log(`Maintenance completed for ${recipient}: ${result.hash}`);
}

main();
