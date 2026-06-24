import React, { useState } from 'react';
import { Camera as CameraIcon, Image as ImageIcon, X } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { useToast } from '../contexts/ToastContext';

interface Props {
  currentImage?: string | null;
  onImageCapture: (base64: string) => void;
  onImageClear: () => void;
}

export function ImagePicker({ currentImage, onImageCapture, onImageClear }: Props) {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const takePhoto = async () => {
    try {
      setIsLoading(true);
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        correctOrientation: true,
      });

      if (photo.webPath) {
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        onImageCapture(base64Data);
      }
    } catch {
      addToast('Error al tomar la foto.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const selectFile = async () => {
    try {
      setIsLoading(true);
      const result = await FilePicker.pickImages({});

      if (result.files && result.files.length > 0) {
        const file = result.files[0];

        if (Capacitor.isNativePlatform()) {
          if (!file.path) {
            addToast('No se pudo obtener la ruta del archivo.', 'error');
            return;
          }

          const fileRead = await Filesystem.readFile({ path: file.path });
          const mimeType = file.mimeType || 'image/jpeg';
          onImageCapture(`data:${mimeType};base64,${fileRead.data}`);
        } else {
          const path = (file as any).webPath || file.path;
          if (!path) return;

          const response = await fetch(path);
          const blob = await response.blob();
          const base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          onImageCapture(base64Data);
        }
      }
    } catch {
      addToast('Error al seleccionar el archivo.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (currentImage) {
    return (
      <div className="relative inline-block">
        <img src={currentImage} alt="Vista previa" className="w-24 h-24 object-contain rounded-xl bg-stone-100" />
        <button
          type="button"
          onClick={onImageClear}
          className="absolute -top-2.5 -right-2.5 bg-rose-500 text-white p-1.5 rounded-full"
          aria-label="Eliminar imagen"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={isLoading}
        onClick={takePhoto}
        className="flex flex-col items-center justify-center w-24 h-24 bg-emerald-50 rounded-xl border-2 border-emerald-200 disabled:opacity-50"
        aria-label="Tomar foto"
      >
        <CameraIcon size={32} className="text-emerald-500" />
        <span className="text-[10px] text-emerald-600 mt-1 font-bold">Tomar foto</span>
      </button>
      <button
        type="button"
        disabled={isLoading}
        onClick={selectFile}
        className="flex flex-col items-center justify-center w-24 h-24 bg-blue-50 rounded-xl border-2 border-blue-200 disabled:opacity-50"
        aria-label="Seleccionar imagen de galería"
      >
        <ImageIcon size={32} className="text-blue-500" />
        <span className="text-[10px] text-blue-600 mt-1 font-bold">Seleccionar</span>
      </button>
    </div>
  );
}
