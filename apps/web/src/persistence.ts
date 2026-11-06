import type { Address, Hex } from "viem";
import type { MirrorVerdict } from "../../../packages/core/src/mirror.js";

const RULES = "shepherd.rules";
const AGENTS = "shepherd.agents";
const APPROVALS = "shepherd.approvals";
const ACTIVITY = "shepherd.activity";
const CONNECTED = "shepherd.sessionConnected";
const SPENT = "shepherd.sessionSpent";
const OWNER_BACKED_UP = "shepherd.ownerBackedUp";

export type RuleMode = 0 | 1 | 2;

export interface PolicyRuleRow {
  target: Address;
  selector: Hex;
  mode: RuleMode;
  label?: string;
}

export interface AgentRecord {
  id: string;
  parentId: string;
  depth: number;
  address: Address;
  sessionKey: Hex;
  valueCap: string;
  expiry: string;
}

export interface PendingApproval {
  id: string;
  createdAt: number;
  agentId: string;
  target: Address;
  selector: Hex;
  data: Hex;
  valueWei: string;
  preview: MirrorVerdict;
  status: "pending" | "approved" | "rejected";
  explorerUrl?: string;
}

export interface ActivityRow {
  id: string;
  at: number;
  method: string;
  agentId: string;
  verdict: string;
  explorerUrl?: string;
  valueWei?: string;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  sessionStorage.setItem(key, JSON.stringify(value));
}

export function loadRules(policy: Address | null): PolicyRuleRow[] {
  if (!policy) return [];
  const all = readJson<Record<string, PolicyRuleRow[]>>(RULES, {});
  return all[policy.toLowerCase()] ?? [];
}

export function saveRules(policy: Address, rows: PolicyRuleRow[]) {
  const all = readJson<Record<string, PolicyRuleRow[]>>(RULES, {});
  all[policy.toLowerCase()] = rows;
  writeJson(RULES, all);
}

export function upsertRule(policy: Address, row: PolicyRuleRow) {
  const rows = loadRules(policy).filter(
    (item) => !(item.target.toLowerCase() === row.target.toLowerCase() && item.selector.toLowerCase() === row.selector.toLowerCase()),
  );
  if (row.mode === 0) {
    saveRules(policy, rows);
    return rows;
  }
  const next = [...rows, row];
  saveRules(policy, next);
  return next;
}

export function loadAgents(account: Address | null): AgentRecord[] {
  if (!account) return [];
  const all = readJson<Record<string, AgentRecord[]>>(AGENTS, {});
  return all[account.toLowerCase()] ?? [];
}

export function saveAgents(account: Address, agents: AgentRecord[]) {
  const all = readJson<Record<string, AgentRecord[]>>(AGENTS, {});
  all[account.toLowerCase()] = agents;
  writeJson(AGENTS, all);
}

export function loadApprovals(account: Address | null): PendingApproval[] {
  if (!account) return [];
  const all = readJson<Record<string, PendingApproval[]>>(APPROVALS, {});
  return all[account.toLowerCase()] ?? [];
}

export function saveApprovals(account: Address, rows: PendingApproval[]) {
  const all = readJson<Record<string, PendingApproval[]>>(APPROVALS, {});
  all[account.toLowerCase()] = rows.slice(0, 80);
  writeJson(APPROVALS, all);
}

export function loadActivity(account: Address | null): ActivityRow[] {
  if (!account) return [];
  const all = readJson<Record<string, ActivityRow[]>>(ACTIVITY, {});
  return all[account.toLowerCase()] ?? [];
}

export function appendActivity(account: Address, row: Omit<ActivityRow, "id" | "at"> & { id?: string; at?: number }) {
  const next: ActivityRow = {
    id: row.id ?? `act_${Date.now().toString(36)}`,
    at: row.at ?? Date.now(),
    method: row.method,
    agentId: row.agentId,
    verdict: row.verdict,
    explorerUrl: row.explorerUrl,
    valueWei: row.valueWei,
  };
  const list = [next, ...loadActivity(account)].slice(0, 100);
  const all = readJson<Record<string, ActivityRow[]>>(ACTIVITY, {});
  all[account.toLowerCase()] = list;
  writeJson(ACTIVITY, all);
  return list;
}

export function loadOwnerBackedUp(): boolean {
  return sessionStorage.getItem(OWNER_BACKED_UP) === "1";
}

export function markOwnerBackedUpStorage() {
  sessionStorage.setItem(OWNER_BACKED_UP, "1");
}

export function clearOwnerBackedUp() {
  sessionStorage.removeItem(OWNER_BACKED_UP);
}

export function loadSessionConnected(): boolean {
  return sessionStorage.getItem(CONNECTED) === "1";
}

export function markSessionConnected(connected: boolean) {
  sessionStorage.setItem(CONNECTED, connected ? "1" : "0");
}

export function loadSpentWei(sessionAddress: string | null): bigint {
  if (!sessionAddress) return 0n;
  const all = readJson<Record<string, string>>(SPENT, {});
  const raw = all[sessionAddress.toLowerCase()];
  return raw ? BigInt(raw) : 0n;
}

export function addSpentWei(sessionAddress: string, amount: bigint) {
  const all = readJson<Record<string, string>>(SPENT, {});
  const key = sessionAddress.toLowerCase();
  const next = (all[key] ? BigInt(all[key]) : 0n) + amount;
  all[key] = next.toString();
  writeJson(SPENT, all);
  return next;
}

export function clearSpentWei(sessionAddress: string) {
  const all = readJson<Record<string, string>>(SPENT, {});
  delete all[sessionAddress.toLowerCase()];
  writeJson(SPENT, all);
}
