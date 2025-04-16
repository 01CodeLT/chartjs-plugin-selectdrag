import { Values } from "./values";

const RESIZE_TAB_SIZE = 6;

export class Selection {

    values = new Values();

    isSelecting = false;
    selection: {
        start: { x: number, y: number, pageX?: number; },
        end?: { x: number, y: number },
    };

    isDragging = false;
    drag: { lastXY: { x: number, y: number }, type: string };

    set(chart, range) {
        // Set values
        this.values.setRange(chart, range);
        this.selection = {
            start: {
                x: chart.scales.x.getPixelForValue(this.values._start.axisValue) || chart.chartArea.left,
                y: 0
            },
            end: {
                x: chart.scales.x.getPixelForValue(this.values._end.axisValue) || chart.chartArea.right,
                y: chart.chartArea.height
            }
        }
    }

    draw(chart, pluginOptions) {
        // Save canvas state
        const {ctx} = chart; ctx.save();

        // Draw user rectangle
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = pluginOptions.colors.selection;
        ctx.fillRect(
            (this.selection.start?.x || 0), chart.chartArea.top,
            (this.selection.end?.x || 0) - (this.selection.start?.x  || 0),
            chart.chartArea.height
        );

        // Add draggable extenders
        if(this.isSelecting == false) {
            ctx.fillStyle = '#acb2b9';
            ctx.fillRect(
                ((this.selection.start?.x || 0) - RESIZE_TAB_SIZE), chart.chartArea.top,
                RESIZE_TAB_SIZE, chart.chartArea.height
            );
            ctx.fillRect(
                (this.selection.end?.x || 0), chart.chartArea.top,
                RESIZE_TAB_SIZE, chart.chartArea.height
            );
        }

        // Restore canvas
        ctx.restore();
    }

    isDrag(e) {
        // Check if selection
        if(!this.selection) { return false; }

        // Check for selection
        if(this.isSelecting == true) { return false; }

        // Check if within rect
        if((e.offsetX >= (this.selection.start.x - (RESIZE_TAB_SIZE * 1.2))) && (e.offsetX <= (this.selection.end.x + (RESIZE_TAB_SIZE * 1.2)))) {
            return true;
        }

        return false;
    }

    handleDragStart(chart, e) {
        // Create selection
        this.isDragging = true;

        // Check drag type
        let dragType = 'move';
        if(e.offsetX < this.selection.start.x && e.offsetX > (this.selection.start.x - (RESIZE_TAB_SIZE * 1.2))) {
            // Expand start
            dragType = 'expand-left';
        }else if(e.offsetX > this.selection.end.x && e.offsetX < (this.selection.end.x + (RESIZE_TAB_SIZE * 1.2))) {
            dragType = 'expand-right';
        }

        // Store drag start
        this.drag = { lastXY: { x: e.offsetX, y: e.offsetY }, type: dragType };
    }

    handleDragMove(chart, e) {
        // Set new selection based on drag
        if(this.drag.type == 'expand-left') {
            //  Validate selection
            if(e.offsetX > this.selection.end.x || e.offsetX < chart.chartArea.left) {
                return;
            }

            // Expand start
            this.selection = {
                start: { x: e.offsetX, y: e.offsetY },
                end: this.selection.end,
            };
        } else if(this.drag.type == 'expand-right') {
            //  Validate selection
            if(e.offsetX < this.selection.start.x || e.offsetX > chart.chartArea.right) {
                return;
            }

            // Expand end
            this.selection = {
                start: this.selection.start,
                end: { x: e.offsetX, y: e.offsetY },
            };
        } else {
            // Get diff
            const xDiff = e.offsetX - this.drag.lastXY.x;

            // Validate move
            if(
                (this.selection.start.x + xDiff) < chart.chartArea.left || 
                (this.selection.end.x + xDiff) > chart.chartArea.right
            ) { return; }

            // Set new selection
            this.selection = {
                start: { x: this.selection.start.x + xDiff, y: this.selection.start.y },
                end: { x: this.selection.end.x + xDiff, y: this.selection.end.y },
            };
        }

        // Store and render
        this.drag.lastXY = { x: e.offsetX, y: e.offsetY };
        chart.render();
    }

    handleDragEnd(chart, e) {
        // Save dragging state
        this.isDragging = false;
        chart.canvas.style.cursor = 'crosshair';

        // Save values
        this.values.start(chart, new MouseEvent('mousedown', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: this.selection.start.x,
            clientY: this.selection.start.y
        }));
        this.values.end(chart, new MouseEvent('mouseup', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: this.selection.end.x,
            clientY: this.selection.end.y
        }));
    }

    handleSelectStart(chart, e) {
        // Get elements
        const axisElements = chart.getElementsAtEventForMode(e, "index", { intersect: false });
        if(axisElements.length === 0) { return; }

        // Save selection state
        this.isSelecting = true;

        // Store values
        this.selection = { start: { x: e.offsetX, y: e.offsetY, pageX: e.pageX }, end: { x: 0, y:0 }}
    }

    handleSelectHover(chart, e) {
        if(!this.selection) { return; }

        // Check drag type
        if(e.offsetX < this.selection.start.x && e.offsetX > (this.selection.start.x - (RESIZE_TAB_SIZE * 1.2))) {
            // Expand start
            chart.canvas.style.cursor = 'w-resize';
        } else if(e.offsetX > this.selection.end.x && e.offsetX < (this.selection.end.x + (RESIZE_TAB_SIZE * 1.2))) {
            chart.canvas.style.cursor = 'w-resize';
        } else if(e.offsetX > this.selection.start.x && e.offsetX < this.selection.end.x) {
            chart.canvas.style.cursor = 'move';
        } else {
            chart.canvas.style.cursor = 'crosshair';
        }
    }

    handleSelectMove(chart, e) {
        this.selection.end.x = e.offsetX;
        this.selection.end.y = e.offsetY;
        chart.render();
    }

    handleSelectEnd(chart, e) {
        // Save selection state
        this.isSelecting = false;

        // TO-DO: Calc click radius and clear selection

        // Check whether select is in reverse
        if(e.pageX < this.selection.start.pageX) {
            this.selection = { start: { x: e.offsetX, y: e.offsetY }, end: JSON.parse(JSON.stringify(this.selection.start)) }
        } else {
            this.selection.end = { x: e.offsetX, y: e.offsetY  }
        }

        // Validate selection within chart area
        const chartBounds = chart.canvas.getBoundingClientRect();
        if(e.pageX < chartBounds.left) { this.selection.start.x = chart.chartArea.left; }
        if(e.pageX > chartBounds.right) { this.selection.end.x = chart.chartArea.right; }

        // Store values
        this.values.start(chart, this.selection.start);
        this.values.end(chart, this.selection.end);
    }
}