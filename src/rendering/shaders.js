import {gasCloudCoordinates} from './gas-clouds.js';
import {surfaceReconstruction} from './texture-sampling.js';
import {earthOptics,earthCloudDensity} from './earth-shaders.js';
import {RING_SHADOW_RANGE} from './ringshine.js';
import {BODY_DATA} from '../mission.js';
export {earthAtmosphereFragment,earthTransmittanceFragment,earthCloudCompositeFragment,cloudFragment,cloudPremultipliedFragment} from './earth-shaders.js';
// Planet surfaces, atmospheric scattering, rings and camera resolve.
export const vertex=`
 #include <common>
 #include <logdepthbuf_pars_vertex>
 varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition; varying vec3 vLocal;
 uniform float flatten;
 void main(){ vUv=uv; vec3 p=position*vec3(1.,flatten,1.);vLocal=p;
 vNormal=normalize(mat3(modelMatrix)*normalize(normal/vec3(1.,flatten,1.)));
 vPosition=(modelMatrix*vec4(p,1.)).xyz;
 gl_Position=projectionMatrix*viewMatrix*vec4(vPosition,1.);
 #include <logdepthbuf_vertex>
 }`;
// Approximate normal optical depths, calibrated to the NASA ring ranges.
// The source profile supplies structure within each named ring region.
const ringOptics=`
 float ringDepth(float r,float a){
  float occupied=smoothstep(.015,.10,a),tau=0.;
  if(r<1.526)tau=.35*pow(clamp(a/.45,0.,1.),1.4);
  else if(r<1.950)tau=mix(.4,2.5,smoothstep(.55,.97,a));
  else if(r<2.030)tau=.10*pow(clamp(a/.45,0.,1.),2.);
  else if(r<2.270)tau=mix(.4,1.,smoothstep(.45,.80,a));
  tau*=occupied;
  return tau+.05*exp(-.5*pow((r-2.320)/.00045,2.));
 }
`;
// One optical model for sunlight at the surface/clouds and air along the view.
// Columns are in km; the existing lookup stores molecular and aerosol density.
const groundShadowSamples=24;
// Stereographic caps avoid the longitude singularity that smears ordinary
// equirectangular mips at the poles. Both maps reproject the same source data.
const lunarPolarSurface=`
 void lunarPolarSurface(inout vec3 normal,inout vec3 colour){
  vec3 direction=normalize(vLocal);float hemisphere=direction.y<0.?-1.:1.;
  vec2 p=direction.xz/((1.+abs(direction.y))*.176326980708465);
  vec2 uv=vec2((p.x*.5+.5)*.5+(hemisphere<0.?.5:0.),p.y*.5+.5);
  // Evaluate gradients before the varying blend branch. The atlas is used
  // from 72–78 degrees, with room around each cap for ordinary mip filtering.
  vec2 dx=dFdx(uv),dy=dFdy(uv);
  float footprint=max(length(dx*vec2(2.,1.)),length(dy*vec2(2.,1.)));
  float blend=smoothstep(.951056516295,.978147600734,abs(direction.y))*(1.-smoothstep(.025,.05,footprint));
  if(blend>0.){
   vec2 xy=textureGrad(lunarPolarNormal,uv,dx,dy).rg*2.-1.;
   vec3 mapped=normalize(vec3(xy,max(0.,1.-abs(xy.x)-abs(xy.y))));
   mapped=normalize(mat3(modelMatrix)*vec3(mapped.x,hemisphere*mapped.z,mapped.y));
   normal=normalize(mix(normal,mapped,blend));
   colour=mix(colour,textureGrad(lunarPolarColor,uv,dx,dy).rgb,blend);
  }
 }
`;
// Cassini PIA21611: 375 image pixels at 78° planetographic latitude.
// Retain the publication's stereographic grid instead of compressing the cap
// into a few global-map rows. Calibration is recorded in saturn-polar-cap-source.json.
const saturnEccentricity=Math.sqrt(1-BODY_DATA.saturn.flatten**2),jetLatitude=78*Math.PI/180;
const saturnCapScale=375/1024/(Math.tan(Math.PI/4-jetLatitude/2)/((1-saturnEccentricity*Math.sin(jetLatitude))/(1+saturnEccentricity*Math.sin(jetLatitude)))**(saturnEccentricity/2));
const saturnPolarSurface=`
 vec3 saturnPolarSurface(vec3 colour){
  vec3 d=normalize(vLocal/vec3(1.,flatten,1.));
  float q=length(vec3(d.x*flatten,d.y,d.z*flatten)),s=d.y/q;
  float e=${saturnEccentricity},ratio=pow((1.-e*s)/(1.+e*s),e*.5);
  float scale=flatten/max(q+d.y,.001)/ratio*${saturnCapScale};
  float angle=rotation*6.283185307,c=cos(angle),a=sin(angle);
  vec2 uv=.5+vec2(-d.x*c-d.z*a,d.x*a-d.z*c)*scale;
  vec2 dx=dFdx(uv),dy=dFdy(uv);
  // Both images already contain the same Cassini field here. Explicit
  // gradients preserve filtering through the pole and the smooth boundary.
  float blend=smoothstep(.974370064785,.978147600734,s);
  if(blend>0.)colour=mix(colour,textureGrad(saturnPolarColor,uv,dx,dy).rgb,blend);
  return colour;
 }
`;
// Native terrain visibility shared by close-view rays and the filtered field.
// All height reads use explicit mip levels, including varying shadow branches.
export const lunarVisibility=`
 float lunarVisibility(vec3 localN){
  if(dot(localN,localSun)>=.5)return 1.;
  float shadow=1.;
  vec2 originUV=vec2(atan(localN.z,-localN.x)/6.283185307,asin(clamp(localN.y,-1.,1.))/3.141592654+.5);
  float originHeight=texture2DLodEXT(reliefHeight,originUV,0.).r*21.-10.;
  vec3 origin=localN*(1.+(originHeight+.07)/1737.4);
  float stepKm=.9;
  for(int i=0;i<48;i++){
   vec3 samplePoint=origin+localSun*(stepKm/1737.4),direction=normalize(samplePoint);
   vec2 terrainUV=vec2(atan(direction.z,-direction.x)/6.283185307,asin(clamp(direction.y,-1.,1.))/3.141592654+.5);
   float height=texture2DLodEXT(reliefHeight,terrainUV,0.).r*21.-10.;
   float clearance=(length(samplePoint)-1.)*1737.4-height;
   float softness=max(.045,stepKm*sunAngle);
   shadow=min(shadow,smoothstep(-softness,softness,clearance));
   if(shadow==0.)return 0.;
   stepKm*=1.118680564601;
  }
  return shadow;
 }
`;
export const fragment=`
 #include <logdepthbuf_pars_fragment>
 uniform sampler2D surfaceMap,surfacePatchMap;uniform vec4 surfacePatchRegion;uniform float surfacePatchWeight;uniform sampler2D waterMap;uniform sampler2D reliefNormal;uniform sampler2D reliefHeight;uniform float reliefShadows;uniform float lunar; uniform sampler2D ringMap; uniform sampler2D cloudMap;
 uniform sampler2D lunarPolarColor,lunarPolarNormal,saturnPolarColor,reliefVisibility;uniform float reliefVisibilityReady;uniform mat4 modelMatrix;
 uniform vec3 sunlight; uniform vec3 localSun; uniform float hasMap; uniform float hasRings;
 uniform float earth; uniform float giant; uniform float rotation; uniform float saturation;uniform float surfaceGain;uniform float graphicMap;
 uniform vec4 occluder;uniform float sunAngle;uniform float flatten;uniform sampler2D ringIrradiance;uniform sampler2D ringShadow;
 ${earthOptics}
 ${earthCloudDensity}
 ${gasCloudCoordinates}
 varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition; varying vec3 vLocal;
 ${lunarPolarSurface}
 ${saturnPolarSurface}
 ${lunarVisibility}
 ${surfaceReconstruction}
 void main(){
 #include <logdepthbuf_fragment>
 vec2 uv=vec2(vUv.x+rotation,mix(vUv.y,asin(clamp(normalize(vLocal/vec3(1.,flatten*flatten,1.)).y,-1.,1.))/3.141592654+.5,graphicMap));
 if(giant>.5)uv=gasWeatherUV(uv);
 // Gradients precede varying lighting branches; the field is only used
 // when terrain samples are smaller than a screen pixel.
 vec2 lunarDx=dFdx(uv),lunarDy=dFdy(uv);
 vec2 lunarSize=vec2(textureSize(reliefVisibility,0));
 float lunarFootprint=max(length(lunarDx*lunarSize),length(lunarDy*lunarSize));
 vec3 tex=mix(vec3(.64,.43,.19),sampleSurface(surfaceMap,uv),hasMap);
 if(earth>.5&&surfacePatchWeight>0.){
  vec2 patchUV=vec2(mod(uv.x-surfacePatchRegion.x+1.,1.),uv.y-surfacePatchRegion.y)/surfacePatchRegion.zw;
  float edge=min(min(patchUV.x,patchUV.y),min(1.-patchUV.x,1.-patchUV.y));
  if(edge>0.)tex=mix(tex,sampleSurface(surfacePatchMap,patchUV),surfacePatchWeight*smoothstep(0.,.02,edge));
 }
 if(hasRings>.5)tex=saturnPolarSurface(tex);
 float lum=dot(tex,vec3(.2126,.7152,.0722));tex=mix(vec3(lum),tex,saturation);
 vec3 n=normalize(vNormal); vec3 view=normalize(-vPosition);
 if(lunar>.5){
  vec2 xy=texture2D(reliefNormal,uv).rg*2.-1.;
  vec3 mapped=normalize(vec3(xy,max(0.,1.-abs(xy.x)-abs(xy.y))));
  vec3 q0=dFdx(vPosition),q1=dFdy(vPosition);vec2 t0=dFdx(vUv),t1=dFdy(vUv);
  vec3 p0=cross(q1,n),p1=cross(n,q0);
  vec3 tangent=p0*t0.x+p1*t1.x,bitangent=p0*t0.y+p1*t1.y;
  tangent*=inversesqrt(max(dot(tangent,tangent),1.e-16));bitangent*=inversesqrt(max(dot(bitangent,bitangent),1.e-16));
  n=normalize(tangent*mapped.x+bitangent*mapped.y+n*mapped.z);
  lunarPolarSurface(n,tex);
 }
 float mu=max(dot(n,view),.0001); float mu0=max(dot(n,sunlight),0.);
 // Diffuse reflection with gentle limb darkening; no camera-facing fill light.
 float light=gasReflection(mu0,mu);
 // The cloud-free Earth map supplies diffuse colour. Keep its published palette;
 // water reflection is a separate geographic material, independent of colour.
 if(earth>.5)light=mu0;
 // Lunar-Lambert mixture for a rough, airless regolith. Parameters are a
 // visual approximation; the normal map and silhouette use measured LOLA relief.
 if(earth<.5&&giant<.5){
  float diffuse=lunar>.5?.25:.35;
  light=diffuse*mu0+(1.-diffuse)*2.*mu0/(mu+mu0+.0001);
  // A bounded regolith phase approximation keeps grazing crescents from
  // staying as bright as a full disc. Source colour and measured relief stay intact.
  float phase=acos(clamp(dot(view,sunlight),-1.,1.));
  light*=exp(-.35*phase);
 }
 vec3 localN=normalize(vLocal);
 float shadow=1.;
 // Trace sunlight over the measured radial height field. The offsets use km;
 // spherical curvature and finite solar size determine the horizon and penumbra.
 if(lunar>.5 && reliefShadows>.5 && mu0>.001){
  float direct=reliefVisibilityReady>.5?1.-smoothstep(1.,2.,lunarFootprint):1.;
  if(direct<1.)shadow=textureGrad(reliefVisibility,uv,lunarDx,lunarDy).r;
  if(direct>0.)shadow=mix(shadow,lunarVisibility(localN),direct);
 }
 if(hasRings>.5 && abs(localSun.y)>.00001){
 float t=-vLocal.y/localSun.y;
 vec3 hit=vLocal+localSun*t;float r=length(hit.xz);
 // Integrate the pixel footprint and finite-Sun penumbra. The mip chain
 // averages transmitted light at this epoch's fixed solar elevation.
 float dx=dFdx(r),dy=dFdy(r),sunWidth=abs(t)*sunAngle/max(abs(localSun.y),.05);
 float reach=.5*(abs(dx)+abs(dy))+3.*sunWidth;
 if(t>0. && r+reach>=1.235 && r-reach<=2.323){
  float transmitted=0.;
  float lod=max(0.,log2(.4*sunWidth*float(textureSize(ringShadow,0).x)/${RING_SHADOW_RANGE.span}));
  for(int y=0;y<2;y++)for(int x=0;x<2;x++){
   float pixelR=r+((2.*float(x)-1.)*dx+(2.*float(y)-1.)*dy)*.2886751346;
   for(int tap=-4;tap<=4;tap++){
    float offset=float(tap)*(2./3.),sampleR=pixelR+offset*sunWidth;
    float light=texture2DLodEXT(ringShadow,vec2((sampleR-${RING_SHADOW_RANGE.start})/${RING_SHADOW_RANGE.span},.5),lod).r;
    float weight=exp(-.5*offset*offset)/3.75150095489;
    transmitted+=.25*weight*light;
   }
  }
  shadow=transmitted;
 }
 }
 if(occluder.w>0.){vec3 delta=occluder.xyz-vLocal;float along=dot(delta,localSun);if(along>0.){float separation=length(delta-localSun*along);float penumbra=max(.0002,along*sunAngle);shadow*=smoothstep(max(0.,occluder.w-penumbra),occluder.w+penumbra,separation);}}
 if(earth>.5){
  // Follow the same oblate-normalized density field as the visible clouds.
  // A spherical ray retains long low-Sun shadows without an elevation floor.
  vec3 axisScale=vec3(1.,flatten,1.),o=normalize(vLocal/axisScale),d=normalize(localSun/axisScale);
  float b=dot(o,d),start=-b+sqrt(b*b+pow(1.+1.4/earthRadius,2.)-1.);
  float end=-b+sqrt(b*b+1.00143*1.00143-1.);
  vec3 firstPoint=o+d*start,span=d*(end-start);vec2 centre,slope,curve;
  bool localMap=cloudSunMap(firstPoint,span,end-start,centre,slope,curve);
  if(!localMap){vec3 mid=normalize(firstPoint+span*.5);centre=vec2(atan(mid.z,-mid.x)/6.283185307+rotation,asin(clamp(mid.y,-1.,1.))/3.141592654+.5);}
  // Derivatives precede the pixel-varying day/night branch. Unwrap the seam.
  vec2 dx=dFdx(centre),dy=dFdy(centre);dx.x-=floor(dx.x+.5);dy.x-=floor(dy.x+.5);
  vec2 size=vec2(textureSize(cloudMap,0));
  float lod=max(-cloudPatchBias*cloudPatchWeight,log2(max(length(dx*size),length(dy*size))));
  if(mu0>0.){
   vec2 travel=slope;
   if(!localMap){
    vec3 first=normalize(firstPoint),last=normalize(o+d*end);
    travel=vec2((atan(last.z,-last.x)-atan(first.z,-first.x))/6.283185307,(asin(clamp(last.y,-1.,1.))-asin(clamp(first.y,-1.,1.)))/3.141592654);
    travel.x-=floor(travel.x+.5);
   }
   int steps=int(clamp(ceil(2.*length(travel*size)/exp2(lod)),6.,${groundShadowSamples}.));
   float depth=0.,stepSize=(end-start)/float(steps),ha=1.4;
   for(int i=0;i<${groundShadowSamples};i++){
    if(i>=steps)break;
    float distance=start+(float(i)+.5)*stepSize;
    vec2 cloudUV;
    if(localMap){float f=(float(i)+.5)/float(steps)-.5;cloudUV=centre+f*(slope+f*.5*curve);}
    else{vec3 dir=normalize(o+d*distance);cloudUV=vec2(atan(dir.z,-dir.x)/6.283185307+rotation,asin(clamp(dir.y,-1.,1.))/3.141592654+.5);}
    float hb=(length(o+d*(distance+stepSize*.5))-1.)*earthRadius;
    depth+=cloudSegment(cloudUV,ha,hb,stepSize*earthRadius,lod);ha=hb;
   }
   shadow*=exp(-depth);
  }
 }
 vec3 indirect=vec3(0.);
 if(hasRings>.5){
  vec2 ringUV=vec2(atan(vLocal.z,vLocal.x)/6.283185307+.5,(asin(clamp(vLocal.y/flatten,-1.,1.))/3.141592654+.5)*32./33.+.5/33.);
  indirect=texture2D(ringIrradiance,ringUV).rgb;
 }
 float fill=hasRings>.5?0.:(1.-shadow)*giant*.035;
 vec3 solar=vec3(1.);
 if(earth>.5){
  // Use the same oblate-to-spherical optical coordinates as the air/clouds.
  vec3 axisScale=vec3(1.,flatten,1.);
  solar=airTransmission(airSunDepth(0.,dot(normalize(vLocal/axisScale),normalize(localSun/axisScale))));
 }
 vec3 illumination=vec3(light*(shadow+fill));
 if(earth>.5)illumination*=solar;
 vec3 color=tex*((illumination+indirect)*surfaceGain+.0006);
 if(earth>.5){
  float ocean=texture2D(waterMap,uv).r;
  vec3 h=normalize(sunlight+view);float nh=max(dot(n,h),0.),vh=max(dot(view,h),0.);
  // Isotropic Cox–Munk slope distribution; representative 5 m/s wind.
  float mss=.003+.00512*5.,nh2=max(nh*nh,.0001);
  float D=exp(-(1.-nh2)/(mss*nh2))/(3.14159265*mss*nh2*nh2);
  float k=.08,G=mu/(mu*(1.-k)+k)*mu0/(mu0*(1.-k)+k);
  float F=.0204+.9796*pow(1.-vh,5.);
  // Same irradiance / pi radiance units as the Lambertian diffuse term.
  color+=solar*3.141592654*D*G*F/(4.*max(mu,.03))*ocean*shadow;
 }
 gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`;
