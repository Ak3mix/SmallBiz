import * as XLSX from 'xlsx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { dbService } from './database';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import JSZip from 'jszip';
import { compressImage } from '../utils/imageUtils';

class DataTransferService {
  private async getProductsWithImages(): Promise<any[]> {
    const result = await dbService.query(`SELECT id, image_path FROM products WHERE image_path IS NOT NULL AND image_path != ''`);
    return result.values || [];
  }

  private async generateXLSXBase64(): Promise<string> {
    const tables = ['products', 'customers', 'cards', 'sales', 'sale_items', 'payments', 'sessions', 'movements', 'settings'];
    const workbook = XLSX.utils.book_new();

    for (const table of tables) {
      const result = await dbService.query(`SELECT * FROM ${table};`);
      const data = result.values || [];
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, table);
    }

    return XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
  }

  private async importFromXLSX(base64Data: string): Promise<void> {
    const wb = XLSX.read(base64Data, { type: 'base64' });
    const json: any = {};
    wb.SheetNames.forEach(sheetName => {
      json[sheetName] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
    });

    await dbService.run(`PRAGMA foreign_keys = OFF;`);

    const tables = ['sale_items', 'payments', 'sales', 'movements', 'sessions', 'products', 'customers', 'cards', 'settings'];
    for (const table of tables) {
      await dbService.run(`DELETE FROM ${table};`);
    }

    const importOrder = ['settings', 'customers', 'cards', 'sessions', 'products', 'sales', 'payments', 'sale_items', 'movements'];
    for (const table of importOrder) {
      const rows = json[table] || [];
      for (const row of rows) {
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = columns.map(() => '?').join(', ');
        const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders});`;
        await dbService.run(sql, values);
      }
    }

    await dbService.run(`PRAGMA foreign_keys = ON;`);
  }

  async exportDatabase(): Promise<string> {
    try {
      const xlsxBase64 = await this.generateXLSXBase64();
      const zip = new JSZip();

      zip.file('backup.xlsx', xlsxBase64, { base64: true });

      const products = await this.getProductsWithImages();
      for (const product of products) {
        try {
          const result = await Filesystem.readFile({
            path: product.image_path,
            directory: Directory.Data,
          });
          let fileData = result.data as string;
          fileData = await compressImage(fileData);
          zip.file(product.image_path, fileData, { base64: true });
        } catch (e) {
          console.error(`Error reading image for product ${product.id}:`, e);
        }
      }

      const zipBase64 = await zip.generateAsync({ type: 'base64' });
      const fileName = `backup_ventas_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;

      if (Capacitor.isNativePlatform()) {
        await Filesystem.writeFile({
          path: fileName,
          data: zipBase64,
          directory: Directory.Cache,
        });

        const savedUri = await Filesystem.getUri({
          path: fileName,
          directory: Directory.Cache,
        });

        await Share.share({
          title: 'Exportar Base de Datos',
          text: `Backup exportado: ${fileName}`,
          url: savedUri.uri,
          dialogTitle: 'Compartir Backup',
        });

        return `Backup exportado: ${fileName}`;
      } else {
        const blob = new Blob([new Uint8Array(atob(zipBase64).split('').map(c => c.charCodeAt(0)))], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        return `Archivo descargado: ${fileName}`;
      }
    } catch (e) {
      console.error('exportDatabase error:', e);
      throw new Error(`Error al exportar: ${e instanceof Error ? e.message : JSON.stringify(e)}`);
    }
  }

  async importDatabase(base64Data: string): Promise<void> {
    // Detect if it's a ZIP (magic bytes PK = 0x50 0x4B)
    let isZip = false;
    try {
      const bytes = atob(base64Data.substring(0, 100));
      isZip = bytes.charCodeAt(0) === 0x50 && bytes.charCodeAt(1) === 0x4B;
    } catch { }

    if (!isZip) {
      // Legacy XLSX import (backward compat)
      return this.importFromXLSX(base64Data);
    }

    // ZIP import with images
    const zip = await JSZip.loadAsync(base64Data, { base64: true });

    // Extract and import XLSX
    const xlsxFile = zip.file('backup.xlsx');
    if (!xlsxFile) throw new Error('No se encontró backup.xlsx en el ZIP');
    const xlsxBase64 = await xlsxFile.async('base64');
    await this.importFromXLSX(xlsxBase64);

    // Extract images
    const imageFiles = zip.file(/^images\//);
    if (imageFiles.length > 0) {
      try {
        await Filesystem.mkdir({ path: 'images', directory: Directory.Data });
      } catch { }

      for (const imgFile of imageFiles) {
        try {
          const imgBase64 = await imgFile.async('base64');
          await Filesystem.writeFile({
            path: imgFile.name,
            data: imgBase64,
            directory: Directory.Data,
          });
        } catch (e) {
          console.error(`Error writing image ${imgFile.name}:`, e);
        }
      }
    }
  }
}

export const dataTransferService = new DataTransferService();
