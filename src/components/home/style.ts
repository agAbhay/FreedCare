import { Dimensions, StyleSheet } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const VISIBLE_SVG_VIEW_HEIGHT = SCREEN_HEIGHT * 0.75;

const styles = StyleSheet.create({
    gestureHandlerRoot: {
        flex: 1,
    },
    mainContentContainer: {
        flex: 1,
        alignItems: 'center',
    },
    background: {
        position: 'absolute',
        top: 50,
        width: SCREEN_WIDTH - 40,
        height: VISIBLE_SVG_VIEW_HEIGHT,
        overflow: 'hidden',
    },
    scroll: {
        marginTop: 50,
        width: SCREEN_WIDTH - 40,
    },
});


export default styles;