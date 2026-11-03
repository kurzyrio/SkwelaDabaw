import { registerPlugin } from '@capacitor/core';

export interface NativeGoogleSignInResult {
  idToken: string;
  uid?: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
}

export interface NativeGoogleAuthPluginInterface {
  signIn(options?: {
    serverClientId?: string;
    webClientId?: string;
  }): Promise<NativeGoogleSignInResult>;

  signOut(options?: {
    serverClientId?: string;
    webClientId?: string;
  }): Promise<{ success: boolean }>;
}

export const NativeGoogleAuth = registerPlugin<NativeGoogleAuthPluginInterface>('NativeGoogleAuth');
