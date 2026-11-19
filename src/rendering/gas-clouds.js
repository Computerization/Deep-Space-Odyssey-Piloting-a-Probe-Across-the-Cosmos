import {boundedCubic} from './texture-sampling.js';
import {RING_SHADOW_RANGE} from './ringshine.js';
// A thin, optically participating upper cloud deck above the mapped deep
// atmosphere. Heights are a visual reconstruction, not measured topography.
// Keep its kilometre scale; do not enlarge the clouds to make a rocky planet.
export const gasCloudCoordinates=`
 uniform float cloudTime,planetRadius;
 // Normalized semi-infinite scattering approximation. The H factors account
 // for repeated scattering; the former bare single-scatter ratio made an
 // oblique illuminated limb brighter than the cloud face by too much.
 // The effective albedo is illustrative, not a spectral retrieval.
 float gasReflection(float mu0,float mu){
  const float gamma=.22360679775;
  float h0=(1.+2.*mu0)/(1.+2.*gamma*mu0),h=(1.+2.*mu)/(1.+2.*gamma*mu);
  float zenith=3./(1.+2.*gamma);
  return .75*(2.*mu0*h0*h/((mu+mu0+.0001)*zenith*zenith))+.25*mu0;
 }
 vec2 gasWeatherUV(vec2 uv){
  // Differential zonal flow, up to 120 m/s. Global rotation is applied by the
  // caller. This remains physical time, so storms do not race across the globe.
  float latitude=(uv.y-.5)*3.141592654;
  uv.x+=cloudTime*.12/(6.283185307*planetRadius)*cos(latitude)*sin(latitude*14.);
  return uv;
 }
`;
export const gasCloudFragment=`
 #include <logdepthbuf_pars_fragment>
 uniform sampler2D surfaceMap;
 uniform sampler2D ringShadow,ringIrradiance;
 uniform vec3 localCamera,localSun;
 uniform float rotation,flatten,surfaceGain,saturation,hasRings,graphicMap;
 varying vec3 vLocal;
 ${gasCloudCoordinates}
 ${boundedCubic}
 vec2 shellHit(vec3 o,vec3 d,float r){float b=dot(o,d),q=b*b-dot(o,o)+r*r;if(q<0.)return vec2(1e8,-1e8);float h=sqrt(q);return vec2(-b-h,-b+h);}
 vec2 weatherUV(vec3 q){vec3 n=normalize(q/vec3(1.,graphicMap>.5?flatten:1.,1.));return gasWeatherUV(vec2(atan(n.z,-n.x)/6.283185307+rotation,asin(clamp(n.y,-1.,1.))/3.141592654+.5));}
 float density(vec3 color,float height){
  float brightness=dot(color,vec3(.2126,.7152,.0722));
  float ceiling=mix(18.,72.,smoothstep(.10,.55,brightness));
  float layer=height/max(ceiling,1.);
  return .055*smoothstep(0.,.15,layer)*(1.-smoothstep(.60,1.,layer));
 }
 void main(){
  #include <logdepthbuf_fragment>
  float radius=planetRadius,top=1.+90./radius;
  vec3 axis=vec3(1.,flatten,1.),o=localCamera/axis,d=normalize(vLocal*top/axis-o),sun=normalize(localSun/axis);
  vec2 uv=weatherUV(vLocal/axis),size=vec2(textureSize(surfaceMap,0));
  vec2 dx=dFdx(uv),dy=dFdy(uv);dx.x-=floor(dx.x+.5);dy.x-=floor(dy.x+.5);
  float footprint=max(length(dx*size),length(dy*size));
  float lod=max(0.,log2(footprint));
  // Sample visible colour anisotropically; a grazing ray must not blur the
  // short axis to the long axis's mip level. Magnified pixels use the same
  // bounded reconstruction as the underlying map, without sharpening halos.
  float reconstruct=1.-smoothstep(.65,1.,footprint);
  // Resolved image features supply cloud structure. Do not cover the source
  // with random grain: fine texture below its resolution remains unknown.
  float ringLod=max(0.,log2(max(length(dFdx(vLocal)),length(dFdy(vLocal)))*float(textureSize(ringShadow,0).x)/${RING_SHADOW_RANGE.span}));
  vec2 hit=shellHit(o,d,top),ground=shellHit(o,d,1.);float a=max(0.,hit.x),b=hit.y;
  if(ground.x>0.)b=min(b,ground.x);if(b<=a)discard;
  float stepSize=(b-a)/6.,through=1.;vec3 radiance=vec3(0.);
  for(int i=0;i<6;i++){
   vec3 q=o+d*(a+(float(i)+.5)*stepSize);float height=max(0.,(length(q)-1.)*radius);
   vec2 colorUV=weatherUV(q);
   vec3 color=textureGrad(surfaceMap,colorUV,dx,dy).rgb;
   if(reconstruct>0.)color=mix(color,boundedCubicSample(surfaceMap,colorUV,true).rgb,reconstruct);
   // Preserve Saturn's separately sampled polar imagery above the modelled deck.
   float polar=hasRings>.5?1.-smoothstep(.94,.98,abs(normalize(q).y)):1.;
   float tau=density(color,height)*stepSize*radius*polar,opacity=1.-exp(-tau);
   if(opacity>.0001){
    vec3 n=normalize(q/axis);float mu0=max(0.,dot(n,normalize(localSun))),mu=max(.001,dot(n,normalize(localCamera-q*axis)));
    // Sunward optical depth resolves cloud self-shadow with the same field.
    float end=shellHit(q,sun,top).y,shadowDepth=0.;
    for(int j=0;j<2;j++){
     vec3 s=q+sun*end*(float(j)+.5)*.5;float h=max(0.,(length(s)-1.)*radius);
     shadowDepth+=density(texture2DLodEXT(surfaceMap,weatherUV(s),lod).rgb,h)*end*radius*.5;
    }
    // Optically thick cloud reflection: a diffuse multiple-scattering term
    // and a single-scattering term, rather than a solid-surface highlight.
    float light=gasReflection(mu0,mu);
    // A diffuse multiple-scattering floor keeps thick clouds from looking
    // like hard terrain; the direct component carries the local self-shadow.
    float illumination=light*(.80+.20*exp(-shadowDepth));
    vec3 indirect=vec3(0.);
    if(hasRings>.5){
     vec3 physical=q*axis;
     float distance=-physical.y/localSun.y;
     if(abs(localSun.y)>.00001&&distance>0.){
      float r=length((physical+localSun*distance).xz);
      if(r>=1.235&&r<=2.323)illumination*=texture2DLodEXT(ringShadow,vec2((r-${RING_SHADOW_RANGE.start})/${RING_SHADOW_RANGE.span},.5),ringLod).r;
     }
     vec2 ringUV=vec2(atan(physical.z,physical.x)/6.283185307+.5,(asin(clamp(physical.y,-1.,1.))/3.141592654+.5)*32./33.+.5/33.);
     indirect=texture2D(ringIrradiance,ringUV).rgb;
    }
    float l=dot(color,vec3(.2126,.7152,.0722));color=mix(vec3(l),color,saturation);
    radiance+=through*opacity*color*((illumination+indirect)*surfaceGain+.0006);
    through*=1.-opacity;
    if(through<.015)break;
   }
  }
  if(through>.9999)discard;
  gl_FragColor=vec4(radiance/(1.-through),1.-through);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }
`;
