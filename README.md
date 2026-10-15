# TIMBA 🎰

Seguí tus apuestas de fútbol en vivo. Cargás el boleto, por ejemplo una combinada de 5 partidos o un hat-trick de un jugador, y TIMBA te muestra:

- el marcador y el minuto de cada partido,
- quién hizo cada gol,
- si cada selección va ganando o perdiendo.

También te avisa por Telegram cuando hay gol, cuando tu jugador marca (con cuántos lleva, por ejemplo 2/3) y cuando el boleto se gana o se cae.

Los datos salen de la API pública (no oficial) de ESPN. Es gratis y no pide key, pero ESPN la puede cambiar sin aviso.

## Correrlo en tu compu

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # tests del motor de apuestas
```

Sin configurar nada, las apuestas se guardan en `.data/db.json`.

## Subirlo a Vercel (todo gratis)

1. **Subí el repo a GitHub e importalo en Vercel.**
2. **Base de datos.** Creá una base Redis en [upstash.com](https://upstash.com) y copiá `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`. Hace falta porque en Vercel no se puede escribir en disco.
3. **Bot de Telegram.**
   - Hablale a @BotFather en Telegram y mandá `/newbot`. Te da el **token**.
   - Mandale cualquier mensaje a tu bot nuevo.
   - Abrí `https://api.telegram.org/bot<TOKEN>/getUpdates` y copiá `chat.id`.
4. **Variables de entorno en Vercel** (están todas en `.env.example`):
   - `APP_PASSWORD`: la contraseña para entrar a la app. El navegador la pide una sola vez.
   - `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.
   - `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`.
   - `CRON_SECRET`: cualquier texto largo.
5. **Chequeo cada minuto.** El cron de Vercel en el plan gratis corre una vez por día, así que usá [cron-job.org](https://cron-job.org), que es gratis:
   - URL: `https://TU-APP.vercel.app/api/check?secret=TU_CRON_SECRET`
   - Frecuencia: cada 1 minuto.

   El chequeo solo le pide datos a ESPN si hay partidos tuyos empezados o por empezar en los próximos 15 minutos.
6. **Probá los avisos.** Entrá a **Avisos** en la app y tocá "Mandar mensaje de prueba".

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
lib/espn.ts         llamadas a ESPN (scoreboard por liga y fecha, planteles)
lib/evaluate.ts     motor: estado de cada selección y del boleto
lib/notify.ts       compara con la vuelta anterior y arma los avisos
lib/store.ts        Upstash Redis o archivo local
app/api/check       el endpoint que llama el cron
components/         dashboard, pista de minutos, armador de boletos
```

Para agregar una liga, sumala en `lib/leagues.ts` con su código de ESPN. El código aparece en la URL de la liga en espn.com, por ejemplo `uru.1` o `arg.1`.
