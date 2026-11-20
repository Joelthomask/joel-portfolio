import crypto from 'node:crypto';
const COOKIE='portfolio_admin_session';
function secret(){const s=process.env.ADMIN_SESSION_SECRET;if(!s||s.length<32)throw new Error('Set ADMIN_SESSION_SECRET to a random string of at least 32 characters.');return crypto.createHash('sha256').update(s).digest();}
export function cookie(name,value,opts={}){let p=`${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Secure`;if(opts.maxAge!==undefined)p+=`; Max-Age=${opts.maxAge}`;return p;}
export function seal(obj){const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',secret(),iv);const body=Buffer.concat([c.update(JSON.stringify(obj)),c.final()]);return Buffer.concat([iv,c.getAuthTag(),body]).toString('base64url');}
export function unseal(token){try{const b=Buffer.from(token,'base64url'),iv=b.subarray(0,12),tag=b.subarray(12,28),body=b.subarray(28),d=crypto.createDecipheriv('aes-256-gcm',secret(),iv);d.setAuthTag(tag);return JSON.parse(Buffer.concat([d.update(body),d.final()]).toString());}catch{return null}}
export function session(req){const raw=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);return raw?unseal(raw):null;}
export function setSession(res,data){res.setHeader('Set-Cookie',cookie(COOKIE,seal(data),{maxAge:60*60*8}));}
export function clearSession(res){res.setHeader('Set-Cookie',cookie(COOKIE,'',{maxAge:0}));}
export function env(){const owner=process.env.GITHUB_OWNER,repo=process.env.GITHUB_REPO,branch=process.env.GITHUB_BRANCH||'main';if(!owner||!repo)throw new Error('Set GITHUB_OWNER and GITHUB_REPO in Vercel environment variables.');return{owner,repo,branch};}
export async function gh(token,path,options={}){const r=await fetch(`https://api.github.com${path}`,{...options,headers:{'Accept':'application/vnd.github+json','Authorization':`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json',...(options.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||`GitHub API error ${r.status}`);return d;}
export function requireAuth(req,res){const s=session(req);if(!s?.access_token){res.status(401).json({error:'Your session has expired. Sign in again.'});return null;}return s;}
export function json(res,status,data){res.status(status);res.setHeader('Content-Type','application/json; charset=utf-8');res.send(JSON.stringify(data));}
