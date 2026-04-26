// lib/stellar/vesting.ts - Real Soroban SDK integration (#215)
import {
  Contract,
  Networks,
  TransactionBuilder,
  Account,
  xdr,
  Address,
  nativeToScVal,
} from 'stellar-sdk';
import type { PaymentInstruction } from './types';

const SOROBAN_RPC_URLS = {
  testnet: 'https://soroban-testnet.stellar.org',
  mainnet: 'https://soroban-mainnet.stellar.org',
};

/**
 * Serialize an array of Stellar addresses to ScVal Vec<Address>
 */
function addressVecToScVal(addresses: string[]): xdr.ScVal {
  return xdr.ScVal.scvVec(
    addresses.map((addr) => new Address(addr).toScVal())
  );
}

/**
 * Serialize an array of i128 amounts (in stroops) to ScVal Vec<i128>
 * Amounts are passed as string decimals; we convert to i128 stroops (7 decimal places).
 */
function amountVecToScVal(amounts: string[]): xdr.ScVal {
  return xdr.ScVal.scvVec(
    amounts.map((amt) => {
      const stroops = BigInt(Math.round(parseFloat(amt) * 1e7));
      return nativeToScVal(stroops, { type: 'i128' });
    })
  );
}

/**
 * Build an unsigned Soroban deposit transaction XDR.
 * The returned XDR can be signed by Freighter or any other wallet and submitted via Soroban RPC.
 */
export async function buildDepositTransaction(
  contractId: string,
  payments: PaymentInstruction[],
  unlockTime: number,
  network: 'testnet' | 'mainnet',
  publicKey: string
): Promise<string> {
  const networkPassphrase = network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
  const rpcUrl = SOROBAN_RPC_URLS[network];

  // Dynamically import SorobanRpc to keep this tree-shakeable
  const { SorobanRpc } = await import('stellar-sdk');
  const server = new SorobanRpc.Server(rpcUrl, { allowHttp: false });

  const sourceAccount = await server.getAccount(publicKey);
  const account = new Account(sourceAccount.accountId(), sourceAccount.sequenceNumber());

  const contract = new Contract(contractId);

  // Derive token from the first payment's asset (format: "CODE:ISSUER" or "XLM")
  const firstAsset = payments[0]?.asset ?? 'XLM';
  const tokenAddress = firstAsset === 'XLM'
    ? 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC' // native XLM wrapper (testnet)
    : firstAsset.split(':')[1];

  const recipients = payments.map((p) => p.address);
  const amounts = payments.map((p) => p.amount);

  const operation = contract.call(
    'deposit',
    new Address(publicKey).toScVal(),          // sender: Address
    new Address(tokenAddress).toScVal(),        // token: Address
    addressVecToScVal(recipients),              // recipients: Vec<Address>
    amountVecToScVal(amounts),                  // amounts: Vec<i128>
    nativeToScVal(BigInt(unlockTime), { type: 'u64' }) // unlock_time: u64
  );

  const tx = new TransactionBuilder(account, {
    fee: '1000000', // high fee ceiling; actual fee set after simulation
    networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(300)
    .build();

  // Simulate to populate the Soroban footprint (read/write keys + auth)
  const simResult = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Soroban simulation failed: ${simResult.error}`);
  }

  // Assemble the transaction with the simulated footprint
  const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build();

  // Return unsigned XDR for wallet signing
  return preparedTx.toEnvelope().toXDR('base64');
}

/**
 * Build an unsigned transaction to bump the contract instance TTL.
 */
export async function buildBumpInstanceTtlTransaction(
  contractId: string,
  network: 'testnet' | 'mainnet',
  publicKey: string
): Promise<string> {
  const networkPassphrase = network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
  const rpcUrl = SOROBAN_RPC_URLS[network];

  const { SorobanRpc } = await import('stellar-sdk');
  const server = new SorobanRpc.Server(rpcUrl, { allowHttp: false });

  const sourceAccount = await server.getAccount(publicKey);
  const account = new Account(sourceAccount.accountId(), sourceAccount.sequenceNumber());

  const contract = new Contract(contractId);
  const operation = contract.call('bump_instance_ttl');

  const tx = new TransactionBuilder(account, {
    fee: '1000000',
    networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(300)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build();
  return preparedTx.toEnvelope().toXDR('base64');
}

/**
 * Build an unsigned transaction to bump a specific vesting schedule TTL.
 */
export async function buildBumpVestingTtlTransaction(
  contractId: string,
  recipient: string,
  index: number,
  network: 'testnet' | 'mainnet',
  publicKey: string
): Promise<string> {
  const networkPassphrase = network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
  const rpcUrl = SOROBAN_RPC_URLS[network];

  const { SorobanRpc } = await import('stellar-sdk');
  const server = new SorobanRpc.Server(rpcUrl, { allowHttp: false });

  const sourceAccount = await server.getAccount(publicKey);
  const account = new Account(sourceAccount.accountId(), sourceAccount.sequenceNumber());

  const contract = new Contract(contractId);
  const operation = contract.call(
    'bump_vesting_ttl',
    new Address(recipient).toScVal(),
    nativeToScVal(index, { type: 'u32' })
  );

  const tx = new TransactionBuilder(account, {
    fee: '1000000',
    networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(300)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build();
  return preparedTx.toEnvelope().toXDR('base64');
}
