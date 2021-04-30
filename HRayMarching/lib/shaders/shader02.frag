// Fragment shader

precision highp float;
 
uniform vec2 iResolution;
uniform float iTime;
uniform int iType;
uniform int iSoftShadow;
uniform vec3 iRo;
uniform float iFov;
uniform vec3 iPitch;
uniform vec3 iYaw;
uniform vec3 iRoll;
uniform mat4 iTransform;
uniform int iLight;

 
#define PI 3.1415926538
#define MAX_STEPS 10000
#define MAX_DIST 10000.
#define SURF_DIST 0.003

/* Some unitility functions before we start*/
float acosh(float x){
    return log(x+sqrt(x*x - 1.));
}

float atanh(float x){
    return 0.5*(log(1.+x)-log(1.-x));
}
float acoth(float x){
    return 0.5*(log(1.+x)-log(x-1.));
}


/// COSH Function (Hyperbolic Cosine)
float cosh(float val)
{
    float tmp = exp(val);
    float cosH = (tmp + 1.0 / tmp) / 2.0;
    return cosH;
}
 
// TANH Function (Hyperbolic Tangent)
float tanh(float val)
{
    float tmp = exp(val);
    float tanH = (tmp - 1.0 / tmp) / (tmp + 1.0 / tmp);
    return tanH;
}
 
// SINH Function (Hyperbolic Sine)
float sinh(float val)
{
    float tmp = exp(val);
    float sinH = (tmp - 1.0 / tmp) / 2.0;
    return sinH;
}


/* Some operations in hyperbolic geometry*/



float HDot(vec4 v1, vec4 v2){
    /* H inner product*/
    return -v1.x *v2.x-v1.y *v2.y-v1.z *v2.z+v1.w *v2.w;
}


vec4 HNormalize(vec4 v){
    /* Normalize to +-1*/
    float norm = sqrt(abs(HDot(v,v)));
    return v/norm;
}

vec4 Euc2Hyp(vec3 p){
    /* This is NOT same as HNormalize
    Instead, This takes (x,y,z) and maps it to such a point (x,y,z,w) that it's on H3*/
    return vec4(p,sqrt(1.+p.x*p.x+p.y*p.y+p.z*p.z));
}


vec4 HMove(vec4 p, vec4 tangent, float t){
/*
Move along the geodesics at p in the tangent direction for distance t. 
Important: tangent is normalized. 
*/
    return p*cosh(t)+tangent*sinh(t);
}



vec4 FindTangent(vec4 p ,vec4 q){
/*
Takes two points p and q, and returns the tangent vector at p
*/
    float d = HDot(p,q);
    // CHECK THIS!!!!!!!!!!!!!!!!!!
    return (q-d*p)/sqrt(pow(d,2.)-1.);
    
}


float HLength(vec4 p,vec4 q){
/*
Compute distance between two points
*/
    return abs(acosh(HDot(p,q)));
}



vec4 Poincare2Minkowski(vec3 p){
    // p: fov, uv
    float prod = pow(p.x,2.)+pow(p.y,2.)+pow(p.z,2.);
    vec4 screenpoint =  vec4(2.*p,1.+prod)/(1.-prod);
    return screenpoint;
}

vec4 Klein2Minkowski(vec3 p){
    return HNormalize(vec4(p,1.));
}

vec3 Minkowski2Poincare(vec4 p){
    return p.xyz/(p.w+1.);
}


vec3 Minkowski2Klein(vec4 p){
    return p.xyz/p.w;
}


/* Raymarching code*/

float sdSphere(vec4 pos, vec4 center, float rad,int type){
    float d;
    if (type == 1){
        d = length(pos.xyz-center.xyz)-rad;
    }
    else{
        d = HLength(pos, center)-rad;     
    }
    return d;
}

float sdHorosphere(vec4  pos, vec4 ipdirection, float offset, int type){
    if(type == 1){
        return log(dot(pos,ipdirection))-offset; 
    }else{
        return log(HDot(pos, ipdirection)) - offset;
    }

}



