declare module "pdf-parse" {
  export type PdfTextResult = {
    text: string;
  };

  export class PDFParse {
    constructor(options: { data: Buffer | Uint8Array | ArrayBuffer });
    getText(): Promise<PdfTextResult>;
    destroy(): Promise<void>;
  }
}
