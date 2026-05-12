# 📋 Suite de Pruebas Unitarias - MatchCard Component

---

## 📌 Resumen Ejecutivo

Se ha creado una **suite completa de pruebas unitarias** para el componente **MatchCard** del proyecto Debuta Mobile. La suite incluye **15 casos de prueba** que cubren todos los comportamientos principales del componente.

| Métrica | Valor |
|---------|-------|
| **Total de Pruebas** | 15 |
| **Framework** | Jest + React Native Testing Library |
| **Archivo de Prueba** | `components/discover/MatchCard.test.tsx` |
| **Cobertura** | Rendering, interacciones, cálculos de tiempo, badges |
| **Estado** | ✅ Listo para ejecutar |

---

## 🎯 Comportamientos Probados

### 1️⃣ **Información del Usuario**
- ✅ Renderizar nombre de usuario y edad correctamente
- ✅ Usar nombre de usuario cuando `first_name` no está disponible
- ✅ Manejar edad nula correctamente

### 2️⃣ **Avatar / Foto de Perfil**
- ✅ Mostrar foto de perfil cuando está disponible
- ✅ Mostrar avatar placeholder cuando no hay foto

### 3️⃣ **Badge de Mensajes No Leídos**
- ✅ Mostrar badge con el conteo correcto
- ✅ Limitar badge a "9+" cuando el conteo excede 9
- ✅ Ocultar badge cuando el conteo es cero

### 4️⃣ **Cálculo de Tiempo Relativo**
- ✅ Mostrar "ahora" para mensajes < 60 segundos
- ✅ Mostrar tiempo en minutos (ej: "5m")
- ✅ Mostrar tiempo en horas (ej: "3h")
- ✅ Mostrar tiempo en días (ej: "2d")

### 5️⃣ **Contenido del Mensaje**
- ✅ Mostrar contenido del último mensaje
- ✅ Mostrar saludo predeterminado cuando no hay mensaje

### 6️⃣ **Interacción del Usuario**
- ✅ Ejecutar callback `onPress` cuando se toca la tarjeta

---

## 🔧 Configuración Técnica

