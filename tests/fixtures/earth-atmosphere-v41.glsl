
 #include <logdepthbuf_pars_fragment>
 uniform vec3 localSun;uniform vec3 localCamera;uniform float flatten;uniform sampler2D opticalDepth;
 varying vec3 vLocal;
 vec2 intersectSphere(vec3 o,vec3 d,float r){float b=dot(o,d);float h=b*b-dot(o,o)+r*r;if(h<0.)return vec2(1e8,-1e8);h=sqrt(h);return vec2(-b-h,-b+h);}
 void main(){
 #include <logdepthbuf_fragment>
 vec3 o=localCamera/vec3(1.,flatten,1.);
 vec3 point=vLocal*1.018/vec3(1.,flatten,1.);
 vec3 d=normalize(point-o),sun=normalize(localSun/vec3(1.,flatten,1.));
 vec2 hit=intersectSphere(o,d,1.018);float start=max(0.,hit.x),end=hit.y;
 vec2 ground=intersectSphere(o,d,1.);if(ground.x>0.)end=min(end,ground.x);
 if(end<=start)discard;
 // Twelve Gaussian samples resolve the steep lower-air density on rays to
 // the ground. Near the limb, keep the established twenty uniform samples:
 // grazing geometry and the narrow solar horizon need different sampling.
 const float nodes[20]=float[20](0.009219682877,0.047941371815,0.115048662903,0.206341022857,0.316084250501,0.437383295744,0.562616704256,0.683915749499,0.793658977143,0.884951337097,0.952058628185,0.990780317123,0.,0.,0.,0.,0.,0.,0.,0.);
 const float weights[20]=float[20](0.023587668193,0.053469662998,0.080039164272,0.101583713362,0.116746268269,0.124573522907,0.124573522907,0.116746268269,0.101583713362,0.080039164272,0.053469662998,0.023587668193,0.,0.,0.,0.,0.,0.,0.,0.);
 float along=dot(o,d);bool limb=dot(o,o)-along*along>.95;
 vec2 viewDepth=vec2(0.);vec3 sumR=vec3(0.),sumM=vec3(0.);
 vec3 betaR=vec3(.0058,.0135,.0331);vec3 betaM=vec3(.003);
 for(int i=0;i<20;i++){
  if(!limb&&i>=12)break;
  float stepSize=(end-start)*(limb?.05:weights[i]);
  float distance=start+(end-start)*(limb?(float(i)+.5)*.05:nodes[i]);
  vec3 p=o+d*distance;float h=max(0.,(length(p)-1.)*6371.);
  vec2 density=exp(-vec2(h/8.,h/1.2));vec2 segment=density*stepSize*6371.;viewDepth+=segment;
  float horizon=-sqrt(max(0.,1.-1./dot(p,p)));
  float sunlightFraction=smoothstep(horizon-.00465,horizon+.00465,dot(normalize(p),sun));
  vec2 lut=vec2(clamp((dot(normalize(p),sun)+.2)/1.2,0.,1.),sqrt(clamp(h/(6371.*.018),0.,1.)));
  vec2 lightDepth=texture2D(opticalDepth,(lut*vec2(511.,127.)+.5)/vec2(512.,128.)).rg;
  vec3 attenuation=exp(-betaR*(viewDepth.x-segment.x*.5+lightDepth.x)-betaM*1.1*(viewDepth.y-segment.y*.5+lightDepth.y));
  sumR+=attenuation*segment.x*sunlightFraction;sumM+=attenuation*segment.y*sunlightFraction;
 }
 float mu=dot(d,sun);float phaseR=.0596831*(1.+mu*mu);float g=.76;
 float phaseM=.0795775*(1.-g*g)/pow(max(.01,1.+g*g-2.*g*mu),1.5);
 // Surface diffuse radiance is albedo * cos(sun), i.e. solar irradiance / pi.
 // Phase functions integrate to one over solid angle, so scattering uses pi
 // in those same units. The old factor of seven over-brightened the air.
 vec3 scatter=(sumR*betaR*phaseR+sumM*betaM*phaseM)*3.141592654;
 vec3 transmittance=exp(-betaR*viewDepth.x-betaM*1.1*viewDepth.y);
 float opacity=clamp(1.-dot(transmittance,vec3(.2126,.7152,.0722)),0.,.94);
 gl_FragColor=vec4(scatter/max(opacity,.001),opacity);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }