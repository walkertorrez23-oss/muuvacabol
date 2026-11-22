
## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Muuvaca — publicar y GitHub
- Enlace público: botón **Publish** en Lovable.
- GitHub: en Lovable, Conectores → GitHub → conectar; el código se sincroniza solo.
- Vercel: el proyecto está construido para servidores tipo edge (Cloudflare). Desplegar en Vercel requiere cambiar el preset de servidor de TanStack Start y configurar las variables `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y las `VITE_SUPABASE_*`. Se recomienda el enlace de Lovable.