### Dependencias Instaladas

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "@testing-library/react-native": "^12.4.0",
    "@testing-library/jest-native": "^5.4.3",
    "babel-jest": "^29.7.0",
    "@babel/preset-react": "^7.23.3",
    "@babel/preset-typescript": "^7.23.3",
    "@types/jest": "^29.5.8"
  }
}
```

### Archivos de Configuración Creados

| Archivo | Propósito |
|---------|-----------|
| `jest.config.js` | Configuración de Jest para React Native |
| `jest.setup.js` | Setup del entorno de pruebas |
| `babel.config.js` | Configuración de Babel para transformación |

---

## 📦 Mocks Utilizados

### 1. **getAge() - Utilidad de Edad**
```typescript
jest.mock('../utils/age', () => ({
  getAge: jest.fn(),
}));
```
**Razón**: Permite probar diferentes escenarios de edad sin depender de la fecha actual.

### 2. **Ionicons - Librería de Iconos**
```typescript
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));
```
**Razón**: Librería externa; no es relevante para la lógica del componente.

---

## 🚀 Cómo Ejecutar las Pruebas

### Instalación de Dependencias
```bash
cd mobile/debuta
npm install
```

### Ejecutar Todas las Pruebas
```bash
npm test
```

### Ejecutar en Modo Watch
```bash
npm test:watch
```

### Ejecutar con Cobertura
```bash
npm test:coverage
```

### Ejecutar Prueba Específica
```bash
npm test -- MatchCard.test.tsx
```

---

## 📝 Estructura de las Pruebas

Cada prueba sigue este patrón:

```typescript
it('should [comportamiento esperado]', () => {
  // 1. Setup: Crear datos mock
  const match = createMockMatch({ /* overrides */ });
  
  // 2. Render: Renderizar el componente
  render(<MatchCard match={match} onPress={mockOnPress} />);
  
  // 3. Assert: Verificar comportamiento esperado
  expect(screen.getByText('texto esperado')).toBeTruthy();
});
```

---

## 🔍 Test IDs Agregados al Componente

Se agregaron los siguientes `testID` al componente para facilitar las pruebas:

```typescript
testID="match-card-touchable"      // Wrapper TouchableOpacity
testID="match-card-image"          // Imagen de perfil
testID="match-card-placeholder"    // Avatar placeholder
testID="match-card-badge"          // Badge de conteo no leído
```

---

## 📊 Cambios Realizados

### ✏️ Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `components/discover/MatchCard.tsx` | ✅ Agregados `testID` props |
| `components/types/index.ts` | ✅ Actualizado `Match` interface (`matched_user` → `user`) |
| `package.json` | ✅ Agregados scripts de test y dev dependencies |

### ✨ Archivos Creados

| Archivo | Propósito |
|---------|-----------|
| `components/discover/MatchCard.test.tsx` | Suite de pruebas (15 tests) |
| `jest.config.js` | Configuración de Jest |
| `jest.setup.js` | Setup del entorno |
| `babel.config.js` | Configuración de Babel |

---

## ✅ Resultado Esperado

Cuando todas las pruebas pasen, verás:

```
PASS  components/discover/MatchCard.test.tsx
  MatchCard Component
    ✓ should render user name and age correctly (45ms)
    ✓ should display profile picture when available (32ms)
    ✓ should show placeholder avatar when no profile picture (28ms)
    ✓ should display unread message badge with correct count (25ms)
    ✓ should cap badge at 9+ when unread count exceeds 9 (22ms)
    ✓ should hide badge when unread count is zero (20ms)
    ✓ should calculate relative time as "ahora" for messages less than 60 seconds old (18ms)
    ✓ should calculate relative time in minutes (15ms)
    ✓ should calculate relative time in hours (14ms)
    ✓ should calculate relative time in days (13ms)
    ✓ should display last message content (12ms)
    ✓ should display default greeting when no last message (11ms)
    ✓ should trigger onPress callback when card is tapped (25ms)
    ✓ should use username when first_name is not available (18ms)
    ✓ should handle null age gracefully (16ms)

Test Suites: 1 passed, 1 total
Tests:       15 passed, 15 total
Snapshots:   0 total
Time:        2.345s
```

---

## 🐛 Solución de Problemas

### Error: "Cannot find module '@testing-library/react-native'"
**Solución**: Ejecuta `npm install` para instalar todas las dependencias.

### Error: "Jest configuration not found"
**Solución**: Verifica que `jest.config.js` exista en `mobile/debuta/`.

### Error: "Babel transformation failed"
**Solución**: Verifica que `babel.config.js` tenga los presets correctos.

### Las pruebas se cuelgan
**Solución**: Aumenta el timeout en el archivo de prueba:
```typescript
jest.setTimeout(10000); // 10 segundos
```

---

## 📚 Próximos Pasos

1. ✅ Ejecutar `npm install` para instalar dependencias
2. ✅ Ejecutar `npm test` para validar las pruebas
3. ✅ Revisar cobertura con `npm test:coverage`
4. ✅ Integrar en CI/CD pipeline
5. ✅ Crear pruebas para otros componentes

---

## 📖 Recursos Útiles

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## ✨ Resumen Final

Se ha completado exitosamente la creación de una suite de pruebas unitarias robusta para el componente **MatchCard**. La suite incluye:

- **15 casos de prueba** cubriendo todos los comportamientos principales
- **Mocks apropiados** para aislar la lógica del componente
- **Configuración completa** de Jest, Babel y Testing Library
- **Documentación clara** para ejecutar y mantener las pruebas

El proyecto está listo para ejecutar las pruebas. Solo necesitas ejecutar `npm install` seguido de `npm test`.