// Single-scattering approximation in kilometres. Density falls with altitude;
// sunlight and view-path extinction are integrated separately.
// Visible-light reconstruction of Titan's absorbing lower haze and a much
// thinner detached upper layer. The ground remains obscured by optical depth.
export const titanAtmosphereFragment=`
 #include <logdepthbuf_pars_fragment>
 uniform vec3 localCamera;uniform vec3 localSun;uniform sampler2D opticalDepth;uniform float sunAngle;uniform vec4 occluder;
 varying vec3 vLocal;
 vec2 sphereHit(vec3 o,vec3 d,float r){float b=dot(o,d),q=b*b-dot(o,o)+r*r;if(q<0.)return vec2(1e8,-1e8);float h=sqrt(q);return vec2(-b-h,-b+h);}
 float hg(float g,float mu){return(1.-g*g)/pow(max(.02,1.+g*g-2.*g*mu),1.5);}
 void main(){
 #include <logdepthbuf_fragment>
 vec3 o=localCamera,d=normalize(vLocal*1.24-o),sun=normalize(localSun);
 vec2 hit=sphereHit(o,d,1.24),ground=sphereHit(o,d,1.);
 float begin=max(0.,hit.x),end=hit.y;if(ground.x>0.)end=min(end,ground.x);if(end<=begin)discard;
 // Draw the far shell so crossing the front shell or near plane cannot erase
 // the medium. Depth belongs to the ray's entrance, not the rasterized exit.
 #ifdef USE_LOGARITHMIC_DEPTH_BUFFER
 float exitDistance=max(length(vLocal*1.24-o),.000001);
 float entryDepth=max(0.,(vFragDepth-1.)*begin/exitDistance);
 gl_FragDepth=log2(1.+entryDepth)*logDepthBufFC*.5;
 #endif
 vec3 extinction=vec3(.060,.090,.150),upper=vec3(.000010,.000020,.000045);
 float stepSize=(end-begin)/32.;vec3 through=vec3(1.),radiance=vec3(0.);
 float phase=.62+.12*hg(.50,dot(d,sun));
 for(int i=0;i<32;i++){
  vec3 q=o+d*(begin+(float(i)+.5)*stepSize);float r=length(q),h=max(0.,(r-1.)*2574.7),mu0=dot(q/r,sun);
  vec2 density=vec2(exp(-h/65.),exp(-.5*pow((h-${BODY_DATA.titan.hazeLayer.toFixed(1)})/18.,2.)));
  vec2 lut=vec2(clamp((mu0+.7)/1.7,0.,1.),sqrt(clamp(h/(2574.7*.24),0.,1.)));
  vec2 column=texture2D(opticalDepth,(lut*vec2(511.,127.)+.5)/vec2(512.,128.)).rg;
  float horizon=-sqrt(max(0.,1.-1./(r*r))),visible=smoothstep(horizon-sunAngle,horizon+sunAngle,mu0);
  if(occluder.w>0.){vec3 delta=occluder.xyz-q;float along=dot(delta,sun);if(along>0.)visible*=smoothstep(occluder.w-along*sunAngle,occluder.w+along*sunAngle,length(delta-sun*along));}
  vec3 direct=exp(-extinction*column.x-upper*column.y);
  vec3 multiple=exp(-extinction*column.x*.20)*(.14*sqrt(max(mu0,0.)));
  vec3 coefficients=extinction*density.x+upper*density.y;
  vec3 segment=exp(-coefficients*stepSize*2574.7);
  vec3 albedo=(extinction*density.x*vec3(.95,.68,.38)+upper*density.y)/max(coefficients,vec3(.000001));
  // Voyager's visible-light views show a brighter southern hemisphere and
  // a darker northern hood. This smooth contrast follows Titan's actual pole,
  // rather than the scene's vertical axis; it is not a measured opacity map.
  float hood=1.-.08*smoothstep(-.12,.12,q.y/r)-.10*smoothstep(.80,.95,q.y/r);
  radiance+=through*(1.-segment)*albedo*(direct*phase+multiple)*visible*hood*1.4;
  through*=segment;if(max(max(through.r,through.g),through.b)<.001)break;
 }
 float alpha=clamp(1.-dot(through,vec3(.2126,.7152,.0722)),0.,1.);if(alpha<.00001)discard;
 gl_FragColor=vec4(radiance/alpha,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`;
