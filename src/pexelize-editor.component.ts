/**
 * Pexelize Editor Angular Component
 *
 * An Angular wrapper for the Pexelize Editor SDK.
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  AfterViewInit,
} from "@angular/core";

import type {
  PexelizeSDK,
  PexelizeConfig,
  EditorOptions,
  PexelizeCallbacks,
  DesignJson,
  ModuleData,
  Module,
  ExportHtmlOptions,
  ExportImageOptions,
  ExportImageData,
  ExportPdfOptions,
  ExportPdfData,
  ExportZipOptions,
  ExportZipData,
  PopupConfig,
  PopupValues,
  MergeTag,
  MergeTagGroup,
  MergeTagsConfig,
  SpecialLink,
  SpecialLinkGroup,
  SpecialLinksConfig,
  FontsConfig,
  Language,
  AppearanceConfig,
  ToolsConfig,
  FeaturesConfig,
  AIConfig,
  EditorBehaviorConfig,
  DisplayConditionsConfig,
  EditorMode,
  EditorEventName,
  ViewMode,
  TextDirection,
  PexelizeToolConfig,
  PexelizeWidgetConfig,
  AuditResult,
  AuditOptions,
  AuditCallback,
  // Collaboration types
  CollaborationFeaturesConfig,
  CommentAction,
  UserInfo,
} from "@pexelize/editor-types";

// ============================================================================
// SDK Loading
// ============================================================================

declare global {
  interface Window {
    pexelize?: PexelizeSDK;
    createEditor?: () => PexelizeSDK;
  }
}

const SDK_CDN_URL = "https://sdk.pexelize.com/latest/pexelize-sdk.min.js";

interface SDKModule {
  pexelize: PexelizeSDK;
  createEditor: (config: PexelizeConfig) => PexelizeSDK;
  PexelizeSDK: new () => PexelizeSDK;
}

// Map of URL -> Promise for caching SDK loads per URL
const sdkLoadPromises: Map<string, Promise<SDKModule>> = new Map();

/**
 * Get the SDK URL to use.
 * @param customUrl - Optional custom SDK URL
 * @returns The SDK URL to load
 */
function getSDKUrl(customUrl?: string): string {
  return customUrl || SDK_CDN_URL;
}

/**
 * Create an SDK module from the global pexelize object.
 */
function createSDKModuleFromGlobal(): SDKModule {
  return {
    pexelize: (window as any).pexelize,
    createEditor: (config: PexelizeConfig) => {
      const instance = new (window as any).pexelize.constructor();
      instance.init(config);
      return instance;
    },
    PexelizeSDK: (window as any).pexelize.constructor,
  };
}

/**
 * Load the SDK from a URL.
 * Supports custom SDK URLs for enterprise self-hosted or specific versions.
 * @param customUrl - Optional custom SDK URL
 */
function loadSDK(customUrl?: string): Promise<SDKModule> {
  const sdkUrl = getSDKUrl(customUrl);

  // Check cache for this specific URL
  const cachedPromise = sdkLoadPromises.get(sdkUrl);
  if (cachedPromise) return cachedPromise;

  // Check if already loaded globally (only for default URL to avoid conflicts)
  if (!customUrl && typeof window !== "undefined" && (window as any).pexelize) {
    return Promise.resolve(createSDKModuleFromGlobal());
  }

  return loadSDKScript(sdkUrl);
}

/**
 * Load the SDK script from a specific URL.
 * Each unique URL is cached separately to support multiple SDK sources.
 * @param sdkUrl - The SDK URL to load
 */
