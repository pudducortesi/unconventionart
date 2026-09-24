# CPU z-buffer geometry review. Requires Pillow and NumPy.
import json,sys,numpy as np
from PIL import Image,ImageDraw
panels=json.load(open(sys.argv[1] if len(sys.argv)>1 else '/tmp/ua-avatar-geometry.json'));height=750;width=360*len(panels)
rgb=np.empty((height,width,3),dtype=np.uint8);rgb[:]=[229,232,236];depth=np.full((height,width),np.inf)
for i,p in enumerate(panels):
 for tri in p['tris']:
  v=np.array(tri['v']);x=i*360+180+v[:,0]*310;y=700-v[:,1]*310;z=v[:,2]
  x0=max(i*360,int(np.floor(x.min())));x1=min((i+1)*360-1,int(np.ceil(x.max())));y0=max(0,int(np.floor(y.min())));y1=min(height-1,int(np.ceil(y.max())))
  if x1<x0 or y1<y0:continue
  denom=(y[1]-y[2])*(x[0]-x[2])+(x[2]-x[1])*(y[0]-y[2])
  if abs(denom)<1e-8:continue
  xx,yy=np.meshgrid(np.arange(x0,x1+1)+.5,np.arange(y0,y1+1)+.5)
  a=((y[1]-y[2])*(xx-x[2])+(x[2]-x[1])*(yy-y[2]))/denom;b=((y[2]-y[0])*(xx-x[2])+(x[0]-x[2])*(yy-y[2]))/denom;c=1-a-b
  zz=a*z[0]+b*z[1]+c*z[2];area=depth[y0:y1+1,x0:x1+1];mask=(a>=0)&(b>=0)&(c>=0)&(zz<area);area[mask]=zz[mask];rgb[y0:y1+1,x0:x1+1][mask]=tri['c']
im=Image.fromarray(rgb);d=ImageDraw.Draw(im)
for i,p in enumerate(panels):d.text((i*360+100,20),p['name'],fill='#25364a')
im.save(sys.argv[2] if len(sys.argv)>2 else '/tmp/ua-garments-review.png')
