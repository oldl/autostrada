// Scale comes from the rendered pasta: a strand averages 79.2 units along its curve and stands for a 25 cm spaghetti.
// A 100 g plate holds about 100 strands.
export const CHUNK_LENGTH=32,STRANDS_PER_CHUNK=19,STRAND_UNITS=79.2,STRAND_METERS=.25,STRANDS_PER_PLATE=100;
// Pasta and wall wind through the same spiral; the wall sits outside every strand.
export const HELIX=.035,WALL_RADIUS=15;
export function centerline(z){return [Math.sin(z*.027)*1.8,Math.sin(z*.019+.7)*1.15];}
// Counters read the camera's own travel, so they can never drift from the picture.
export function odometer(flow){const travel=tunnelMotion({flow,shape:0,torsion:0}).travel,servings=travel/CHUNK_LENGTH*STRANDS_PER_CHUNK/STRANDS_PER_PLATE;return {meters:travel/STRAND_UNITS*STRAND_METERS,plates:Math.floor(servings),fill:servings%1};}
export function tunnelMotion({flow,shape,torsion}){
  return {travel:flow*3.6, time:flow,
    rotation:Math.sin(flow*.26)*(.12+shape*.045)+torsion*.18,
    compression:1-(.08+shape*.025)*(.5+.5*Math.sin(flow*.53)),
    twist:.018+shape*.009, bend:.12+shape*.045+Math.abs(torsion)*.25};
}
export function geometrySignal(state){
 const m=tunnelMotion(state),z=m.travel;
 return {rotation:-(m.rotation+Math.sin(z*.045+state.flow*.13)*m.twist*14),
  contraction:Math.max(0,Math.min(1,(1-m.compression-Math.sin(z*.12-state.flow*.32)*.035)/.24))};
}
