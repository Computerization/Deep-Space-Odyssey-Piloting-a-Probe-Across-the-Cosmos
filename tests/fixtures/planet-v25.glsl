
 #include <logdepthbuf_pars_fragment>
 uniform sampler2D surfaceMap;uniform sampler2D reliefNormal;uniform sampler2D reliefHeight;uniform float reliefShadows;uniform float lunar; uniform sampler2D ringMap; uniform sampler2D cloudMap;
 uniform vec3 sunlight; uniform vec3 localSun; uniform float hasMap; uniform float hasRings;
 uniform float earth; uniform float haze; uniform float giant; uniform float renderRadius; uniform float rotation; uniform float saturation;uniform float surfaceGain;uniform float centricMap;
 uniform vec4 occluder;uniform float sunAngle;uniform float flatten;uniform sampler2D ringIrradiance;
 
 float ringDepth(float r,float a){
  float occupied=smoothstep(.015,.10,a),tau=0.;
  if(r<1.526)tau=.35*pow(clamp(a/.45,0.,1.),1.4);
  else if(r<1.950)tau=mix(.4,2.5,smoothstep(.55,.97,a));
  else if(r<2.030)tau=.10*pow(clamp(a/.45,0.,1.),2.);
  else if(r<2.270)tau=mix(.4,1.,smoothstep(.45,.80,a));
  tau*=occupied;
  return tau+.05*exp(-.5*pow((r-2.320)/.00045,2.));
 }

 varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition; varying vec3 vLocal;
 void main(){
 #include <logdepthbuf_fragment>
 vec2 uv=vec2(vUv.x+rotation,mix(vUv.y,asin(clamp(normalize(vLocal).y,-1.,1.))/3.141592654+.5,centricMap));
 vec3 tex=mix(vec3(.64,.43,.19),texture2D(surfaceMap,uv).rgb,hasMap);
 float lum=dot(tex,vec3(.2126,.7152,.0722));tex=mix(vec3(lum),tex,saturation);
 vec3 n=normalize(vNormal); vec3 view=normalize(-vPosition);
 if(lunar>.5){
  vec3 mapped=texture2D(reliefNormal,uv).xyz*2.-1.;
  vec3 q0=dFdx(vPosition),q1=dFdy(vPosition);vec2 t0=dFdx(vUv),t1=dFdy(vUv);
  vec3 p0=cross(q1,n),p1=cross(n,q0);
  vec3 tangent=p0*t0.x+p1*t1.x,bitangent=p0*t0.y+p1*t1.y;
  tangent*=inversesqrt(max(dot(tangent,tangent),1.e-16));bitangent*=inversesqrt(max(dot(bitangent,bitangent),1.e-16));
  n=normalize(tangent*mapped.x+bitangent*mapped.y+n*mapped.z);
 }
 float mu=max(dot(n,view),.0001); float mu0=max(dot(n,sunlight),0.);
 // Diffuse reflection with gentle limb darkening; no camera-facing fill light.
 float light=mix(.78*pow(mu0,.84)+.22*mu0/(mu+mu0+.0001),pow(mu0,.78)*pow(mu,.13),giant);
 // Lunar-Lambert mixture for a rough, airless regolith. Parameters are a
 // visual approximation; the normal map and silhouette use measured LOLA relief.
 if(lunar>.5)light=.25*mu0+.75*2.*mu0/(mu+mu0+.0001);
 // A low-altitude cloud shell shades the ground along the actual solar direction.
 vec3 localN=normalize(vLocal),east=normalize(vec3(localN.z,0.,-localN.x));
 vec3 north=cross(localN,east);float solarElevation=max(.08,dot(localN,localSun));
 vec2 solarUV=vec2(dot(localSun,east)/(6.2831853*max(.12,length(localN.xz))),dot(localSun,north)/3.14159265);
 float shadow=1.;
 // Trace sunlight over the measured radial height field. The offsets use km;
 // spherical curvature and finite solar size determine the horizon and penumbra.
 if(lunar>.5 && reliefShadows>.5 && dot(localN,localSun)<.5 && mu0>.001){
  float originHeight=texture2D(reliefHeight,uv).r*21.-10.;
  vec3 origin=localN*(1.+(originHeight+.07)/1737.4);
  float stepKm=.9;
  for(int i=0;i<14;i++){
   vec3 samplePoint=origin+localSun*(stepKm/1737.4),direction=normalize(samplePoint);
   vec2 terrainUV=vec2(atan(direction.z,-direction.x)/6.283185307,asin(clamp(direction.y,-1.,1.))/3.141592654+.5);
   float height=texture2D(reliefHeight,terrainUV).r*21.-10.;
   float clearance=(length(samplePoint)-1.)*1737.4-height;
   float softness=max(.045,stepKm*sunAngle);
   shadow=min(shadow,smoothstep(-softness,softness,clearance));
   stepKm*=1.5;
  }
 }
 if(hasRings>.5 && abs(localSun.y)>.00001){
 float t=-vLocal.y/localSun.y;
 vec3 hit=vLocal+localSun*t;float r=length(hit.xz);
 // Integrate the pixel footprint independently of the finite-Sun penumbra.
 // A mip average of opacity cannot be exponentiated into mean transmission.
 float dx=dFdx(r),dy=dFdy(r),sunWidth=abs(t)*sunAngle/max(abs(localSun.y),.05);
 float reach=.5*(abs(dx)+abs(dy))+2.*sunWidth;
 if(t>0. && r+reach>=1.235 && r-reach<=2.32){
  float transmitted=0.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
   float pixelR=r+(float(x)*dx+float(y)*dy)*.3872983346;
   float pixelWeight=(x==0?8./18.:5./18.)*(y==0?8./18.:5./18.);
   for(int tap=-2;tap<=2;tap++){
    float sampleR=pixelR+float(tap)*sunWidth;
    float a=texture2DLodEXT(ringMap,vec2(clamp((sampleR-1.235)/1.085,0.,1.),.5),0.).a;
    float tau=sampleR>=1.235&&sampleR<=2.32?ringDepth(sampleR,a):0.;
    float weight=tap==0?.4:abs(tap)==1?.24:.06;
    transmitted+=pixelWeight*weight*exp(-tau/max(.025,abs(localSun.y)));
   }
  }
  shadow=transmitted;
 }
 }
 if(occluder.w>0.){vec3 delta=occluder.xyz-vLocal;float along=dot(delta,localSun);if(along>0.){float separation=length(delta-localSun*along);float penumbra=max(.0002,along*sunAngle);shadow*=smoothstep(max(0.,occluder.w-penumbra),occluder.w+penumbra,separation);}}
 if(earth>.5){float cover=texture2D(cloudMap,uv).r;float height=2.7+smoothstep(.55,.95,cover)*6.3;float cl=texture2D(cloudMap,uv+solarUV*(height*.7/6371.)/solarElevation).r;shadow*=exp(log(max(.025,1.-smoothstep(.025,.99,cl)))/solarElevation);}
 vec3 indirect=vec3(0.);
 if(hasRings>.5){
  vec2 ringUV=vec2(atan(vLocal.z,vLocal.x)/6.283185307+.5,(asin(clamp(vLocal.y/flatten,-1.,1.))/3.141592654+.5)*32./33.+.5/33.);
  indirect=texture2D(ringIrradiance,ringUV).rgb;
 }
 float fill=hasRings>.5?0.:(1.-shadow)*giant*.035;
 vec3 color=tex*((vec3(light*(shadow+fill))+indirect)*surfaceGain+.0006);
 if(earth>.5){
  float ocean=smoothstep(.015,.065,tex.b-max(tex.r,tex.g*.82));
  vec3 h=normalize(sunlight+view);float nh=max(dot(n,h),0.),vh=max(dot(view,h),0.);
  // Isotropic Cox–Munk slope distribution; representative 5 m/s wind.
  float mss=.003+.00512*5.,nh2=max(nh*nh,.0001);
  float D=exp(-(1.-nh2)/(mss*nh2))/(3.14159265*mss*nh2*nh2);
  float k=.08,G=mu/(mu*(1.-k)+k)*mu0/(mu0*(1.-k)+k);
  float F=.0204+.9796*pow(1.-vh,5.);
  color+=vec3(1.,.97,.91)*D*G*F/(4.*max(mu,.03))*ocean*shadow;
 }
 if(haze>.5){float polar=smoothstep(.62,.95,abs(localN.y));color*=mix(vec3(1.),vec3(.82,.84,.84),polar);}
 gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }