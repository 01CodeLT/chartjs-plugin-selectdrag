// Store chart data
const states = new WeakMap();
const getState = (chart) => {
    const state = states.get(chart);
    return state || null;
}
const setState = (chart, updatedState) => {
    const originalState = getState(chart);
    states.set(chart, Object.assign({}, originalState, updatedState));
    return updatedState;
}

// Store options
const pluginOptions = {
    colors: {
        selection: "#e8eff6", selectedElements: "#1f77b4", unselectedElements: "#cccccc"
    }
};

// Export main plugin
export default {
    id: "selectdrag",

    start: (chart, _args, options) => {
        // Check if enabled
        if(!chart?.config?.options?.plugins?.selectdrag?.enabled) {
            return;
        }

        // Get chart canvas
        const canvasElement = chart.canvas;

        // Draw begin
        canvasElement.addEventListener("mousedown", (e) => {
            // Get elements
            const axisElements = chart.getElementsAtEventForMode(e, "index", { intersect: false });
            if(axisElements.length === 0) { return; }

            // Get axis value
            const axisIndex = chart.getElementsAtEventForMode(e, "index", { intersect: false })[0].index;
            const axisValue = chart.data.labels[axisIndex];

            // Set selection origin
            setState(chart, {
                selectionXY: {
                    drawing: true,
                    start: { axisValue, axisIndex, x: e.offsetX, y: e.offsetY },
                    end: {}
                }
            });
        });

        // Draw end
        window.addEventListener("mouseup", (e) => {
            // Check drawing status
            const state = getState(chart);
            if(!state || state?.selectionXY?.drawing === false) {
                return;
            }

            // Get axis value
            const axisElements = chart.getElementsAtEventForMode(e, "index", { intersect: false });
            const axisIndex = axisElements.length > 0 ? axisElements[0].index : chart.data.labels.length - 1;
            const axisValue = chart.data.labels[axisIndex];

            // Check values & set end origin
            if(state.selectionXY.start.axisIndex > axisIndex) {
                // Switch values - user has selected opposite way
                state.selectionXY.end = JSON.parse(JSON.stringify(state.selectionXY.start));
                state.selectionXY.start =  { axisValue, axisIndex, x: e.offsetX, y: e.offsetY }
            } else {
                // Set end origin
                state.selectionXY.end = { axisValue, axisIndex, x: e.offsetX, y: e.offsetY };
            }

            // End drawing
            state.selectionXY.drawing = false;
            setState(chart, state);

            // Render rectangle
            chart.update();

            // Emit event
            const selectCompleteCallback = chart?.config?.options?.plugins?.selectdrag?.onSelectComplete;
            if(selectCompleteCallback) {
                selectCompleteCallback({
                    range: [
                        state.selectionXY.start.axisValue,
                        state.selectionXY.end.axisValue
                    ],
                    boundingBox: [
                        state.selectionXY.start,
                        [
                            state.selectionXY.end.x,
                            state.selectionXY.start.y,
                        ],
                        state.selectionXY.end,
                        [
                            state.selectionXY.start.x,
                            state.selectionXY.end.y,
                        ]
                    ]
                });
            }
        });

        // Draw extend
        canvasElement.addEventListener("mousemove", (e) => {
            // Check drawing status
            const state = getState(chart);
            if(!state || state?.selectionXY?.drawing === false) {
                return;
            }

            // Set end origin
            state.selectionXY.end = { x: e.offsetX, y: e.offsetY };
            chart.render();
            setState(chart, state);
        });
    },

    beforeUpdate: (chart, args, options) => {
        // Check if enabled
        if(!chart?.config?.options?.plugins?.selectdrag?.enabled) {
            return;
        }

        // Check drawing status
        const state = getState(chart);

        // Set highlighted
        chart.data.datasets = chart.data.datasets.map((dataset) => {
            dataset.backgroundColor = chart.data.labels.map((value, index) => {
                if(!state || !state?.selectionXY?.start?.x || !state?.selectionXY?.end?.x) {
                    // Show default
                    return pluginOptions.colors.selectedElements;
                } else {
                    // Show selected/unselected
                    if(index >= state.selectionXY.start?.axisIndex && index <= state.selectionXY.end?.axisIndex) {
                        return pluginOptions.colors.selectedElements;
                    } else {
                        return pluginOptions.colors.unselectedElements;
                    }
                }
            });
            return dataset;
        });
    },

    afterDraw: (chart, args, options) => {
        // Check drawing status
        const state = getState(chart);
        if(!state || (state?.selectionXY?.drawing === false && !state.selectionXY.end?.x)) {
            return;
        }

        // Save canvas state
        const {ctx} = chart;
        ctx.save();

        // Draw user rectangle
        ctx.globalCompositeOperation = "destination-over";

        // Draw selection
        ctx.fillStyle = pluginOptions.colors.selection;
        ctx.fillRect(
            (state.selectionXY.start?.x || 0), chart.chartArea.top,
            (state.selectionXY.end?.x || 0) - (state.selectionXY.start?.x  || 0),
            chart.chartArea.height
        );

        // Restore canvas
        ctx.restore();
    },

    setSelection: (chart, range = []) => {
        // Check has data
        if(chart.data.labels.length === 0 || chart.data.datasets.length === 0) {
            return;
        }

        // Check if new data blank
        if(range.length === 0) {
            // Clear selection
            setState(chart, null);
            chart.update();
        }

        // Create state
        const state = {
            selectionXY: {
                drawing: false,
                start: {},
                end: {}
            }
        };

        // Set start axis
        const startAxisIndex = chart.data.labels.findIndex((item) => item === range[0]);
        state.selectionXY.start = {
            axisValue: range[0],
            axisIndex: startAxisIndex,
            x: chart.scales.x.getPixelForValue(chart.data.labels[startAxisIndex]),
            y: 0
        }

        // Set end axis
        const endAxisIndex = chart.data.labels.findIndex((item) => item === range[1]);
        state.selectionXY.end = {
            axisValue: range[0],
            axisIndex: endAxisIndex,
            x: chart.scales.x.getPixelForValue(chart.data.labels[endAxisIndex]),
            y: chart.chartArea.height
        }

        setState(chart, state);
        chart.update();
    },

    clearSelection: (chart) => {
        // Clear state
        setState(chart, null);
        chart.update();
    }
}