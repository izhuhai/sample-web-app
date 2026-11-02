'use strict';
const fs=require('fs');const path=require('path');const https=require('https');const {spawn}=require('child_process');
const PORT=process.env.PORT||8080;
const UUID=process.env.UUID||"";
const WS_PATH=process.env.WS_PATH||"/ws";
const XRAY_URL='https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip';
function download(url,dest){return new Promise((resolve,reject)=>{const f=fs.createWriteStream(dest);https.get(url,{headers:{'User-Agent':'node'}},res=>{if(res.statusCode>=300&&res.statusCode<400&&res.headers.location){f.close();return download(res.headers.location,dest).then(resolve,reject);}res.pipe(f);f.on('finish',()=>{f.close();resolve();});}).on('error',e=>{fs.unlink(dest,()=>{});reject(e);});});}
async function ensureXray(){const bin=path.join(__dirname,'xray');if(fs.existsSync(bin)) return bin;const zip=path.join(__dirname,'xray.zip');await download(XRAY_URL,zip);const AdmZip=require('adm-zip');new AdmZip(zip).extractAllTo(__dirname,true);try{fs.unlinkSync(zip);}catch(e){}fs.chmodSync(bin,0o755);return bin;}
async function main(){if(!UUID){console.error('UUID env missing');process.exit(1);}const bin=await ensureXray();const cfg={"log":{"loglevel":"warning"},"inbounds":[{"listen":"0.0.0.0","port":Number(PORT),"protocol":"vless","settings":{"clients":[{"id":UUID,"flow":""}],"decryption":"none"},"streamSettings":{"network":"ws","wsSettings":{"path":WS_PATH}},"sniffing":{"enabled":true,"destOverride":["http","tls"]}}],"outbounds":[{"protocol":"freedom"}]};fs.writeFileSync(path.join(__dirname,'config.json'),JSON.stringify(cfg));const p=spawn(bin,['run','-c',path.join(__dirname,'config.json')],{stdio:'inherit'});p.on('exit',(c)=>{console.error('xray exited',c);process.exit(c||1);});}
main().catch(e=>{console.error(e);process.exit(1);});
