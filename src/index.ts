// Store chart data
const states = new WeakMap();
const getState = (chart) => {
    const state = states.get(chart);
    return state || null;
}
const setState = (chart, updatedState) => {
    const originalState = getState(chart);
    states.set(
        chart, 
        updatedState == null ? null : Object.assign({}, originalState, updatedState)
    );
    return updatedState;
}

// Store options
const pluginOptions = {
    output: 'label',
    highlight: true,
    colors: {
        selection: "#e8eff6",
        selected: "#1f77b4", // Unused if backgroundColorDefault set on dataset
        unselected: "#cccccc"
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

            // Create state
            const state = {
                selectionXY: {
                    drawing: true,
                    start: { axisValue: null, axisIndex: null, x: e.offsetX, y: e.offsetY },
                    end: {}
                }
            };

            // Get axis value
            const output = chart?.config?.options?.plugins?.selectdrag?.output || pluginOptions.output;
            ({
                'label': () => {
                    const axisIndex = chart.getElementsAtEventForMode(e, "index", { intersect: false })[0].index;
                    state.selectionXY.start.axisIndex = axisIndex;
                    state.selectionXY.start.axisValue = chart.data.labels[axisIndex];
                },
                'value': () => {
                    // Get value by scale
                    state.selectionXY.start.axisValue = chart.scales.x.getValueForPixel(e.offsetX);
                },
            })[output]();

            // Set selection origin
            setState(chart, state);
        });

        // Draw end
        window.addEventListener("mouseup", (e) => {
            // Check drawing status
            const state = getState(chart);
            if(!state || state?.selectionXY?.drawing === false) {
                return;
            }

            // Get axis value
            const output = chart?.config?.options?.plugins?.selectdrag?.output || pluginOptions.output;
            ({
                'label': () => {
                    // Get value by label
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
                },
                'value': () => {
                    // Get value by scale
                    const axisValue = chart.scales.x.getValueForPixel(e.offsetX);
                   
                    // Check values & set end origin
                    if(state.selectionXY.start.axisValue > axisValue) {
                        // Switch values - user has selected opposite way
                        state.selectionXY.end = JSON.parse(JSON.stringify(state.selectionXY.start));
                        state.selectionXY.start =  { axisValue, axisIndex: null, x: e.offsetX, y: e.offsetY }
                    } else {
                        // Set end origin
                        state.selectionXY.end = { axisValue, axisIndex: null, x: e.offsetX, y: e.offsetY };
                    }
                },
            })[output]();

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

        // Check if enabled
        const highlight = chart?.config?.options?.plugins?.selectdrag?.highlight;
        if(highlight !== undefined && highlight == false) { return; }

        // Check drawing status
        const state = getState(chart);

        // Color based on output
        const output = chart?.config?.options?.plugins?.selectdrag?.output || pluginOptions.output;
        const colors = chart?.config?.options?.plugins?.selectdrag?.colors || pluginOptions.colors;
        const backgroundColorCallback = {
            'label': (value, index, defaultColor) => {
                // Show selected/unselected
                if(index >= state.selectionXY.start?.axisIndex && index <= state.selectionXY.end?.axisIndex) {
                    return defaultColor;
                } else {
                    return colors.unselected;
                }
            }, 
            'value': (value, index, defaultColor) => {
                // Show selected/unselected
                const v = value.x || value;
                if(v >= state.selectionXY.start?.axisValue && v <= state.selectionXY.end?.axisValue) {
                    return defaultColor;
                } else {
                    return colors.unselected;
                }
            }
        }[output];

        // Set highlighted
        chart.data.datasets = chart.data.datasets.map((dataset) => {
            dataset.backgroundColor = (
                output == 'value' ? dataset.data : chart.data.labels
            ).map((value, index) => {
                if(!state || !state?.selectionXY?.start?.x || !state?.selectionXY?.end?.x) {
                    // Show default
                    return dataset.backgroundColorDefault || colors.selected;
                } else {
                    // Show selected/unselected
                    return backgroundColorCallback(value, index, dataset.backgroundColorDefault || colors.selected);
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

        // Get output type
        const output = chart?.config?.options?.plugins?.selectdrag?.output || pluginOptions.output;
        const getValue = {
            'label': (v) => {
                const axisIndex = chart.data.labels.findIndex((item) => item === v);
                return { i: axisIndex, v: chart.data.labels[axisIndex] };
            }, 
            'value': (v) => {
                return { i: null, v: v.x || v };
            }
        }[output];

        // Set start axis
        const startValue = getValue(range[0]);
        state.selectionXY.start = {
            axisValue: startValue.v,
            axisIndex: startValue.i,
            x: chart.scales.x.getPixelForValue(startValue.v),
            y: 0
        }

        // Set end axis
        const endValue = getValue(range[1]);
        state.selectionXY.end = {
            axisValue: endValue.v,
            axisIndex: endValue.i,
            x: chart.scales.x.getPixelForValue(endValue.v),
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