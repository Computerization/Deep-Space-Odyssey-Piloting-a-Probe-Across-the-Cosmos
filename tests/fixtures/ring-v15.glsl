
 #include <logdepthbuf_pars_fragment>
 uniform sampler2D ringMap;uniform vec3 localSun;uniform vec3 localCamera;uniform float sunAngle;varying vec3 vLocal;
 
 float ringDepth(float r,float a){
  float occupied=smoothstep(.015,.10,a),tau=0.;
  if(r<1.526)tau=.35*pow(clamp(a/.45,0.,1.),1.4);
  else if(r<1.950)tau=mix(.4,2.5,smoothstep(.55,.97,a));
  else if(r<2.030)tau=.10*pow(clamp(a/.45,0.,1.),2.);
  else if(r<2.270)tau=mix(.4,1.,smoothstep(.45,.80,a));
  tau*=occupied;
  return tau+.05*exp(-.5*pow((r-2.320)/.00045,2.));
 }

 void main(){
 #include <logdepthbuf_fragment>
 float r=length(vLocal.xz),u=(r-1.235)/1.085;
 vec4 tex=texture2D(ringMap,vec2(clamp(u,0.,1.),.5));
 vec3 q=vLocal/vec3(1.,.902,1.),d=localSun/vec3(1.,.902,1.);
 vec3 direction=normalize(d);float along=-dot(q,direction),separation=length(q+direction*along);
 float penumbra=max(fwidth(separation)*.7,abs(along)*sunAngle/.95);
 float sh=along>0.?smoothstep(1.-penumbra,1.+penumbra,separation):1.;
 float mu=max(.015,abs(normalize(localCamera-vLocal).y)),mu0=max(.015,abs(localSun.y));
 float tau=ringDepth(r,tex.a);
 float opacity=1.-exp(-tau/mu);
 float reflection=mu0/(mu+mu0)*(1.-exp(-tau*(1./mu+1./mu0)));
 float transmission=abs(mu-mu0)<.002?(tau/mu)*exp(-tau/mu):mu0/(mu-mu0)*(exp(-tau/mu)-exp(-tau/mu0));
 vec3 source=vec3(tex.r*1.08,tex.g*1.04,min(tex.b,tex.g));
 vec3 albedo=r>2.27?vec3(.54,.52,.48):clamp(source*2.6,vec3(0.),vec3(.85));
 float phase=.86+.28*pow(max(0.,dot(normalize(localCamera-vLocal),localSun)),6.);
 float energy=localCamera.y*localSun.y>0.?reflection*2.3:max(0.,transmission)*1.8;
 // Weak planet-shine provides the only illumination inside the globe's shadow.
 // energy already includes the optical-depth integral. Straight-alpha
 // compositing must not attenuate that radiance a second time.
 gl_FragColor=vec4(albedo*(energy*phase*sh+.0015*opacity/(r*r))/max(opacity,.0001),opacity);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }