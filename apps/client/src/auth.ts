import { signIn, signUp } from '../../../src/developer-auth/supabaseAuth';
import type { DeveloperSession } from '../../../src/developer-auth/types';

const STORAGE_KEY='qr-tools-developer-session';
export function getStoredSession(): DeveloperSession|null { const raw=sessionStorage.getItem(STORAGE_KEY); if(!raw)return null; try{return JSON.parse(raw) as DeveloperSession;}catch{return null;} }
function store(session:DeveloperSession){sessionStorage.setItem(STORAGE_KEY,JSON.stringify(session));}
export async function login(email:string,password:string){const session=await signIn(email,password);store(session);return session;}
export async function register(email:string,password:string){const session=await signUp(email,password);store(session);return session;}
export function logout(){sessionStorage.removeItem(STORAGE_KEY);}
export function authHeader(session:DeveloperSession){return {Authorization:`Bearer ${session.accessToken}`};}
