import RNFS from 'react-native-fs';

// --- Why this module exists -------------------------------------------------
//
// Pin photos picked from the camera / gallery come back as paths in the
// picker's temporary or cache directory. Those locations are NOT permanent —
// iOS purges tmp/ and Android can clear the cache, which silently breaks the
// image later. So we copy every picked photo into a managed folder inside the
// app's Documents directory.
//
// CRITICAL iOS detail: the absolute path to the Documents directory contains a
// sandbox UUID that Apple can change on every app update. Storing the *full*
// absolute path therefore breaks the image on the next App Store update, even
// though the file itself survives. To be update-proof we store only the
// RELATIVE path (e.g. "pin_images/photo.jpg") in the database and rebuild the
// absolute path against the CURRENT Documents directory at read time.
// ---------------------------------------------------------------------------

const IMAGE_SUBDIR = 'pin_images';
const IMAGE_DIR = `${RNFS.DocumentDirectoryPath}/${IMAGE_SUBDIR}`;

const stripScheme = (uri: string) => uri.replace(/^file:\/\//, '');

const ALLOWED_EXT = /^(jpg|jpeg|png|heic|heif|webp)$/;

const ensureDir = async (): Promise<void> => {
  const exists = await RNFS.exists(IMAGE_DIR);
  if (!exists) await RNFS.mkdir(IMAGE_DIR);
};

/**
 * Copy a freshly-picked image into permanent app storage and return the
 * RELATIVE path to store in the DB (e.g. "pin_images/pin_123.jpg").
 *
 * If the value is already one of our relative paths it is returned unchanged
 * (re-saving an unedited pin is a no-op). On any failure we fall back to the
 * original uri — better to keep a short-lived reference than to fail the save.
 */
export const persistPinImage = async (sourceUri: string): Promise<string> => {
  if (!sourceUri) return sourceUri;
  // Already one of our managed relative paths — nothing to copy.
  if (sourceUri.startsWith(`${IMAGE_SUBDIR}/`)) return sourceUri;

  try {
    await ensureDir();
    const rawExt = (sourceUri.split('.').pop() || '').split('?')[0].toLowerCase();
    const ext = ALLOWED_EXT.test(rawExt) ? rawExt : 'jpg';
    const fileName = `pin_${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`;
    const destPath = `${IMAGE_DIR}/${fileName}`;

    await RNFS.copyFile(stripScheme(sourceUri), destPath);
    return `${IMAGE_SUBDIR}/${fileName}`;
  } catch (e) {
    console.warn('persistPinImage: failed to copy image, keeping original uri', e);
    return sourceUri;
  }
};

/**
 * Persist a list of picked images into permanent storage, preserving order.
 * Already-managed relative paths pass through untouched (no-op), so re-saving a
 * pin whose gallery is unchanged copies nothing.
 */
export const persistPinImages = async (sourceUris: string[]): Promise<string[]> => {
  const out: string[] = [];
  for (const uri of sourceUris) {
    if (!uri) continue;
    out.push(await persistPinImage(uri));
  }
  return out;
};

/**
 * Turn a stored image value into an absolute `file://` uri usable by <Image>.
 *
 * Handles every shape we may encounter:
 *  - relative managed path ("pin_images/x.jpg")  → rooted at current Documents
 *  - external uri (content:// or http(s)://)      → returned as-is
 *  - legacy absolute path that lives inside some Documents container → re-rooted
 *    onto the CURRENT Documents dir (heals iOS paths whose UUID changed on a
 *    past update, as long as the file still exists)
 *  - any other legacy absolute path (old tmp/cache) → returned as-is (best
 *    effort; if the file is gone the caller's onError shows "No Image")
 */
export const resolvePinImage = (stored?: string | null): string | undefined => {
  if (!stored) return undefined;

  // External references — leave untouched.
  if (/^(content|https?):\/\//.test(stored)) return stored;

  const path = stripScheme(stored);

  // Relative managed path — root it against the current Documents directory.
  if (!path.startsWith('/')) {
    return `file://${RNFS.DocumentDirectoryPath}/${path}`;
  }

  // Absolute path. If it points inside any Documents container, re-root the
  // portion after the last "/Documents/" onto the current Documents dir so it
  // still resolves after an iOS update changed the sandbox UUID.
  const marker = '/Documents/';
  const idx = path.lastIndexOf(marker);
  if (idx !== -1) {
    const relative = path.slice(idx + marker.length);
    return `file://${RNFS.DocumentDirectoryPath}/${relative}`;
  }

  // Some other absolute path (legacy tmp/cache) — best effort.
  return `file://${path}`;
};

/**
 * Delete an image file we manage. Resolves the stored value to its current
 * absolute location and only ever deletes files inside the app's Documents
 * directory — picker temp paths, content:// uris, and photo-library references
 * are left alone so we never delete the user's originals.
 */
export const deletePinImage = async (stored?: string | null): Promise<void> => {
  if (!stored) return;
  const resolved = resolvePinImage(stored);
  if (!resolved) return;

  const path = stripScheme(resolved);
  if (!path.startsWith(RNFS.DocumentDirectoryPath)) return;

  try {
    if (await RNFS.exists(path)) await RNFS.unlink(path);
  } catch (e) {
    console.warn('deletePinImage: failed to delete image file', e);
  }
};

/**
 * Remove every pin image file we manage. Used by "clear all data". Touches only
 * our own managed folder and the legacy "imported_" files in the Documents
 * root — never anything outside the app sandbox.
 */
export const clearAllPinImages = async (): Promise<void> => {
  try {
    if (await RNFS.exists(IMAGE_DIR)) await RNFS.unlink(IMAGE_DIR);

    const docFiles = await RNFS.readDir(RNFS.DocumentDirectoryPath);
    for (const f of docFiles) {
      if (f.isFile() && f.name.startsWith('imported_')) {
        await RNFS.unlink(f.path);
      }
    }
  } catch (e) {
    console.warn('clearAllPinImages: failed to clear image files', e);
  }
};
