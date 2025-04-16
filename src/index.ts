import { Selection } from "./selection";
import { getOptions, highlightChartData } from "./utils";

const states = new WeakMap();
export default {
    id: "selectdrag",

    start: (chart, _args, options) => {
        // Check if enabled
        if(!chart?.config?.options?.plugins?.selectdrag?.enabled) {
            return;
        }

        // Get chart canvas
        const canvasElement = chart.canvas;
        canvasElement.style.cursor = 'crosshair';

        // Add listen events
        canvasElement.addEventListener("mousedown", (e) => {
            // Get state
            const selection: Selection = states.get(chart) || new Selection();

            // Check for drag?
            if(selection.isDrag(e)) {
                selection.handleDragStart(chart, e);
            } else {
                selection.handleSelectStart(chart, e);
            }

            states.set(chart, selection);
        });

        canvasElement.addEventListener('mousemove', (e) => {
            // Get existing selection
            const selection: Selection = states.get(chart);
            if(!selection) { return; }

            if(selection.isSelecting === true) {
                selection.handleSelectMove(chart, e);
            }

            if(selection.isDragging == true) {
                selection.handleDragMove(chart, e);
            }

            if(!selection.isDragging && !selection.isSelecting) {
                selection.handleSelectHover(chart, e);
            }

            states.set(chart, selection);
        });

        // Draw end
        let mouseUpTimeout;
        window.addEventListener("mouseup", (e) => {
            // Get existing selection
            const selection: Selection = states.get(chart);
            if(!selection) { return; }

            const selectComplete = (selection) => {
                clearTimeout(mouseUpTimeout);
                mouseUpTimeout = setTimeout(() => {
                    const pluginOptions = getOptions(chart);
                    if(pluginOptions.onSelectComplete) {
                        const range = selection.values.getRange();
                        if(range.length > 0) {
                            pluginOptions.onSelectComplete({
                                range: range,
                                boundingBox: [
                                    selection.selection.start.x,
                                    [
                                        selection.selection.end.x,
                                        selection.selection.start.y,
                                    ],
                                    selection.selection.end,
                                    [
                                        selection.selection.start.x,
                                        selection.selection.end.y,
                                    ]
                                ]
                            });
                        }
                    }
                }, 500);
            }

            if(selection.isSelecting == true) {
                selection.handleSelectEnd(chart, e);
                selectComplete(selection);
            }

            if(selection.isDragging == true) {
                selection.handleDragEnd(chart, e);
                selectComplete(selection);
            }

            states.set(chart, selection);
            chart.update();
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
        highlightChartData(chart, states.get(chart) || null);
    },

    afterDraw: (chart, args, options) => {
        // Check drawing status
        const selection: Selection = states.get(chart);
        if(!selection?.selection || (selection?.isSelecting === false && !selection.selection.end?.x)) {
            return;
        }

        selection.draw(chart, getOptions(chart));
    },

    setSelection: (chart, range = []) => {
        // Check has data
        if(chart.data.labels.length === 0 || chart.data.datasets.length === 0) {
            return;
        }

        // Check if new data blank
        if(range.length === 0) {
            // Clear selection
            states.delete(chart);
            chart.update();
            return;
        }

        // Creat new selection
        const selection = new Selection();

        // Set range and store
        selection.set(chart, range); states.set(chart, selection);

        // Update chart with selection
        chart.update();
    },

    clearSelection: (chart) => {
        // Clear state
        states.delete(chart);
        chart.update();
    }
}