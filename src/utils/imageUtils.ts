export function compressImage(base64Data: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Image load timeout')), 10000);
    const img = new Image();
    img.onload = () => {
      clearTimeout(timeout);
      const MAX = 300;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context not available')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load image'));
    };
    img.src = base64Data.startsWith('data:') ? base64Data : `data:image/jpeg;base64,${base64Data}`;
  });
}