function loadSDKScript(sdkUrl: string): Promise<SDKModule> {
  // Check cache for this specific URL
  const cachedPromise = sdkLoadPromises.get(sdkUrl);
  if (cachedPromise) return cachedPromise;

  const loadPromise = new Promise<SDKModule>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = sdkUrl;
    script.async = true;

    script.onload = () => {
      if ((window as any).pexelize) {
        // Resolve with SDK module interface
        resolve(createSDKModuleFromGlobal());
      } else {
        sdkLoadPromises.delete(sdkUrl);
        reject(
          new Error("Failed to load Pexelize SDK - createEditor not found"),
        );
      }
    };

    script.onerror = () => {
      sdkLoadPromises.delete(sdkUrl);
      reject(new Error(`Failed to load Pexelize SDK from ${sdkUrl}`));
    };

    document.head.appendChild(script);
  });

  // Cache the promise for this URL
  sdkLoadPromises.set(sdkUrl, loadPromise);

  return loadPromise;
}

// ============================================================================
// Content Type
// ============================================================================

export type EditorContentTypeValue = "module";

// ============================================================================
// Component
// ============================================================================

/**
 * PexelizeEditorComponent
 *
 * @example
 * ```html
 * <pexelize-editor
 *   editorKey="your-editor-key"
 *   editorMode="email"
 *   (ready)="onReady($event)"
 *   (change)="onChange($event)"
 * ></pexelize-editor>
 * ```
 *
 * @example
 * ```typescript
 * import { Component, ViewChild } from '@angular/core';
 * import { PexelizeEditorComponent } from '@pexelize/angular-editor';
 *
 * @Component({
 *   selector: 'app-editor',
 *   template: `
 *     <pexelize-editor
 *       #editor
 *       editorKey="your-editor-key"
 *       (ready)="onReady($event)"
 *     ></pexelize-editor>
 *     <button (click)="handleSave()">Save</button>
 *   `
 * })
 * export class EditorComponent {
 *   @ViewChild('editor') editor!: PexelizeEditorComponent;
 *
 *   onReady(sdk: PexelizeSDK) {
 *     console.log('Editor ready!', sdk);
 *   }
 *
 *   handleSave() {
 *     this.editor.saveDesign((design) => {
 *       console.log('Design:', design);
 *     });
 *   }
 * }
 * ```
 */
