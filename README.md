# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

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