float sdPlane1(vec4 pos, vec4 center, vec4 normal,  int type){
    if(type == 1){
        return abs(dot(pos.xyz-center.xyz,normalize(normal.xyz)))-5.*SURF_DIST;
        //return dot(pos.xyz,normal.xyz);
    }else{
        return HLength(center,pos)*abs(HDot(FindTangent(center, pos),normal))-2.*SURF_DIST;
        //return HDot(pos,normal);
    }
}


void HGetT1T2(in vec4 p, in vec4 basisx, out vec4 basisy, out vec4 basisz){
    
    // Get three (independent) tangent vectors at p
    basisz = HNormalize(vec4(0.0,p.w,0.0,p.y));
    basisy = HNormalize(vec4(p.w,0.0,0.0,p.x));

    if (basisx.x == 0. && basisx.z == 0.){
        basisz = HNormalize(vec4(0.0,0.0,p.w,p.z));  
    }
    if (basisx.y == 0. && basisx.z == 0.){
        basisy = HNormalize(vec4(0.0,0.0,p.w,p.z));  
    }

    
    // Use Gram Schmidt 
    basisy = HNormalize(basisy - HDot(basisy, basisx)*basisx); 
    basisz = HNormalize(basisz - HDot(basisz, basisx)*basisx - HDot(basisz, basisy)*basisy); 
}



float sdPlane(vec4 pos, vec4 center, vec4 normal,  int type){
    if(type == 1){
        return abs(dot(pos.xyz-center.xyz,normalize(normal.xyz)))-5.*SURF_DIST;
    }else{
        float x = HDot(pos,center);
        vec4 T1;
        vec4 T2;
        HGetT1T2(center,normal,T1,T2);
        float y1 = HDot(pos,T1);
        float y2 = HDot(pos,T2);
        return acosh(sqrt(x*x-y1*y1-y2*y2))-10.*SURF_DIST;
    }
}



bool HExterior(vec4 center,vec4 normal, vec4 p){
    if(HDot(FindTangent(center, p),normal)>0.){
        return true;
    }
    else{
        return false;
    }
}


float sdSquare(vec4 pos, vec4 center, vec4 normal, vec4 T1
, vec4 T2
, float l, int type){
    l = l+0.09;
    float offset = 5.;
    if(type == 1){
        return abs(dot(pos.xyz-center.xyz,normalize(normal.xyz)))-5.*SURF_DIST;
    }else{
        float x = HDot(pos,center);
        float y =  HDot(pos,normal);
        float y1 = HDot(pos,T1);
        float y2 = HDot(pos,T2);
        vec4 Ttheta = (y1/sqrt(y1*y1+y2*y2))*T1+(y2/sqrt(y1*y1+y2*y2))*T2;
        //vec4 Q = (x/sqrt(x*x-y*y))*center - (y/sqrt(x*x-y*y))*Ttheta;
        vec4 M1_positive = HMove(center,T1,l);
        vec4 M1_negative = HMove(center,T1,-l);
        vec4 M2_positive = HMove(center,T2,l);
        vec4 M2_negative = HMove(center,T2,-l);
        bool b1_positive = HExterior(M1_positive, -T1,pos);
        bool b1_negative = HExterior(M1_negative, T1,pos);
        bool b2_positive = HExterior(M2_positive, -T2,pos);
        bool b2_negative = HExterior(M2_negative, T2,pos);

        if (b1_positive && b2_positive){
            return HLength(pos, HMove(M1_positive,T2,l))-offset*SURF_DIST;
        }
        if (b1_positive && b2_negative){
            return HLength(pos, HMove(M1_positive,T2,-l))-offset*SURF_DIST;
        }
        if (b1_negative && b2_positive){
            return HLength(pos, HMove(M2_positive,T1,-l))-offset*SURF_DIST;
        }
        if (b1_negative && b2_negative){
            return HLength(pos, HMove(M2_negative,T1,-l))-offset*SURF_DIST;
        }
        if(b1_positive){
            return acosh(sqrt(HDot(pos,M1_positive)*HDot(pos,M1_positive)-HDot(pos,T2)*HDot(pos,T2)))-offset*SURF_DIST;
        }        
        if(b1_negative){
            return acosh(sqrt(HDot(pos,M1_negative)*HDot(pos,M1_negative)-HDot(pos,T2)*HDot(pos,T2)))-offset*SURF_DIST;
        }
        if(b2_positive){
            return acosh(sqrt(HDot(pos,M2_positive)*HDot(pos,M2_positive)-HDot(pos,T1)*HDot(pos,T1)))-offset*SURF_DIST;
        }        
        if(b2_negative){
            return acosh(sqrt(HDot(pos,M2_negative)*HDot(pos,M2_negative)-HDot(pos,T1)*HDot(pos,T1)))-offset*SURF_DIST;
        }
        if (b1_negative != true && b1_positive != true&&b2_negative != true&&b2_positive != true){
            return acosh(sqrt(x*x-y1*y1-y2*y2))-offset*SURF_DIST;
        }
        return 0.;

    
    }
}

