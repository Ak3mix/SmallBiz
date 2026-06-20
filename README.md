<div align="center">
  <h1>VentasPro</h1>
  <p><strong>Sistema de gestión de ventas para Android</strong></p>

  <p>
    <a href="https://github.com/Ak3mix/App_de_Ventas/actions/workflows/main.yml">
      <img src="https://github.com/Ak3mix/App_de_Ventas/actions/workflows/main.yml/badge.svg" alt="Build Status">
    </a>
    <a href="https://github.com/Ak3mix/App_de_Ventas">
      <img src="https://img.shields.io/github/repo-size/Ak3mix/App_de_Ventas" alt="Repo Size">
    </a>
    <a href="https://github.com/Ak3mix/App_de_Ventas/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
    </a>
    <a href="https://github.com/Ak3mix/App_de_Ventas/releases">
      <img src="https://img.shields.io/github/v/release/Ak3mix/App_de_Ventas" alt="Latest Release">
    </a>
  </p>
</div>

---

## Funcionalidades

- **Vender** — Carrito de compras con modal interactivo, pagos en efectivo, transferencia o dividido (efectivo + transferencia), selección de tarjeta bancaria para transferencias.
- **Inventario** — CRUD de productos con imágenes, búsqueda por nombre, filtro por categoría, alerta de stock bajo (≤5 unidades), y gestión de tarjetas bancarias (sub-tab).
- **Cierre (Reportes)** — Jornadas de venta con colapsable de ventas, cancelación con restauración de stock, historial de jornadas cerradas (editar nombre, eliminación suave), exportación a Excel con desglose por producto, ganancia neta, ventas por tarjeta y control de mermas.
- **Movimientos** — Registro automático de ventas, cancelaciones, mermas y ajustes de stock.
- **Exportación/Importación** — Base de datos completa a XLSX (productos, clientes, tarjetas, ventas, movimientos).
- **Actualizaciones automáticas** — APK firmado con keystore persistente, versionado automático (1.1.X), generado vía GitHub Actions.

## Tech Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Estilos | Tailwind CSS v4, clsx, tailwind-merge |
| Animaciones | Motion (Framer Motion) |
| Nativo | Capacitor 6 (Android) |
| Base de datos | SQLite (`@capacitor-community/sqlite`) |
| Exportación | SheetJS (XLSX) |
| Íconos | lucide-react |
| Fechas | date-fns |
| CI/CD | GitHub Actions |

## Requisitos

- Node.js 22+
- Java 21+ (para build Android)
- Android Studio (para ejecutar en dispositivo/emulador)

## Instalación y desarrollo

```bash
# 1. Clonar e instalar dependencias
npm ci

# 2. Construir web app
npm run build

# 3. Sincronizar con Capacitor
npx cap sync android

# 4. Abrir en Android Studio
npx cap open android
```

Para desarrollo web local:
```bash
npm run dev
```

## Build y firma (local)

1. Generar keystore (una sola vez):
   ```bash
   keytool -genkey -v -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Configurar variables de entorno o editar `android/app/build.gradle` con las credenciales.

3. Construir APK firmado:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

## CI/CD — GitHub Actions

El pipeline en `.github/workflows/main.yml` se ejecuta automáticamente al pushear a `main`:

| Paso | Descripción |
|------|------------|
| Setup | JDK 21, Node.js 22 |
| Build | `npm install && npm run build && npx cap sync android` |
| Firma | Decodifica keystore desde `ANDROID_KEYSTORE_BASE64` (secreto) |
| Versión | `versionCode = run_number`, `versionName = 1.1.X` |
| APK | `assembleRelease` con split ABI `arm64-v8a` |
| Artefacto | `App_de_Ventas_v1.1.X.apk` firmado, disponible en Actions |

### Secrets requeridos en GitHub

| Secret | Descripción |
|--------|------------|
| `ANDROID_KEYSTORE_BASE64` | Keystore en base64 |
| `ANDROID_KEY_ALIAS` | Alias del keystore |
| `ANDROID_KEY_PASSWORD` | Contraseña del keystore |

## Estructura del proyecto

```
├── src/
│   ├── App.tsx                    # UI principal (tabs, modales)
│   ├── main.tsx                   # Punto de entrada
│   ├── index.css                  # Estilos globales
│   └── services/
│       ├── api.ts                 # Capa de acceso a datos
│       ├── database.ts            # Schema SQLite + migraciones
│       ├── dataTransferService.ts # Export/Import XLSX
│       ├── migration.ts           # Migraciones adicionales
│       └── repositories/
│           ├── productRepository.ts
│           ├── salesRepository.ts
│           ├── cardRepository.ts
│           └── movementRepository.ts
├── android/                       # Proyecto nativo Capacitor
├── .github/workflows/main.yml     # Pipeline CI/CD
├── capacitor.config.ts            # Config Capacitor
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Licencia

MIT
