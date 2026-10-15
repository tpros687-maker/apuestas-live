# TIMBA 🎰

Seguí tus apuestas de fútbol en vivo, vos y tus amigos, cada uno con su cuenta. Cargás el boleto, por ejemplo una combinada de 5 partidos o un hat-trick de un jugador, y TIMBA te muestra:

- el marcador y el minuto de cada partido,
- quién hizo cada gol,
- si cada selección va ganando o perdiendo.

Además te manda **notificaciones push** al celular o a la compu cuando hay gol, cuando tu jugador marca (con cuántos lleva, por ejemplo 2/3) y cuando el boleto se gana o se cae.

Los datos salen de la API pública (no oficial) de ESPN. Es gratis y no pide key, pero ESPN la puede cambiar sin aviso.

## Correrlo en tu compu

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # tests del motor de apuestas
```

Sin configurar nada, todo se guarda en `.data/db.json`. La primera cuenta que crees no pide código de invitación.

## Variables de entorno en Vercel

| Variable | Para qué |
|---|---|
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Base de datos. Se cargan solas al conectar **Storage → Upstash for Redis** |
| `INVITE_CODE` | El código que necesitan tus amigos para crear su cuenta |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Claves de las notificaciones push (`npx web-push generate-vapid-keys`) |
| `VAPID_SUBJECT` | `mailto:` con tu mail |
| `CRON_SECRET` | Protege el chequeo automático |

## Chequeo cada minuto

El cron de Vercel en el plan gratis corre una vez por día, así que usá [cron-job.org](https://cron-job.org), que es gratis:

- URL: `https://TU-APP.vercel.app/api/check?secret=TU_CRON_SECRET`
- Frecuencia: cada 1 minuto.

Revisa las apuestas de todos los usuarios, pide cada liga a ESPN una sola vez y le avisa a cada uno lo suyo. Solo consulta ESPN si hay partidos empezados o por empezar en los próximos 15 minutos.

## Invitar amigos

En la app, entrá a **Avisos y amigos**, copiá el link de invitación (ya trae el código) y mandáselo. Cada uno crea su usuario, carga sus apuestas y activa sus avisos.

En iPhone las notificaciones solo funcionan si agregás TIMBA a la pantalla de inicio (Compartir → Agregar a inicio) y la abrís desde ahí.

## Mercados soportados

| Mercado | Cómo se resuelve |
|---|---|
| Resultado (1X2) | Marcador al final; en vivo muestra si va ganando o perdiendo |
| Doble oportunidad | Igual que resultado |
| Más/menos goles (0.5 a 5.5) | "Más de" se gana apenas se pasa la línea; "menos de" se pierde apenas se pasa |
| Ambos marcan | Se gana cuando marcan los dos equipos |
| Jugador marca / doblete / hat-trick | Cuenta los goles del jugador. Los goles en contra no cuentan |

Un partido suspendido o postergado anula esa selección y la combinada sigue con las demás.

## Estructura

```
lib/espn-parse.ts   ESPN → formato propio (goles, goleadores, goles en contra)
lib/espn.ts         llamadas a ESPN (scoreboard día por día, planteles)
lib/evaluate.ts     motor: estado de cada selección y del boleto
lib/notify.ts       compara con la vuelta anterior y arma los avisos
lib/auth.ts         cuentas (contraseñas con PBKDF2) y sesiones por cookie
lib/push.ts         notificaciones push (web-push)
lib/store.ts        Upstash Redis o archivo local
app/api/check       el endpoint que llama el cron
public/sw.js        service worker que muestra las notificaciones
```

Para agregar una liga, sumala en `lib/leagues.ts` con su código de ESPN. El código aparece en la URL de la liga en espn.com, por ejemplo `uru.1` o `uefa.europa.conf`.
