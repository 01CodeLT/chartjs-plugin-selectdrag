import { Values } from "./values";

const RESIZE_TAB_SIZE = 6;

export class Selection {

    values = new Values();

    isSelecting = false;
    selection: {
        start: { x: number, y: number },
        end?: { x: number, y: number },
    };

    isDragging = false;
    drag: { lastXY: { x: number, y: number }, type: string };

    set(chart, range) {
        // Set values
        this.values.setRange(chart, range);
        this.selection = {
            start: {
                x: chart.scales.x.getPixelForValue(this.values._start.axisValue),
                y: 0
            },
            end: {
                x: chart.scales.x.getPixelForValue(this.values._end.axisValue),
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
            this.drag.lastXY = { x: e.offsetX, y: e.offsetY };
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
            this.drag.lastXY = { x: e.offsetX, y: e.offsetY };
        } else {
            // Get diff
            const xDiff = e.offsetX - this.drag.lastXY.x;
            const yDiff = e.offsetY - this.drag.lastXY.y;

            const yStartNew = this.selection.start.y + yDiff;
            const yEndNew = this.selection.end.y + yDiff;

            // Set new selection
            this.selection = {
                start: { 
                    x: (this.selection.start.x + xDiff) < chart.chartArea.left ? chart.chartArea.left : this.selection.start.x + xDiff,
                    y: yStartNew < 0 || yStartNew > chart.chartArea.height ? 1 : yStartNew
                },
                end: { 
                    x: (this.selection.end.x + xDiff) > chart.chartArea.right ? chart.chartArea.right : this.selection.end.x + xDiff,
                    y: yEndNew < 0 || yEndNew > chart.chartArea.height ? chart.chartArea.height : yEndNew
                },
            };

            // Last xy not used
            console.log(this.selection)
            if(
                (this.selection.start.x + xDiff) < chart.chartArea.left || 
                (this.selection.end.x + xDiff) > chart.chartArea.right
            ) {
                return;
            }

            this.drag.lastXY = { x: e.offsetX, y: e.offsetY };
        }

        // Store and render
        chart.render();
    }

    handleDragEnd(chart, e) {
        // Save dragging state
        this.isDragging = false;
        chart.canvas.style.cursor = 'crosshair';

        // Save values
        this.values.start(chart, { offsetX: this.selection.start.x, offsetY: this.selection.start.y });
        this.values.end(chart, { offsetX: this.selection.end.x, offsetY: this.selection.end.y });
    }

    handleSelectStart(chart, e) {
        // Get elements
        const axisElements = chart.getElementsAtEventForMode(e, "index", { intersect: false });
        if(axisElements.length === 0) { return; }

        // Save selection state
        this.isSelecting = true;

        // Store values
        this.values.start(chart, e);
        this.selection = { start: { x: e.offsetX, y: e.offsetY }, end: { x: 0, y:0 }}
    }

    handleSelectHover(chart, e) {
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

        // Set end values
        this.values.end(chart, e);
        if(e.offsetX < this.selection.start.x) {
            this.selection = { start: { x: e.offsetX, y: e.offsetY }, end: JSON.parse(JSON.stringify(this.selection.start)) }
            this.values.swap();
        } else {
            this.selection.end = { x: e.offsetX, y: e.offsetY  }
        }
    }
}