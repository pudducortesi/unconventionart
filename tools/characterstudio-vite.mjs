// Executed with a minimal environment by build-characterstudio.mjs.
import {build} from '../research/upstream/CharacterStudio/node_modules/vite/dist/node/index.js';
import config from '../research/upstream/CharacterStudio/vite.config.js';
await build({...config,configFile:false,base:'/characterstudio/',define:{localStorage:'globalThis.__uaEditorStorage'}});
