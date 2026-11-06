import { encodeFunctionData, numberToHex, type Address, type Hex } from "viem";
import { accountAbi } from "../../../packages/core/src/abi.js";
import {
  CHAIN_ID,
  CHAIN_ID_HEX,
  CHAIN_NAME,
  ETHREX_URL,
  EXPLORER_URL,
  NATIVE_CURRENCY,
} from "../../../packages/core/src/config.js";

export interface WalletChoice {
  uuid: string;
  name: string;
  rdns: string;
}

export interface ConnectedWallet {
  name: string;
  address: Address;
  chainId: number;
  uuid?: string;
}

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

const providers = new Map<string, Eip1193>();
let lastProvider: Eip1193 | null = null;

export function rememberWallet(detail: { info: WalletChoice; provider: Eip1193 }) {
  providers.set(detail.info.uuid, detail.provider);
}

export function walletProjectId() {
  return import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() || "";
}

export function providerFor(wallet: ConnectedWallet | null): Eip1193 | null {
  if (!wallet) return lastProvider;
  if (wallet.uuid && providers.has(wallet.uuid)) return providers.get(wallet.uuid) ?? null;
  return lastProvider;
}

function providerError(error: unknown): { code?: number; message: string } {
  const raw = error as { code?: number; message?: string; data?: { originalError?: { code?: number } } };
  return {
    code: raw?.code ?? raw?.data?.originalError?.code,
    message: raw?.message ?? (error instanceof Error ? error.message : "wallet rejected"),
  };
}

/** Add + switch the injected wallet onto the public alt-mempool devnet (chain 1337). */
export async function switchToDevnet(provider: Eip1193): Promise<number> {
  const trySwitch = async () => {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID_HEX }] });
  };
  const tryAdd = async () => {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: CHAIN_ID_HEX,
          chainName: CHAIN_NAME,
          nativeCurrency: { ...NATIVE_CURRENCY },
          // MetaMask needs ethrex for eth_sendRawTransaction / balances.
          // Frame txs still go through the sidecar from the Shepherd app.
          rpcUrls: [ETHREX_URL],
          blockExplorerUrls: [EXPLORER_URL],
        },
      ],
    });
  };

  try {
    await trySwitch();
  } catch (error) {
    const { code, message } = providerError(error);
    if (code === 4902 || /unrecognized|unknown chain|not added|do not see/i.test(message)) {
      try {
        await tryAdd();
      } catch (addError) {
        const added = providerError(addError);
        if (!/pending|already/i.test(added.message)) {
          throw new Error(`Could not add ${CHAIN_NAME}. Approve the network in your wallet. (${added.message})`);
        }
      }
      try {
        await trySwitch();
      } catch (switchAgain) {
        const again = providerError(switchAgain);
        throw new Error(`Approve switching to ${CHAIN_NAME} (chain ${CHAIN_ID}). (${again.message})`);
      }
    } else if (code === 4001 || /reject|denied|cancel/i.test(message)) {
      throw new Error(`Switch to ${CHAIN_NAME} (chain ${CHAIN_ID}) was rejected.`);
    } else {
      // Some wallets throw a generic error before the chain exists — try add then switch.
      try {
        await tryAdd();
        await trySwitch();
      } catch {
        throw new Error(`Could not switch to ${CHAIN_NAME}. ${message}`);
      }
    }
  }

  const id = Number(await provider.request({ method: "eth_chainId" }));
  if (id !== CHAIN_ID) {
    throw new Error(`Wallet is on chain ${id}. Shepherd needs ${CHAIN_ID} (${CHAIN_NAME}).`);
  }
  return id;
}

export async function connectInjected(uuid: string, name: string): Promise<ConnectedWallet> {
  const provider = providers.get(uuid);
  if (!provider) throw new Error("That wallet disconnected. Refresh and choose it again.");
  lastProvider = provider;
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const address = accounts[0];
  if (!address) throw new Error("The wallet did not return an account.");
  const chainId = await switchToDevnet(provider);
  return { name, address: address as Address, chainId, uuid };
}

export async function connectWalletConnect(): Promise<ConnectedWallet> {
  const projectId = walletProjectId();
  if (!projectId) {
    throw new Error("Set VITE_WALLETCONNECT_PROJECT_ID, then restart the dev server. Injected wallets work without it.");
  }
  const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
  const provider = await EthereumProvider.init({
    projectId,
    optionalChains: [CHAIN_ID],
    showQrModal: true,
    rpcMap: { [CHAIN_ID]: ETHREX_URL },
    metadata: {
      name: "Shepherd",
      description: "A scoped agent wallet",
      url: window.location.origin,
      icons: [`${window.location.origin}/icon.png`],
    },
  });
  await provider.connect();
  const eip1193 = provider as unknown as Eip1193;
  lastProvider = eip1193;
  const address = provider.accounts[0];
  if (!address) throw new Error("WalletConnect did not return an account.");
  const chainId = await switchToDevnet(eip1193);
  return { name: "WalletConnect", address: address as Address, chainId };
}

export async function readBrowserBalance(wallet: ConnectedWallet): Promise<bigint | null> {
  const provider = providerFor(wallet);
  if (!provider) return null;
  try {
    const hex = (await provider.request({
      method: "eth_getBalance",
      params: [wallet.address, "latest"],
    })) as string;
    return BigInt(hex);
  } catch {
    return null;
  }
}

export async function readBrowserChainId(wallet: ConnectedWallet | null): Promise<number | null> {
  const provider = providerFor(wallet);
  if (!provider) return null;
  try {
    return Number(await provider.request({ method: "eth_chainId" }));
  } catch {
    return null;
  }
}

/**
 * Deposit into ShepherdAccount from the connected browser wallet.
 * Must call fund() — a plain transfer hits fallback and reverts.
 */
export async function fundFromBrowser(wallet: ConnectedWallet, account: Address, valueWei: bigint): Promise<Hex> {
  const provider = providerFor(wallet);
  if (!provider) throw new Error("Reconnect the browser wallet, then try again.");
  await switchToDevnet(provider);
  const data = encodeFunctionData({ abi: accountAbi, functionName: "fund" });
  const hash = (await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: wallet.address,
        to: account,
        value: numberToHex(valueWei),
        data,
        chainId: CHAIN_ID_HEX,
      },
    ],
  })) as Hex;
  if (!hash) throw new Error("The wallet did not return a transaction hash.");
  return hash;
}

export function watchWalletChain(
  wallet: ConnectedWallet | null,
  onChange: (chainId: number) => void,
): () => void {
  const provider = providerFor(wallet);
  if (!provider?.on) return () => undefined;
  const handler = (chainIdHex: unknown) => {
    const id = typeof chainIdHex === "string" ? Number(chainIdHex) : Number(chainIdHex);
    if (Number.isFinite(id)) onChange(id);
  };
  provider.on("chainChanged", handler);
  return () => provider.removeListener?.("chainChanged", handler);
}

export function explorerAddress(address: string) {
  return `${EXPLORER_URL}?address=${address}`;
}

export { CHAIN_ID, CHAIN_NAME, ETHREX_URL, EXPLORER_URL };