vec4 HReflect(vec4 pos, vec4 center, vec4 normal){
    vec4 d = -FindTangent(center,pos);
    vec4 r =  HNormalize(d-2.*HDot(d,normal)*normal);
    //return HMove(center,r,HLength(pos,center));
    return pos +2.*HDot(pos,normal)*normal;
}


vec4 sdCenterCube(vec4 p, float l, int type,vec3 frontbackright, vec3 leftuplow){
    float d1;
    vec3 light = vec3(0.,0.,0.);
    float d = 1e20;
    vec4 center  = vec4(0.,0.,0.,1.);
    vec4 T1 = vec4(1.,0.,0.,0.);
    vec4 T2 = vec4(0.,1.,0.,0.);
    vec4 T3 = vec4(0.,0.,1.,0.);
    vec4 pivot = HMove(vec4(0.,0.,0.,1.),T1,l);
    if(frontbackright.x > 0.){
        d1 = sdSquare(p,pivot,FindTangent(pivot,center),T2,T3,l,type);

        //make the dihedral angle 2/5 pi
        //d1 = min(d1,sdSquare(q,Euc2Hyp(vec3(0.,0.,-0.5)),vec4(0.,0.,-sqrt(5./4.),0.5),vec4(1.,0.,0.,0.),vec4(0.,1.,0.,0.),0.5 ,type));
        if (d>d1){
            light = vec3(1.,1.,0.);
            d = d1;
        } 
    }
    if(frontbackright.y > 0.){
    pivot = HMove(vec4(0.,0.,0.,1.),T1,-l);
    d1 = sdSquare(p,pivot,FindTangent(pivot,center),T2,T3,l ,type);
    if (d>d1){
        light = vec3(1.,1.,0.);
        d = d1;
    } 
    }
    if(frontbackright.z > 0.){
    pivot = HMove(vec4(0.,0.,0.,1.),T2,l);
    d1 = sdSquare(p,pivot,FindTangent(pivot,center),T1,T3,l ,type);
    
    //d1 = sdSquare(p,Euc2Hyp(vec3(0.,-0.5,0.)), vec4(0.,-sqrt(5./4.),0.,0.5),vec4(1.,0.,0.,0.),vec4(0.,0.,1.,0.),0.5,type);
    if (d>d1){
    light = vec3(0.,1.,1.);
        d = d1;
    }
    }
    if(leftuplow.x > 0. ){
    pivot = HMove(vec4(0.,0.,0.,1.),T2,-l);
    d1 = sdSquare(p,pivot,FindTangent(pivot,center),T1,T3,l ,type);      
    //d1 = sdSquare(p,Euc2Hyp(vec3(0.,0.5,0.)), vec4(0.,sqrt(5./4.),0.,0.5),vec4(1.,0.,0.,0.),vec4(0.,0.,1.,0.),0.5,type);
    if (d>d1){
    light = vec3(0.,1.,1.);
        d = d1;
    }  
    }
    if(leftuplow.y > 0. ){
    pivot = HMove(vec4(0.,0.,0.,1.),T3,l);
    d1 = sdSquare(p,pivot,FindTangent(pivot,center),T1,T2,l ,type);        
    //d1 = sdSquare(p,Euc2Hyp(vec3(-0.5,0.,0.)), vec4(-sqrt(5./4.),0.,0.,0.5),vec4(0.,1.,0.,0.),vec4(0.,0.,1.,0.),0.5,type);
    if (d>d1){
    light = vec3(1.,0.,1.);
        d = d1;
    }  
    }
    if(leftuplow.z > 0. ){
    pivot = HMove(vec4(0.,0.,0.,1.),T3,-l);
    d1 = sdSquare(p,pivot,FindTangent(pivot,center),T1,T2,l ,type);       
    //d1 = sdSquare(p,Euc2Hyp(vec3(0.5,0.,0.)), vec4(sqrt(5./4.),0.,0.,0.5),vec4(0.,1.,0.,0.),vec4(0.,0.,1.,0.),0.5,type);
    if (d>d1){
    light = vec3(1.,0.,1.);
        d = d1;
    }  
    }
    return vec4(light,d);
}

