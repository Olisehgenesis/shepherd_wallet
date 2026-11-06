import { encodeFunctionData, numberToHex, type Address, type Hex } from "viem";
import { accountAbi } from "../../../packages/core/src/abi.js";
import { CHAIN_ID, EXPLORER_URL, GATEWAY_URL } from "../../../packages/core/src/config.js";

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
};

const providers = new Map<string, Eip1193>();
let lastProvider: Eip1193 | null = null;

export function rememberWallet(detail: { info: WalletChoice; provider: Eip1193 }) {
  providers.set(detail.info.uuid, detail.provider);
}

export function walletProjectId() {
  return import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() || "";
}

function providerFor(wallet: ConnectedWallet | null): Eip1193 | null {
  if (!wallet) return lastProvider;
  if (wallet.uuid && providers.has(wallet.uuid)) return providers.get(wallet.uuid) ?? null;
  return lastProvider;
}

export async function connectInjected(uuid: string, name: string): Promise<ConnectedWallet> {
  const provider = providers.get(uuid);
  if (!provider) throw new Error("That wallet disconnected. Refresh and choose it again.");
  lastProvider = provider;
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const address = accounts[0];
  if (!address) throw new Error("The wallet did not return an account.");
  const chainId = await ensureDevnet(provider);
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
    rpcMap: { [CHAIN_ID]: GATEWAY_URL },
    metadata: {
      name: "Shepherd",
      description: "A scoped agent wallet",
      url: window.location.origin,
      icons: [`${window.location.origin}/icon.png`],
    },
  });
  await provider.connect();
  lastProvider = provider;
  const address = provider.accounts[0];
  if (!address) throw new Error("WalletConnect did not return an account.");
  const chainId = await ensureDevnet(provider);
  return { name: "WalletConnect", address: address as Address, chainId };
}

/** Ask the connected browser wallet for its ETH balance on the current chain. */
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

/**
 * Deposit into ShepherdAccount from the connected browser wallet.
 * Must call fund() — a plain transfer hits fallback and reverts.
 */
export async function fundFromBrowser(wallet: ConnectedWallet, account: Address, valueWei: bigint): Promise<Hex> {
  const provider = providerFor(wallet);
  if (!provider) throw new Error("Reconnect the browser wallet, then try again.");
  await ensureDevnet(provider);
  const data = encodeFunctionData({ abi: accountAbi, functionName: "fund" });
  const hash = (await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: wallet.address,
        to: account,
        value: numberToHex(valueWei),
        data,
      },
    ],
  })) as Hex;
  if (!hash) throw new Error("The wallet did not return a transaction hash.");
  return hash;
}

async function ensureDevnet(provider: Eip1193): Promise<number> {
  const chainHex = "0x539";
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainHex }] });
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainHex,
            chainName: "Alt mempool devnet",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: [GATEWAY_URL],
            blockExplorerUrls: [EXPLORER_URL],
          },
        ],
      });
    }
  }
  const id = Number(await provider.request({ method: "eth_chainId" }));
  return Number.isFinite(id) ? id : 0;
}

export function explorerAddress(address: string) {
  return `${EXPLORER_URL}?address=${address}`;
}
