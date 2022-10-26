/// <reference types="astro/client" />

declare global {
  namespace JSX {
    interface IntrinsicElements {
      content: any;
      category: any;
    }
  }
}