vec4 sdScene(vec4 p, int type) {

    /* Get the minimum  distance of p with ANY object in the world*/
    /*vec4 center = vec4(0.,0.,0.,1.);
    float l = 0.53;
    vec4 T1 = vec4(1.,0.,0.,0.);
    vec4 T2 = vec4(0.,1.,0.,0.);
    vec4 T3 = vec4(0.,0.,1.,0.);
    vec4 pivot = HMove(vec4(0.,0.,0.,1.),T1,l);

    vec4 res = sdCenterCube(p,l,type,vec3(0.,0.,0.),vec3(0.,1.,1.));

    vec4 q = HReflect(p,pivot,FindTangent(pivot,center));
    vec4 resq = sdCenterCube(q,l,type,vec3(0.,1.,0.),vec3(1.,1.,1.));
    if(resq.w <res.w){
        res = resq;
    }
    //test section


    pivot = HMove(HMove(center,T1,2.*l),T2,l);

    vec4 qq = HReflect(p,pivot,FindTangent(pivot,HMove(center,T1,2.*l)));
    pivot = HMove(vec4(0.,0.,0.,1.),T1,l);
    q = HReflect(qq,pivot,FindTangent(pivot,center));
    resq = sdCenterCube(q,l,type,vec3(1.,1.,0.),vec3(1.,1.,1.));
    
    if(resq.w <res.w){
        res = resq;
    }

    pivot = HMove(HMove(center,T2,2.*l),T1,l);

    qq = HReflect(p,pivot,FindTangent(pivot,HMove(center,T2,2.*l)));
    pivot = HMove(vec4(0.,0.,0.,1.),T2,l);
    q = HReflect(qq,pivot,FindTangent(pivot,center));
    resq = sdCenterCube(q,l,type,vec3(0.,1.,1.),vec3(1.,1.,1.));
    
    if(resq.w <res.w){
        res = resq;
    }

    //test section end
    pivot = HMove(vec4(0.,0.,0.,1.),T1,-l);
    q = HReflect(p,pivot,FindTangent(pivot,center));
    resq = sdCenterCube(q,l,type,vec3(1.,0.,1.),vec3(1.,1.,1.));
    if(resq.w <res.w){
        res = resq;
    }
    pivot = HMove(vec4(0.,0.,0.,1.),T2,l);
    q = HReflect(p,pivot,FindTangent(pivot,center));
    resq = sdCenterCube(q,l,type,vec3(0.,1.,0.),vec3(1.,1.,1.));
    if(resq.w <res.w){
        res = resq;
    }
    pivot = HMove(vec4(0.,0.,0.,1.),T2,-l);
    q = HReflect(p,pivot,FindTangent(pivot,center));
    resq = sdCenterCube(q,l,type,vec3(1.,1.,1.),vec3(0.,1.,1.));
    if(resq.w <res.w){
        res = resq;
    }
    pivot = HMove(vec4(0.,0.,0.,1.),T3,l);
    q = HReflect(p,pivot,FindTangent(pivot,center));
    resq = sdCenterCube(q,l,type,vec3(1.,1.,1.),vec3(1.,0.,1.));
    if(resq.w <res.w){
        res = resq;
    }
    pivot = HMove(vec4(0.,0.,0.,1.),T3,-l);
    q = HReflect(p,pivot,FindTangent(pivot,center));
    resq = sdCenterCube(q,l,type,vec3(1.,1.,1.),vec3(1.,1.,0.));
    if(resq.w <res.w){
        res = resq;
    }
    return res;*/


    vec4 center = vec4(0.,0.,0.,1.);
    float l = 0.53;
    vec4 T1 = vec4(1.,0.,0.,0.);
    vec4 T2 = vec4(0.,1.,0.,0.);
    vec4 T3 = vec4(0.,0.,1.,0.);
    vec4 pivot = HMove(vec4(0.,0.,0.,1.),T1,l);

    //vec4 res = sdCenterCube(p,l,type,vec3(1., 1.,1.),vec3(1.,1.,1.));
    vec4 res = sdCenterCube(p,l,type,vec3(0.,0.,0.),vec3(0.,1.,1.));

    vec4 q = HReflect(p,pivot,FindTangent(pivot,center));
    vec4 resq = sdCenterCube(q,l,type,vec3(0.,0.,0.),vec3(1.,1.,1.));
    if(resq.w <res.w){
        res = resq;
    }
    //test section


    pivot = HMove(HMove(center,T1,2.*l),T2,l);

    vec4 qq = HReflect(p,pivot,FindTangent(pivot,HMove(center,T1,2.*l)));
    pivot = HMove(vec4(0.,0.,0.,1.),T1,l);
    q = HReflect(qq,pivot,FindTangent(pivot,center));
    resq = sdCenterCube(q,l,type,vec3(1.,1.,0.),vec3(1.,1.,1.));
    
    if(resq.w <res.w){
        res = resq;
    }

    pivot = HMove(HMove(center,T2,2.*l),T1,l);

    qq = HReflect(p,pivot,FindTangent(pivot,HMove(center,T2,2.*l)));
    pivot = HMove(vec4(0.,0.,0.,1.),T2,l);
    q = HReflect(qq,pivot,FindTangent(pivot,center));
    resq = sdCenterCube(q,l,type,vec3(0.,1.,1.),vec3(1.,1.,1.));
    
    if(resq.w <res.w){
        res = resq;
    }

    //test section end

    //new test



    pivot = HMove(center,T1,3.*l);


    qq = HReflect(p,pivot,FindTangent(pivot,center));
    pivot = HMove(center,T1,1.*l);
    q = HReflect(qq,pivot,FindTangent(pivot,center));
    resq = sdCenterCube(q,l,type,vec3(1.,0.,0.),vec3(1.,1.,1.));
    
    if(resq.w <res.w){
        res = resq;
    }

    pivot = HMove(HMove(center,T1,4.*l),T2,l);
    qq = HReflect(p,pivot,FindTangent(pivot,HMove(center,T1,4.*l)));
    pivot = HMove(center,T1,3.*l);
    qq = HReflect(qq,pivot,FindTangent(pivot,center));
    pivot = HMove(center,T1,1.*l);
    q = HReflect(qq,pivot,FindTangent(pivot,center));
    resq = sdCenterCube(q,l,type,vec3(1.,1.,0.),vec3(1.,1.,1.));
    
    if(resq.w <res.w){
        res = resq;
    }


    pivot = HMove(HMove(center,T1,2.*l),T2,3.*l);
    
    q = HReflect(p,pivot,FindTangent(pivot,HMove(center,T1,2.*l)));
    pivot = HMove(HMove(center,T1,2.*l),T2,l);

    q = HReflect(q,pivot,FindTangent(pivot,HMove(center,T1,2.*l)));
    pivot = HMove(vec4(0.,0.,0.,1.),T1,l);
    q = HReflect(q,pivot,FindTangent(pivot,center));
    resq = sdCenterCube(q,l,type,vec3(1.,1.,0.),vec3(1.,1.,1.));
    
    if(resq.w <res.w){
        res = resq;
    }




    //end new test
    pivot = HMove(vec4(0.,0.,0.,1.),T1,-l);
    q = HReflect(p,pivot,FindTangent(pivot,center));
    resq = sdCenterCube(q,l,type,vec3(1.,0.,1.),vec3(1.,1.,1.));
    if(resq.w <res.w){
        res = resq;
    }
    pivot = HMove(vec4(0.,0.,0.,1.),T2,l);
    q = HReflect(p,pivot,FindTangent(pivot,center));
    resq = sdCenterCube(q,l,type,vec3(0.,1.,0.),vec3(1.,1.,1.));
    if(resq.w <res.w){
        res = resq;
    }
    pivot = HMove(vec4(0.,0.,0.,1.),T2,-l);
    q = HReflect(p,pivot,FindTangent(pivot,center));
    resq = sdCenterCube(q,l,type,vec3(1.,1.,1.),vec3(0.,1.,1.));
    if(resq.w <res.w){
        res = resq;
    }
    pivot = HMove(vec4(0.,0.,0.,1.),T3,l);
    q = HReflect(p,pivot,FindTangent(pivot,center));
    resq = sdCenterCube(q,l,type,vec3(1.,1.,1.),vec3(1.,0.,1.));
    if(resq.w <res.w){
        res = resq;
    }
    pivot = HMove(vec4(0.,0.,0.,1.),T3,-l);
    q = HReflect(p,pivot,FindTangent(pivot,center));
    resq = sdCenterCube(q,l,type,vec3(1.,1.,1.),vec3(1.,1.,0.));
    if(resq.w <res.w){
        res = resq;
    }
    return res;
} 




