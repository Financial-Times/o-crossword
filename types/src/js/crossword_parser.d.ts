declare function parseWhateverItIs(text: any): {
    version: string;
    author: string;
    editor: string;
    publisher: string;
    copyright: string;
    pubdate: string;
    dimensions: string;
    across: any[];
    down: any[];
    errors: any[];
    originalDSL: any;
};
declare function parseWhateverItIsIntoSpecJson(text: any): string;
export { parseWhateverItIs as whateverItIs, parseWhateverItIsIntoSpecJson as intoSpecJson };
