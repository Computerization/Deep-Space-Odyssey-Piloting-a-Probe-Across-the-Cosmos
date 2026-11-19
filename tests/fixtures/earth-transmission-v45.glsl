
 #define TRANSMISSION_ONLY
 #include <logdepthbuf_pars_fragment>
 uniform vec3 localSun;uniform vec3 localCamera;uniform float flatten;
 varying vec3 vLocal;
 
 
 
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
  #ifndef TRANSMISSION_ONLY
  float horizon=-sqrt(max(0.,1.-1./dot(p,p)));
  float sunlightFraction=smoothstep(horizon-.00465,horizon+.00465,dot(normalize(p),sun));
  vec2 lightDepth=airSunDepth(h,dot(normalize(p),sun));
  vec3 attenuation=airTransmission(viewDepth-segment*.5+lightDepth);
  sumR+=attenuation*segment.x*sunlightFraction;sumM+=attenuation*segment.y*sunlightFraction;
  #endif
 }
 transmittance=airTransmission(viewDepth);
 #ifndef TRANSMISSION_ONLY
 float mu=dot(d,sun);float phaseR=.0596831*(1.+mu*mu);float g=.76;
 float phaseM=.0795775*(1.-g*g)/pow(max(.01,1.+g*g-2.*g*mu),1.5);
 // Surface diffuse radiance is albedo * cos(sun), i.e. solar irradiance / pi.
 // Phase functions integrate to one over solid angle, so scattering uses pi
 // in those same units. The old factor of seven over-brightened the air.
 scatter=(sumR*airRayleigh*phaseR+sumM*airMie*phaseM)*3.141592654;
 #endif
 }
 void main(){
 #include <logdepthbuf_fragment>
 vec3 o=localCamera/vec3(1.,flatten,1.);
 vec3 point=vLocal*1.018/vec3(1.,flatten,1.);
 vec3 d=normalize(point-o),sun=normalize(localSun/vec3(1.,flatten,1.));
 vec3 scatter,transmittance;airTransport(o,d,sun,1e8,scatter,transmittance);
 #ifdef TRANSMISSION_ONLY
 gl_FragColor=vec4(transmittance,1.);
 #else
 gl_FragColor=vec4(scatter,0.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 #endif
 }