vec3 GetNormal(vec3 p ){
    /* Get the normal vector at point p*/ 
    
    vec4 d = sdScene(vec4(p,1.),1);
    
    //Approximate the gradient of SDF at p
    vec2 e = vec2(.01,0);
    vec3 n = d.w-vec3(sdScene(vec4(p-e.xyy,1.),1).w,sdScene(vec4(p-e.yxy,1.),1).w, sdScene(vec4(p-e.yyx,1.),1).w);
    return normalize(n);
}

vec4 RayMarch(vec3 ro, vec3 rd){
   	/*Take a ray origin and a normalized(important!) ray direction. 
	  Return the total ray marching distance from origin to the closest intersection point in the world.
    */ 
    
    float dO = 0.;
    vec4 dS;
    // marching loop
    for(int i = 0; i<MAX_STEPS;i++){
        // move our current point along the ray (safely)
        vec3 p = ro+rd*dO;
        dS = sdScene(Euc2Hyp(p),1);
        dO+= dS.w;
        if(dO>MAX_DIST || dS.w<SURF_DIST) break;
    }
    if(dO>MAX_DIST){
        return vec4(0.,0.,0.,-1);
    }
    
    return vec4(dS.xyz,dO);
}

vec4 HRayMarch(vec4 ro, vec4 rd){
   	/*Take a ray origin and a normalized(important!) ray direction. 
	  Return the total ray marching distance from origin to the closest intersection point in the world.
    */ 
    
    float dO = 0.;
    vec4 dS;
    // marching loop
    for(int i = 0; i<MAX_STEPS;i++){
        // move our current point along the ray (safely)
        vec4 p = HMove(ro,rd,dO);
        dS = sdScene(p,2);
        dO+= dS.w;
        if(dO>MAX_DIST || dS.w<SURF_DIST) break;
    }
    if(dO>MAX_DIST){
        return vec4(0.,0.,0.,-1.);
    }
    return vec4(dS.xyz,dO);
}

