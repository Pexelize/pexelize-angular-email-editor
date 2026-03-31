import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import copy from "rollup-plugin-copy";

const plugins = [peerDepsExternal(), resolve(), commonjs()];

const external = ["@angular/core", "@angular/common", "@pexelize/editor-types"];

// ESM bundle (uses ngc output)
const esmBundle = {
  input: "dist/out-tsc/index.js",
  output: {
    file: "dist/index.js",
    format: "esm",
    sourcemap: true,
    exports: "named",
  },
  plugins: [
    ...plugins,
    // Copy type declarations from ngc output
    copy({
      targets: [
        { src: "dist/out-tsc/index.d.ts", dest: "dist" },
        { src: "dist/out-tsc/types.d.ts", dest: "dist" },
        { src: "dist/out-tsc/pexelize-editor.component.d.ts", dest: "dist" },
        { src: "dist/out-tsc/pexelize-editor.module.d.ts", dest: "dist" },
      ],
      hook: "writeBundle",
    }),
  ],
  external,
};

export default [esmBundle];
