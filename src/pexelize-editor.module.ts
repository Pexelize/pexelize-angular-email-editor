/**
 * Pexelize Editor Angular Module
 *
 * This module is provided for backwards compatibility with non-standalone Angular apps.
 * For Angular 14+ apps using standalone components, you can import PexelizeEditorComponent directly.
 */

import { NgModule } from "@angular/core";
import { PexelizeEditorComponent } from "./pexelize-editor.component";

@NgModule({
  imports: [PexelizeEditorComponent],
  exports: [PexelizeEditorComponent],
})
export class PexelizeEditorModule {}
