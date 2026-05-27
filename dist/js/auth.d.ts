/**
 * auth.ts — Autenticação via Supabase Auth REST API
 *
 * FIXES aplicados:
 * - Token refresh implementado (antes o usuário era deslogado após 1h sem aviso)
 * - Mensagens de erro em português para todos os casos
 * - Proteção contra race condition no refresh
 */
import type { Session, AuthUser, SignUpResponse, SignInResponse } from './types.js';
export declare function signUp(email: string, password: string, name: string): Promise<SignUpResponse>;
export declare function signIn(email: string, password: string): Promise<SignInResponse>;
export declare function signOut(): Promise<void>;
export declare function forgotPassword(email: string): Promise<void>;
export declare function saveSession(session: Session): void;
/**
 * Retorna a sessão, fazendo refresh automático se necessário.
 */
export declare function getSession(): Promise<Session | null>;
/** Versão síncrona para acesso rápido (não faz refresh) */
export declare function getSessionSync(): Session | null;
export declare function clearSession(): void;
export declare function isLoggedIn(): boolean;
export declare function getUser(): AuthUser | null;
export declare function getAccessToken(): string | null;
export declare function getUserId(): string | null;
//# sourceMappingURL=auth.d.ts.map