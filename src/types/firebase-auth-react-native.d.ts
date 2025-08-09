import type { Persistence, ReactNativeAsyncStorage } from "firebase/auth";

declare module "firebase/auth" {
    // v12 exports the function at runtime but not in the .d.ts
    export function getReactNativePersistence(
        storage: ReactNativeAsyncStorage
    ): Persistence;
}
