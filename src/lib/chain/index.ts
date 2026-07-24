// src/lib/chain/index.ts
//
// Barrel for everything chain-related, so callers have one import path:
//
//   import { electroneumChain, getProviderOrThrow, readTokenMeta } from "@/src/lib/chain";
//
// (This replaces the old flat src/lib/chain.ts, whose contents now live in
// ./networks.ts — existing `@/src/lib/chain` imports keep working.)
export * from "./networks";
export * from "./provider";
export * from "./erc20";
