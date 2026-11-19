import {chromium,BASE_URL} from './browser.mjs';import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),page=await browser.newPage({viewport:{width:800,height:500}}),errors=[],views=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const gauss={4:[[.069431844202974,.173927422568727],[.330009478207572,.326072577431273],[.669990521792428,.326072577431273],[.930568155797026,.173927422568727]],6:[[.033765242898424,.085662246189585],[.169395306766868,.180380786524069],[.380690406958402,.233956967286346],[.619309593041598,.233956967286346],[.830604693233132,.180380786524069],[.966234757101576,.085662246189585]]};
try{
await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
await page.evaluate(()=>{const a=window.__cosmos;a.game.mode='panel';a.world.setQuality('ultra');document.getElementById('hud').hidden=true;document.getElementById('toast').hidden=true;window.cloudOriginal=a.world.bodies.earth.clouds.material.fragmentShader});
for(const [label,radius,phase]of [['day',2.35,35],['terminator',2.35,90],['crescent',2.35,150],['close',1.05,50],['grazing',1.08,90]]){
await page.evaluate(async({radius,phase})=>{const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(0);a.game.mode='panel';a.game.timePaused=true;const c=w.bodyPositions.earth,sun=c.clone().negate().normalize(),side=new t.Vector3().crossVectors(sun,new t.Vector3(0,1,0)).normalize(),p=sun.multiplyScalar(Math.cos(phase*Math.PI/180)).addScaledVector(side,Math.sin(phase*Math.PI/180)).multiplyScalar(6371*radius).add(c);a.game.player.position.copy(p);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,c,new t.Vector3(0,1,0)));w.followReady=false;window.cloudPixels={};},{radius,phase});
for(const mode of ['off','original','gauss4','gauss6','reference32','reference128']){
const result=await page.evaluate(({mode,gauss})=>{
 const a=window.__cosmos,w=a.world,cloud=w.bodies.earth.clouds;cloud.visible=mode!=='off';let shader=window.cloudOriginal;
 const original='for(int j=0;j<4;j++){float a=float(j)*.25,b=(float(j)+1.)*.25;a*=a;b*=b;sunDepth+=cloudDensity(q+sun*sunEnd*(a+b)*.5,false)*sunEnd*6371.*(b-a);}';
 if(mode.startsWith('reference')){const n=Number(mode.slice(9));shader=shader.replace(original,`for(int j=0;j<${n};j++){float a=float(j)/${n}.,b=(float(j)+1.)/${n}.;a*=a;b*=b;sunDepth+=cloudDensity(q+sun*sunEnd*(a+b)*.5,false)*sunEnd*6371.*(b-a);}`)}
 if(mode.startsWith('gauss')){const n=Number(mode.slice(5)),rows=gauss[n],nodes=rows.map(r=>r[0]).join(','),weights=rows.map(r=>r[1]).join(',');shader=shader.replace(original,`const float nodes[${n}]=float[${n}](${nodes});const float weights[${n}]=float[${n}](${weights});for(int j=0;j<${n};j++){float u=nodes[j];sunDepth+=cloudDensity(q+sun*sunEnd*u*u,false)*sunEnd*6371.*(2.*u*weights[j]);}`)}
 cloud.material.fragmentShader=shader;cloud.material.needsUpdate=true;w.update(a.game.player,0,{view:'probe',exposure:1});
 const c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;const x=c.getContext('2d');x.drawImage(w.canvas,0,0);window.cloudPixels[mode]=x.getImageData(0,0,c.width,c.height).data;return {png:c.toDataURL().split(',')[1]};
},{mode,gauss});
await fs.writeFile(`tests/screenshots/v29-cloud-${label}-${mode}.png`,Buffer.from(result.png,'base64'));
}
const metrics=await page.evaluate(()=>{const p=window.cloudPixels,out={};for(const mode of ['original','gauss4','gauss6','reference32']){let sum=0,sq=0,max=0,n=0;for(let i=0;i<p.reference128.length;i+=4){if(Math.max(...[0,1,2].map(c=>Math.abs(p.reference128[i+c]-p.off[i+c])))<=2)continue;for(let c=0;c<3;c++){const e=Math.abs(p[mode][i+c]-p.reference128[i+c]);sum+=e;sq+=e*e;max=Math.max(max,e);n++}}out[mode]={channels:n,mae:sum/n,rmse:Math.sqrt(sq/n),max}}return out});views.push({label,radius,phase,metrics});console.log(views.at(-1));
}
await fs.writeFile('tests/cloud-light-v29-investigation.json',JSON.stringify({views,errors},null,2));
}finally{await browser.close()}