void HGetTangentBasis(in vec4 p, out vec4 basisx, out vec4 basisy, out vec4 basisz){

    
    // Get three (independent) tangent vectors at p
    basisx = HNormalize(vec4(p.w,0.0,0.0,p.x));
    basisy = HNormalize(vec4(0.0,p.w,0.0,p.y));
    basisz = HNormalize(vec4(0.0,0.0,p.w,p.z));  
    
    // Use Gram Schmidt 
    basisy = HNormalize(basisy - HDot(basisy, basisx)*basisx); 
    basisz = HNormalize(basisz - HDot(basisz, basisx)*basisx - HDot(basisz, basisy)*basisy); 
}

vec4 HGetNormal(vec4 p ){
    /* Get the normal vector at point p*/ 
    vec4 basisx;
    vec4 basisy;
    vec4 basisz;
    HGetTangentBasis(p,basisx,basisy,basisz);
    float epsilon = 3.;
    float dx = sdScene(HMove(p,basisx,epsilon*SURF_DIST),2).w-sdScene(HMove(p,basisx,-epsilon*SURF_DIST),2).w;
    float dy = sdScene(HMove(p,basisy,epsilon*SURF_DIST),2).w-sdScene(HMove(p,basisy,-epsilon*SURF_DIST),2).w;
    float dz = sdScene(HMove(p,basisz,epsilon*SURF_DIST),2).w-sdScene(HMove(p,basisz,-epsilon*SURF_DIST),2).w;
    //Approximate the gradient of SDF at p
    vec4 n = basisx *dx+basisy *dy+basisz *dz;

    return HNormalize(n);
}

