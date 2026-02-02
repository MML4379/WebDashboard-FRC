export interface View {
    mount: (parent: HTMLElement) => void;
    unmount: () => void;
}