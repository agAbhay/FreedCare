export interface IPoint {
    x: number;
    y: number;
    dist: number;
    angle: number;
}

export interface IMarkerPoint {

    x: number;
    y: number;
    dist: number;
    cycle: number;
}
// Add SegmentType
export type SegmentType = 'arc' | 'vertical-down' | 'horizontal';

export interface TIunnelSegment {
    start: number;
    end: number;
    action: (t: number) => { x: number, y: number };
    type: SegmentType;
}