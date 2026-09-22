import { auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  let errString = '';
  try {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: String(provider.providerId || ''),
          displayName: provider.displayName ? String(provider.displayName) : null,
          email: provider.email ? String(provider.email) : null,
          photoUrl: provider.photoURL ? String(provider.photoURL) : null
        })) || []
      },
      operationType,
      path: path ? String(path) : null
    };
    errString = JSON.stringify(errInfo);
  } catch {
    errString = JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      operationType,
      path: path ? String(path) : null
    });
  }
  console.error('Firestore Error: ', errString);
  throw new Error(errString);
}
