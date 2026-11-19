
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
 float stepSize=(end-start)/20.;vec2 viewDepth=vec2(0.);vec3 sumR=vec3(0.),sumM=vec3(0.);
 vec3 betaR=vec3(.0058,.0135,.0331);vec3 betaM=vec3(.003);
 for(int i=0;i<20;i++){
  vec3 p=o+d*(start+(float(i)+.5)*stepSize);float h=max(0.,(length(p)-1.)*6371.);
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
 vec3 scatter=(sumR*betaR*phaseR+sumM*betaM*phaseM)*7.;
 vec3 transmittance=exp(-betaR*viewDepth.x-betaM*1.1*viewDepth.y);
 float opacity=clamp(1.-dot(transmittance,vec3(.2126,.7152,.0722)),0.,.94);
 gl_FragColor=vec4(scatter/max(opacity,.001),opacity);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }