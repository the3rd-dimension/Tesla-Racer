# Asset Register

Every external asset must be listed here with its source and licence before it is shipped.

| Asset | Type | Source / author | Licence | Attribution required | Used in |
|---|---|---|---|---|---|
| `building1.glb` | 3D model | Custom made in blender 5.2 | Unlicenced | Unknown | Roadside buildings |
| `building2.glb` | 3D model | Custom made in blender 5.2 | Unlicenced | Unknown | Roadside buildings |
| `building3.glb` | 3D model | Custom made in blender 5.2 | Unlicenced | Unknown | Roadside buildings |
| `building4.glb` | 3D model | Custom made in blender 5.2 | Unlicenced | Unknown | Roadside buildings |
| `SpecialDialogue.mp3` | Audio | User-provided; original source unknown | Not specified | Unknown | Special button / F key |
| `horn.mp3` | Audio | User-provided; original source unknown | Not specified | Unknown | Vehicle horn, collision and chaser sound effects |
| `mainMenu.mp3` | Audio | User-provided; original source unknown | Not specified | Unknown | Main menu background music |

**Current state:** roadside buildings use the provided GLB models; vehicle GLBs are optional and fall back to procedural models until added. Audio is synthesised at runtime.
Player skin paths are defined in `src/config/modelPaths.ts`; add each supplied skin model to this register when the files are added.
Configure all audio paths in `src/config/audioConfig.ts`. Add variants to `vehicleHit`, `chaserClose`, `mainMenuMusic`, or `backgroundMusic`; playback selects a random entry for hit/close sound arrays and uses the Music volume setting for music.

Rules:
- Prefer CC0 / own-created assets.
- Optimise models (low poly, shared materials) and compress textures before adding them to `public/assets/`.
- Put GLB models in `public/assets/models`, textures in `public/assets/textures`, audio in `public/assets/audio`.
