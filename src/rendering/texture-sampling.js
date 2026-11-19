// One bounded Catmull–Rom kernel, generated inline for the existing cloud
// shader and as a magnification helper for surface imagery.
export function cubicKernel(source,index=p=>`clamp(${p},ivec2(0),ivec2(size)-1)`,explicitLod=false){
 const sample=explicitLod?'texture2DLodEXT':'texture2D',lod=explicitLod?',0.':'';
 return `  vec2 w0=f*(-.5+f*(1.-.5*f));
  vec2 w1=1.+f*f*(-2.5+1.5*f);
  vec2 w2=f*(.5+f*(2.-1.5*f));
  vec2 w3=f*f*(-.5+.5*f),middle=w1+w2;
  vec3 x=vec3(base.x-.5,base.x+.5+w2.x/middle.x,base.x+2.5)/size.x;
  vec3 y=vec3(base.y-.5,base.y+.5+w2.y/middle.y,base.y+2.5)/size.y;
  vec3 wx=vec3(w0.x,middle.x,w3.x),wy=vec3(w0.y,middle.y,w3.y);
  vec4 result=vec4(0.);
  for(int j=0;j<3;j++)for(int i=0;i<3;i++)result+=${sample}(${source},vec2(x[i],y[j])${lod})*wx[i]*wy[j];
  vec4 a=texelFetch(${source},${index('ivec2(base)')},0);
  vec4 b=texelFetch(${source},${index('ivec2(base)+ivec2(1,0)')},0);
  vec4 c=texelFetch(${source},${index('ivec2(base)+ivec2(0,1)')},0);
  vec4 d=texelFetch(${source},${index('ivec2(base)+ivec2(1,1)')},0);
`;
}

// The four surrounding values bound each channel, avoiding ringing and halos.
export const boundedCubic=`
 ivec2 sampleIndex(ivec2 p,ivec2 size,bool repeatX){
  return ivec2(repeatX?(p.x%size.x+size.x)%size.x:clamp(p.x,0,size.x-1),clamp(p.y,0,size.y-1));
 }
 vec4 boundedCubicSample(sampler2D source,vec2 uv,bool repeatX){
  vec2 size=vec2(textureSize(source,0)),p=uv*size-.5,base=floor(p),f=p-base;
${cubicKernel('source',p=>`sampleIndex(${p},ivec2(size),repeatX)`,true)}  return clamp(result,min(min(a,b),min(c,d)),max(max(a,b),max(c,d)));
 }
`;

// Only reconstruct magnified source pixels. The largest singular value of
// the UV Jacobian keeps anisotropic/minified footprints on their mip path.
export const surfaceReconstruction=`
 ${boundedCubic}
 vec3 sampleSurface(sampler2D source,vec2 uv){
  vec2 size=vec2(textureSize(source,0)),dx=dFdx(uv)*size,dy=dFdy(uv)*size;
  float a=dot(dx,dx),b=dot(dx,dy),c=dot(dy,dy);
  float footprint=sqrt(.5*(a+c+sqrt((a-c)*(a-c)+4.*b*b)));
  vec3 linear=texture2D(source,uv).rgb;
  float weight=1.-smoothstep(.65,1.,footprint);
  if(weight<=0.)return linear;
  return mix(linear,boundedCubicSample(source,uv,true).rgb,weight);
 }
`;
