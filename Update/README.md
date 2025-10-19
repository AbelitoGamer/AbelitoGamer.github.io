# Herramientas de Actualización

Github Pages sera un regalo de dios para nosotros los pobres jodidos que no podemos costearnos hostear NADA en NINGUN LADO que se atreva a si quiera cobrar 1 centimo por sus servicios. Lamentablemente, Github Pages cachea un chingo las cosas de la web, cosa que, para mi especifica web es una putada porque todo funciona en base a jsons que si llego a cambiar, pero alguien tiene los viejos aun cacheados, se rompen cosas de a gratis. Esto de aqui es basicamente un script que va a por todos los htmls de la pagina en busca de referencias a otros archivos, y les añade un poderoso "?v=1.0.0" al final que fuerza que se cargen como algo nuevo.

## Archivos

- **`version.json`** - La version actual
- **`update-version.js`** - Script de Node.js para incrementar números de versión y actualizar todos los archivos HTML
- **`update-version.ps1`** - Script de PowerShell para hacer la update rapido y furiosisimo
- **`_headers`** - Configuración de headers HTTP para control de caché (debe estar en la raíz)

## Uso

### Solo Actualizar Versiones (Node.js)
```bash
cd Update
node update-version.js
```

### Actualizar Versiones (PowerShell)
Desde el directorio raíz:
```powershell
Update\update-version.ps1
```

O desde el directorio Update:
```powershell
.\update-version.ps1
```

## Cómo funciona

1. `update-version.js` lee la versión actual de `version.json`
2. Incrementa el número de versión patch (1.0.1 → 1.0.2)
3. Actualiza todos los archivos HTML del proyecto para usar la nueva versión en archivos CSS/JS/JSON

Esto se asegura que siempre se obtenga el contenido mas reciente sin que el cache me quiera trolear mostrando cosas que yo ya modifique.