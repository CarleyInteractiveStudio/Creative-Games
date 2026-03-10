# API de Logros para Desarrolladores - Creative Game

¡Bienvenido! Esta guía te enseñará cómo integrar el sistema de logros de Creative Game en tu videojuego.

## 1. Configuración del Logro
Antes de poder desbloquear un logro, debes crearlo en el panel de **Publicar/Editar Juego**:
1. Ve a la sección **Logros**.
2. Añade un nuevo logro.
3. Elige un nombre, descripción y una **Clave (ID)** (ej: `primer_nivel`, `secreto_encontrado`).
4. Sube el icono del logro.

## 2. Desbloqueando Logros desde el Juego
Como tu juego se ejecuta dentro de un `iframe`, debes comunicarte con la página principal (padre) usando `postMessage`.

### Código JavaScript (Recomendado)
Copia y pega esta función en tu código para facilitar el proceso:

```javascript
function desbloquearLogro(clave) {
    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'UNLOCK_ACHIEVEMENT',
            key: clave
        }, '*');
        console.log("Solicitud de logro enviada:", clave);
    } else {
        console.warn("El juego no está en un iframe de Creative Game.");
    }
}

// Ejemplo de uso:
desbloquearLogro('primer_paso');
```

## 3. ¿Qué sucede al llamar a la API?
Cuando llamas a `desbloquearLogro`:
1. La plataforma verifica si el usuario ha iniciado sesión.
2. Comprueba si el logro existe para tu juego.
3. Si el usuario aún no lo tiene, se guarda en su cuenta.
4. Aparecerá una notificación visual "¡Logro Desbloqueado!" en la parte inferior derecha de la pantalla sin interrumpir el juego.

## Límites
- Máximo **100 logros** por juego.
- Las imágenes deben ser URLs directas (preferiblemente de GitHub).

---
&copy; 2026 Creative Game Team