float HShadowMarch(vec4 ro, vec4 rd, vec4 lightPos,float k, int is_soft){
   	/*Take a ray origin and a normalized(important!) ray direction. 
	  Return the total ray marching distance from origin to the closest intersection point in the world.
    */ 
    
    float light = 1.;
    if (is_soft == 2){
        return light;
    }
    float dO = SURF_DIST;
    float d = HLength(ro,lightPos);
    // marching loop
    for(int i = 0; i<MAX_STEPS;i++){
        // move our current point along the ray (safely)
        vec4 p = HMove(ro,rd,dO);
        float dS = sdScene(p,2).w;
        dO+= dS;
        if(is_soft == 1){
            light = min(light,k*dS/dO);         
        }

        if(dO>d) break;
        if (dS<SURF_DIST){
            light  = 0.;
            break;
        }
    }
    return light;
}


float ShadowMarch(vec3 ro, vec3 rd, vec3 lightPos,float k, int is_soft){
   	/*Take a ray origin and a normalized(important!) ray direction. 
	  Return the total ray marching distance from origin to the closest intersection point in the world.
    */ 
    
    float light = 1.;
    if (is_soft == 2){
        return light;
    }
    float dO = SURF_DIST;
    float d = length(lightPos-ro);
    // marching loop
    for(int i = 0; i<MAX_STEPS;i++){
        // move our current point along the ray (safely)
        vec3 p = ro+rd*dO;
        float dS = sdScene(vec4(p,1.),1).w;
        if (is_soft == 1){
            light = min(light,k*dS/dO);
        }
        dO+= dS;
        if(dO>d) break;
        if (dS<SURF_DIST){
            light  = 0.;
            break;
        }
    }
    return clamp(light,0.,1.);
}




float GetLight(vec4 p, vec4 ro, int type,float dist){
    /* Get LightValue at point p Using Phong Model*/ 
    // Light Position
    //vec4 lightPos = Euc2Hyp(vec3(10,20.*cos(iTime),20.*sin(iTime)));
    if (iLight == 0){
        return 1.;
    }else{
    vec4 lightPos = Euc2Hyp(vec3(0.,0.,0.15));
    float lightIntensity = 3.;
    float light =1.;
    if (type == 1){
            // The light vector with respect to p
        vec3 l = normalize(lightPos.xyz-p.xyz);
    
        // The normal vector at p
        vec3 n = GetNormal(p.xyz);
    
        // The view vector with respect to p
        vec3 v = normalize(ro.xyz-p.xyz);
    
        // The mid-vector between l and v
        vec3 h = normalize(v+l);
  
        // kd = diffuse coefficient, ks  = specular coefficient 
        float kd = 1.;
        float ks = .2;
        float dif = kd*lightIntensity*max(dot(n,l)/dist,0.);
        float spec = ks*lightIntensity*max(dot(n,h)/dist,0.);
    
        // add diffuse and specular
        light = dif+spec;
    
        //Cast Shadow by shooting another ray marching to light source. 
        float s = ShadowMarch(p.xyz+2.*n*SURF_DIST,l,lightPos.xyz,4.,iSoftShadow);
        light  = light*s;
    
    }else{

        vec4 l = FindTangent(p,lightPos);
  
        // The normal vector at p
        vec4 n = HGetNormal(p);
   
        // The view vector with respect to p
        vec4 v = FindTangent(p,ro);
    
        // The mid-vector between l and v
        vec4 h = HNormalize(v+l);
 
        // kd = diffuse coefficient, ks  = specular coefficient 
        float kd = 1.;
        float ks = 0.1;
        float dif = clamp(-kd*lightIntensity*HDot(n,l)/dist/2.,0.,1.);
 
        float spec = clamp(-ks*lightIntensity*HDot(n,h)/dist/2.,0.,1.);

        // add diffuse and specular

          

        //Cast Shadow by shooting another marching to light source. 
        float d = HShadowMarch(HMove(p,n,40.*SURF_DIST),l,lightPos,4.,iSoftShadow);
        return (dif+spec)*d;    
    }

    
    return light;
    }
}