@Component({
  selector: "pexelize-editor",
  template: `<div
    #container
    [id]="containerId"
    [style.width]="'100%'"
    [style.height]="computedHeight"
    [style.minHeight]="computedMinHeight"
  ></div>`,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
  standalone: true,
})
export class PexelizeEditorComponent
  implements OnInit, OnDestroy, OnChanges, AfterViewInit
{
  // ========================================================================
  // Inputs
  // ========================================================================

  /** Editor key for authentication (required) */
  @Input() editorKey!: string;

  /** Initial design to load */
  @Input() design?: DesignJson | ModuleData | null;

  /** Editor mode (email, web, popup) */
  @Input() editorMode: EditorMode = "email";

  /** Popup builder configuration (only used when editorMode is 'popup') */
  @Input() popup?: PopupConfig;

  /** Content type: 'module' for single-row mode */
  @Input() contentType?: EditorContentTypeValue;

  /** AI features configuration */
  @Input() ai?: AIConfig;

  /** UI language/locale */
  @Input() locale?: string;

  /**
   * Custom translation overrides keyed by locale code.
   * Each locale maps translation keys to translated strings,
   * allowing partial or full override of the editor's built-in UI strings.
   *
   * @example
   * ```ts
   * translations: {
   *   'en-US': { 'toolbar.save': 'Save Draft' },
   *   'fr-FR': { 'toolbar.save': 'Enregistrer le brouillon' },
   * }
   * ```
   */
  @Input() translations?: Record<string, Record<string, string>>;

  /** Text direction (ltr, rtl) */
  @Input() textDirection?: TextDirection;

  /** Template language for multi-language support */
  @Input() language?: Language;

  /** Visual customization */
  @Input() appearance?: AppearanceConfig;

  /** Enable/disable tools */
  @Input() tools?: ToolsConfig;

  /** Custom tools to register (Pexelize-style) */
  @Input() customTools?: PexelizeToolConfig[];

  /** Feature toggles */
  @Input() features?: FeaturesConfig;

  /** Merge tags configuration */
  @Input() mergeTags?: MergeTagsConfig;

  /** Special links configuration */
  @Input() specialLinks?: SpecialLinksConfig;

  /** Custom modules */
  @Input() modules?: Module[];

  /** Display conditions configuration */
  @Input() displayConditions?: DisplayConditionsConfig;

  /** Editor behavior configuration */
  @Input() editor?: EditorBehaviorConfig;

  /** Fonts configuration */
  @Input() fonts?: FontsConfig;

  /** Default body/canvas values applied on init */
  @Input() bodyValues?: Record<string, unknown>;

  /** Header row JSON to inject as a locked, non-editable row at the top */
  @Input() header?: unknown;

  /** Footer row JSON to inject as a locked, non-editable row at the bottom */
  @Input() footer?: unknown;

  /** Custom CSS URLs or inline styles */
  @Input() customCSS?: string[];

  /** Custom JS URLs or inline scripts */
  @Input() customJS?: string[];

  /** Height of the editor */
  @Input() height: string | number = "600px";

  /** Minimum height for the editor */
  @Input() minHeight: string | number = "600px";

  /** Additional editor options (merged into options) */
  @Input() options?: Partial<EditorOptions>;

  /**
   * Callbacks for editor events (minus onReady/onLoad/onChange/onError which use Angular outputs).
   * Includes: linkClick, onModuleSave, onPreview, onHeaderRowClick, onFooterRowClick,
   * onLockedRowClick, onContentDialog.
   */
  @Input() callbacks?: Omit<
    PexelizeCallbacks,
    "onReady" | "onLoad" | "onChange" | "onError"
  >;

  /**
   * Custom SDK URL for loading the Pexelize SDK script.
   * Use this for enterprise self-hosted SDK or specific versions.
   * @default "https://sdk.pexelize.com/latest/pexelize-sdk.min.js"
   */
  @Input() sdkUrl?: string;

  /**
   * Team collaboration features (commenting, reviewer role, etc.)
   * Can be a simple boolean or detailed configuration object.
   * Only works with editorMode 'email' or 'web'.
   * @default false
   */
  @Input() collaboration?: boolean | CollaborationFeaturesConfig;

  /** User information for session identity and collaboration */
  @Input() user?: UserInfo;

  /**
   * Design mode for template permissions.
   * - 'edit': Admin mode - shows "Row Actions" for setting row permissions
   * - 'live': End-user mode - enforces row permissions
   * @default 'live'
   */
  @Input() designMode?: "edit" | "live";

  // ========================================================================
  // Outputs
  // ========================================================================

  /** Emitted when the editor is ready */
  @Output() ready = new EventEmitter<PexelizeSDK>();

  /** Emitted when a design is loaded */
  @Output() load = new EventEmitter<unknown>();

  /** Emitted when the design changes */
  @Output() change = new EventEmitter<{ design: DesignJson; type: string }>();

  /** Emitted when an error occurs */
  @Output() error = new EventEmitter<Error>();

  /** Emitted when a comment event occurs (create, edit, delete, resolve, reopen) */
  @Output() commentAction = new EventEmitter<CommentAction>();

  // ========================================================================
  // Internal State
  // ========================================================================

  containerId = `pexelize-editor-${Math.random().toString(36).substr(2, 9)}`;
  private sdk: PexelizeSDK | null = null;
  private _isReady = false;

  get isReady(): boolean {
    return this._isReady;
  }

  get computedHeight(): string {
    return typeof this.height === "number" ? `${this.height}px` : this.height;
  }

  get computedMinHeight(): string {
    return typeof this.minHeight === "number"
      ? `${this.minHeight}px`
      : this.minHeight;
  }

  // ========================================================================
  // Lifecycle
  // ========================================================================

  ngOnInit(): void {
    // Initialization happens in ngAfterViewInit
  }

  ngAfterViewInit(): void {
    this.initializeEditor();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.sdk || !this._isReady) return;

    // Watch for design changes
    if (changes["design"] && !changes["design"].firstChange) {
      const newDesign = changes["design"].currentValue;
      if (newDesign) {
        this.sdk.loadDesign(newDesign as DesignJson);
      }
    }

    // Watch for merge tags changes
    if (changes["mergeTags"] && !changes["mergeTags"].firstChange) {
      const newTags = changes["mergeTags"].currentValue as MergeTagsConfig;
      if (newTags) {
        this.sdk.setMergeTags(newTags);
      }
    }

    // Watch for modules changes
    if (changes["modules"] && !changes["modules"].firstChange) {
      const newModules = changes["modules"].currentValue;
      if (newModules) {
        this.sdk.setModules(newModules);
      }
    }

    // Watch for display conditions changes
    if (
      changes["displayConditions"] &&
      !changes["displayConditions"].firstChange
    ) {
      const newConditions = changes["displayConditions"].currentValue;
      if (newConditions) {
        this.sdk.setDisplayConditions(newConditions);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.sdk) {
      this.sdk.destroy();
      this.sdk = null;
    }
  }

  // ========================================================================
  // Initialization
  // ========================================================================

  private async initializeEditor(): Promise<void> {
    try {
      const { createEditor } = await loadSDK(this.sdkUrl);
      const config = this.buildConfig();
      const sdk = createEditor(config);
      this.sdk = sdk;

      // Set up event listeners
      sdk.addEventListener("editor:ready", () => {
        this._isReady = true;
        this.ready.emit(sdk);
      });

      sdk.addEventListener("design:loaded", (data: unknown) => {
        this.load.emit(data);
      });

      sdk.addEventListener(
        "design:updated",
        (data: { design: DesignJson; type: string }) => {
          this.change.emit(data);
        },
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("Initialization error:", error.message);
      this.error.emit(error);
    }
  }

  private buildConfig(): PexelizeConfig {
    const editorConfig =
      this.contentType === "module"
        ? {
            ...this.editor,
            contentType: this.contentType as "module",
            minRows: 1,
            maxRows: 1,
          }
        : this.editor;

    // Build collaboration feature config
    let featuresConfig = this.features;
    if (this.collaboration !== undefined) {
      const collaborationConfig =
        typeof this.collaboration === "object"
          ? {
              ...this.collaboration,
              onComment: (action: CommentAction) => {
                this.commentAction.emit(action);
              },
            }
          : this.collaboration;
      featuresConfig = {
        ...featuresConfig,
        collaboration: collaborationConfig,
      };
    }

    // Build callbacks (merge Angular outputs with user-provided callbacks)
    const callbacks: PexelizeCallbacks = {
      ...this.callbacks,
    };

    // Build nested options object
    const editorOptions: EditorOptions = {
      ...(this.user !== undefined && { user: this.user }),
      ...(this.locale !== undefined && { locale: this.locale }),
      ...(this.translations !== undefined && {
        translations: this.translations,
      }),
      ...(this.textDirection !== undefined && {
        textDirection: this.textDirection,
      }),
      ...(this.language !== undefined && { language: this.language }),
      height: this.height,
      minHeight: this.minHeight,
      ...(this.mergeTags !== undefined && { mergeTags: this.mergeTags }),
      ...(this.specialLinks !== undefined && {
        specialLinks: this.specialLinks,
      }),
      ...(this.modules !== undefined && { modules: this.modules }),
      ...(this.displayConditions !== undefined && {
        displayConditions: this.displayConditions,
      }),
      ...(this.appearance !== undefined && { appearance: this.appearance }),
      ...(this.tools !== undefined && { tools: this.tools }),
      ...(this.customTools !== undefined && { customTools: this.customTools }),
      ...(this.fonts !== undefined && { fonts: this.fonts }),
      ...(this.bodyValues !== undefined && { bodyValues: this.bodyValues }),
      ...(this.header !== undefined && { header: this.header }),
      ...(this.footer !== undefined && { footer: this.footer }),
      ...(editorConfig !== undefined && { editor: editorConfig }),
      ...(this.customCSS !== undefined && { customCSS: this.customCSS }),
      ...(this.customJS !== undefined && { customJS: this.customJS }),
      ...(featuresConfig !== undefined && { features: featuresConfig }),
      ...(this.ai !== undefined && { ai: this.ai }),
      ...this.options,
    };

    return {
      containerId: this.containerId,
      editorKey: this.editorKey,
      ...(this.editorMode !== undefined && { editorMode: this.editorMode }),
      ...(this.designMode !== undefined && { designMode: this.designMode }),
      ...(this.design !== undefined && { design: this.design as DesignJson }),
      ...(this.popup !== undefined && { popup: this.popup }),
      callbacks,
      options: editorOptions,
    };
  }

  // ========================================================================
  // Public Methods - Full SDK pass-through
  // ========================================================================

  /** Get the underlying SDK instance */
  getEditor(): PexelizeSDK | null {
    return this.sdk;
  }

  // Design methods
  loadDesign(
    design: DesignJson,
    options?: { preserveHistory?: boolean },
  ): void {
    this.sdk?.loadDesign(design, options);
  }

  loadBlank(): void {
    this.sdk?.loadBlank();
  }

  saveDesign(callback: (design: DesignJson) => void): void {
    this.sdk?.saveDesign(callback);
  }

  getDesign(): Promise<{ html: string; json: DesignJson }> | undefined {
    return this.sdk?.getDesign();
  }

  // Export methods (async-only)
  exportHtml(options?: ExportHtmlOptions): Promise<string> | undefined {
    return this.sdk?.exportHtml(options);
  }

  exportPlainText(): Promise<string> | undefined {
    return this.sdk?.exportPlainText();
  }

  exportJson(): Promise<DesignJson> | undefined {
    return this.sdk?.exportJson();
  }

  exportImage(
    options?: ExportImageOptions,
  ): Promise<ExportImageData> | undefined {
    return this.sdk?.exportImage(options);
  }

  exportPdf(options?: ExportPdfOptions): Promise<ExportPdfData> | undefined {
    return this.sdk?.exportPdf(options);
  }

  exportZip(options?: ExportZipOptions): Promise<ExportZipData> | undefined {
    return this.sdk?.exportZip(options);
  }

  getPopupValues(): Promise<PopupValues | null> | undefined {
    return this.sdk?.getPopupValues();
  }

  // Merge tags
  setMergeTags(config: MergeTagsConfig): void {
    this.sdk?.setMergeTags(config);
  }

  getMergeTags(): Promise<(MergeTag | MergeTagGroup)[]> | undefined {
    return this.sdk?.getMergeTags();
  }

  // Special links
  setSpecialLinks(config: SpecialLinksConfig): void {
    this.sdk?.setSpecialLinks(config);
  }

  getSpecialLinks(): Promise<(SpecialLink | SpecialLinkGroup)[]> | undefined {
    return this.sdk?.getSpecialLinks();
  }

  // Modules
  setModulesLoading(loading: boolean): void {
    this.sdk?.setModulesLoading(loading);
  }

  setModules(modules: Module[]): void {
    this.sdk?.setModules(modules);
  }

  getModules(): Promise<Module[]> | undefined {
    return this.sdk?.getModules();
  }

  // Fonts
  setFonts(config: FontsConfig): void {
    this.sdk?.setFonts(config);
  }

  getFonts(): Promise<FontsConfig> | undefined {
    return this.sdk?.getFonts();
  }

  // Body values
  setBodyValues(values: Record<string, unknown>): void {
    this.sdk?.setBodyValues(values);
  }

  getBodyValues(): Promise<Record<string, unknown>> | undefined {
    return this.sdk?.getBodyValues();
  }

  // Configuration
  setOptions(options: Partial<EditorOptions>): void {
    this.sdk?.setOptions(options);
  }

  setToolsConfig(config: ToolsConfig): void {
    this.sdk?.setToolsConfig(config);
  }

  setEditorMode(mode: EditorMode): void {
    this.sdk?.setEditorMode(mode);
  }

  setEditorConfig(config: EditorBehaviorConfig): void {
    this.sdk?.setEditorConfig(config);
  }

  getEditorConfig(): Promise<EditorBehaviorConfig> | undefined {
    return this.sdk?.getEditorConfig();
  }

  setLocale(locale: string): void {
    this.sdk?.setLocale(locale);
  }

  setTextDirection(direction: TextDirection): void {
    this.sdk?.setTextDirection(direction);
  }

  setAppearance(config: AppearanceConfig): void {
    this.sdk?.setAppearance(config);
  }

  setCustomCSS(css: string[]): void {
    this.sdk?.setCustomCSS(css);
  }

  setCustomJS(js: string[]): void {
    this.sdk?.setCustomJS(js);
  }

  // Multi-language
  setLanguage(language: Language): void {
    this.sdk?.setLanguage(language);
  }

  getLanguage(): Promise<Language | null> | undefined {
    return this.sdk?.getLanguage();
  }

  // Undo/Redo
  undo(): void {
    this.sdk?.undo();
  }

  redo(): void {
    this.sdk?.redo();
  }

  save(): void {
    this.sdk?.save();
  }

  // Preview
  showPreview(device?: ViewMode): void {
    this.sdk?.showPreview(device);
  }

  hidePreview(): void {
    this.sdk?.hidePreview();
  }

  // Tools
  registerTool(config: unknown): Promise<void> | undefined {
    return this.sdk?.registerTool(config);
  }

  unregisterTool(toolId: string): Promise<void> | undefined {
    return this.sdk?.unregisterTool(toolId);
  }

  getTools():
    | Promise<Array<{ id: string; label: string; baseToolType: string }>>
    | undefined {
    return this.sdk?.getTools();
  }

  // Display conditions
  setDisplayConditions(config: DisplayConditionsConfig): void {
    this.sdk?.setDisplayConditions(config);
  }

  // Audit
  audit(callback: AuditCallback): void;
  audit(options: AuditOptions, callback: AuditCallback): void;
  audit(options?: AuditOptions): Promise<AuditResult> | undefined;
  audit(
    optionsOrCallback?: AuditOptions | AuditCallback,
    callback?: AuditCallback,
  ): Promise<AuditResult> | undefined | void {
    if (typeof optionsOrCallback === "function") {
      return this.sdk?.audit(optionsOrCallback);
    }
    if (callback) {
      return this.sdk?.audit(optionsOrCallback as AuditOptions, callback);
    }
    return this.sdk?.audit(optionsOrCallback);
  }

  // Collaboration
  showComment(commentId: string): void {
    this.sdk?.showComment(commentId);
  }

  openCommentPanel(rowId: string): void {
    this.sdk?.openCommentPanel(rowId);
  }

  // Events
  addEventListener<T = unknown>(
    event: EditorEventName,
    callback: (data: T) => void,
  ): (() => void) | undefined {
    return this.sdk?.addEventListener(event, callback);
  }

  removeEventListener<T = unknown>(
    event: EditorEventName,
    callback: (data: T) => void,
  ): void {
    this.sdk?.removeEventListener(event, callback);
  }

  // Advanced
  registerColumns(cells: number[]): void {
    this.sdk?.registerColumns(cells);
  }

  setBrandingColors(config: {
    colors?:
      | string[]
      | Array<{
          id: string;
          label?: string;
          colors: string[];
          default?: boolean;
        }>;
    recentColors?: boolean;
  }): void {
    this.sdk?.setBrandingColors(config);
  }

  // Custom widgets
  createWidget(
    config: PexelizeWidgetConfig | unknown,
  ): Promise<void> | undefined {
    return this.sdk?.createWidget(config);
  }

  removeWidget(widgetName: string): Promise<void> | undefined {
    return this.sdk?.removeWidget(widgetName);
  }

  // Undo/Redo state
  canUndo(): Promise<boolean> | undefined {
    return this.sdk?.canUndo();
  }

  canRedo(): Promise<boolean> | undefined {
    return this.sdk?.canRedo();
  }

  // Tabs
  updateTabs(tabs: Record<string, { visible?: boolean }>): void {
    this.sdk?.updateTabs(tabs);
  }
}
