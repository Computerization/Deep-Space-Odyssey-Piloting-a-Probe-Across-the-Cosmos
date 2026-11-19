import test from 'node:test';import assert from 'node:assert/strict';
import {cloudSkyTable,SKY_MU,SKY_HEIGHT,SKY_TOP} from '../src/rendering/cloud-skylight.js';

test('daylight LUT interpolation agrees with a dense angular integral across heights and near the horizon',()=>{
 const {data,width}=cloudSkyTable();
 const read=(x,y,c)=>data[(y*width+x)*4+c];let worst=0;
 for(const h of [0,1.4,3.7,8.99,20])for(const s of [0,.001,.013,.1,.38,.966,1])for(let c=0;c<3;c++){
  const x=Math.sqrt(s)*(SKY_MU-1),y=h/SKY_TOP*(SKY_HEIGHT-1),i=Math.floor(x),j=Math.floor(y),f=x-i,g=y-j;
  const interp=k=>read(i,k,c)*(1-f)+read(Math.min(i+1,SKY_MU-1),k,c)*f;
  const actual=interp(j)*(1-g)+interp(j+1)*g;
  const ray=[.0058,.0135,.0331][c]*8*Math.exp(-h/8),tau=ray+.0033*1.2*Math.exp(-h/1.2);
  let expected=0;
  if(s>0)for(let k=0;k<4096;k++){
   const m=(k+.5)/4096,path=s/(s-m)*(Math.exp(-tau/s)-Math.exp(-tau/m));
   expected+=path*.375*(1+m*m*s*s+.5*(1-m*m)*(1-s*s))*m/4096*ray/tau;
  }
  worst=Math.max(worst,Math.abs(expected-actual));
 }
 assert.ok(worst<.00012,`max absolute irradiance error ${worst}`);
 assert.ok(read(SKY_MU,0,2)>read(SKY_MU,0,0));assert.ok(read(SKY_MU,20,2)<read(SKY_MU,0,2));
 assert.equal(width*SKY_HEIGHT*8,66048,'fixed RGBA16F GPU bytes; no mip chain');
});
