import { Component, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PexelizeEditorComponent } from "@pexelize/angular-editor";
import type { EditorOptions } from "@pexelize/editor-types";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, PexelizeEditorComponent],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent {
  @ViewChild("editor") editorComponent!: PexelizeEditorComponent;

  isReady = false;

  // ── Editor configuration ────────────────────────────────────────────────────
  // Only non-default options are needed here. Features like preview, undoRedo,
  // stock images, and all tools are enabled by default.

  editorOptions: EditorOptions = {
    appearance: {
      theme: "light" as const,
      accentColor: "indigo" as const,
    },
    // Add your custom options here, e.g.:
    // mergeTags: { customMergeTags: [...] },
    // fonts: { showDefaultFonts: true, customFonts: [...] },
    // tools: { html: { enabled: false } },
  };

  // ── Event handlers ──────────────────────────────────────────────────────────

  onReady(): void {
    this.isReady = true;
    console.log("Editor ready");
  }

  onChange(data: { design: unknown; type: string }): void {
    console.log("Design changed:", data?.type);
  }

  onError(error: Error): void {
    console.error("Error:", error.message);
  }

  // ── Toolbar actions ─────────────────────────────────────────────────────────

  handleNewBlank(): void {
    this.editorComponent?.loadBlank();
  }

  async handleSaveDesign(): Promise<void> {
    const result = await this.editorComponent?.getDesign();
    if (result) {
      console.log("Design saved:", result);
    }
  }

  async handleExportHtml(): Promise<void> {
    const html = await this.editorComponent?.exportHtml();
    if (html) {
      console.log("Exported HTML:", html);
    }
  }

  handleUndo(): void {
    this.editorComponent?.undo();
  }

  handleRedo(): void {
    this.editorComponent?.redo();
  }

  handlePreview(): void {
    this.editorComponent?.showPreview("desktop");
  }
}
