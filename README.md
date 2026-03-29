# Carley Interactive Studio - Creative Game (v2026)

Este repositorio contiene el código fuente de la plataforma **Creative Game**, integrada con el sistema central de **Carley Studio SSO**.

## 🚀 Integración SSO & Bridge

La plataforma utiliza un sistema de autenticación centralizado. Todas las operaciones de base de datos y sesión se realizan a través del puente seguro `bridge.html` alojado en `carleystudio.com`.

### Configuración del Servidor Central (`carleystudio.com`)

Para que esta aplicación funcione correctamente, el servidor principal debe cumplir con los siguientes requisitos:

#### 1. White-list de Dominios (CORS / Message Origin)
El archivo `bridge.html` y `sso.js` en el servidor principal deben autorizar el origen:
- `https://creativegame.online` (o el dominio de GitHub Pages correspondiente).

#### 2. Base de Datos (Supabase) - Tablas requeridas
El proyecto de Supabase vinculado debe tener las siguientes tablas configuradas:

| Tabla | Propósito | Columnas Clave |
| :--- | :--- | :--- |
| `profiles` | Perfiles de usuario | `id`, `full_name`, `username`, `avatar_url`, `interests`, `gender`, `birth_date` |
| `games` | Catálogo de juegos | `id`, `user_id`, `title`, `description`, `image_url`, `repo_url`, `status`, `categories`, `devices`, `rating` |
| `categories` | Categorías de juegos | `id`, `name` |
| `favorites` | Likes/Favoritos | `id`, `user_id`, `game_id` |
| `notifications`| Alertas del sistema | `id`, `user_id`, `title`, `content`, `is_read`, `game_id` |
| `ratings` | Calificaciones (1-5) | `id`, `user_id`, `game_id`, `score` |
| `achievements` | Logros obtenidos | `id`, `user_id`, `game_id`, `title`, `definition_id` |
| `achievement_definitions` | Logros por juego | `id`, `game_id`, `key`, `title`, `description`, `icon_url` |
| `play_sessions`| Tiempo de juego | `id`, `user_id`, `game_id`, `duration_seconds` |
| `comments` | Interacción social | `id`, `user_id`, `game_id`, `content` |
| `world_chat` | Chat global "Mundo" | `id`, `user_id`, `content`, `is_game_share`, `game_id` |

#### 3. Seguridad RLS
Es fundamental que las políticas de **Row Level Security (RLS)** estén activas en Supabase para proteger los datos de los usuarios, ya que el Bridge permite realizar llamadas desde el cliente.

## 🛠️ Desarrollo local

Para probar la plataforma localmente:
1. Asegúrate de que `carleystudio.com` esté accesible para cargar el iframe del bridge.
2. Si el bridge no carga, las llamadas a la base de datos fallarán por timeout.
3. El panel de administración se encuentra en `/admin` y solo permite el acceso al correo `johncarley14@gmail.com`.

---
© 2026 Carley Interactive Studio. Todos los derechos reservados.
