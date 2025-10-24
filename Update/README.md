# Herramientas de Actualización - Sistema de Cache Busting

Github Pages sera un regalo de dios para nosotros los pobres jodidos que no podemos costearnos hostear NADA en NINGUN LADO que se atreva a si quiera cobrar 1 centimo por sus servicios. Lamentablemente, Github Pages cachea un chingo las cosas de la web, cosa que, para mi especifica web es una putada porque todo funciona en base a jsons que si llego a cambiar, pero alguien tiene los viejos aun cacheados, se rompen cosas de a gratis.

## 🆕 Sistema Nuevo: Timestamp-Based Versioning (RECOMENDADO)

Este es el sistema mejorado que usa timestamps únicos en lugar de números de versión manuales.

### Archivos del Nuevo Sistema
- **`update-cache-version.js`** - Script de Node.js con timestamps automáticos
- **`update-cache-version.ps1`** - Script de PowerShell con timestamps automáticos
- **`cache-version.json`** - Info de la última versión generada

### Uso del Nuevo Sistema

#### Opción 1: Node.js (Recomendado)
```bash
cd Update
node update-cache-version.js
```

#### Opción 2: PowerShell (Sin Node.js)
```powershell
cd Update
.\update-cache-version.ps1
```

### Ventajas
- ✅ Cada versión es única (basada en timestamp)
- ✅ No hay que recordar incrementar números
- ✅ Timestamp muestra exactamente cuándo se actualizó
- ✅ Imposible tener conflictos de versión

---

## 📦 Sistema Antiguo (Deprecated)

**Nota:** El sistema antiguo con `version.json` sigue funcionando pero se recomienda usar el nuevo sistema de timestamps.

### Archivos del Sistema Antiguo
- **`version.json`** - La version actual (manual)
- **`update-version.js`** - Script que incrementa versión numéricamente
- **`update-version.ps1`** - PowerShell para el sistema antiguo

### Uso del Sistema Antiguo

#### Node.js
```bash
cd Update
node update-version.js
```

#### PowerShell
#### PowerShell
```powershell
.\update-version.ps1
```

---

## 🔧 Cuándo Ejecutar

**SIEMPRE antes de hacer commit y push**, especialmente después de:
- Modificar archivos JavaScript
- Actualizar archivos CSS  
- Cambiar archivos JSON de contenido
- Modificar cualquier recurso

## 📝 Workflow Recomendado

```bash
# 1. Hacer tus cambios de código/contenido
# 2. Actualizar cache version
cd Update
node update-cache-version.js
cd ..

# 3. Commit y push
git add .
git commit -m "Update content and cache version"
git push
```

## ❓ Qué Hace el Sistema

1. **Genera timestamp único** basado en milisegundos actuales
2. **Busca todos los archivos HTML** recursivamente
3. **Actualiza todos los enlaces** de recursos:
   - CSS: `href="styles.css"` → `href="styles.css?v=1761329719942"`
   - JavaScript: `src="main.js"` → `src="main.js?v=1761329719942"`  
   - JSON: `'data.json'` → `'data.json?v=1761329719942'`
4. **Guarda info** en `cache-version.json`

## 🐛 Troubleshooting

**Problema**: Los cambios no se reflejan en producción  
**Solución**: Ejecuta el script de cache version y haz push

**Problema**: Script no encuentra archivos  
**Solución**: Asegúrate de ejecutar desde el directorio `Update/`

**Problema**: Error "ENOENT" o archivo no encontrado  
**Solución**: Verifica que Node.js esté instalado o usa la versión PowerShell

## Cómo funciona

1. `update-version.js` lee la versión actual de `version.json`
2. Incrementa el número de versión patch (1.0.1 → 1.0.2)
3. Actualiza todos los archivos HTML del proyecto para usar la nueva versión en archivos CSS/JS/JSON

Esto se asegura que siempre se obtenga el contenido mas reciente sin que el cache me quiera trolear mostrando cosas que yo ya modifique.

Esto NO esta relacionado con la version de la pagina que sale en el Update Log, estos se mueven mucho mas frecuentemente y mientras aun estoy haciendo pruebas para refrescar cosas.