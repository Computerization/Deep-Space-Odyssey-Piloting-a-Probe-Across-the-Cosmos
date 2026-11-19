
 #include <logdepthbuf_pars_fragment>
 uniform sampler2D cloudMap;
 uniform vec3 localSun;uniform vec3 localCamera;uniform float rotation;uniform float flatten;
 
 
 uniform sampler2D opticalDepth;
 const vec3 airRayleigh=vec3(.0058,.0135,.0331),airMie=vec3(.003);
 vec2 airSunDepth(float height,float mu){
  vec2 uv=vec2(clamp((mu+.2)/1.2,0.,1.),sqrt(clamp(height/(6371.*.018),0.,1.)));
  return texture2D(opticalDepth,(uv*vec2(511.,127.)+.5)/vec2(512.,128.)).rg;
 }
 vec3 airTransmission(vec2 column){return exp(-airRayleigh*column.x-airMie*1.1*column.y);}

 vec2 airSphereHit(vec3 o,vec3 d,float r){float b=dot(o,d),h=b*b-dot(o,o)+r*r;if(h<0.)return vec2(1e8,-1e8);h=sqrt(h);return vec2(-b-h,-b+h);}
 // Radiance and RGB transmission up to a physical endpoint. The cloud pass
 // uses its opacity-weighted depth; the clear-air pass uses the ground/sky.
 void airTransport(vec3 o,vec3 d,vec3 sun,float limit,out vec3 scatter,out vec3 transmittance){
 scatter=vec3(0.);transmittance=vec3(1.);
 vec2 hit=airSphereHit(o,d,1.018);float start=max(0.,hit.x),end=min(hit.y,limit);
 vec2 ground=airSphereHit(o,d,1.);if(ground.x>0.)end=min(end,ground.x);
 if(end<=start)return;
 #ifdef TRANSMISSION_ONLY
 // Reuse the solar density table for the view column. Outward columns avoid
 // lookup interpolation across the ground horizon; split crossing rays at
 // their tangent so both halves stay in the table's smooth positive domain.
 // The clipped top-of-air endpoints have zero outward column.
 vec3 first=o+d*start,last=o+d*end;
 float a=dot(first,d),b=dot(last,d),ra=length(first),rb=length(last);
 vec2 A=start>0.?vec2(0.):airSunDepth((ra-1.)*6371.,abs(a)/ra);
 vec2 B=end==hit.y?vec2(0.):airSunDepth((rb-1.)*6371.,abs(b)/rb);
 vec2 column=a>=0.?A-B:B-A;
 if(a<0.&&b>0.)column=2.*airSunDepth((length(first-d*a)-1.)*6371.,0.)-A-B;
 transmittance=airTransmission(max(column,vec2(0.)));
 #else
 // Twelve Gaussian samples resolve the steep lower-air density on rays to
 // the ground. Near the limb, keep the established twenty uniform samples:
 // grazing geometry and the narrow solar horizon need different sampling.
 const float nodes[20]=float[20](0.009219682877,0.047941371815,0.115048662903,0.206341022857,0.316084250501,0.437383295744,0.562616704256,0.683915749499,0.793658977143,0.884951337097,0.952058628185,0.990780317123,0.,0.,0.,0.,0.,0.,0.,0.);
 const float weights[20]=float[20](0.023587668193,0.053469662998,0.080039164272,0.101583713362,0.116746268269,0.124573522907,0.124573522907,0.116746268269,0.101583713362,0.080039164272,0.053469662998,0.023587668193,0.,0.,0.,0.,0.,0.,0.,0.);
 // Endpoints above the low aerosol layer have a smoother column. Six
 // Gaussian samples suffice there; ground rays keep twelve and limbs twenty.
 const float upperNodes[6]=float[6](.033765242898,.169395306767,.380690406958,.619309593042,.830604693233,.966234757102);
 const float upperWeights[6]=float[6](.085662246190,.180380786524,.233956967286,.233956967286,.180380786524,.085662246190);
 float along=dot(o,d);bool limb=dot(o,o)-along*along>.95;
 bool elevated=(length(o+d*end)-1.)*6371.>1.3;
 vec2 viewDepth=vec2(0.);vec3 sumR=vec3(0.),sumM=vec3(0.);
 for(int i=0;i<20;i++){
  if(!limb&&i>=(elevated?6:12))break;
  float stepSize=(end-start)*(limb?.05:elevated?upperWeights[i]:weights[i]);
  float distance=start+(end-start)*(limb?(float(i)+.5)*.05:elevated?upperNodes[i]:nodes[i]);
  vec3 p=o+d*distance;float h=max(0.,(length(p)-1.)*6371.);
  vec2 density=exp(-vec2(h/8.,h/1.2));vec2 segment=density*stepSize*6371.;viewDepth+=segment;
  float horizon=-sqrt(max(0.,1.-1./dot(p,p)));
  float sunlightFraction=smoothstep(horizon-.00465,horizon+.00465,dot(normalize(p),sun));
  vec2 lightDepth=airSunDepth(h,dot(normalize(p),sun));
  vec3 attenuation=airTransmission(viewDepth-segment*.5+lightDepth);
  sumR+=attenuation*segment.x*sunlightFraction;sumM+=attenuation*segment.y*sunlightFraction;
 }
 transmittance=airTransmission(viewDepth);
 float mu=dot(d,sun);float phaseR=.0596831*(1.+mu*mu);float g=.76;
 float phaseM=.0795775*(1.-g*g)/pow(max(.01,1.+g*g-2.*g*mu),1.5);
 // Surface diffuse radiance is albedo * cos(sun), i.e. solar irradiance / pi.
 // Phase functions integrate to one over solid angle, so scattering uses pi
 // in those same units. The old factor of seven over-brightened the air.
 scatter=(sumR*airRayleigh*phaseR+sumM*airMie*phaseM)*3.141592654;
 #endif
 }
 
 // Expand spherical UV coordinates only over a short, pole-safe Sun path.
 // Samples share one exact midpoint map and its first two derivatives.
 bool cloudSunMap(vec3 q,vec3 sunSpan,float sunEnd,out vec2 midUV,out vec2 uvSlope,out vec2 uvCurve){
  midUV=vec2(0.);uvSlope=vec2(0.);uvCurve=vec2(0.);
  float polarLimit=min(length(q.xz),length((q+sunSpan).xz));
  if(polarLimit<.05||sunEnd>=.04*polarLimit)return false;
  vec3 mid=q+sunSpan*.5;
  float polar2=dot(mid.xz,mid.xz),radial2=dot(mid,mid),polar=sqrt(polar2);
  float azimuth=mid.z*sunSpan.x-mid.x*sunSpan.z;
  float polarSlope=dot(mid.xz,sunSpan.xz),radialSlope=dot(mid,sunSpan);
  midUV=vec2(atan(mid.z,-mid.x)/6.283185307+rotation,asin(clamp(mid.y/sqrt(radial2),-1.,1.))/3.141592654+.5);
  float latitudeSlope=(polar2*sunSpan.y-mid.y*polarSlope)/(polar*radial2);
  uvSlope=vec2(azimuth/polar2/6.283185307,latitudeSlope/3.141592654);
  uvCurve=vec2(-2.*azimuth*polarSlope/(polar2*polar2)/6.283185307,(-mid.y*azimuth*azimuth/(polar2*polar*radial2)-2.*radialSlope*latitudeSlope/radial2)/3.141592654);
  return true;
 }
 // One reconstruction of cloud top and vertical optical depth for both rays.
 vec2 cloudColumn(float weather){
  return vec2(2.7+smoothstep(.55,.95,weather)*6.3,-log(max(.025,1.-smoothstep(.025,.99,weather))));
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
 float cloudSegment(vec2 uv,float ha,float hb,float segmentKm,float lod){
  if(min(ha,hb)>=9.||max(ha,hb)<=1.4)return 0.;
  float weather=texture2DLodEXT(cloudMap,uv,lod).r;
  if(weather<=.025)return 0.;
  vec2 column=cloudColumn(weather);float top=column.x,width=top-1.4;
  // The complete sunlight segment lies above this column.
  if(min(ha,hb)>=top)return 0.;
  float la=(ha-1.4)/width,lb=(hb-1.4)/width,dh=hb-ha;
  float average;
  if(min(la,lb)>=.14&&max(la,lb)<=.60)average=1./width;
  else if(abs(dh)<.01){float l=(la+lb)*.5;average=smoothstep(0.,.14,l)*(1.-smoothstep(.60,1.,l))/width;}
  else average=(cloudProfileIntegral(lb)-cloudProfileIntegral(la))/dh;
  return max(0.,average)*column.y/.73*segmentKm;
 }


 // Daytime, single-Rayleigh-scattered sky irradiance. Integrate the analytic
 // plane-parallel path over a hemisphere; azimuth is averaged exactly and
 // six Gaussian elevations resolve the remaining integral. Reuse the shared
 // vertical air columns. Curved twilight and air/cloud multiple scattering
 // are outside this approximation; it supplies no light below the horizon.
 vec3 airSkyIrradiance(float height,float muSun){
  if(muSun<=0.)return vec3(0.);
  vec2 column=airSunDepth(height,1.);
  vec3 rayleigh=airRayleigh*column.x,tau=rayleigh+airMie*1.1*column.y;
  vec3 direct=exp(-tau/muSun),sum=vec3(0.);
  const float nodes[6]=float[6](.033765242898,.169395306767,.380690406958,.619309593042,.830604693233,.966234757102);
  const float weights[6]=float[6](.085662246190,.180380786524,.233956967286,.233956967286,.180380786524,.085662246190);
  for(int i=0;i<6;i++){
   float mu=nodes[i],difference=muSun-mu;
   // The coincident-direction limit avoids cancellation at a quadrature node.
   vec3 path=abs(difference)<.001?tau/mu*exp(-tau/mu):muSun/difference*(direct-exp(-tau/mu));
   float phase=.375*(1.+mu*mu*muSun*muSun+.5*(1.-mu*mu)*(1.-muSun*muSun));
   sum+=path*phase*mu*weights[i];
  }
  return sum*rayleigh/max(tau,vec3(.000001));
 }
 varying vec3 vLocal;float cloudLod;float cloudFineLod;vec2 cloudFootprint;vec2 cloudSize;
 vec2 sphereHit(vec3 o,vec3 d,float r){float b=dot(o,d),q=b*b-dot(o,o)+r*r;if(q<0.)return vec2(1e8,-1e8);float h=sqrt(q);return vec2(-b-h,-b+h);}
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
 vec2 cloudColumnSegment(float weather,float ha,float hb,float segmentKm){
  if(min(ha,hb)>=9.||max(ha,hb)<=1.4)return vec2(0.,.5);
  if(weather<=.025)return vec2(0.,.5);
  vec2 column=cloudColumn(weather);float top=column.x,width=top-1.4;
  if(min(ha,hb)>=top)return vec2(0.,.5);
  float la=(ha-1.4)/width,lb=(hb-1.4)/width,dh=hb-ha,average,sampleFraction=.5;
  if(min(la,lb)>=.14&&max(la,lb)<=.60)average=1./width;
  else if(abs(dh)<.01){float l=(la+lb)*.5;average=smoothstep(0.,.14,l)*(1.-smoothstep(.60,1.,l))/width;}
  else{
   vec2 integrated=cloudProfileStatistics(lb)-cloudProfileStatistics(la);
   float integral=integrated.x;
   average=integral/dh;
   if(abs(integral)>.000001){
    float meanLayer=integrated.y/integral;
    sampleFraction=clamp((1.4+width*meanLayer-ha)/dh,0.,1.);
   }
  }
  return vec2(max(0.,average)*column.y/.73*segmentKm,sampleFraction);
 }
 // At a resolved grazing view, use the existing two weather reads along
 // the ray instead of averaging them into one constant vertical column.
 // Their optical-depth-weighted centroid still receives one lighting sample.
 vec2 cloudViewSegment(vec3 m,vec3 span,float ha,float hb,float segmentKm){
  if(min(ha,hb)>=9.||max(ha,hb)<=1.4)return vec2(0.,.5);
  float r=length(m),polar2=dot(m.xz,m.xz),polar=sqrt(polar2);
  vec2 uv=vec2(atan(m.z,-m.x)/6.283185307+rotation,asin(clamp(m.y/r,-1.,1.))/3.141592654+.5);
  float detail=(1.-smoothstep(.2,.35,abs(dot(m,span))/(r*length(span))))*(1.-smoothstep(0.,1.,cloudFineLod));
  if(polar<.05||length(span)>=.04*polar)detail=0.;
  vec2 offset=cloudFootprint;
  if(detail>0.){
   float azimuth=(m.z*span.x-m.x*span.z)/polar2;
   float latitude=(polar2*span.y-m.y*dot(m.xz,span.xz))/(polar*r*r);
   offset=mix(offset,vec2(azimuth/6.283185307,latitude/3.141592654)*.25,detail);
  }
  float a=texture2DLodEXT(cloudMap,uv-offset,cloudFineLod).r,b=texture2DLodEXT(cloudMap,uv+offset,cloudFineLod).r;
  vec2 coarse=vec2(0.);
  if(detail<1.)coarse=cloudColumnSegment((a+b)*.5,ha,hb,segmentKm);
  if(detail<=0.)return coarse;
  float hm=(r-1.)*6371.;
  vec2 nearPart=cloudColumnSegment(a,ha,hm,segmentKm*.5),farPart=cloudColumnSegment(b,hm,hb,segmentKm*.5);
  vec2 integral=vec2(nearPart.x+farPart.x,.5*(nearPart.x*nearPart.y+farPart.x*(farPart.y+1.)));
  integral=mix(vec2(coarse.x,coarse.x*coarse.y),integral,detail);
  return vec2(integral.x,integral.x>0.?integral.y/integral.x:.5);
 }
 float hg(float g,float mu){return(1.-g*g)/pow(max(.02,1.+g*g-2.*g*mu),1.5);}
 void main(){
 #include <logdepthbuf_fragment>
 cloudSize=vec2(textureSize(cloudMap,0));
 vec3 o=localCamera/vec3(1.,flatten,1.),point=vLocal*1.00143/vec3(1.,flatten,1.);
 vec3 sampleN=normalize(point);vec2 sampleUV=vec2(atan(sampleN.z,-sampleN.x)/6.283185307,asin(clamp(sampleN.y,-1.,1.))/3.141592654);
 // Take derivatives before ray branches and unwrap the longitude seam.
 vec2 dx=dFdx(sampleUV),dy=dFdy(sampleUV);dx.x-=floor(dx.x+.5);dy.x-=floor(dy.x+.5);
 dx*=cloudSize;dy*=cloudSize;
 float major=max(length(dx),length(dy)),minor=min(length(dx),length(dy));
 cloudLod=max(0.,log2(major));cloudFineLod=max(0.,log2(max(minor,major*.5)));
 cloudFootprint=(length(dx)>length(dy)?dx:dy)/cloudSize*.25;
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
 vec2 footprint=axis*sqrt(max(0.,major2-mipWidth*mipWidth)/12.)/cloudSize;
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
 float split=lowerHit.y<0.?mix(begin,end,.4):clamp(lowerHit.x,begin,end),through=1.,cloudDistance=0.;vec3 radiance=vec3(0.);
 // A long, resolved slant ray crosses many lateral weather texels. Allocate
 // up to two samples per resolved texel, with a bounded 64-step total. Wide
 // views use coarser mip footprints and retain the original 8 + 12 minimum.
 vec3 firstN=normalize(o+d*begin),lastN=normalize(o+d*end);
 vec2 travel=vec2((atan(lastN.z,-lastN.x)-atan(firstN.z,-firstN.x))/6.283185307,(asin(clamp(lastN.y,-1.,1.))-asin(clamp(firstN.y,-1.,1.)))/3.141592654);
 travel.x-=floor(travel.x+.5);
 float sampleDensity=2.*length(travel*cloudSize)/(exp2(cloudFineLod)*max(end-begin,.00000001));
 int upperSteps=int(clamp(ceil(sampleDensity*(split-begin)),8.,32.));
 int lowerSteps=int(clamp(ceil(sampleDensity*(end-split)),12.,32.));
 vec2 intervalStep=vec2((split-begin)/float(upperSteps),(end-split)/float(lowerSteps));
 vec2 intervalKm=intervalStep*6371.;
 float phase=.48+.20*hg(.55,dot(d,sun))+.13*hg(-.25,dot(d,sun));
 float previousViewHeight=(length(o+d*begin)-1.)*6371.;
 float sunlightFootprint=exp2(cloudLod),skyWeight=0.;
 for(int i=0;i<64;i++){
  if(i>=upperSteps+lowerSteps)break;
  float stepSize=i<upperSteps?intervalStep.x:intervalStep.y;if(stepSize<.00000001)continue;
  float stepKm=i<upperSteps?intervalKm.x:intervalKm.y;
  float t=i<upperSteps?begin+(float(i)+.5)*stepSize:split+(float(i-upperSteps)+.5)*stepSize;
  vec3 q=o+d*t;float nextViewHeight=(length(o+d*(t+stepSize*.5))-1.)*6371.;
  vec2 segment=cloudViewSegment(q,d*stepSize,previousViewHeight,nextViewHeight,stepKm);
  previousViewHeight=nextViewHeight;
  if(segment.x>.0001*stepKm){
   q+=d*stepSize*(segment.y-.5);
   float radius=length(q),height=max(0.,(radius-1.)*6371.),mu0=dot(q/radius,sun);
   float horizon=-sqrt(max(0.,1.-1./(radius*radius))),visible=smoothstep(horizon-.00465,horizon+.00465,mu0);
   float opacity=1.-exp(-segment.x);
   cloudDistance+=through*opacity*(t+stepSize*(segment.y-.5));
   // Extinction still applies on the night side; sunlight work only contributes
   // where the solar disc is above the local horizon.
   if(visible>0.){
    float sunEnd=sphereHit(q,sun,1.00143).y;float sunDepth=0.;
    vec3 sunSpan=sun*sunEnd;vec2 midUV,uvSlope,uvCurve;
    bool localMap=cloudSunMap(q,sunSpan,sunEnd,midUV,uvSlope,uvCurve);
    float previousHeight=height;
    // Resolve long, visible shadow paths against the weather-map footprint.
    // Start with four segments; resolved slant lighting uses at most six.
    float sunTexels=localMap?length(uvSlope*cloudSize):sunEnd*cloudSize.x/(6.283185307*max(.05,min(length(q.xz),length((q+sunSpan).xz))));
    int sunSteps=int(clamp(ceil(2.*sunTexels/sunlightFootprint),4.,6.));
    float sunStep=1./float(sunSteps);
    #pragma unroll_loop_start
    for(int i=0;i<6;i++){
     if(UNROLLED_LOOP_INDEX<sunSteps){
     float a=float(UNROLLED_LOOP_INDEX)*sunStep,b=(float(UNROLLED_LOOP_INDEX)+1.)*sunStep;a*=a;b*=b;
     float nextHeight=(length(q+sun*sunEnd*b)-1.)*6371.;
     float fraction=(a+b)*.5;vec2 uv;
     if(localMap){float f=fraction-.5;uv=midUV+f*(uvSlope+f*.5*uvCurve);}
     else{vec3 m=q+sunSpan*fraction;uv=vec2(atan(m.z,-m.x)/6.283185307+rotation,asin(clamp(m.y/length(m),-1.,1.))/3.141592654+.5);}
     sunDepth+=cloudSegment(uv,previousHeight,nextHeight,sunEnd*6371.*(b-a),cloudLod);
     previousHeight=nextHeight;
     }
    }
    #pragma unroll_loop_end
    vec3 solar=airTransmission(airSunDepth(height,mu0));
    float lighting=visible*(phase*exp(-sunDepth)+.30*exp(-sunDepth*.18));
    radiance+=through*opacity*solar*lighting*1.18;
    // Approximate overhead cloud shielding with this segment's vertical depth.
    skyWeight+=through*opacity*exp(-sunDepth*max(mu0,0.)*.18);
   }
   through*=1.-opacity;
   if(through<.008)break;
  }
 }
 float alpha=1.-through;if(alpha<.0001)discard;
 // Composite clouds over clear air at their own representative depth. Air
 // behind an opaque cloud contributes neither extinction nor visible haze.
 // Reuse the representative cloud depth for the slowly varying sky field.
 vec3 centre=o+d*(cloudDistance/alpha);
 radiance+=airSkyIrradiance(max(0.,(length(centre)-1.)*6371.),dot(normalize(centre),sun))*skyWeight;
 vec3 frontScatter,frontTransmission;
 airTransport(o,d,sun,cloudDistance/alpha,frontScatter,frontTransmission);
 radiance=radiance*frontTransmission+alpha*frontScatter;
 gl_FragColor=vec4(radiance/alpha,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }