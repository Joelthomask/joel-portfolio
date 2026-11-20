import {session,json} from '../../lib/admin.js';export default function handler(req,res){const s=session(req);json(res,200,{authenticated:!!s?.access_token,user:s?.user||null})}
