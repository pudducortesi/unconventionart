// WebXR standard gamepads expose thumbsticks on axes 2/3; simple controllers use 0/1.
export function snapTurn(axes, armed=true) {
  const x=Number(axes?.length>=4?axes[2]:axes?.[0])||0;
  if(Math.abs(x)<.25)return {armed:true,angle:0};
  if(armed&&Math.abs(x)>.7)return {armed:false,angle:-Math.sign(x)*Math.PI/6};
  return {armed,angle:0};
}
