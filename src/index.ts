/**
 * Pexelize Angular Editor
 *
 * Angular wrapper for the Pexelize Editor SDK.
 *
 * @packageDocumentation
 */

// Export the component
export { PexelizeEditorComponent } from "./pexelize-editor.component";
export type { EditorContentTypeValue } from "./pexelize-editor.component";

// Export the module
export { PexelizeEditorModule } from "./pexelize-editor.module";

// Re-export all SDK types from the shared types package
export * from "@pexelize/editor-types";
