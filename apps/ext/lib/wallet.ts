import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Address, Hex } from "viem";
import { createWalletClient, custom, hexToNumber, type TransactionRequest } from "viem";
import { clearVault, loadVault, saveVault, setDoor, type DoorWallet, type ShepherdVault } from "./storage";
import { ethRpc } from "./rpc";
import { CHAIN_ID, CHAIN_ID_HEX } from "./config";

export async function createShepherdWallet(door?: DoorWallet): Promise<ShepherdVault> {
  const ownerKey = generatePrivateKey();
  const ownerAddress = privateKeyToAccount(ownerKey).address;
  const vault: ShepherdVault = {
    ownerKey,
    ownerAddress,
    door,
    createdAt: Date.now(),
  };
  await saveVault(vault);
  return vault;
}

export async function importShepherdWallet(ownerKey: Hex, door?: DoorWallet): Promise<ShepherdVault> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(ownerKey)) throw new Error("Private key must be 0x + 64 hex chars.");
  const ownerAddress = privateKeyToAccount(ownerKey).address;
  const vault: ShepherdVault = {
    ownerKey,
    ownerAddress,
    door,
    createdAt: Date.now(),
  };
  await saveVault(vault);
  return vault;
}

export async function linkDoor(door: DoorWallet) {
  return setDoor(door);
}

export async function unlinkDoor() {
  return setDoor(undefined);
}

export async function resetWallet() {
  await clearVault();
}

export async function getAccounts(): Promise<Address[]> {
  const vault = await loadVault();
  return vault ? [vault.ownerAddress] : [];
}

export async function getBalanceWei(address: Address): Promise<bigint> {
  const hex = (await ethRpc("eth_getBalance", [address, "latest"])) as string;
  return BigInt(hex);
}

export async function providerRequest(method: string, params: unknown[] = []): Promise<unknown> {
  const vault = await loadVault();

  switch (method) {
    case "eth_chainId":
      return CHAIN_ID_HEX;
    case "net_version":
      return String(CHAIN_ID);
    case "eth_accounts":
      return vault ? [vault.ownerAddress] : [];
    case "eth_requestAccounts": {
      if (!vault) throw providerError(4100, "Shepherd Wallet is locked. Open the extension and create a wallet.");
      return [vault.ownerAddress];
    }
    case "wallet_revokePermissions":
    case "wallet_requestPermissions":
      if (!vault) throw providerError(4100, "No Shepherd wallet");
      return [{ parentCapability: "eth_accounts" }];
    case "wallet_getPermissions":
      return vault ? [{ parentCapability: "eth_accounts" }] : [];
    case "wallet_switchEthereumChain": {
      const target = (params[0] as { chainId?: string } | undefined)?.chainId?.toLowerCase();
      if (target && target !== CHAIN_ID_HEX && hexToNumber(target as Hex) !== CHAIN_ID) {
        throw providerError(4902, "Shepherd Wallet currently supports only the alt mempool devnet (1337).");
      }
      return null;
    }
    case "wallet_addEthereumChain":
      return null;
    case "personal_sign": {
      if (!vault) throw providerError(4100, "No Shepherd wallet");
      const [data, address] = params as [Hex | string, Address];
      assertAddress(vault, address);
      const account = privateKeyToAccount(vault.ownerKey);
      return account.signMessage({
        message: typeof data === "string" && !data.startsWith("0x") ? data : { raw: data as Hex },
      });
    }
    case "eth_signTypedData_v4": {
      if (!vault) throw providerError(4100, "No Shepherd wallet");
      const [address, typedDataRaw] = params as [Address, string | object];
      assertAddress(vault, address);
      const typedData = typeof typedDataRaw === "string" ? JSON.parse(typedDataRaw) : typedDataRaw;
      const account = privateKeyToAccount(vault.ownerKey);
      return account.signTypedData(typedData as Parameters<typeof account.signTypedData>[0]);
    }
    case "eth_sendTransaction": {
      if (!vault) throw providerError(4100, "No Shepherd wallet");
      const tx = params[0] as TransactionRequest & { from?: Address };
      if (tx.from) assertAddress(vault, tx.from);
      return sendLegacy(vault, tx);
    }
    case "eth_getBalance":
    case "eth_call":
    case "eth_getCode":
    case "eth_getTransactionCount":
    case "eth_estimateGas":
    case "eth_gasPrice":
    case "eth_blockNumber":
    case "eth_getBlockByNumber":
    case "eth_getTransactionReceipt":
    case "eth_getTransactionByHash":
      return ethRpc(method, params);
    default:
      if (method.startsWith("eth_") || method.startsWith("net_")) {
        return ethRpc(method, params);
      }
      throw providerError(4200, `Shepherd Wallet does not support ${method}`);
  }
}

function assertAddress(vault: ShepherdVault, address: Address) {
  if (address.toLowerCase() !== vault.ownerAddress.toLowerCase()) {
    throw providerError(4100, "Unknown account");
  }
}

function providerError(code: number, message: string) {
  const error = new Error(message) as Error & { code: number };
  error.code = code;
  return error;
}

async function sendLegacy(vault: ShepherdVault, tx: TransactionRequest) {
  const account = privateKeyToAccount(vault.ownerKey);
  const client = createWalletClient({
    account,
    transport: custom({
      async request({ method, params }) {
        return ethRpc(method, (params as unknown[]) ?? []);
      },
    }),
  });
  return client.sendTransaction({
    to: tx.to,
    value: tx.value,
    data: tx.data,
    gas: tx.gas,
    gasPrice: tx.gasPrice,
    nonce: tx.nonce,
    chain: null,
  });
}
