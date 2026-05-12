# 🚀 Guía de Instalación y Ejecución de Pruebas

## Paso 1: Instalar Dependencias

Navega al directorio del proyecto mobile:

```bash
cd mobile/debuta
npm install
```

Esto instalará todas las dependencias necesarias incluyendo:
- Jest
- React Native Testing Library
- Babel y sus presets
- TypeScript types para Jest

## Paso 2: Verificar la Instalación

Después de instalar, verifica que los archivos de configuración estén en su lugar:

```bash
# Verifica que existan estos archivos:
ls jest.config.js
ls jest.setup.js
ls babel.config.js
```

## Paso 3: Ejecutar las Pruebas

### Opción A: Ejecutar todas las pruebas
```bash
npm test
```

### Opción B: Ejecutar en modo watch (se re-ejecutan al cambiar archivos)
```bash
npm test:watch
```

### Opción C: Ejecutar con reporte de cobertura
```bash
npm test:coverage
```

### Opción D: Ejecutar solo el archivo de MatchCard
```bash
npm test -- MatchCard.test.tsx
```

## Paso 4: Interpretar los Resultados

### ✅ Pruebas Exitosas
```
PASS  components/discover/MatchCard.test.tsx
  MatchCard Component
    ✓ should render user name and age correctly
    ✓ should display profile picture when available
    ... (más pruebas)

Test Suites: 1 passed, 1 total
Tests:       15 passed, 15 total
```

### ❌ Pruebas Fallidas
Si alguna prueba falla, verás:
```
FAIL  components/discover/MatchCard.test.tsx
  MatchCard Component
    ✕ should render user name and age correctly
      Expected: "Alice, 28"
      Received: "Alice"
```

## Paso 5: Solucionar Problemas

### Problema: "Cannot find module"
```bash
# Solución: Limpia node_modules y reinstala
rm -rf node_modules
npm install
```

### Problema: "Jest is not recognized"
```bash
# Solución: Usa npm run
npm run test
```

### Problema: Errores de Babel
```bash
# Verifica que babel.config.js tenga los presets correctos
cat babel.config.js
```

## Paso 6: Integración Continua (Opcional)

Para agregar pruebas a tu pipeline de CI/CD, agrega esto a tu workflow:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd mobile/debuta && npm install
      - run: cd mobile/debuta && npm test
```

## Archivos Importantes

```
mobile/debuta/
├── jest.config.js              # Configuración de Jest
├── jest.setup.js               # Setup del entorno
├── babel.config.js             # Configuración de Babel
├── package.json                # Scripts y dependencias
├── components/
│   ├── discover/
│   │   ├── MatchCard.tsx       # Componente (con testID)
│   │   └── MatchCard.test.tsx  # Suite de pruebas (15 tests)
│   └── types/
│       └── index.ts            # Types (actualizado)
└── TEST_SUMMARY.md             # Este archivo
```

## Comandos Rápidos

```bash
# Instalar dependencias
npm install

# Ejecutar pruebas
npm test

# Modo watch
npm test:watch

# Con cobertura
npm test:coverage

# Prueba específica
npm test -- MatchCard.test.tsx

# Limpiar y reinstalar
rm -rf node_modules && npm install
```

## ¿Qué Sigue?

1. ✅ Ejecuta `npm install`
2. ✅ Ejecuta `npm test`
3. ✅ Verifica que todas las 15 pruebas pasen
4. ✅ Revisa la cobertura con `npm test:coverage`
5. ✅ Crea pruebas para otros componentes siguiendo el mismo patrón

---

**¡Listo! Tus pruebas están configuradas y listas para ejecutar.** 🎉
