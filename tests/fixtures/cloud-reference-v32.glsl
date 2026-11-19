
 #include <logdepthbuf_pars_fragment>
 uniform sampler2D cloudMap;uniform sampler2D opticalDepth;
 uniform vec3 localSun;uniform vec3 localCamera;uniform float rotation;uniform float flatten;
 varying vec3 vLocal;
 float cloudLod;float cloudFineLod;vec2 cloudFootprint;
 #if CLOUD_ANISOTROPIC
 vec2 cloudDx;vec2 cloudDy;
 #endif
 vec2 sphereHit(vec3 o,vec3 d,float r){float b=dot(o,d),q=b*b-dot(o,o)+r*r;if(q<0.)return vec2(1e8,-1e8);float h=sqrt(q);return vec2(-b-h,-b+h);}
 float cloudDensity(vec3 p,bool detail){
  float r=length(p),h=(r-1.)*6371.;
  // Density is identically zero outside the authored vertical cloud support.
  // Avoid map coordinates and reads for empty sunlight-march samples.
  if(h<=1.4||h>=9.)return 0.;
  vec2 uv=vec2(atan(p.z,-p.x)/6.283185307+rotation,asin(clamp(p.y/r,-1.,1.))/3.141592654+.5);
  float weather;
  if(detail){
   #if CLOUD_ANISOTROPIC
   // Magnified texels still benefit from area averaging. At minification,
   // pass the full footprint to the sampler and blend the crossover.
   if(cloudLod<1.){
    weather=(texture2DLodEXT(cloudMap,uv-cloudFootprint,cloudFineLod).r+texture2DLodEXT(cloudMap,uv+cloudFootprint,cloudFineLod).r)*.5;
    if(cloudLod>0.)weather=mix(weather,texture2DGradEXT(cloudMap,uv,cloudDx,cloudDy).r,smoothstep(0.,1.,cloudLod));
   }else weather=texture2DGradEXT(cloudMap,uv,cloudDx,cloudDy).r;
   #else
   weather=(texture2DLodEXT(cloudMap,uv-cloudFootprint,cloudFineLod).r+texture2DLodEXT(cloudMap,uv+cloudFootprint,cloudFineLod).r)*.5;
   #endif
  }
  else weather=texture2DLodEXT(cloudMap,uv,cloudLod).r;
  if(weather<=.025)return 0.;
  float deep=smoothstep(.55,.95,weather),top=2.7+deep*6.3;
  // This column has no cloud above its own top; avoid the optical-depth log.
  if(h>=top)return 0.;
  float layer=(h-1.4)/max(1.,top-1.4);
  float optical=-log(max(.025,1.-smoothstep(.025,.99,weather)));
  return optical/(.73*(top-1.4))*smoothstep(0.,.14,layer)*(1.-smoothstep(.60,1.,layer));
 }
 // Integral of the existing vertical density profile, including empty space.
 float cloudProfileIntegral(float h){
  float l=clamp(h,0.,1.);
  if(l<.14){float x=l/.14;return .14*x*x*x*(1.-.5*x);}
  if(l<.60)return l-.07;
  float x=(l-.60)/.4;return .53+.4*(x-x*x*x+.5*x*x*x*x);
 }
 // One measured weather sample per segment. Integrate its vertical column
 // instead of treating the midpoint density as constant through the segment.
 // Heights are linear within a segment; lateral weather still uses its midpoint.
 float cloudSegment(vec3 m,float ha,float hb,float segmentKm){
  float r=length(m);
  if(min(ha,hb)>=9.||max(ha,hb)<=1.4)return 0.;
  vec2 uv=vec2(atan(m.z,-m.x)/6.283185307+rotation,asin(clamp(m.y/r,-1.,1.))/3.141592654+.5);
  float weather=texture2DLodEXT(cloudMap,uv,cloudLod).r;
  if(weather<=.025)return 0.;
  float top=2.7+smoothstep(.55,.95,weather)*6.3,width=top-1.4;
  // The complete sunlight segment is above this measured-density column.
  if(min(ha,hb)>=top)return 0.;
  float la=(ha-1.4)/width,lb=(hb-1.4)/width,dh=hb-ha;
  float average;
  if(abs(dh)<.01){float l=(la+lb)*.5;average=smoothstep(0.,.14,l)*(1.-smoothstep(.60,1.,l))/width;}
  else average=(cloudProfileIntegral(lb)-cloudProfileIntegral(la))/dh;
  float optical=-log(max(.025,1.-smoothstep(.025,.99,weather)));
  return max(0.,average)*optical/.73*segmentKm;
 }
 float hg(float g,float mu){return(1.-g*g)/pow(max(.02,1.+g*g-2.*g*mu),1.5);}
 void main(){
 #include <logdepthbuf_fragment>
 vec3 o=localCamera/vec3(1.,flatten,1.),point=vLocal*1.00143/vec3(1.,flatten,1.);
 vec3 sampleN=normalize(point);vec2 sampleUV=vec2(atan(sampleN.z,-sampleN.x)/6.283185307,asin(clamp(sampleN.y,-1.,1.))/3.141592654);
 // Compute derivatives before pixel-varying ray branches, and unwrap the
 // longitude seam before passing the complete footprint to textureGrad.
 vec2 dx=dFdx(sampleUV),dy=dFdy(sampleUV);dx.x-=floor(dx.x+.5);dy.x-=floor(dy.x+.5);
 #if CLOUD_ANISOTROPIC
 cloudDx=dx;cloudDy=dy;
 #endif
 dx*=vec2(8192.,4096.);dy*=vec2(8192.,4096.);
 float major=max(length(dx),length(dy)),minor=min(length(dx),length(dy));
 cloudLod=max(0.,log2(major));cloudFineLod=max(0.,log2(max(minor,major*.5)));
 cloudFootprint=(length(dx)>length(dy)?dx:dy)/vec2(8192.,4096.)*.25;
 vec3 d=normalize(point-o),sun=normalize(localSun/vec3(1.,flatten,1.));
 vec2 hit=sphereHit(o,d,1.00143);float begin=max(0.,hit.x),end=hit.y;
 vec2 inner=sphereHit(o,d,1.+1.4/6371.);if(inner.x>0.)end=min(end,inner.x);
 if(end<=begin)discard;
 float split=clamp(sphereHit(o,d,1.+3./6371.).x,begin,end),through=1.;vec3 radiance=vec3(0.);
 float phase=.48+.20*hg(.55,dot(d,sun))+.13*hg(-.25,dot(d,sun));
 for(int i=0;i<20;i++){
  float stepSize=i<8?(split-begin)/8.:(end-split)/12.;if(stepSize<.00000001)continue;
  float t=i<8?begin+(float(i)+.5)*stepSize:split+(float(i)-8.+.5)*stepSize;
  vec3 q=o+d*t;float density=cloudDensity(q,true);
  if(density>.0001){
   float radius=length(q),height=max(0.,(radius-1.)*6371.),mu0=dot(q/radius,sun);
   float horizon=-sqrt(max(0.,1.-1./(radius*radius))),visible=smoothstep(horizon-.00465,horizon+.00465,mu0);
   float opacity=1.-exp(-density*stepSize*6371.);
   // Extinction still applies on the night side; sunlight work only contributes
   // where the solar disc is above the local horizon.
   if(visible>0.){
    float sunEnd=sphereHit(q,sun,1.00143).y;float sunDepth=0.;
    float previousHeight=height;
    for(int j=0;j<4;j++){
     float a=float(j)*.25,b=(float(j)+1.)*.25;a*=a;b*=b;
     float nextHeight=(length(q+sun*sunEnd*b)-1.)*6371.;
     sunDepth+=cloudSegment(q+sun*sunEnd*(a+b)*.5,previousHeight,nextHeight,sunEnd*6371.*(b-a));
     previousHeight=nextHeight;
    }
    vec2 lut=vec2(clamp((mu0+.2)/1.2,0.,1.),sqrt(clamp(height/(6371.*.018),0.,1.)));
    vec2 air=texture2D(opticalDepth,(lut*vec2(511.,127.)+.5)/vec2(512.,128.)).rg;
    vec3 solar=exp(-vec3(.0058,.0135,.0331)*air.x-vec3(.0033)*air.y);
    float lighting=visible*(phase*exp(-sunDepth)+.30*exp(-sunDepth*.18));
    radiance+=through*opacity*solar*lighting*1.18;
   }
   through*=1.-opacity;
   if(through<.008)break;
  }
 }
 float alpha=1.-through;if(alpha<.0001)discard;
 gl_FragColor=vec4(radiance/alpha,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }