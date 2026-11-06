import { MSG_SOURCE, SHEPHERD_ICON_DATA_URL, SHEPHERD_RDNS, SHEPHERD_UUID } from "../lib/config";

type DoorInfo = { uuid: string; name: string; rdns?: string; icon?: string };

export default defineUnlistedScript(() => {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  let requestId = 0;
  const pending = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
  >();

  function emit(event: string, ...args: unknown[]) {
    for (const fn of listeners.get(event) ?? []) {
      try {
        fn(...args);
      } catch {
        /* ignore listener errors */
      }
    }
  }

  function request(args: { method: string; params?: unknown[] } | string, params?: unknown[]) {
    const method = typeof args === "string" ? args : args.method;
    const requestParams = typeof args === "string" ? (params ?? []) : (args.params ?? []);
    const id = `shepherd-${++requestId}`;

    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      window.postMessage({ source: MSG_SOURCE, id, method, params: requestParams }, "*");
      window.setTimeout(() => {
        if (!pending.has(id)) return;
        pending.delete(id);
        reject(Object.assign(new Error("Shepherd request timed out"), { code: -32002 }));
      }, 60_000);
    });
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data as {
      source?: string;
      id?: string;
      result?: unknown;
      error?: { message?: string; code?: number };
      type?: string;
      uuid?: string;
    };

    if (data?.source === `${MSG_SOURCE}-result` && data.id) {
      const waiter = pending.get(data.id);
      if (!waiter) return;
      pending.delete(data.id);
      if (data.error) {
        waiter.reject(Object.assign(new Error(data.error.message ?? "failed"), { code: data.error.code }));
      } else {
        waiter.resolve(data.result);
      }
      return;
    }

    if (data?.source === `${MSG_SOURCE}-door` && data.id && data.type) {
      void (async () => {
        try {
          if (data.type === "discover") {
            const doors = await discoverDoors();
            window.postMessage({ source: `${MSG_SOURCE}-door-result`, id: data.id, result: doors }, "*");
          } else if (data.type === "connect") {
            const door = await connectDoor(data.uuid);
            window.postMessage({ source: `${MSG_SOURCE}-door-result`, id: data.id, result: door }, "*");
          }
        } catch (error) {
          window.postMessage(
            {
              source: `${MSG_SOURCE}-door-result`,
              id: data.id,
              error: { message: (error as Error).message },
            },
            "*",
          );
        }
      })();
    }
  });

  async function discoverDoors(): Promise<DoorInfo[]> {
    const found = new Map<string, DoorInfo>();

    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<{ info: DoorInfo }>).detail;
      if (!detail?.info?.uuid || detail.info.rdns === SHEPHERD_RDNS) return;
      found.set(detail.info.uuid, {
        uuid: detail.info.uuid,
        name: detail.info.name,
        rdns: detail.info.rdns,
        icon: detail.info.icon,
      });
    };

    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    window.removeEventListener("eip6963:announceProvider", onAnnounce);

    const ethereum = (window as unknown as { ethereum?: { request?: Function; isMetaMask?: boolean } }).ethereum;
    if (found.size === 0 && ethereum?.request && !(ethereum as { isShepherd?: boolean }).isShepherd) {
      found.set("legacy-injected", {
        uuid: "legacy-injected",
        name: ethereum.isMetaMask ? "MetaMask" : "Injected wallet",
      });
    }

    return [...found.values()];
  }

  async function connectDoor(uuid?: string) {
    type Detail = {
      info: DoorInfo;
      provider: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
    };
    const doors = new Map<string, Detail>();

    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<Detail>).detail;
      if (!detail?.info?.uuid || detail.info.rdns === SHEPHERD_RDNS) return;
      doors.set(detail.info.uuid, detail);
    };

    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    window.removeEventListener("eip6963:announceProvider", onAnnounce);

    let chosen = uuid ? doors.get(uuid) : undefined;
    if (!chosen && uuid === "legacy-injected") chosen = undefined;
    if (!chosen && !uuid) chosen = [...doors.values()][0];
    if (!chosen && uuid) chosen = doors.get(uuid);

    let provider = chosen?.provider;
    let info = chosen?.info;

    if (!provider) {
      const ethereum = (window as unknown as {
        ethereum?: { request: Function; isShepherd?: boolean; providers?: Array<{ request: Function }> };
      }).ethereum;
      const candidate =
        ethereum?.providers?.find((p) => !(p as { isShepherd?: boolean }).isShepherd) ??
        (ethereum && !ethereum.isShepherd ? ethereum : undefined);
      if (!candidate?.request) {
        throw new Error("No injected door on this tab. Open any https site, unlock MetaMask/Rabby, then try again.");
      }
      provider = candidate as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
      info = info ?? { uuid: uuid ?? "legacy-injected", name: "Injected wallet" };
    }

    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
    const address = accounts[0];
    if (!address) throw new Error("Door wallet returned no account.");

    return {
      uuid: info?.uuid,
      name: info?.name ?? "Injected wallet",
      rdns: info?.rdns,
      icon: info?.icon,
      address,
    };
  }

  const provider = {
    isShepherd: true,
    isMetaMask: false,
    providers: undefined as unknown[] | undefined,
    request,
    send(methodOrPayload: string | { method: string; params?: unknown[] }, params?: unknown[]) {
      if (typeof methodOrPayload === "string") return request(methodOrPayload, params);
      return request(methodOrPayload);
    },
    sendAsync(
      payload: { id?: unknown; method: string; params?: unknown[] },
      callback: (error: Error | null, result?: unknown) => void,
    ) {
      void request(payload)
        .then((result) => callback(null, { id: payload.id, jsonrpc: "2.0", result }))
        .catch((error: Error) => callback(error));
    },
    on(event: string, listener: (...args: unknown[]) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
      return provider;
    },
    removeListener(event: string, listener: (...args: unknown[]) => void) {
      listeners.get(event)?.delete(listener);
      return provider;
    },
    removeAllListeners(event?: string) {
      if (event) listeners.delete(event);
      else listeners.clear();
      return provider;
    },
    emit,
  };

  const info = {
    uuid: SHEPHERD_UUID,
    name: "Shepherd Wallet",
    icon: SHEPHERD_ICON_DATA_URL,
    rdns: SHEPHERD_RDNS,
  };

  const announce = () => {
    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: Object.freeze({ info: Object.freeze({ ...info }), provider }),
      }),
    );
  };

  window.addEventListener("eip6963:requestProvider", announce);
  announce();

  const w = window as unknown as { ethereum?: typeof provider & { providers?: unknown[] } };
  if (!w.ethereum) {
    w.ethereum = provider;
  } else if (Array.isArray(w.ethereum.providers)) {
    w.ethereum.providers.push(provider);
  } else {
    const existing = w.ethereum;
    w.ethereum = Object.assign(existing, {
      providers: [existing, provider],
    }) as typeof provider & { providers?: unknown[] };
    // Prefer not to overwrite MetaMask's window.ethereum; keep it as primary for doors.
  }
});