vec3 render(vec2 uv, int type, vec4 ro, float fov){
    //mat3 transform = mat3(
        //iTransform[0][0],iTransform[1][0],iTransform[2][0],
        //iTransform[0][1],iTransform[1][1],iTransform[2][1],
        //iTransform[0][2],iTransform[1][2],iTransform[2][2]
    //);
    vec3 roll = vec3(iTransform[0][0],iTransform[0][1],iTransform[0][2]);
    vec3 pitch = vec3(iTransform[1][0],iTransform[1][1],iTransform[1][2]);
    vec3 yaw = vec3(iTransform[2][0],iTransform[2][1],iTransform[2][2]);
    vec3 light = vec3(0.,1.,1.);
    if(type == 1){
        vec3 rd = normalize(fov*roll+uv.x*pitch+uv.y*yaw);
        vec4 res = RayMarch(ro.xyz,rd);
        vec3 p = ro.xyz+rd*res.w;
        // Get the lighting info at that point
        float lightIntensity = GetLight(vec4(p,1.),ro,1,res.w);
        light = lightIntensity*res.xyz;
    }
    else{
        vec4 rd;    
        if(type == 2){
            vec4 tangentu;
            vec4 tangentv;
            vec4 tangento;
            HGetTangentBasis(ro,tangento,tangentu,tangentv);
            // Get the closest intersection point from ro at rd direction
            rd = HNormalize(fov*tangento+uv.y*tangentv+uv.x*tangentu);
        }else if(type == 3){
            vec4 screenpoint = Klein2Minkowski(clamp(Minkowski2Klein(Euc2Hyp(iRo))+0.1*normalize(fov*roll+uv.x*pitch+uv.y*yaw),-1.,1.));
            rd = FindTangent(ro,screenpoint);            
        }else if (type == 4){
            vec4 screenpoint =  Poincare2Minkowski(Minkowski2Poincare(Euc2Hyp(iRo))+0.1*0.1*normalize(fov*roll+uv.x*pitch+uv.y*yaw));
            rd = FindTangent(ro,screenpoint);
        }
        else{
            return vec3(1.,1.,1.);
        }
        vec4 res = HRayMarch(ro,rd);
        if (res.w<0.){
            return vec3(1.,1.,1.);
        }
        vec4 p = HMove(ro,rd,res.w);
        float lightIntensity = GetLight(p,ro,2,res.w);    
        light = lightIntensity*res.xyz;
    }
    // Get the lighting info at that point
    
    return light;
    
}



void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // type 1:Euclidean 
    // type 2:Hyperbolic Tangent Space projection
    // type 3:Hyperbolic Klein Projection
    // type 4:Hyperbolic Poincere Disk Projection 
    
    
    // adjusted uv 
    vec2 uv = (fragCoord-.5*iResolution.xy)/max(iResolution.x,iResolution.y);
    //issue: There are points that are not on the unit disk/sphere, which cannot be projected to the hyperboloid.

    vec3 light = render(uv,iType, Euc2Hyp(iRo),iFov);
    fragColor = vec4(1.,0.,0.,1.);
    fragColor = vec4(light,1.);   
}





 
void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
