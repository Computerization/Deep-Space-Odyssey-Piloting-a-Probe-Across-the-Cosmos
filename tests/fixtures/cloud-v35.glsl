
 #include <logdepthbuf_pars_fragment>
 uniform sampler2D cloudMap;uniform sampler2D opticalDepth;
 uniform vec3 localSun;uniform vec3 localCamera;uniform float rotation;uniform float flatten;
 varying vec3 vLocal;float cloudLod;float cloudFineLod;vec2 cloudFootprint;
 vec2 sphereHit(vec3 o,vec3 d,float r){float b=dot(o,d),q=b*b-dot(o,o)+r*r;if(q<0.)return vec2(1e8,-1e8);float h=sqrt(q);return vec2(-b-h,-b+h);}
 // Integral of the existing vertical density profile, including empty space.
 float cloudProfileIntegral(float h){
  float l=clamp(h,0.,1.);
  if(l<.14){float x=l/.14;return .14*x*x*x*(1.-.5*x);}
  if(l<.60)return l-.07;
  float x=(l-.60)/.4;return .53+.4*(x-x*x*x+.5*x*x*x*x);
 }
 // First moment of the same profile. A partially occupied view segment is
 // illuminated at its cloud centroid, rather than at an empty midpoint.
 vec2 cloudProfileStatistics(float h){
  float l=clamp(h,0.,1.);
  if(l<.14){float x=l/.14,x3=x*x*x;return vec2(.14*x3*(1.-.5*x),.0196*x3*x*(.75-.4*x));}
  if(l<.60)return vec2(l-.07,.00686+.5*(l*l-.0196));
  float x=(l-.60)/.4,x2=x*x,x3=x2*x,x4=x2*x2;
  float tail=x-x3+.5*x4;
  return vec2(.53+.4*tail,.17706+.24*tail+.16*(.5*x2-.75*x4+.4*x4*x));
 }
 vec2 cloudViewSegment(vec3 m,float ha,float hb,float segmentKm){
  if(min(ha,hb)>=9.||max(ha,hb)<=1.4)return vec2(0.,.5);
  float r=length(m);
  vec2 uv=vec2(atan(m.z,-m.x)/6.283185307+rotation,asin(clamp(m.y/r,-1.,1.))/3.141592654+.5);
  float weather=(texture2DLodEXT(cloudMap,uv-cloudFootprint,cloudFineLod).r+texture2DLodEXT(cloudMap,uv+cloudFootprint,cloudFineLod).r)*.5;
  if(weather<=.025)return vec2(0.,.5);
  float top=2.7+smoothstep(.55,.95,weather)*6.3,width=top-1.4;
  if(min(ha,hb)>=top)return vec2(0.,.5);
  float la=(ha-1.4)/width,lb=(hb-1.4)/width,dh=hb-ha,average,sampleFraction=.5;
  if(abs(dh)<.01){float l=(la+lb)*.5;average=smoothstep(0.,.14,l)*(1.-smoothstep(.60,1.,l))/width;}
  else{
   vec2 integrated=cloudProfileStatistics(lb)-cloudProfileStatistics(la);
   float integral=integrated.x;
   average=integral/dh;
   if(abs(integral)>.000001){
    float meanLayer=integrated.y/integral;
    sampleFraction=clamp((1.4+width*meanLayer-ha)/dh,0.,1.);
   }
  }
  float optical=-log(max(.025,1.-smoothstep(.025,.99,weather)));
  return vec2(max(0.,average)*optical/.73*segmentKm,sampleFraction);
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
  // The complete sunlight segment lies above this column.
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
 // Take derivatives before ray branches and unwrap the longitude seam.
 vec2 dx=dFdx(sampleUV),dy=dFdy(sampleUV);dx.x-=floor(dx.x+.5);dy.x-=floor(dy.x+.5);
 dx*=vec2(8192.,4096.);dy*=vec2(8192.,4096.);
 float major=max(length(dx),length(dy)),minor=min(length(dx),length(dy));
 cloudLod=max(0.,log2(major));cloudFineLod=max(0.,log2(max(minor,major*.5)));
 cloudFootprint=(length(dx)>length(dy)?dx:dy)/vec2(8192.,4096.)*.25;
 if(cloudLod>0.){
 // Match the pixel footprint covariance with an isotropic mip and two taps.
 // The mip already covers the minor axis, so only the remaining variance
 // belongs in the tap separation. Isotropic footprints need no extra blur.
 float aa=dx.x*dx.x+dy.x*dy.x,bb=dx.x*dx.y+dy.x*dy.y,cc=dx.y*dx.y+dy.y*dy.y;
 float trace=aa+cc,delta=sqrt(max(0.,(aa-cc)*(aa-cc)+4.*bb*bb));
 float major2=max(0.,(trace+delta)*.5),minor2=max(0.,(trace-delta)*.5);
 float mipWidth=sqrt(max(minor2,major2*.25));
 vec2 axis=aa>=cc?vec2(major2-cc,bb):vec2(bb,major2-aa);
 axis/=max(length(axis),.000001);
 vec2 footprint=axis*sqrt(max(0.,major2-mipWidth*mipWidth)/12.)/vec2(8192.,4096.);
 if(dot(footprint,cloudFootprint)<0.)footprint=-footprint;
 float blend=smoothstep(0.,1.,cloudLod);
 cloudFineLod=mix(cloudFineLod,max(0.,log2(max(mipWidth,.000001))),blend);
 cloudFootprint=mix(cloudFootprint,footprint,blend);
 }
 vec3 d=normalize(point-o),sun=normalize(localSun/vec3(1.,flatten,1.));
 vec2 hit=sphereHit(o,d,1.00143);float begin=max(0.,hit.x),end=hit.y;
 vec2 inner=sphereHit(o,d,1.+1.4/6371.);if(inner.x>0.)end=min(end,inner.x);
 if(end<=begin)discard;
 // Rays crossing only upper clouds still use the complete twenty-step budget.
 vec2 lowerHit=sphereHit(o,d,1.+3./6371.);
 float split=lowerHit.y<0.?mix(begin,end,.4):clamp(lowerHit.x,begin,end),through=1.;vec3 radiance=vec3(0.);
 // A long, resolved slant ray crosses many lateral weather texels. Allocate
 // up to two samples per resolved texel, with a bounded 64-step total. Wide
 // views use coarser mip footprints and retain the original 8 + 12 minimum.
 vec3 firstN=normalize(o+d*begin),lastN=normalize(o+d*end);
 vec2 travel=vec2((atan(lastN.z,-lastN.x)-atan(firstN.z,-firstN.x))/6.283185307,(asin(clamp(lastN.y,-1.,1.))-asin(clamp(firstN.y,-1.,1.)))/3.141592654);
 travel.x-=floor(travel.x+.5);
 float sampleDensity=2.*length(travel*vec2(8192.,4096.))/(exp2(cloudFineLod)*max(end-begin,.00000001));
 int upperSteps=int(clamp(ceil(sampleDensity*(split-begin)),8.,32.));
 int lowerSteps=int(clamp(ceil(sampleDensity*(end-split)),12.,32.));
 float phase=.48+.20*hg(.55,dot(d,sun))+.13*hg(-.25,dot(d,sun));
 float previousViewHeight=(length(o+d*begin)-1.)*6371.;
 for(int i=0;i<64;i++){
  if(i>=upperSteps+lowerSteps)break;
  float stepSize=i<upperSteps?(split-begin)/float(upperSteps):(end-split)/float(lowerSteps);if(stepSize<.00000001)continue;
  float t=i<upperSteps?begin+(float(i)+.5)*stepSize:split+(float(i-upperSteps)+.5)*stepSize;
  vec3 q=o+d*t;float nextViewHeight=(length(o+d*(t+stepSize*.5))-1.)*6371.;
  vec2 segment=cloudViewSegment(q,previousViewHeight,nextViewHeight,stepSize*6371.);
  previousViewHeight=nextViewHeight;
  if(segment.x>.0001*stepSize*6371.){
   q+=d*stepSize*(segment.y-.5);
   float radius=length(q),height=max(0.,(radius-1.)*6371.),mu0=dot(q/radius,sun);
   float horizon=-sqrt(max(0.,1.-1./(radius*radius))),visible=smoothstep(horizon-.00465,horizon+.00465,mu0);
   float opacity=1.-exp(-segment.x);
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