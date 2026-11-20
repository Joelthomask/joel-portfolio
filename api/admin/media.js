import crypto from 'node:crypto';
import {requireAuth,env,gh,json} from '../../lib/admin.js';
export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  const session=requireAuth(req,res);if(!session)return;
  try{
    const {owner,repo,branch:base}=env();
    const {name,type,base64,sourceBranch}=req.body||{};
    const extensions={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'};
    if(!name||!base64||!extensions[type])throw new Error('Choose a PNG, JPEG, WebP or GIF image.');
    if(base64.length>3.85*1024*1024)throw new Error('Image too large. Maximum upload size is 2.8 MB; resize it and retry.');
    const safe=name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(-100)||`image.${extensions[type]}`;
    let target=sourceBranch;
    if(target){
      if(!/^admin\/media-[a-z0-9-]+$/.test(target))throw new Error('Invalid media draft branch.');
      await gh(session.access_token,`/repos/${owner}/${repo}/git/ref/heads/${target}`);
    }else{
      const ref=await gh(session.access_token,`/repos/${owner}/${repo}/git/ref/heads/${base}`);
      target=`admin/media-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      await gh(session.access_token,`/repos/${owner}/${repo}/git/refs`,{method:'POST',body:JSON.stringify({ref:`refs/heads/${target}`,sha:ref.object.sha})});
    }
    const filename=`${Date.now()}-${safe}`;
    const result=await gh(session.access_token,`/repos/${owner}/${repo}/contents/public/uploads/${filename}`,{method:'PUT',body:JSON.stringify({message:`Stage portfolio media: ${safe}`,content:base64,branch:target})});
    json(res,200,{branch:target,file:{name:safe,url:`/uploads/${filename}`,sha:result.content.sha}});
  }catch(e){json(res,400,{error:e.message})}
}
