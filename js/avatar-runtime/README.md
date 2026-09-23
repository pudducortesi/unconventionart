# Vendored three-vrm

`three-vrm.js` is a minified ESM build of the official `@pixiv/three-vrm@3.5.5` npm package, obtained by `.github/workflows/avatar-assets.yml`. Minified with the project esbuild; `three` is kept external, then resolved to the shared vendor engine by `tools/vendor.mjs`.

Original source: https://github.com/pixiv/three-vrm
License: MIT, retained in `three-vrm-LICENSE.txt` and copied into the deployment licenses directory.

The included Atelier asset is glTF/GLB. Registering VRMLoaderPlugin prepares the loader for VRM but does not constitute a complete user VRM editor.
