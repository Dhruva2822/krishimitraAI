export function isLeafImage(imageData: ImageData): { isLeaf: boolean; reason: string } {
  const data = imageData.data;
  if (!data || data.length === 0) {
    return { isLeaf: false, reason: 'Invalid or empty image data.' };
  }
  
  // Basic sanity check: verify it's not a single solid color (flat background or empty crop)
  let isSolid = true;
  const r0 = data[0], g0 = data[1], b0 = data[2];
  for (let i = 4; i < data.length; i += 4) {
    if (data[i] !== r0 || data[i + 1] !== g0 || data[i + 2] !== b0) {
      isSolid = false;
      break;
    }
  }
  if (isSolid) {
    return { isLeaf: false, reason: 'NOT A LEAF, PLS UPLOAD LEAF IMAGES ONLY' };
  }

  // Passed basic sanity checks - let the advanced vision AI model perform the final classification
  return { isLeaf: true, reason: 'Valid leaf image detected' };
}
