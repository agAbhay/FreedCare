import React, { useRef, useState, useEffect } from 'react';
import { Animated, Dimensions, StyleSheet, View, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { ScrollView, GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import RootPageBackground from '../../shared-components/svg/RootPageBackground';
import { SegmentType, TIunnelSegment, IMarkerPoint, IPoint } from '../../interfaces/IHome';
import styles from './style';


const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const pathPadding = 25;
const effectiveCardWidth = screenWidth - 40 - (2 * pathPadding);
const cardStartXOffset = pathPadding;

const borderRadius = 60;
const straightLen = 50;

const halfHorizontal = effectiveCardWidth / 2 - borderRadius;
const fullHorizontal = effectiveCardWidth - 2 * borderRadius;
const arcLen = (Math.PI * borderRadius) / 2;

const cycleLength =
    halfHorizontal + arcLen + straightLen + arcLen +
    fullHorizontal + arcLen + straightLen + arcLen;
const cycleVertical = 4 * borderRadius + 2 * straightLen;

const xJumpMagnitude = Math.max(1, effectiveCardWidth / 2 - borderRadius);
const pathTransitionSmoothingDist = xJumpMagnitude;



const visibleSvgViewHeight = screenHeight * 0.75;
const iconTargetYOnScreenProportion = 0.25;

const arrowSvgPath = "M0,-15 L10,0 L2,0 L0,-5 L-2,0 L-10,0 Z";
const arrowColor = "#f16c23";
const arrowBorderColor = "#d3d3d3";
const iconScale = 1.5;
const borderScale = 1.625;
const borderStrokeWidth = 0.5;

const markerStyleConfig = {
    fillColor: "#48cae4",
    borderColor: "#0096c7",
    fillRadius: 5,
    gap: 3,
    borderThickness: 2,
};
const markerBorderStrokeRadius =
    markerStyleConfig.fillRadius +
    markerStyleConfig.gap +
    (markerStyleConfig.borderThickness / 2);


const markerTargetDistSeg2InCycle = halfHorizontal + arcLen;
const markerTargetDistSeg6InCycle = halfHorizontal + 3 * arcLen + straightLen + fullHorizontal;

const allMarkerDistancesInCycle = [
    markerTargetDistSeg2InCycle,
    markerTargetDistSeg6InCycle
];

const maxTrailInterpolationStep = 5;

const iconMinOpacity = 0.5;
const iconFadePathDistance = 25;

const startMarkerRadius = markerStyleConfig.fillRadius;
const startMarkerColor = markerStyleConfig.fillColor;
const startMarkerBorderColor = markerStyleConfig.borderColor;
const startMarkerBorderThickness = markerStyleConfig.borderThickness;
const startMarkerLineLength = 10;
const startMarkerLineColor = startMarkerBorderColor;
const startMarkerLineThickness = 1.5;

const startMarkerBorderRadius =
    startMarkerRadius +
    markerStyleConfig.gap +
    (startMarkerBorderThickness / 2);

function calculatePositionByDist(cumulativeDist: number, segments: TIunnelSegment[]): { x: number, y: number, angle: number, segmentType: SegmentType } {
    const d = Math.max(0, cumulativeDist);
    const cycleCount = Math.floor(d / cycleLength);
    const localD = d % cycleLength;

    const seg = segments.find(s => localD >= s.start && localD <= s.end)!;
    const t = localD - seg.start;

    const currentActionPos = seg.action(t);
    let currentX = currentActionPos.x + cardStartXOffset;
    const currentY = currentActionPos.y + cycleCount * cycleVertical;

    let inSmoothingTransition = false;
    let transitionStartX = 0;
    if (cycleCount > 0 && localD < pathTransitionSmoothingDist) {
        inSmoothingTransition = true;
        const prevCycleEndSegment = segments[segments.length - 1];
        const prevCycleEndActionPos = prevCycleEndSegment.action(prevCycleEndSegment.end - prevCycleEndSegment.start);
        transitionStartX = prevCycleEndActionPos.x + cardStartXOffset;

        const targetCurrentX = currentActionPos.x + cardStartXOffset;
        const transitionProgress = localD / pathTransitionSmoothingDist;
        currentX = transitionStartX + (targetCurrentX - transitionStartX) * transitionProgress;
    }

    const deltaDist = 1;
    let localDPlusDelta = localD + deltaDist;
    let cycleCountPlusDelta = cycleCount;

    if (localDPlusDelta >= cycleLength) {
        localDPlusDelta -= cycleLength;
        cycleCountPlusDelta++;
    }

    const segPlusDelta = segments.find(s => localDPlusDelta >= s.start && localDPlusDelta <= s.end)!;
    const tPlusDelta = localDPlusDelta - segPlusDelta.start;

    const nextActionPos = segPlusDelta.action(tPlusDelta);
    let nextX = nextActionPos.x + cardStartXOffset;
    const nextY = nextActionPos.y + cycleCountPlusDelta * cycleVertical;

    if (inSmoothingTransition && cycleCountPlusDelta === cycleCount && localDPlusDelta < pathTransitionSmoothingDist) {
        const targetNextX = nextActionPos.x + cardStartXOffset;
        const nextTransitionProgress = localDPlusDelta / pathTransitionSmoothingDist;
        nextX = transitionStartX + (targetNextX - transitionStartX) * nextTransitionProgress;
    }
    else if (cycleCountPlusDelta > cycleCount && localDPlusDelta < pathTransitionSmoothingDist) {

        const currentCycleEndSegment = segments[segments.length - 1];
        const currentCycleEndActionPos = currentCycleEndSegment.action(currentCycleEndSegment.end - currentCycleEndSegment.start);
        const currentCycleEndXForNextTransition = currentCycleEndActionPos.x + cardStartXOffset;

        const targetNextX = nextActionPos.x + cardStartXOffset;
        const nextTransitionProgress = localDPlusDelta / pathTransitionSmoothingDist;
        nextX = currentCycleEndXForNextTransition + (targetNextX - currentCycleEndXForNextTransition) * nextTransitionProgress;
    }

    let angleRad = Math.atan2(nextY - currentY, nextX - currentX);
    let angleDeg = angleRad * (180 / Math.PI);

    angleDeg += 90;

    return { x: currentX, y: currentY, angle: angleDeg, segmentType: seg.type };
}

const tunnelSegmentsData: TIunnelSegment[] = [
    { start: 0, end: halfHorizontal, action: (t: number) => ({ x: effectiveCardWidth / 2 + t, y: 0 }), type: 'horizontal' },
    { start: halfHorizontal, end: halfHorizontal + arcLen, action: (t: number) => { const angle = -Math.PI / 2 + (t / arcLen) * (Math.PI / 2); return { x: effectiveCardWidth - borderRadius + borderRadius * Math.cos(angle), y: borderRadius + borderRadius * Math.sin(angle), }; }, type: 'arc' },
    { start: halfHorizontal + arcLen, end: halfHorizontal + arcLen + straightLen, action: (t: number) => ({ x: effectiveCardWidth, y: borderRadius + t }), type: 'vertical-down' },
    { start: halfHorizontal + arcLen + straightLen, end: halfHorizontal + 2 * arcLen + straightLen, action: (t: number) => { const angle = 0 + (t / arcLen) * (Math.PI / 2); return { x: effectiveCardWidth - borderRadius + borderRadius * Math.cos(angle), y: (borderRadius + straightLen) + borderRadius * Math.sin(angle), }; }, type: 'arc' },
    { start: halfHorizontal + 2 * arcLen + straightLen, end: halfHorizontal + 2 * arcLen + straightLen + fullHorizontal, action: (t: number) => ({ x: effectiveCardWidth - borderRadius - t, y: 2 * borderRadius + straightLen }), type: 'horizontal' },
    { start: halfHorizontal + 2 * arcLen + straightLen + fullHorizontal, end: halfHorizontal + 3 * arcLen + straightLen + fullHorizontal, action: (t: number) => { const cx = borderRadius; const cy = 3 * borderRadius + straightLen; const current_angle = -Math.PI / 2 - (t / arcLen) * (Math.PI / 2); return { x: cx + borderRadius * Math.cos(current_angle), y: cy + borderRadius * Math.sin(current_angle) }; }, type: 'arc' },
    { start: halfHorizontal + 3 * arcLen + straightLen + fullHorizontal, end: halfHorizontal + 3 * arcLen + 2 * straightLen + fullHorizontal, action: (t: number) => { const y_start_seg7 = 3 * borderRadius + straightLen; return { x: 0, y: y_start_seg7 + t }; }, type: 'vertical-down' },
    { start: halfHorizontal + 3 * arcLen + 2 * straightLen + fullHorizontal, end: cycleLength, action: (t: number) => { const angle = Math.PI + (t / arcLen) * (Math.PI / 2); const y_start_seg8 = 3 * borderRadius + 2 * straightLen; return { x: borderRadius + borderRadius * Math.cos(angle), y: y_start_seg8 - borderRadius * Math.sin(angle) }; }, type: 'arc' },
];

const Home: React.FC = () => {
    const animatedScrollY = useRef(new Animated.Value(0)).current;

    const initialDist = 0;
    const initialCalculation = calculatePositionByDist(initialDist, tunnelSegmentsData);
    const initialPoint: IPoint = { ...initialCalculation, dist: initialDist, angle: initialCalculation.angle };

    const [pos, setPos] = useState<IPoint>(initialPoint);
    const [trailPoints, setTrailPoints] = useState<IPoint[]>([initialPoint]);
    const [viewBoxY, setViewBoxY] = useState<number>(
        initialPoint.y - visibleSvgViewHeight * iconTargetYOnScreenProportion
    );
    const [specialMarkerPoints, setSpecialMarkerPoints] = useState<IMarkerPoint[]>([]);
    const [iconOpacity, setIconOpacity] = useState(1.0);
    const [hasScrolled, setHasScrolled] = useState(false); // New state for scroll status

    const lastScrollOffset = useRef(0);
    const currentTotalDist = useRef(initialDist);
    const prevTotalDist = useRef(initialDist);
    const tunnelSegments = useRef<TIunnelSegment[]>(tunnelSegmentsData);

    useEffect(() => {
        const initialCycleCount = Math.floor(initialDist / cycleLength);
        let initialMarkers: IMarkerPoint[] = [];

        allMarkerDistancesInCycle.forEach(markerBaseDist => {
            const markerGlobalDist = markerBaseDist + initialCycleCount * cycleLength;
            if (initialDist >= markerGlobalDist) {
                const posCalc = calculatePositionByDist(markerGlobalDist, tunnelSegments.current);
                if (!initialMarkers.find(p => p.dist === markerGlobalDist)) {
                    initialMarkers.push({ x: posCalc.x, y: posCalc.y, dist: markerGlobalDist, cycle: initialCycleCount });
                }
            }
        });
        if (initialMarkers.length > 0) {
            setSpecialMarkerPoints(prev => [...prev, ...initialMarkers].filter((v, i, a) => a.findIndex(t => (t.dist === v.dist)) === i));
        }

        const { segmentType: initialSegmentType } = calculatePositionByDist(initialDist, tunnelSegments.current);
        let calculatedInitialOpacity = 1.0;
        if (initialSegmentType === 'arc' || initialSegmentType === 'vertical-down') {
            calculatedInitialOpacity = iconMinOpacity;
        }

        const initialLocalD = initialDist % cycleLength;
        const initialSegmentIndex = tunnelSegments.current.findIndex(s => initialLocalD >= s.start && initialLocalD <= s.end);
        if (initialSegmentType === 'arc' && initialSegmentIndex === 7) {
            const distToEndOfCycle = cycleLength - initialLocalD;
            if (distToEndOfCycle < iconFadePathDistance && distToEndOfCycle >= 0) {
                const progress = 1.0 - (distToEndOfCycle / iconFadePathDistance);
                calculatedInitialOpacity = iconMinOpacity + progress * (1.0 - iconMinOpacity);
            }
        }
        setIconOpacity(Math.max(iconMinOpacity, Math.min(1.0, calculatedInitialOpacity)));

    }, []);

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const yScrollOffset = e.nativeEvent.contentOffset.y;

        animatedScrollY.setValue(yScrollOffset);

        if (!hasScrolled && yScrollOffset > 0) {
            setHasScrolled(true);
        }

        const scrollDeltaY = yScrollOffset - lastScrollOffset.current;

        if (Math.abs(scrollDeltaY) < 0.01 && yScrollOffset === lastScrollOffset.current) {
            if (Math.abs(scrollDeltaY) < 1e-5) return;
        }


        const ctdAtFrameStart = currentTotalDist.current;

        let pathDistScrollFactor = 0.5;
        const cycleAtFrameStart = Math.floor(ctdAtFrameStart / cycleLength);
        const localDAtFrameStart = ctdAtFrameStart % cycleLength;

        if (cycleAtFrameStart > 0 && localDAtFrameStart < pathTransitionSmoothingDist) {
            pathDistScrollFactor = 0.15;
        }

        prevTotalDist.current = ctdAtFrameStart;
        currentTotalDist.current = Math.max(0, ctdAtFrameStart + scrollDeltaY * pathDistScrollFactor);


        const newCalculatedData = calculatePositionByDist(currentTotalDist.current, tunnelSegments.current);
        const newPosWithDist: IPoint = { x: newCalculatedData.x, y: newCalculatedData.y, angle: newCalculatedData.angle, dist: currentTotalDist.current };
        setPos(newPosWithDist);

        let targetOpacity = 1.0;
        if (newCalculatedData.segmentType === 'arc' || newCalculatedData.segmentType === 'vertical-down') {
            targetOpacity = iconMinOpacity;
        }

        const localD = currentTotalDist.current % cycleLength;
        const currentSegment = tunnelSegments.current.find(s => localD >= s.start && localD <= s.end);

        if (currentSegment && currentSegment.type === 'arc') {
            const segment8 = tunnelSegments.current[7];
            if (currentSegment.start === segment8.start && currentSegment.end === segment8.end) {
                const distToEndOfCycle = cycleLength - localD;
                if (distToEndOfCycle < iconFadePathDistance && distToEndOfCycle >= 0) {
                    const progress = 1.0 - (distToEndOfCycle / iconFadePathDistance);
                    targetOpacity = iconMinOpacity + progress * (1.0 - iconMinOpacity);
                }
            }
        }
        setIconOpacity(Math.max(iconMinOpacity, Math.min(1.0, targetOpacity)));

        const currentCycle = Math.floor(currentTotalDist.current / cycleLength);
        let newlyAddedMarkers: IMarkerPoint[] = [];
        allMarkerDistancesInCycle.forEach(markerBaseDist => {
            const markerDistInCurrentCycle = markerBaseDist + currentCycle * cycleLength;

            if (prevTotalDist.current < markerDistInCurrentCycle && currentTotalDist.current >= markerDistInCurrentCycle) {
                const markerPosCalc = calculatePositionByDist(markerDistInCurrentCycle, tunnelSegments.current);
                newlyAddedMarkers.push({ x: markerPosCalc.x, y: markerPosCalc.y, dist: markerDistInCurrentCycle, cycle: currentCycle });
            }
        });
        setSpecialMarkerPoints(prevMarkers => {
            const updatedMarkers = [...prevMarkers];
            newlyAddedMarkers.forEach(newMarker => {
                if (!updatedMarkers.find(p => p.dist === newMarker.dist)) {
                    updatedMarkers.push(newMarker);
                }
            });
            return updatedMarkers.filter(marker => marker.dist <= currentTotalDist.current);
        });

        if (yScrollOffset > lastScrollOffset.current) {
            setTrailPoints(prevTrailPoints => {
                const lastPoint = prevTrailPoints.length > 0 ? prevTrailPoints[prevTrailPoints.length - 1] : initialPoint;
                const distanceDelta = newPosWithDist.dist - lastPoint.dist;
                let pointsToAdd: IPoint[] = [];
                if (distanceDelta > maxTrailInterpolationStep) {
                    const numSteps = Math.ceil(distanceDelta / maxTrailInterpolationStep);
                    for (let i = 1; i < numSteps; i++) {
                        const intermediateDist = lastPoint.dist + i * (distanceDelta / numSteps);
                        // Pass tunnelSegments.current
                        const intermediatePosData = calculatePositionByDist(intermediateDist, tunnelSegments.current);
                        pointsToAdd.push({ x: intermediatePosData.x, y: intermediatePosData.y, angle: intermediatePosData.angle, dist: intermediateDist });
                    }
                }
                pointsToAdd.push(newPosWithDist);
                return [...prevTrailPoints, ...pointsToAdd];
            });
        }
        else {
            setTrailPoints(prevTrailPoints => {
                const newTrail = prevTrailPoints.filter(p => p.dist <= newPosWithDist.dist);
                if (newTrail.length === 0 || (newTrail.length > 0 && newTrail[newTrail.length - 1].dist < newPosWithDist.dist)) {
                    return [...newTrail, newPosWithDist];
                }
                if (newTrail.length > 0 && newTrail[newTrail.length - 1].dist === newPosWithDist.dist) {
                    return newTrail;
                }
                return [...newTrail, newPosWithDist];
            });
        }
        lastScrollOffset.current = yScrollOffset;

        setViewBoxY(newPosWithDist.y - visibleSvgViewHeight * iconTargetYOnScreenProportion);
    };

    const derivedTrailD = trailPoints.length > 1 ?
        `M ${trailPoints[0].x},${trailPoints[0].y}` +
        trailPoints.slice(1).map(p => `L${p.x},${p.y}`).join('') :
        (trailPoints.length === 1 ? `M ${trailPoints[0].x},${trailPoints[0].y}` : '');

    return (
        <GestureHandlerRootView style={styles.gestureHandlerRoot}>
            <View style={StyleSheet.absoluteFillObject}>
                <RootPageBackground scrollY={animatedScrollY} />
            </View>

            <View style={styles.mainContentContainer}>
                <View style={styles.background} pointerEvents="none">
                    <Svg
                        width="100%"
                        height="100%"
                        viewBox={`${0} ${viewBoxY} ${screenWidth - 40} ${visibleSvgViewHeight}`}>
                        <Path
                            d={derivedTrailD}
                            stroke="#AFDDFF"
                            strokeWidth={2}
                            strokeOpacity={0.7}
                            fill="none"
                        />
                        <Circle
                            cx={initialPoint.x}
                            cy={initialPoint.y}
                            r={startMarkerRadius}
                            fill={startMarkerColor}
                        />
                        <Circle
                            cx={initialPoint.x}
                            cy={initialPoint.y}
                            r={startMarkerBorderRadius}
                            fill="none"
                            stroke={startMarkerBorderColor}
                            strokeWidth={startMarkerBorderThickness}
                        />
                        <Line
                            x1={initialPoint.x}
                            y1={initialPoint.y - startMarkerRadius - markerStyleConfig.gap - startMarkerBorderThickness} // Top of border
                            x2={initialPoint.x}
                            y2={initialPoint.y - startMarkerRadius - markerStyleConfig.gap - startMarkerBorderThickness - startMarkerLineLength} // End of line
                            stroke={startMarkerLineColor}
                            strokeWidth={startMarkerLineThickness}
                        />
                        {
                            specialMarkerPoints.map(marker => (
                                <React.Fragment key={`marker-${marker.dist}`}>
                                    <Circle
                                        cx={marker.x}
                                        cy={marker.y}
                                        r={markerStyleConfig.fillRadius}
                                        fill={markerStyleConfig.fillColor}
                                    />
                                    <Circle
                                        cx={marker.x}
                                        cy={marker.y}
                                        r={markerBorderStrokeRadius}
                                        fill="none"
                                        stroke={markerStyleConfig.borderColor}
                                        strokeWidth={markerStyleConfig.borderThickness}
                                    />
                                </React.Fragment>
                            ))
                        }

                        {
                            hasScrolled && (
                                <>
                                    <Path
                                        d={arrowSvgPath}
                                        fill="none"
                                        stroke={arrowBorderColor}
                                        strokeWidth={borderStrokeWidth}
                                        transform={`translate(${pos.x}, ${pos.y}) rotate(${pos.angle}) scale(${borderScale})`}
                                        opacity={iconOpacity}
                                    />
                                    <Path
                                        d={arrowSvgPath}
                                        fill={arrowColor}
                                        transform={`translate(${pos.x}, ${pos.y}) rotate(${pos.angle}) scale(${iconScale})`}
                                        opacity={iconOpacity}
                                    />
                                </>
                            )
                        }
                    </Svg>
                </View>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={{ height: cycleVertical * 50 + screenWidth }}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                />
            </View>
        </GestureHandlerRootView>
    );
};


export default Home;
