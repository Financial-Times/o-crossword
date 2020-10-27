export = OCrossword;
declare function OCrossword(rootEl: any): void;
declare class OCrossword {
    constructor(rootEl: any);
    rootEl: any;
    assemble(): void;
    onResize: any;
    addEventListener(el: any, type: any, callback: any): void;
    listeners: any[];
    removeAllEventListeners(): void;
    destroy(): void;
}
