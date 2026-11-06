import type { Address } from "viem";
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
}

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

const providers = new Map<string, Eip1193>();

export function rememberWallet(detail: { info: WalletChoice; provider: Eip1193 }) {
  providers.set(detail.info.uuid, detail.provider);
}

export function walletProjectId() {
  return import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() || "";
}

export async function connectInjected(uuid: string, name: string): Promise<ConnectedWallet> {
  const provider = providers.get(uuid);
  if (!provider) throw new Error("That wallet disconnected. Refresh and choose it again.");
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const address = accounts[0];
  if (!address) throw new Error("The wallet did not return an account.");
  const chainId = await ensureDevnet(provider);
  return { name, address: address as Address, chainId };
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
  const address = provider.accounts[0];
  if (!address) throw new Error("WalletConnect did not return an account.");
  const chainId = await ensureDevnet(provider);
  return { name: "WalletConnect", address: address as Address, chainId };
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
