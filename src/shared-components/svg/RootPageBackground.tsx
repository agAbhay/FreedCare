// BackgroundLines.tsx
import React from "react";
import {
    Dimensions,
    StyleSheet,
    Animated,
} from 'react-native';
import { Svg, Path, Defs, LinearGradient, Stop, G, Rect, Mask } from "react-native-svg";

const { width: W, height: H_screen } = Dimensions.get('window'); // Renamed H to H_screen to avoid conflict

// These are from your SVG's viewBox
const PATTERN_VIEWBOX_WIDTH = 360;

// Original Y coordinates of the pattern content
const ORIGINAL_CONTENT_MIN_Y = 100;
const ORIGINAL_CONTENT_MAX_Y = 400 + 9 * 15; // 535
// New viewBox height is the actual height of the drawn content
const PATTERN_VIEWBOX_HEIGHT = ORIGINAL_CONTENT_MAX_Y - ORIGINAL_CONTENT_MIN_Y; // 535 - 100 = 435

// Calculate the height of one pattern unit when its width is scaled to screen width
const SCALED_PATTERN_UNIT_HEIGHT = W * (PATTERN_VIEWBOX_HEIGHT / PATTERN_VIEWBOX_WIDTH);
const SCALE_FACTOR = W / PATTERN_VIEWBOX_WIDTH; // Uniform scaling factor

const PARALLAX_FACTOR = 0.3; // Positive: background scrolls up (slower) as user scrolls down.
const MASK_ID = 'bottomFadeMask';
const LINE_GRADIENT_ID = 'lineGradient';

// Component to render one instance of your defined 10 paths
const UserPatternPaths: React.FC = () => (
    <G>
        {[...Array(10)].map((_, i) => {
            // Adjust Y coordinates to be relative to 0 within the new PATTERN_VIEWBOX_HEIGHT
            const y1_orig = 100 + i * 10;
            const c1y_orig = 100 + i * 30;
            const c2y_orig = 200 + i * 20;
            const y2_orig = 400 + i * 15;

            const d = `
                M 0 ${y1_orig - ORIGINAL_CONTENT_MIN_Y}
                C 60 ${c1y_orig - ORIGINAL_CONTENT_MIN_Y}, 300 ${c2y_orig - ORIGINAL_CONTENT_MIN_Y}, 360 ${y2_orig - ORIGINAL_CONTENT_MIN_Y}
            `;
            return (
                <Path
                    key={`userpath-${i}`}
                    d={d}
                    fill="none"
                    stroke={`url(#${LINE_GRADIENT_ID})`}
                    strokeWidth="0.5"
                />
            );
        })}
    </G>
);

interface Props {
    scrollY: Animated.Value;
}

const RootPageBackground: React.FC<Props> = ({ scrollY }) => {
    // Calculate continuous scroll distance for parallax effect
    const parallaxScrollDistance = Animated.multiply(scrollY, PARALLAX_FACTOR);

    // Loop this distance
    const loopedPositiveDistance = Animated.modulo(parallaxScrollDistance, SCALED_PATTERN_UNIT_HEIGHT);

    // Convert to negative translateY for upward scrolling parallax
    const containerTranslateY = Animated.multiply(loopedPositiveDistance, -1);

    // The SVG container needs to be tall enough to hold two pattern units
    const svgContainerHeight = SCALED_PATTERN_UNIT_HEIGHT * 2;

    return (
        <Animated.View
            style={[
                StyleSheet.absoluteFill,
                { transform: [{ translateY: containerTranslateY }] },
            ]}
            pointerEvents="none"
        >
            <Svg
                width={W} // SVG takes full screen width
                height={svgContainerHeight} // SVG is tall enough for two patterns
                style={{ position: 'absolute', top: 0, left: 0 }}
            >
                <Defs>
                    {/* Gradient for the path strokes (from your SVG) */}
                    <LinearGradient id={LINE_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="#AFCDFB" stopOpacity="0.6" />
                        <Stop offset="1" stopColor="#AFCDFB" stopOpacity="0.1" />
                    </LinearGradient>

                    {/* Gradient for the bottom fade mask */}
                    <LinearGradient id="fadeGradientDef" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="white" stopOpacity="1" />
                        {/* Start fading further up if SCALED_PATTERN_UNIT_HEIGHT is very large, adjust as needed */}
                        <Stop offset="80%" stopColor="white" stopOpacity="1" />
                        <Stop offset="100%" stopColor="white" stopOpacity="0" />
                    </LinearGradient>
                    <Mask id={MASK_ID}>
                        <Rect x="0" y="0" width={W} height={svgContainerHeight} fill="url(#fadeGradientDef)" />
                    </Mask>
                </Defs>

                {/* Apply scaling and mask to the group containing the patterns */}
                <G transform={`scale(${SCALE_FACTOR})`} mask={`url(#${MASK_ID})`}>
                    {/* Render the first instance of the pattern */}
                    <UserPatternPaths />
                    {/* Render the second instance, translated down by the original viewBox height */}
                    <G transform={`translate(0, ${PATTERN_VIEWBOX_HEIGHT})`}>
                        <UserPatternPaths />
                    </G>
                </G>
            </Svg>
        </Animated.View>
    );
};

export default RootPageBackground;
