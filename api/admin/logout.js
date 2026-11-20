import {clearSession,json} from '../../lib/admin.js';export default function handler(req,res){clearSession(res);json(res,200,{ok:true})}