export const ringFragment=`
 #include <logdepthbuf_pars_fragment>
 uniform sampler2D ringMap;uniform vec3 localSun;uniform vec3 localCamera;uniform float sunAngle;varying vec3 vLocal;
 ${ringOptics}
 // Shared single-scattering response: radiance gain and view opacity.
 vec2 ringSignal(float tau,float mu,float mu0,bool reflected){
  float t=exp(-tau/mu);
  float reflection=mu0/(mu+mu0)*(1.-exp(-tau*(1./mu+1./mu0)));
  float transmission=abs(mu-mu0)<.002?(tau/mu)*t:mu0/(mu-mu0)*(t-exp(-tau/mu0));
  return vec2(reflected?reflection*2.3:max(0.,transmission)*1.8,1.-t);
 }
 void main(){
 #include <logdepthbuf_fragment>
 vec3 q=vLocal/vec3(1.,.902,1.),d=localSun/vec3(1.,.902,1.);
 vec3 direction=normalize(d);float along=-dot(q,direction),separation=length(q+direction*along);
 float penumbra=max(fwidth(separation)*.7,abs(along)*sunAngle/.95);
 float sh=along>0.?smoothstep(1.-penumbra,1.+penumbra,separation):1.;
 float mu=max(.015,abs(normalize(localCamera-vLocal).y)),mu0=max(.015,abs(localSun.y));
 float phase=.86+.28*pow(max(0.,dot(normalize(localCamera-vLocal),localSun)),6.);
 vec3 dx=dFdx(vLocal),dy=dFdy(vLocal);
 float radius=length(vLocal.xz),a=abs(dFdx(radius)),b=abs(dFdy(radius));
 float fMix=smoothstep(.0009,.0018,a+b),u=(radius-1.235)/1.085;
 bool reflected=localCamera.y*localSun.y>0.;
 vec2 gradX=vec2(dFdx(u)/3.,0.),gradY=vec2(dFdy(u)/3.,0.);
 vec3 radiance=vec3(0.);float coverage=0.;
 // Integrate the radiance and transparency over a pixel's projected footprint.
 // Averaging source alpha before its exponential loses thin gaps and aliases
 // radial optical-depth boundaries when the rings approach an edge-on view.
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  vec3 samplePoint=vLocal+dx*(float(x)/3.)+dy*(float(y)/3.);
  float r=length(samplePoint.xz),sampleU=(r-1.235)/1.085;
  vec4 tex=textureGrad(ringMap,vec2(clamp(sampleU,0.,1.),.5),gradX,gradY);
  float tau=r>=1.235&&r<=2.323?ringDepth(r,tex.a):0.;
  vec2 light=ringSignal(tau,mu,mu0,reflected);
  vec3 albedo=r>2.27?vec3(.54,.52,.48):clamp(tex.rgb*2.6,vec3(0.),vec3(.85));
  float keep=r>2.27?1.-fMix:1.;
  radiance+=albedo*(light.x*phase*sh+.0015*light.y/(r*r))*keep;coverage+=light.y*keep;
 }
 coverage/=9.;radiance/=9.;
 // An unresolved F ring can fall between all nine pixel samples. Integrate
 // its narrow profile instead, weighted by the square pixel's radial footprint.
 // The sum of two uniform coordinates has this trapezoidal density.
 if(fMix>0.&&abs(radius-2.320)<.5*(a+b)+.0018){
  float major=max(max(a,b),1e-10),minor=max(min(a,b),1e-10);
  for(int i=0;i<16;i++){
   float x=(float(i)+.5)*.5-4.,r=2.320+x*.00045;
   float weight=max(0.,min(1./major,(.5*(major+minor)-abs(r-radius))/(major*minor)))*.000225*fMix;
   vec2 light=ringSignal(.05*exp(-.5*x*x),mu,mu0,reflected);
   radiance+=vec3(.54,.52,.48)*(light.x*phase*sh+.0015*light.y/(r*r))*weight;
   coverage+=light.y*weight;
  }
 }
 gl_FragColor=vec4(radiance/max(coverage,.0001),coverage);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`;
export const resolveFragment=`
 uniform sampler2D sceneColor;varying vec2 vUv;
 void main(){
  gl_FragColor=texture2D(sceneColor,vUv);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;
