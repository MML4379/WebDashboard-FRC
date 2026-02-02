import { View } from "../../router/types";

export class Home implements View {
    private container: HTMLElement | null = null;
    private animFrameId: number | null = null;

    mount(parent: HTMLElement) {
        this.container = document.createElement('div');
        this.container.className = 'page';

        // initial render
        this.container.innerHTML = ``;
    }

    unmount() {
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
        }
    }
}